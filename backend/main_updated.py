from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from scan_endpoints import scan_router
import uvicorn

# Create FastAPI app
app = FastAPI(
    title="PillSafe OCR API",
    description="Production-level OCR system for medicine verification",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include scan endpoints
app.include_router(scan_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "PhillSafe OCR API",
        "version": "2.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "PillSafe OCR API",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": {
            "scan": "/api/save-scan",
            "history": "/api/scans",
            "stats": "/api/scans/stats",
            "health": "/health"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
