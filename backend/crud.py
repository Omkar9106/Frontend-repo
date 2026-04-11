from typing import List, Optional, Dict, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from models import OCRScanModel, ScanCreateRequest, ScanResponse, PyObjectId

class ScanCRUD:
    """CRUD operations for OCR scan collection"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection = database.scans
        
        # Create indexes for better performance
        self._create_indexes()
    
    async def _create_indexes(self):
        """Create database indexes"""
        try:
            # Index for timestamp sorting
            await self.collection.create_index("timestamp", direction=DESCENDING)
            
            # Index for medicine name search
            await self.collection.create_index("medicine")
            
            # Index for status filtering
            await self.collection.create_index("status")
            
            # Index for user_id (if user tracking is needed)
            await self.collection.create_index("user_id")
            
            # Compound index for medicine + status
            await self.collection.create_index([("medicine", ASCENDING), ("status", ASCENDING)])
            
            print("Database indexes created successfully")
            
        except Exception as e:
            print(f"Error creating indexes: {e}")
    
    async def create_scan(self, scan_data: ScanCreateRequest, user_id: Optional[str] = None) -> ScanResponse:
        """Create new scan record"""
        try:
            # Create document with timestamp
            scan_doc = OCRScanModel(
                **scan_data.dict(),
                user_id=user_id,
                timestamp=datetime.utcnow()
            )
            
            # Insert into database
            result = await self.collection.insert_one(scan_doc.dict(by_alias=True))
            
            # Get the inserted document
            created_scan = await self.collection.find_one({"_id": result.inserted_id})
            
            if created_scan:
                return ScanResponse(**created_scan)
            else:
                raise Exception("Failed to retrieve created scan")
                
        except Exception as e:
            print(f"Error creating scan: {e}")
            raise
    
    async def get_scan_by_id(self, scan_id: str) -> Optional[ScanResponse]:
        """Get scan by ID"""
        try:
            # Convert string ID to ObjectId
            object_id = PyObjectId(scan_id)
            
            scan = await self.collection.find_one({"_id": object_id})
            
            if scan:
                return ScanResponse(**scan)
            return None
            
        except Exception as e:
            print(f"Error getting scan by ID: {e}")
            return None
    
    async def get_scans_by_user(self, user_id: str, limit: int = 50, skip: int = 0) -> List[ScanResponse]:
        """Get scans for specific user"""
        try:
            cursor = self.collection.find(
                {"user_id": user_id}
            ).sort("timestamp", DESCENDING).skip(skip).limit(limit)
            
            scans = await cursor.to_list(length=limit)
            return [ScanResponse(**scan) for scan in scans]
            
        except Exception as e:
            print(f"Error getting user scans: {e}")
            return []
    
    async def get_all_scans(self, limit: int = 100, skip: int = 0) -> List[ScanResponse]:
        """Get all scans with pagination"""
        try:
            cursor = self.collection.find(
                {}
            ).sort("timestamp", DESCENDING).skip(skip).limit(limit)
            
            scans = await cursor.to_list(length=limit)
            return [ScanResponse(**scan) for scan in scans]
            
        except Exception as e:
            print(f"Error getting all scans: {e}")
            return []
    
    async def get_scans_by_medicine(self, medicine_name: str, limit: int = 20) -> List[ScanResponse]:
        """Get scans by medicine name (case-insensitive)"""
        try:
            cursor = self.collection.find(
                {"medicine": {"$regex": medicine_name, "$options": "i"}}
            ).sort("timestamp", DESCENDING).limit(limit)
            
            scans = await cursor.to_list(length=limit)
            return [ScanResponse(**scan) for scan in scans]
            
        except Exception as e:
            print(f"Error getting scans by medicine: {e}")
            return []
    
    async def get_scans_by_status(self, status: str, limit: int = 50) -> List[ScanResponse]:
        """Get scans by verification status"""
        try:
            cursor = self.collection.find(
                {"status": status}
            ).sort("timestamp", DESCENDING).limit(limit)
            
            scans = await cursor.to_list(length=limit)
            return [ScanResponse(**scan) for scan in scans]
            
        except Exception as e:
            print(f"Error getting scans by status: {e}")
            return []
    
    async def get_scan_statistics(self) -> Dict[str, Any]:
        """Get scan statistics"""
        try:
            # First get all scans and process confidence values in application code
            pipeline = [
                {
                    "$group": {
                        "_id": "$status",
                        "count": {"$sum": 1},
                        "confidences": {"$push": "$confidence"}
                    }
                },
                {"$sort": {"count": -1}}
            ]
            
            status_stats = await self.collection.aggregate(pipeline).to_list(length=None)
            
            # Process confidence values in application code
            processed_stats = []
            for stat in status_stats:
                # Convert confidence strings to numbers and calculate average
                confidences = []
                for conf in stat.get("confidences", []):
                    try:
                        # Remove % and convert to float
                        conf_num = float(str(conf).replace("%", ""))
                        confidences.append(conf_num)
                    except (ValueError, TypeError):
                        continue
                
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0
                
                processed_stats.append({
                    "_id": stat["_id"],
                    "count": stat["count"],
                    "avg_confidence": avg_confidence
                })
            
            # Get total scans
            total_scans = await self.collection.count_documents({})
            
            # Get recent scans (last 24 hours)
            yesterday = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            recent_scans = await self.collection.count_documents({"timestamp": {"$gte": yesterday}})
            
            # Get unique medicines
            unique_medicines = await self.collection.distinct("medicine")
            
            return {
                "total_scans": total_scans,
                "recent_scans_24h": recent_scans,
                "unique_medicines": len(unique_medicines),
                "status_breakdown": processed_stats,
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"Error getting statistics: {e}")
            return {
                "total_scans": 0,
                "recent_scans_24h": 0,
                "unique_medicines": 0,
                "status_breakdown": [],
                "last_updated": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    async def delete_scan(self, scan_id: str) -> bool:
        """Delete scan by ID"""
        try:
            object_id = PyObjectId(scan_id)
            result = await self.collection.delete_one({"_id": object_id})
            return result.deleted_count > 0
            
        except Exception as e:
            print(f"Error deleting scan: {e}")
            return False
    
    async def update_scan(self, scan_id: str, update_data: Dict[str, Any]) -> Optional[ScanResponse]:
        """Update scan by ID"""
        try:
            object_id = PyObjectId(scan_id)
            
            # Remove fields that shouldn't be updated
            update_data.pop("_id", None)
            update_data.pop("timestamp", None)
            
            result = await self.collection.update_one(
                {"_id": object_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                updated_scan = await self.collection.find_one({"_id": object_id})
                if updated_scan:
                    return ScanResponse(**updated_scan)
            
            return None
            
        except Exception as e:
            print(f"Error updating scan: {e}")
            return None
    
    async def get_medicines_statistics(self) -> List[Dict[str, Any]]:
        """Get statistics for all medicines"""
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": "$medicine",
                        "total_scans": {"$sum": 1},
                        "real_scans": {
                            "$sum": {
                                "$cond": [{"$eq": ["$status", "Real"]}, 1, 0]
                            }
                        },
                        "fake_scans": {
                            "$sum": {
                                "$cond": [{"$eq": ["$status", "Fake"]}, 1, 0]
                            }
                        },
                        "suspicious_scans": {
                            "$sum": {
                                "$cond": [{"$eq": ["$status", "Suspicious"]}, 1, 0]
                            }
                        },
                        "confidences": {"$push": "$confidence"},
                        "last_scan": {"$max": "$timestamp"}
                    }
                },
                {"$sort": {"total_scans": -1}}
            ]
            
            medicines_stats = await self.collection.aggregate(pipeline).to_list(length=None)
            
            # Process results
            result = []
            for stat in medicines_stats:
                # Calculate average confidence
                confidences = []
                for conf in stat.get("confidences", []):
                    try:
                        conf_num = float(str(conf).replace("%", ""))
                        confidences.append(conf_num)
                    except (ValueError, TypeError):
                        continue
                
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0
                
                result.append({
                    "name": stat["_id"],
                    "total_scans": stat["total_scans"],
                    "real_scans": stat["real_scans"],
                    "fake_scans": stat["fake_scans"],
                    "suspicious_scans": stat["suspicious_scans"],
                    "last_scan": stat["last_scan"].isoformat() if stat["last_scan"] else None,
                    "avg_confidence": avg_confidence
                })
            
            return result
            
        except Exception as e:
            print(f"Error getting medicines statistics: {e}")
            return []
    
    async def get_medicine_details(self, medicine_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed information for a specific medicine"""
        try:
            cursor = self.collection.find(
                {"medicine": {"$regex": medicine_name, "$options": "i"}}
            ).sort("timestamp", DESCENDING)
            
            scans = await cursor.to_list(length=100)  # Get last 100 scans
            
            if not scans:
                return None
            
            # Calculate statistics
            total_scans = len(scans)
            real_count = sum(1 for scan in scans if scan.get("status") == "Real")
            fake_count = sum(1 for scan in scans if scan.get("status") == "Fake")
            suspicious_count = sum(1 for scan in scans if scan.get("status") == "Suspicious")
            
            # Calculate average confidence
            confidences = []
            for scan in scans:
                try:
                    conf_num = float(str(scan.get("confidence", "0%")).replace("%", ""))
                    confidences.append(conf_num)
                except (ValueError, TypeError):
                    continue
            
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return {
                "name": medicine_name,
                "total_scans": total_scans,
                "real_scans": real_count,
                "fake_scans": fake_count,
                "suspicious_scans": suspicious_count,
                "avg_confidence": avg_confidence,
                "last_scan": scans[0].get("timestamp").isoformat() if scans else None,
                "recent_scans": scans[:10]  # Last 10 scans
            }
            
        except Exception as e:
            print(f"Error getting medicine details: {e}")
            return None
    
    async def get_medicine_trends(self) -> Dict[str, Any]:
        """Get medicine trends - most frequent and most suspicious"""
        try:
            # Get most frequently scanned medicines
            frequent_pipeline = [
                {"$group": {
                    "_id": "$medicine",
                    "count": {"$sum": 1},
                    "avg_confidence": {"$avg": {
                        "$toDouble": {"$replaceAll": {"input": "$confidence", "find": "%", "replacement": ""}}
                    }},
                    "latest_scan": {"$max": "$timestamp"}
                }},
                {"$sort": {"count": -1}},
                {"$limit": 10},
                {"$project": {
                    "medicine": "$_id",
                    "scan_count": "$count",
                    "avg_confidence": {"$round": ["$avg_confidence", 1]},
                    "latest_scan": "$latest_scan",
                    "_id": 0
                }}
            ]
            
            # Get most suspicious medicines (high fake/suspicious ratio)
            suspicious_pipeline = [
                {"$group": {
                    "_id": "$medicine",
                    "total_scans": {"$sum": 1},
                    "fake_scans": {
                        "$sum": {
                            "$cond": [{"$in": ["$status", ["Fake", "fake"]]}, 1, 0]
                        }
                    },
                    "suspicious_scans": {
                        "$sum": {
                            "$cond": [{"$in": ["$status", ["Suspicious", "suspicious"]]}, 1, 0]
                        }
                    },
                    "avg_confidence": {"$avg": {
                        "$toDouble": {"$replaceAll": {"input": "$confidence", "find": "%", "replacement": ""}}
                    }},
                    "latest_scan": {"$max": "$timestamp"}
                }},
                {"$addFields": {
                    "suspicious_ratio": {
                        "$divide": [
                            {"$add": ["$fake_scans", "$suspicious_scans"]},
                            "$total_scans"
                        ]
                    }
                }},
                {"$match": {
                    "total_scans": {"$gte": 2},  # At least 2 scans
                    "suspicious_ratio": {"$gt": 0}  # Some suspicious activity
                }},
                {"$sort": {"suspicious_ratio": -1}},
                {"$limit": 10},
                {"$project": {
                    "medicine": "$_id",
                    "total_scans": "$total_scans",
                    "fake_scans": "$fake_scans",
                    "suspicious_scans": "$suspicious_scans",
                    "suspicious_ratio": {"$round": ["$suspicious_ratio", 2]},
                    "avg_confidence": {"$round": ["$avg_confidence", 1]},
                    "latest_scan": "$latest_scan",
                    "_id": 0
                }}
            ]
            
            frequent_result = await self.collection.aggregate(frequent_pipeline).to_list(length=10)
            suspicious_result = await self.collection.aggregate(suspicious_pipeline).to_list(length=10)
            
            return {
                "most_frequent": frequent_result,
                "most_suspicious": suspicious_result,
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"Error getting medicine trends: {e}")
            return {
                "most_frequent": [],
                "most_suspicious": [],
                "last_updated": datetime.utcnow().isoformat()
            }
    
    async def delete_medicine_scans(self, medicine_name: str) -> int:
        """Delete all scans for a specific medicine"""
        try:
            result = await self.collection.delete_many(
                {"medicine": {"$regex": medicine_name, "$options": "i"}}
            )
            return result.deleted_count
            
        except Exception as e:
            print(f"Error deleting medicine scans: {e}")
            return 0
