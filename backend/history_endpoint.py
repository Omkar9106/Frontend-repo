from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database
from models import ScanResponse
from datetime import datetime

# Create router
history_router = APIRouter(prefix="/api/v1", tags=["history"])

@history_router.get("/scans", response_model=List[ScanResponse])
async def get_scan_history(limit: int = 50, offset: int = 0) -> List[ScanResponse]:
    """
    Get scan history from MongoDB or mock data if MongoDB is not available
    
    - **limit**: Maximum number of scans to return (default: 50, max: 100)
    - **offset**: Number of scans to skip for pagination (default: 0)
    
    Returns scans sorted by timestamp (newest first)
    """
    try:
        # Validate limit
        if limit > 100:
            limit = 100
        if limit < 1:
            limit = 50
        
        # Validate offset
        if offset < 0:
            offset = 0
        
        # Try to get database connection
        db = await get_database()
        
        # If database is not available, return mock data
        if db is None:
            print("[HISTORY] Using mock data - MongoDB not available")
            return get_mock_scan_history(limit, offset)
        
        collection = db.scans
        
        # Query MongoDB with sorting and pagination
        cursor = collection.find(
            {}  # No filter - get all documents
        ).sort(
            "timestamp", -1  # Sort by timestamp descending (newest first)
        ).skip(
            offset  # Skip for pagination
        ).limit(
            limit  # Limit results
        )
        
        # Execute query and convert to list
        scans = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string for JSON response
        scan_responses = []
        for scan in scans:
            # Convert ObjectId to string
            scan["id"] = str(scan.pop("_id", None))
            
            # Ensure timestamp is in ISO format
            if "timestamp" in scan and isinstance(scan["timestamp"], datetime):
                scan["timestamp"] = scan["timestamp"].isoformat()
            
            # Create ScanResponse model
            scan_responses.append(ScanResponse(**scan))
        
        print(f"[HISTORY] Retrieved {len(scan_responses)} scans (limit={limit}, offset={offset})")
        
        return scan_responses
        
    except Exception as e:
        print(f"[HISTORY ERROR] Failed to fetch scan history: {e}")
        # Return mock data as fallback
        print("[HISTORY] Falling back to mock data due to error")
        return get_mock_scan_history(limit, offset)

def get_mock_scan_history(limit: int, offset: int) -> List[ScanResponse]:
    """Generate mock scan history data"""
    from datetime import datetime, timedelta
    import random
    
    mock_scans = [
        {
            "id": f"mock_{i}",
            "medicine": ["Paracetamol 500mg", "Ibuprofen 400mg", "Amoxicillin 500mg", "Aspirin 75mg", "Cough Syrup"][i % 5],
            "status": ["Real", "Fake", "Suspicious"][i % 3],
            "confidence": f"{85 + (i % 15)}%",
            "batch_number": f"BATCH{1000 + i}",
            "expiry_date": f"{12 + (i % 24)}/{2024 + (i % 2)}",
            "extracted_text": f"Sample OCR text for medicine scan {i}",
            "extraction_method": "database_match",
            "processing_time": f"{1.2 + (i % 8) * 0.1}s",
            "extraction_confidence": f"{90 + (i % 10)}%",
            "reason": "Sample verification result",
            "fake_indicators": [] if i % 3 == 0 else ["Suspicious indicator"],
            "timestamp": (datetime.utcnow() - timedelta(hours=i)).isoformat(),
            "file_name": f"scan_{i}.jpg"
        }
        for i in range(offset, min(offset + limit, 20))
    ]
    
    return [ScanResponse(**scan) for scan in mock_scans]

@history_router.get("/scans/count")
async def get_scan_count() -> Dict[str, Any]:
    """
    Get total number of scans in database
    """
    try:
        # Get database connection
        db = await get_database()
        collection = db.scans
        
        # Count total documents
        total_count = await collection.count_documents({})
        
        return {
            "total_scans": total_count,
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"[HISTORY ERROR] Failed to count scans: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to count scans: {str(e)}"
        )

@history_router.get("/scans/recent", response_model=List[ScanResponse])
async def get_recent_scans(limit: int = 10) -> List[ScanResponse]:
    """
    Get most recent scans (simplified endpoint)
    
    - **limit**: Maximum number of recent scans to return (default: 10, max: 20)
    """
    try:
        # Validate limit
        if limit > 20:
            limit = 20
        if limit < 1:
            limit = 10
        
        # Get database connection
        db = await get_database()
        collection = db.scans
        
        # Query for most recent scans
        cursor = collection.find(
            {}
        ).sort(
            "timestamp", -1
        ).limit(
            limit
        )
        
        # Execute query
        scans = await cursor.to_list(length=limit)
        
        # Convert to response format
        scan_responses = []
        for scan in scans:
            scan["id"] = str(scan.pop("_id", None))
            
            if "timestamp" in scan and isinstance(scan["timestamp"], datetime):
                scan["timestamp"] = scan["timestamp"].isoformat()
            
            scan_responses.append(ScanResponse(**scan))
        
        print(f"[HISTORY] Retrieved {len(scan_responses)} recent scans")
        
        return scan_responses
        
    except Exception as e:
        print(f"[HISTORY ERROR] Failed to fetch recent scans: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve recent scans: {str(e)}"
        )

@history_router.get("/scans/medicine/{medicine_name}", response_model=List[ScanResponse])
async def get_scans_by_medicine(medicine_name: str, limit: int = 20) -> List[ScanResponse]:
    """
    Get scans by medicine name (case-insensitive search)
    
    - **medicine_name**: Medicine name to search for
    - **limit**: Maximum number of results (default: 20, max: 50)
    """
    try:
        # Validate limit
        if limit > 50:
            limit = 50
        if limit < 1:
            limit = 20
        
        # Get database connection
        db = await get_database()
        collection = db.scans
        
        # Case-insensitive search
        cursor = collection.find(
            {"medicine": {"$regex": medicine_name, "$options": "i"}}
        ).sort(
            "timestamp", -1
        ).limit(
            limit
        )
        
        # Execute query
        scans = await cursor.to_list(length=limit)
        
        # Convert to response format
        scan_responses = []
        for scan in scans:
            scan["id"] = str(scan.pop("_id", None))
            
            if "timestamp" in scan and isinstance(scan["timestamp"], datetime):
                scan["timestamp"] = scan["timestamp"].isoformat()
            
            scan_responses.append(ScanResponse(**scan))
        
        print(f"[HISTORY] Retrieved {len(scan_responses)} scans for medicine: {medicine_name}")
        
        return scan_responses
        
    except Exception as e:
        print(f"[HISTORY ERROR] Failed to search scans by medicine: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search scans: {str(e)}"
        )
