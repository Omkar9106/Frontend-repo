from typing import Dict, Any, Optional
from datetime import datetime
from database import get_database
from models import ScanCreateRequest, ScanResponse
from crud import ScanCRUD

class ScanService:
    """Service layer for scan operations"""
    
    def __init__(self):
        self.crud_instance: Optional[ScanCRUD] = None
    
    async def _get_crud(self) -> ScanCRUD:
        """Get CRUD instance (lazy initialization)"""
        if self.crud_instance is None:
            db = await get_database()
            if db is None:
                # Database not available, return None to trigger mock data
                return None
            self.crud_instance = ScanCRUD(db)
        return self.crud_instance
    
    async def save_scan_result(self, api_response: Dict[str, Any], file_info: Optional[Dict[str, Any]] = None, user_id: Optional[str] = None) -> ScanResponse:
        """Save OCR scan result to database"""
        try:
            # Extract data from API response
            scan_data = ScanCreateRequest(
                scan_id=api_response.get("scan_id", f"scan_{int(datetime.now().timestamp())}"),
                medicine=api_response.get("medicine", "Unknown"),
                status=api_response.get("status", "Unknown"),
                confidence=api_response.get("confidence", "0%"),
                batch_number=api_response.get("batch_number"),
                expiry_date=api_response.get("expiry_date"),
                extracted_text=api_response.get("extracted_text", ""),
                extraction_method=api_response.get("extraction_method", "unknown"),
                processing_time=api_response.get("processing_time", "0s"),
                extraction_confidence=api_response.get("extraction_confidence"),
                reason=api_response.get("reason", "Analysis completed"),
                fake_indicators=api_response.get("fake_indicators", []),
                location=api_response.get("location"),
                file_name=file_info.get("filename") if file_info else None,
                file_size=file_info.get("size") if file_info else None
            )
            
            # Save to database
            crud = await self._get_crud()
            if crud is None:
                print("[SERVICE] Database not available - cannot save scan")
                # Return a mock response
                return ScanResponse(
                    id="mock_saved",
                    scan_id=scan_data.scan_id,
                    medicine=scan_data.medicine,
                    status=scan_data.status,
                    confidence=scan_data.confidence,
                    batch_number=scan_data.batch_number,
                    expiry_date=scan_data.expiry_date,
                    extracted_text=scan_data.extracted_text,
                    extraction_method=scan_data.extraction_method,
                    processing_time=scan_data.processing_time,
                    extraction_confidence=scan_data.extraction_confidence,
                    reason=scan_data.reason,
                    fake_indicators=scan_data.fake_indicators or [],
                    timestamp=datetime.utcnow(),
                    location=scan_data.location,
                    file_name=scan_data.file_name
                )
            return await crud.create_scan(scan_data, user_id)
            
        except Exception as e:
            print(f"Error saving scan result: {e}")
            raise
    
    async def get_scan_history(self, user_id: Optional[str] = None, limit: int = 50, offset: int = 0) -> list[ScanResponse]:
        """Get scan history"""
        try:
            crud = await self._get_crud()
            
            if user_id:
                return await crud.get_scans_by_user(user_id, limit, offset)
            else:
                return await crud.get_all_scans(limit, offset)
                
        except Exception as e:
            print(f"Error getting scan history: {e}")
            return []
    
    async def get_scan_by_id(self, scan_id: str) -> Optional[ScanResponse]:
        """Get specific scan by ID"""
        try:
            crud = await self._get_crud()
            return await crud.get_scan_by_id(scan_id)
            
        except Exception as e:
            print(f"Error getting scan by ID: {e}")
            return None
    
    async def get_medicine_history(self, medicine_name: str, limit: int = 20) -> list[ScanResponse]:
        """Get history for specific medicine"""
        try:
            crud = await self._get_crud()
            return await crud.get_scans_by_medicine(medicine_name, limit)
            
        except Exception as e:
            print(f"Error getting medicine history: {e}")
            return []
    
    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get dashboard statistics"""
        try:
            crud = await self._get_crud()
            if crud is None:
                print("[SERVICE] Database not available - using mock stats")
                return self.get_mock_stats()
            return await crud.get_scan_statistics()
            
        except Exception as e:
            print(f"Error getting dashboard stats: {e}")
            return self.get_mock_stats()
    
    def get_mock_stats(self) -> Dict[str, Any]:
        """Generate mock dashboard statistics"""
        return {
            "total_scans": 42,
            "recent_scans_24h": 8,
            "unique_medicines": 12,
            "status_breakdown": [
                {"_id": "Real", "count": 25, "avg_confidence": 89.5},
                {"_id": "Fake", "count": 12, "avg_confidence": 45.2},
                {"_id": "Suspicious", "count": 5, "avg_confidence": 62.8}
            ],
            "last_updated": datetime.utcnow().isoformat()
        }
    
    async def delete_scan(self, scan_id: str) -> bool:
        """Delete scan by ID"""
        try:
            crud = await self._get_crud()
            return await crud.delete_scan(scan_id)
            
        except Exception as e:
            print(f"Error deleting scan: {e}")
            return False
    
    async def get_medicine_trends(self) -> Dict[str, Any]:
        """Get medicine trends - most frequent and most suspicious"""
        try:
            crud = await self._get_crud()
            if crud is None:
                print("[SERVICE] Database not available - using mock trends")
                return self.get_mock_trends()
            return await crud.get_medicine_trends()
            
        except Exception as e:
            print(f"Error getting medicine trends: {e}")
            return self.get_mock_trends()
    
    def get_mock_trends(self) -> Dict[str, Any]:
        """Generate mock trends data"""
        return {
            "most_frequent": [
                {"medicine": "Paracetamol", "scan_count": 15, "avg_confidence": 85.2, "latest_scan": "2026-04-10T10:30:00Z"},
                {"medicine": "Ibuprofen", "scan_count": 12, "avg_confidence": 78.5, "latest_scan": "2026-04-10T09:45:00Z"},
                {"medicine": "Amoxicillin", "scan_count": 8, "avg_confidence": 92.1, "latest_scan": "2026-04-10T11:15:00Z"},
                {"medicine": "Aspirin", "scan_count": 7, "avg_confidence": 88.7, "latest_scan": "2026-04-10T08:20:00Z"},
                {"medicine": "Crocin", "scan_count": 5, "avg_confidence": 76.3, "latest_scan": "2026-04-10T07:30:00Z"}
            ],
            "most_suspicious": [
                {"medicine": "FakeMed", "total_scans": 8, "fake_scans": 6, "suspicious_scans": 2, "suspicious_ratio": 1.0, "avg_confidence": 45.2, "latest_scan": "2026-04-10T10:00:00Z"},
                {"medicine": "SuspiciousPill", "total_scans": 5, "fake_scans": 3, "suspicious_scans": 2, "suspicious_ratio": 1.0, "avg_confidence": 52.8, "latest_scan": "2026-04-10T09:15:00Z"},
                {"medicine": "UnknownTablet", "total_scans": 4, "fake_scans": 2, "suspicious_scans": 1, "suspicious_ratio": 0.75, "avg_confidence": 38.5, "latest_scan": "2026-04-10T08:45:00Z"}
            ],
            "last_updated": datetime.utcnow().isoformat()
        }

# Global service instance
scan_service = ScanService()
