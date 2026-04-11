from datetime import datetime
from typing import Optional, List, Dict, Any, Annotated
from pydantic import BaseModel, Field, field_validator, ConfigDict, GetJsonSchemaHandler, field_serializer
from pydantic.json_schema import JsonSchemaValue
from bson import ObjectId

class PyObjectId(ObjectId):
    """Custom ObjectId class for Pydantic validation"""
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        return {
            "type": "str",
            "custom_serializer": lambda v: str(v),
            "custom_validator": lambda v: cls.validate(v),
        }
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    
    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema: JsonSchemaValue, handler: GetJsonSchemaHandler) -> JsonSchemaValue:
        return {"type": "string"}

class OCRScanModel(BaseModel):
    """MongoDB document model for OCR scan history"""
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    
    # Medicine information
    medicine: str = Field(..., description="Medicine name extracted from OCR")
    status: str = Field(..., description="Verification status: Real/Fake/Suspicious")
    confidence: str = Field(..., description="Confidence percentage (e.g., '85%')")
    
    # Medicine details
    batch_number: Optional[str] = Field(None, description="Batch number from label")
    expiry_date: Optional[str] = Field(None, description="Expiry date from label")
    
    # OCR and processing details
    extracted_text: str = Field(..., description="Raw text extracted by OCR")
    extraction_method: str = Field(..., description="Method used for extraction")
    processing_time: str = Field(..., description="Total processing time")
    extraction_confidence: Optional[str] = Field(None, description="Extraction confidence score")
    
    # Analysis details
    reason: str = Field(..., description="Reason for verification result")
    fake_indicators: Optional[List[str]] = Field(default_factory=list, description="List of suspicious indicators")
    
    # Metadata
    scan_id: str = Field(..., description="Unique scan identifier")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Scan timestamp")
    location: Optional[str] = Field(None, description="Location where scan was performed")
    user_id: Optional[str] = Field(None, description="User identifier if available")
    file_name: Optional[str] = Field(None, description="Original file name")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "scan_id": "scan_1726035660_a1b2c3d4",
                "medicine": "Paracetamol 500mg",
                "status": "Real",
                "confidence": "92%",
                "batch_number": "ABC123456",
                "expiry_date": "12/2025",
                "extracted_text": "PARACETAMOL 500MG BATCH NO: ABC123456 EXP: 12/2025",
                "extraction_method": "database_match",
                "processing_time": "1.45s",
                "extraction_confidence": "95.5%",
                "reason": "High confidence authentic medicine with valid batch and expiry",
                "fake_indicators": [],
                "timestamp": "2026-04-10T11:21:00.000Z",
                "location": "28.61, 77.20",
                "user_id": "user123",
                "file_name": "medicine_label.jpg",
                "file_size": 1024000
            }
        }
    )
    
    @field_serializer('timestamp', when_used='json')
    def serialize_timestamp(self, value: datetime) -> str:
        return value.isoformat()

class ScanCreateRequest(BaseModel):
    """Request model for creating new scan"""
    scan_id: str
    medicine: str
    status: str
    confidence: str
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    extracted_text: str
    extraction_method: str
    processing_time: str
    extraction_confidence: Optional[str] = None
    reason: str
    fake_indicators: Optional[List[str]] = None
    location: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None

class ScanResponse(BaseModel):
    """Response model for scan data"""
    id: str
    scan_id: str
    medicine: str
    status: str
    confidence: str
    batch_number: Optional[str]
    expiry_date: Optional[str]
    extracted_text: str
    extraction_method: str
    processing_time: str
    extraction_confidence: Optional[str]
    reason: str
    fake_indicators: List[str]
    timestamp: datetime
    location: Optional[str]
    file_name: Optional[str]
    
    @field_serializer('timestamp', when_used='json')
    def serialize_timestamp(self, value: datetime) -> str:
        return value.isoformat()
