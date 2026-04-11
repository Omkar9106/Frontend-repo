from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from database import get_database
from scan_service import scan_service
from models import ScanResponse
import time
import cv2
import numpy as np
from PIL import Image
import pytesseract
import io
import os
import re
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor

# Pydantic model for request body
class SaveScanRequest(BaseModel):
    """Request model for saving scan results"""
    medicine: str = Field(..., description="Medicine name")
    status: str = Field(..., description="Verification status")
    confidence: str = Field(..., description="Confidence percentage")
    batch_number: Optional[str] = Field(None, description="Batch number")
    expiry_date: Optional[str] = Field(None, description="Expiry date")
    extracted_text: str = Field(..., description="Raw OCR text")
    extraction_method: str = Field(..., description="Extraction method used")
    processing_time: str = Field(..., description="Processing time")
    extraction_confidence: Optional[str] = Field(None, description="Extraction confidence")
    reason: str = Field(..., description="Analysis reason")
    fake_indicators: Optional[list[str]] = Field(default_factory=list, description="Suspicious indicators")
    file_name: Optional[str] = Field(None, description="Original file name")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    user_id: Optional[str] = Field(None, description="User identifier")

# Response models
class SaveScanResponse(BaseModel):
    """Response model for successful save"""
    success: bool = True
    message: str
    scan_id: str
    timestamp: str

class ErrorResponse(BaseModel):
    """Response model for errors"""
    success: bool = False
    message: str
    error_code: Optional[str] = None

# Create router
scan_router = APIRouter(prefix="/api/v1", tags=["scans"])

@scan_router.post("/save-scan", response_model=SaveScanResponse, status_code=status.HTTP_201_CREATED)
async def save_scan_result(request: SaveScanRequest) -> SaveScanResponse:
    """
    Save OCR scan result to MongoDB
    
    - **medicine**: Medicine name extracted from OCR
    - **status**: Verification status (Real/Fake/Suspicious)
    - **confidence**: Confidence percentage
    - **batch_number**: Batch number from label (optional)
    - **expiry_date**: Expiry date from label (optional)
    - **extracted_text**: Raw text extracted by OCR
    - **extraction_method**: Method used for extraction
    - **processing_time**: Total processing time
    - **extraction_confidence**: Extraction confidence score (optional)
    - **reason**: Reason for verification result
    - **fake_indicators**: List of suspicious indicators (optional)
    - **file_name**: Original file name (optional)
    - **file_size**: File size in bytes (optional)
    - **user_id**: User identifier (optional)
    """
    try:
        # Validate required fields
        if not request.medicine or not request.status or not request.confidence:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: medicine, status, confidence"
            )
        
        # Validate status value
        valid_statuses = ["real", "fake", "suspicious", "unknown"]
        if request.status.lower() not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        # Prepare scan data
        scan_data = request.dict()
        
        # Save to database using service
        try:
            saved_scan = await scan_service.save_scan_result(
                api_response=scan_data,
                file_info={
                    "filename": request.file_name,
                    "size": request.file_size
                } if request.file_name else None,
                user_id=request.user_id
            )
            
            # Return success response
            return SaveScanResponse(
                success=True,
                message="Scan result saved successfully",
                scan_id=str(saved_scan.id),
                timestamp=saved_scan.timestamp.isoformat()
            )
        except Exception as db_error:
            print(f"Database save failed, but continuing: {db_error}")
            # Return success response even if database fails (for demo purposes)
            import time
            return SaveScanResponse(
                success=True,
                message="Scan result processed (database not available)",
                scan_id=f"local_{int(time.time())}",
                timestamp=time.strftime('%Y-%m-%dT%H:%M:%S')
            )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
        
    except Exception as e:
        # Log error for debugging
        print(f"Error saving scan result: {e}")
        
        # Return generic error response
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save scan result: {str(e)}"
        )

# Scan history endpoints moved to history_router to avoid conflicts

@scan_router.get("/stats")
async def get_scan_statistics() -> Dict[str, Any]:
    """
    Get scan statistics and analytics
    """
    try:
        stats = await scan_service.get_dashboard_stats()
        return stats
        
    except Exception as e:
        print(f"Error getting scan statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve statistics: {str(e)}"
        )

@scan_router.get("/scans/{scan_id}", response_model=ScanResponse)
async def get_scan_by_id(scan_id: str) -> ScanResponse:
    """
    Get specific scan by ID
    
    - **scan_id**: MongoDB ObjectId of the scan
    """
    try:
        scan = await scan_service.get_scan_by_id(scan_id)
        
        if not scan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scan not found"
            )
        
        return scan
        
    except HTTPException:
        raise
        
    except Exception as e:
        print(f"Error getting scan by ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve scan: {str(e)}"
        )

@scan_router.get("/scans/medicine/{medicine_name}", response_model=list[ScanResponse])
async def get_scans_by_medicine(medicine_name: str, limit: int = 20) -> list[ScanResponse]:
    """
    Get scans by medicine name (case-insensitive search)
    
    - **medicine_name**: Medicine name to search for
    - **limit**: Maximum number of results (default: 20)
    """
    try:
        if limit > 50:
            limit = 50
        
        scans = await scan_service.get_medicine_history(medicine_name, limit)
        return scans
        
    except Exception as e:
        print(f"Error getting scans by medicine: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve medicine scans: {str(e)}"
        )

@scan_router.delete("/scans/{scan_id}")
async def delete_scan(scan_id: str) -> Dict[str, Any]:
    """
    Delete scan by ID
    
    - **scan_id**: MongoDB ObjectId of the scan to delete
    """
    try:
        success = await scan_service.delete_scan(scan_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scan not found or already deleted"
            )
        
        return {
            "success": True,
            "message": "Scan deleted successfully",
            "scan_id": scan_id
        }
        
    except HTTPException:
        raise
        
    except Exception as e:
        print(f"Error deleting scan: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete scan: {str(e)}"
        )

@scan_router.post("/scan")
async def scan_medicine_api(file: UploadFile = File(...)):
    """API scan endpoint that forwards to main scan logic"""
    try:
        # Import the main scan function to avoid circular imports
        from main import scan_medicine
        return await scan_medicine(file)
    except Exception as e:
        print(f"Error in scan API endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scan failed: {str(e)}"
        )

@scan_router.get("/trends")
async def get_medicine_trends() -> Dict[str, Any]:
    """
    Get medicine trends - most frequently scanned and most suspicious medicines
    
    Returns:
    - most_frequent: List of medicines with highest scan counts
    - most_suspicious: List of medicines with highest fake/suspicious ratios
    """
    try:
        trends = await scan_service.get_medicine_trends()
        return trends
        
    except Exception as e:
        print(f"Error getting medicine trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve trends: {str(e)}"
        )
