from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from database import get_database
from crud import ScanCRUD

# Pydantic models
class MedicineStats(BaseModel):
    """Medicine statistics model"""
    name: str = Field(..., description="Medicine name")
    total_scans: int = Field(..., description="Total number of scans")
    real_scans: int = Field(..., description="Number of real scans")
    fake_scans: int = Field(..., description="Number of fake scans")
    suspicious_scans: int = Field(..., description="Number of suspicious scans")
    last_scan: Optional[str] = Field(None, description="Last scan timestamp")
    avg_confidence: float = Field(..., description="Average confidence score")

class MedicineResponse(BaseModel):
    """Response model for medicine data"""
    medicines: List[MedicineStats]
    total_medicines: int
    last_updated: str

# Create router
medicines_router = APIRouter(prefix="/api/v1", tags=["medicines"])

@medicines_router.get("/medicines", response_model=MedicineResponse)
async def get_medicines_stats() -> MedicineResponse:
    """
    Get comprehensive statistics for all medicines
    """
    try:
        db = await get_database()
        if db is None:
            # Return empty response if database not available
            return MedicineResponse(
                medicines=[],
                total_medicines=0,
                last_updated=datetime.utcnow().isoformat()
            )
        
        crud = ScanCRUD(db)
        medicines_data = await crud.get_medicines_statistics()
        
        return MedicineResponse(
            medicines=medicines_data,
            total_medicines=len(medicines_data),
            last_updated=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        print(f"Error getting medicines statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve medicines data: {str(e)}"
        )

@medicines_router.get("/medicines/{medicine_name}")
async def get_medicine_details(medicine_name: str) -> Dict[str, Any]:
    """
    Get detailed information for a specific medicine
    """
    try:
        db = await get_database()
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        crud = ScanCRUD(db)
        medicine_details = await crud.get_medicine_details(medicine_name)
        
        if not medicine_details:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medicine not found"
            )
        
        return medicine_details
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting medicine details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve medicine details: {str(e)}"
        )

@medicines_router.delete("/medicines/{medicine_name}")
async def delete_medicine_scans(medicine_name: str) -> Dict[str, Any]:
    """
    Delete all scans for a specific medicine
    """
    try:
        db = await get_database()
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        crud = ScanCRUD(db)
        deleted_count = await crud.delete_medicine_scans(medicine_name)
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} scans for medicine: {medicine_name}",
            "deleted_count": deleted_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting medicine scans: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete medicine scans: {str(e)}"
        )
