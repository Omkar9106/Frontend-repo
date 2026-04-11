from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from history_endpoint import history_router
from scan_endpoints import scan_router
from medicines_endpoint import medicines_router
import time
import asyncio
import cv2
import numpy as np
from PIL import Image
import pytesseract
import io
import os
import re
from datetime import datetime
from typing import Dict, Optional, Tuple
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()

# Include routers
app.include_router(history_router)
app.include_router(scan_router)
app.include_router(medicines_router)

# Configure CORS for development and production
def get_cors_origins():
    """Get allowed origins based on environment"""
    origins = [
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:8001", "http://127.0.0.1:8001",
        "http://localhost:3001", "http://127.0.0.1:3001",
        "http://localhost:3020", "http://127.0.0.1:3020"
    ]
    
    # Add production domains for Render
    if os.environ.get('RENDER') == 'true':
        # Allow all Render subdomains and custom domains
        render_service_url = os.environ.get('RENDER_SERVICE_URL', '')
        if render_service_url:
            origins.append(render_service_url)
            origins.append(render_service_url.replace('https://', 'http://'))  # Also allow HTTP
        
        # Common Render patterns
        origins.extend([
            "https://*.onrender.com",
            "https://*.render.com"
        ])
    
    return origins

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure pytesseract path - CRITICAL FIX
import sys
import platform

# Detect OS and set Tesseract path accordingly
if platform.system() == "Windows":
    # Common Windows installation paths
    possible_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        r'C:\Tesseract-OCR\tesseract.exe'
    ]
    for path in possible_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            print(f"[TESSERACT] Found at: {path}")
            break
    else:
        print("[WARNING] Tesseract not found in common Windows paths")
        print("[INFO] Please install Tesseract OCR from: https://github.com/UB-Mannheim/tesseract/wiki")
elif platform.system() == "Darwin":  # macOS
    if os.path.exists('/usr/local/bin/tesseract'):
        pytesseract.pytesseract.tesseract_cmd = '/usr/local/bin/tesseract'
        print("[TESSERACT] Found at: /usr/local/bin/tesseract")
    else:
        print("[WARNING] Tesseract not found at /usr/local/bin/tesseract")
        print("[INFO] Install with: brew install tesseract")
else:  # Linux
    # Check for Render.com deployment environment
    if os.environ.get('RENDER') == 'true' or os.environ.get('RENDER_SERVICE_ID'):
        print("[DEPLOYMENT] Detected Render.com environment")
    
    # Set Tesseract path for Linux (Render deployment)
    if os.path.exists('/usr/bin/tesseract'):
        pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'
        print("[TESSERACT] Found at: /usr/bin/tesseract")
        
        # Additional check for Tesseract data directory
        tessdata_paths = [
            '/usr/share/tesseract-ocr/4.00/tessdata',
            '/usr/share/tesseract-ocr/tessdata',
            '/usr/share/tessdata'
        ]
        tessdata_found = False
        for path in tessdata_paths:
            if os.path.exists(path):
                os.environ['TESSDATA_PREFIX'] = path.replace('/tessdata', '')
                print(f"[TESSERACT] Tessdata directory found: {path}")
                tessdata_found = True
                break
        
        if not tessdata_found:
            print("[WARNING] Tesseract tessdata directory not found in standard locations")
    else:
        print("[WARNING] Tesseract not found at /usr/bin/tesseract")
        print("[INFO] Install with: sudo apt-get install tesseract-ocr")
        print("[INFO] For Render deployment, ensure build.sh installs Tesseract")

# Test Tesseract availability
try:
    pytesseract.get_tesseract_version()
    print("[TESSERACT] Version check passed")
    TESSERACT_AVAILABLE = True
except Exception as e:
    print(f"[ERROR] Tesseract not available: {e}")
    print("[ERROR] OCR will not work without Tesseract!")
    TESSERACT_AVAILABLE = False

def fallback_ocr_response(image_info: str = "unknown"):
    """Fallback response when Tesseract is not available"""
    return JSONResponse(content={
        "medicine": "Unknown",
        "status": "unknown",
        "confidence": "0%",
        "batch_number": None,
        "expiry_date": None,
        "extracted_text": "",
        "extraction_method": "fallback",
        "processing_time": "0s",
        "extraction_confidence": None,
        "reason": f"OCR service unavailable - Tesseract not installed or not working. Image info: {image_info}",
        "fake_indicators": ["OCR service unavailable"],
        "timestamp": datetime.now().isoformat(),
        "file_name": None,
        "error": "OCR_ENGINE_UNAVAILABLE",
        "fallback_used": True
    })

def safe_ocr_with_fallback(image, image_name: str = "unknown"):
    """Perform OCR with comprehensive fallback handling"""
    if not TESSERACT_AVAILABLE:
        print("[FALLBACK] Using fallback response - Tesseract not available")
        return fallback_ocr_response(image_name)
    
    try:
        # Attempt OCR with Tesseract
        print("[OCR] Attempting Tesseract OCR...")
        text = pytesseract.image_to_string(image)
        
        if text and text.strip():
            print(f"[OCR] Success: Extracted {len(text.strip())} characters")
            return None  # Let normal processing continue
        else:
            print("[OCR] Warning: No text extracted, but Tesseract is working")
            return None  # Let normal processing continue with empty text
            
    except Exception as ocr_error:
        print(f"[OCR] Tesseract failed: {ocr_error}")
        print("[FALLBACK] Using fallback response due to Tesseract error")
        return fallback_ocr_response(image_name)

# Production configuration
@dataclass
class MedicineExtraction:
    name: Optional[str] = None
    confidence: float = 0.0
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    extraction_method: str = "unknown"
    fake_indicators: list = None
    
    def __post_init__(self):
        if self.fake_indicators is None:
            self.fake_indicators = []

@dataclass
class ProcessingMetrics:
    file_read_time: float = 0.0
    image_validation_time: float = 0.0
    preprocessing_time: float = 0.0
    ocr_time: float = 0.0
    cleaning_time: float = 0.0
    extraction_time: float = 0.0
    verification_time: float = 0.0
    total_time: float = 0.0

# Thread pool for performance optimization
executor = ThreadPoolExecutor(max_workers=4)

def preprocess_image(image):
    """Simplified image preprocessing for OCR"""
    try:
        # Step 1: Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Step 2: Resize to reasonable size (max 1000px width)
        height, width = gray.shape
        if width > 1000:
            scale_factor = 1000 / width
            new_width = 1000
            new_height = int(height * scale_factor)
            resized = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        else:
            resized = gray
        
        # Step 3: Apply very light blur to reduce noise
        blurred = cv2.GaussianBlur(resized, (1, 1), 0)
        
        print(f"[DEBUG] Preprocessed: {gray.shape} -> {resized.shape}")
        return blurred
        
    except Exception as e:
        print(f"[ERROR] Image preprocessing error: {e}")
        # Fallback to original grayscale if preprocessing fails
        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

def clean_ocr_text(text):
    """Production-grade text cleaning"""
    try:
        # Remove newlines and extra spaces
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove special characters except letters, numbers, spaces, forward slash, hyphen, colon
        cleaned = re.sub(r'[^A-Za-z0-9\s/\-:]', '', text)
        
        # Normalize text to a single line
        cleaned = cleaned.strip()
        
        return cleaned
    except Exception as e:
        print(f"Text cleaning error: {e}")
        return text.strip()

def calculate_medicine_confidence(medicine_name: str, text: str, method: str) -> float:
    """Calculate confidence score for medicine name extraction"""
    try:
        base_confidence = 0.0
        
        # Method-based confidence
        method_scores = {
            "database_match": 0.9,
            "uppercase_dominant": 0.7,
            "all_uppercase": 0.6,
            "regex_pattern": 0.5
        }
        base_confidence = method_scores.get(method, 0.3)
        
        # Length-based confidence
        if len(medicine_name) >= 8:
            base_confidence += 0.1
        elif len(medicine_name) >= 6:
            base_confidence += 0.05
        
        # Position-based confidence (appears early in text)
        words = text.split()
        if medicine_name in words[:3]:  # In first 3 words
            base_confidence += 0.1
        elif medicine_name in words[:6]:  # In first 6 words
            base_confidence += 0.05
        
        # Case consistency bonus
        if medicine_name.isupper() or medicine_name.istitle():
            base_confidence += 0.05
        
        return min(base_confidence, 1.0)
    except Exception:
        return 0.3

def detect_fake_medicine_indicators(text: str, extraction: MedicineExtraction) -> list:
    """Detect indicators of fake medicine"""
    indicators = []
    text_lower = text.lower()
    
    # Suspicious keywords
    suspicious_keywords = [
        "fake", "replica", "copy", "unauthorized", "counterfeit",
        "imitation", "duplicate", "unlicensed", "illegal", "bogus"
    ]
    
    for keyword in suspicious_keywords:
        if keyword in text_lower:
            indicators.append(f"Suspicious keyword: {keyword}")
    
    # Missing critical information
    if not extraction.name:
        indicators.append("Missing medicine name")
    if not extraction.batch_number:
        indicators.append("Missing batch number")
    if not extraction.expiry_date:
        indicators.append("Missing expiry date")
    
    # Low confidence extraction
    if extraction.confidence < 0.5:
        indicators.append("Low extraction confidence")
    
    # Poor OCR quality indicators
    if len(text.strip()) < 10:
        indicators.append("Very short OCR text")
    
    # Inconsistent formatting
    if extraction.batch_number and len(extraction.batch_number) < 4:
        indicators.append("Suspicious batch number format")
    
    return indicators

def hybrid_medicine_extraction(text: str) -> MedicineExtraction:
    """Hybrid extraction combining regex and keyword scoring"""
    try:
        cleaned_text = clean_ocr_text(text)
        extraction = MedicineExtraction()
        
        # Comprehensive medicine database
        medicine_db = {
            'paracetamol', 'ibuprofen', 'aspirin', 'crocin', 'amoxicillin', 'penicillin',
            'cephalexin', 'azithromycin', 'diclofenac', 'naproxen', 'mefenamic', 'ketorolac',
            'ondansetron', 'domperidone', 'pantoprazole', 'ranitidine', 'metformin',
            'glimepiride', 'sitagliptin', 'pioglitazone', 'atorvastatin', 'simvastatin',
            'rosuvastatin', 'losartan', 'telmisartan', 'amlodipine', 'enalapril',
            'albuterol', 'salbutamol', 'budesonide', 'fluticasone', 'levothyroxine',
            'methylphenidate', 'sertraline', 'fluoxetine', 'ciprofloxacin', 'ofloxacin',
            'levofloxacin', 'clindamycin', 'doxycycline', 'tetracycline', 'erythromycin',
            'clarithromycin', 'cefuroxime', 'cefixime', 'ceftriaxone', 'gabapentin',
            'pregabalin', 'duloxetine', 'venlafaxine', 'escitalopram', 'citalopram',
            'paroxetine', 'bupropion', 'hydrochlorothiazide', 'furosemide',
            'spironolactone', 'metoprolol', 'propranolol', 'atenolol', 'carvedilol',
            'bisoprolol', 'warfarin', 'clopidogrel', 'ticagrelor', 'prasugrel',
            'digoxin', 'insulin', 'glargine', 'lispro', 'aspart', 'detemir', 'degludec'
        }
        
        words = cleaned_text.split()
        
        # Method 1: Direct database match
        for word in words:
            if len(word) >= 4 and word.lower() in medicine_db:
                extraction.name = word.title()
                extraction.confidence = calculate_medicine_confidence(word.title(), text, "database_match")
                extraction.extraction_method = "database_match"
                break
        
        # Method 2: Uppercase dominant scoring
        if not extraction.name:
            best_score = 0
            best_word = None
            for word in words:
                if len(word) >= 6 and word.isalpha():
                    upper_count = sum(1 for c in word if c.isupper())
                    score = upper_count / len(word)
                    if score >= 0.75 and score > best_score:
                        best_score = score
                        best_word = word
            
            if best_word:
                extraction.name = best_word.title()
                extraction.confidence = calculate_medicine_confidence(best_word.title(), text, "uppercase_dominant")
                extraction.extraction_method = "uppercase_dominant"
        
        # Method 3: All uppercase fallback
        if not extraction.name:
            for word in words:
                if len(word) >= 5 and word.isupper() and word.isalpha():
                    extraction.name = word.title()
                    extraction.confidence = calculate_medicine_confidence(word.title(), text, "all_uppercase")
                    extraction.extraction_method = "all_uppercase"
                    break
        
        # Batch number extraction (enhanced)
        batch_patterns = [
            r'(?:BATCH\s*NO?\.?|LOT\s*NO?\.?|B\.?NO\.?|BATCH|LOT|B\.?NO|BN)\s*[:#\-]?\s*([A-Z0-9]{4,})',
            r'(?:BATCH\s*NUMBER|LOT\s*NUMBER|B\s*NUMBER)\s*[:#\-]?\s*([A-Z0-9]{4,})',
            r'(?:BATCH|LOT|BATCH\s*NO|LOT\s*NO)\s*([A-Z0-9]{4,})',
            r'B\.?NO\s*[:#\-]?\s*([A-Z0-9]{4,})',
            r'\b([A-Z]{2,}\d{2,}[A-Z0-9]*)\b',
            r'\b([A-Z0-9]{6,})\b'
        ]
        
        for pattern in batch_patterns:
            matches = re.findall(pattern, cleaned_text, re.IGNORECASE)
            for match in matches:
                candidate = match.strip().upper()
                if len(candidate) >= 4 and not candidate.isdigit():
                    extraction.batch_number = candidate
                    break
            if extraction.batch_number:
                break
        
        # Expiry date extraction (enhanced)
        expiry_patterns = [
            r'(?:EXP\.?|EXPIRY|EXP|MFG/EXP|USE\s*BY|BEST\s*BEFORE|EXPIRES)\s*[:/\\]?\s*(\d{1,2}[/-]\d{4})',
            r'(?:EXP\.?|EXPIRY|EXP|MFG/EXP|USE\s*BY)\s*[:/\\]?\s*(\d{1,2}[/-]\d{2})',
            r'(?:EXP\.?|EXPIRY|EXP|MFG/EXP|USE\s*BY)\s*[:/\\]?\s*(\d{4})',
            r'(?:EXP\.?|EXPIRY|EXP|MFG/EXP|USE\s*BY)\s*[:/\\]?\s*([A-Za-z]{3,9}\s+\d{4})',
            r'\b(\d{1,2}[/-]\d{2,4})\b',
            r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[-/]?\s*\d{2,4}\b',
            r'\b(?:0[1-9]|1[0-2])[-/](?:20)?\d{2}\b'
        ]
        
        for pattern in expiry_patterns:
            matches = re.findall(pattern, cleaned_text, re.IGNORECASE)
            for match in matches:
                candidate = match.strip()
                if re.match(r'^\d{1,2}[/-]\d{2,4}$', candidate) or \
                   re.match(r'^[A-Za-z]{3,9}\s+\d{4}$', candidate) or \
                   (candidate.isdigit() and len(candidate) == 4):
                    extraction.expiry_date = candidate
                    break
            if extraction.expiry_date:
                break
        
        # Detect fake medicine indicators
        extraction.fake_indicators = detect_fake_medicine_indicators(text, extraction)
        
        return extraction
        
    except Exception as e:
        print(f"Hybrid extraction error: {e}")
        return MedicineExtraction(extraction_method="error")

def production_verify_authenticity(extraction: MedicineExtraction, text: str) -> Dict:
    """Production-level authenticity verification"""
    try:
        confidence_score = 50  # Base score
        
        # Information completeness scoring
        if extraction.name:
            confidence_score += 15
            if extraction.confidence > 0.7:
                confidence_score += 10
        
        if extraction.batch_number:
            confidence_score += 15
            # Batch number format validation
            if len(extraction.batch_number) >= 6:
                confidence_score += 5
        
        if extraction.expiry_date:
            confidence_score += 15
            # Expiry date format validation
            if re.match(r'^\d{1,2}[/-]\d{4}$', extraction.expiry_date):
                confidence_score += 5
        
        # AI Health Surveillance System - counterfeit detection
        fake_penalty = len(extraction.fake_indicators) * 10
        confidence_score -= fake_penalty
        
        # Quality indicators
        text_lower = text.lower()
        quality_indicators = ["gmp", "iso", "certified", "approved", "licensed", "fda", "who"]
        for indicator in quality_indicators:
            if indicator in text_lower:
                confidence_score += 3
        
        # Extraction method confidence
        method_scores = {
            "database_match": 10,
            "uppercase_dominant": 5,
            "all_uppercase": 3,
            "regex_pattern": 2,
            "error": -10
        }
        confidence_score += method_scores.get(extraction.extraction_method, 0)
        
        # Clamp confidence score
        confidence_score = max(0, min(99, confidence_score))
        
        # Determine status
        status = "Real" if confidence_score >= 70 else "Fake"
        
        # Generate reason
        if status == "Real":
            if confidence_score >= 85:
                reason = "High confidence authentic medicine"
            else:
                reason = "Likely authentic medicine"
        else:
            if extraction.fake_indicators:
                reason = f"Suspicious indicators: {', '.join(extraction.fake_indicators[:2])}"
            else:
                reason = "Insufficient information for verification"
        
        return {
            "status": status,
            "confidence": f"{confidence_score}%",
            "reason": reason,
            "fake_indicators": extraction.fake_indicators,
            "extraction_confidence": f"{extraction.confidence * 100:.1f}%"
        }
        
    except Exception as e:
        print(f"Verification error: {e}")
        return {
            "status": "Fake",
            "confidence": "0%",
            "reason": "Verification processing failed",
            "fake_indicators": ["Processing error"],
            "extraction_confidence": "0%"
        }

@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint that doesn't require database"""
    return {"message": "Backend is working!", "status": "ok", "timestamp": time.time()}

@app.post("/test-ocr")
async def test_ocr_simple(file: UploadFile = File(...)):
    """Simple OCR test endpoint - bypass all preprocessing"""
    try:
        print("="*60)
        print("SIMPLE OCR TEST")
        print(f"File: {file.filename}, Size: {file.size}")
        print("="*60)
        
        # Read file
        contents = await file.read()
        print(f"Read {len(contents)} bytes")
        
        # Open with PIL
        image = Image.open(io.BytesIO(contents))
        print(f"Image: {image.format}, {image.mode}, {image.size}")
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            print(f"Converting from {image.mode} to RGB")
            image = image.convert('RGB')
        
        # Direct OCR - no preprocessing
        print("Attempting direct OCR...")
        text = pytesseract.image_to_string(image)
        print(f"OCR Result: {repr(text)}")
        print(f"Length: {len(text.strip())}")
        
        # Try with different configs if empty
        if not text.strip():
            print("Trying different configurations...")
            configs = ['--psm 6', '--psm 11', '--psm 3', '--psm 13']
            for config in configs:
                try:
                    result = pytesseract.image_to_string(image, config=config)
                    print(f"Config {config}: {repr(result)}")
                    if len(result.strip()) > len(text.strip()):
                        text = result
                except Exception as e:
                    print(f"Config {config} failed: {e}")
        
        return JSONResponse({
            "success": True,
            "filename": file.filename,
            "image_info": {
                "format": image.format,
                "mode": image.mode,
                "size": image.size
            },
            "extracted_text": text,
            "text_length": len(text.strip()),
            "raw_result": repr(text)
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "extracted_text": "",
            "text_length": 0
        })

@app.post("/scan")
async def scan_medicine(file: UploadFile = File(...)):
    """Production-level OCR scan endpoint with hybrid extraction"""
    start_time = time.time()
    metrics = ProcessingMetrics()
    
    # Initialize default response values
    default_response = {
        "medicine": "Not Found",
        "status": "Fake",
        "confidence": "0%",
        "reason": "OCR processing failed",
        "batch_number": None,
        "expiry_date": None,
        "extracted_text": "",
        "processing_time": "0.00s",
        "extraction_confidence": "0%",
        "fake_indicators": []
    }
    
    # Enhanced debug logging
    print("="*70)
    print("PILLSAFE PRODUCTION OCR SCAN")
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Filename: {file.filename}")
    print(f"Content-Type: {file.content_type}")
    print(f"File Size: {file.size if hasattr(file, 'size') else 'Unknown'}")
    print(f"Tesseract Available: {TESSERACT_AVAILABLE}")
    print("="*70)
    
    # Additional file debug info
    if hasattr(file, 'file'):
        print(f"[DEBUG] File object type: {type(file.file)}")
    if hasattr(file, 'spool_max_size'):
        print(f"[DEBUG] Spool max size: {file.spool_max_size}")
    
    try:
        # Step 1: File reading with metrics and enhanced debugging
        file_read_start = time.time()
        
        # Reset file pointer if needed
        if hasattr(file, 'file') and hasattr(file.file, 'seek'):
            try:
                file.file.seek(0)
                print("[DEBUG] File pointer reset to beginning")
            except Exception as seek_error:
                print(f"[DEBUG] Could not reset file pointer: {seek_error}")
        
        contents = await file.read()
        metrics.file_read_time = time.time() - file_read_start
        
        print(f"[PERF] File read: {metrics.file_read_time:.3f}s ({len(contents)} bytes)")
        print(f"[DEBUG] Content type check: {type(contents)}")
        print(f"[DEBUG] Content preview (first 100 bytes): {contents[:100] if len(contents) > 0 else 'Empty'}")
        
        if not contents:
            print("[ERROR] Empty file received")
            default_response["reason"] = "File is empty"
            return JSONResponse(content=default_response)
        
        # Step 2: Enhanced image validation with detailed debugging
        image_validate_start = time.time()
        try:
            print("[DEBUG] Attempting to open image with PIL...")
            image = Image.open(io.BytesIO(contents))
            print(f"[DEBUG] PIL Image opened successfully")
            print(f"[DEBUG] Image format: {image.format}")
            print(f"[DEBUG] Image mode: {image.mode}")
            print(f"[DEBUG] Image size: {image.size}")
            
            # Verify image
            image.verify()
            print("[DEBUG] Image verification passed")
            
            # Reopen after verification (verify() closes the image)
            image = Image.open(io.BytesIO(contents))
            print("[DEBUG] Image reopened after verification")
            
            metrics.image_validation_time = time.time() - image_validate_start
            print(f"[PERF] Image validation: {metrics.image_validation_time:.3f}s")
            
        except Exception as img_error:
            print(f"[ERROR] Image validation failed: {img_error}")
            print(f"[DEBUG] Error type: {type(img_error)}")
            print(f"[DEBUG] Error details: {str(img_error)}")
            
            # Try to get more info about the content
            if len(contents) > 0:
                print(f"[DEBUG] Content starts with: {contents[:50].hex()}")
                print(f"[DEBUG] Content ends with: {contents[-50:].hex()}")
            
            default_response["reason"] = f"Invalid image: {str(img_error)}"
            return JSONResponse(content=default_response)
        
        # Step 3: Optimized preprocessing with metrics
        preprocess_start = time.time()
        try:
            print("[DEBUG] Starting image preprocessing...")
            print(f"[DEBUG] Original image mode: {image.mode}")
            
            # Convert image to RGB first (handles palette mode, grayscale, etc.)
            if image.mode != 'RGB':
                print(f"[DEBUG] Converting from {image.mode} to RGB")
                image = image.convert('RGB')
            
            # Convert to OpenCV format
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            print(f"[DEBUG] Converted to OpenCV format: {opencv_image.shape}")
            
            processed_image = preprocess_image(opencv_image)
            print(f"[DEBUG] Preprocessed image shape: {processed_image.shape}")
            
            metrics.preprocessing_time = time.time() - preprocess_start
            print(f"[PERF] Preprocessing: {metrics.preprocessing_time:.3f}s")
        except Exception as preprocess_error:
            print(f"[ERROR] Preprocessing failed: {preprocess_error}")
            print(f"[DEBUG] Preprocessing error type: {type(preprocess_error)}")
            default_response["reason"] = f"Image preprocessing failed: {str(preprocess_error)}"
            return JSONResponse(content=default_response)
        
        # Step 4: OCR with performance optimization
        ocr_start = time.time()
        extracted_text = ""
        
        if not TESSERACT_AVAILABLE:
            print("[ERROR] Tesseract not available")
            default_response["reason"] = "OCR engine not available"
            return JSONResponse(content=default_response)
        
        try:
            print("[DEBUG] Starting OCR processing...")
            print(f"[DEBUG] Processed image dtype: {processed_image.dtype}")
            print(f"[DEBUG] Processed image shape: {processed_image.shape}")
            print(f"[DEBUG] Processed image min/max: {processed_image.min()}/{processed_image.max()}")
            
            # Try multiple OCR configurations
            configs = [
                '--oem 3 --psm 6',  # Assume uniform block of text
                '--oem 3 --psm 11', # Sparse text
                '--oem 3 --psm 13', # Raw line
                '--oem 3 --psm 3',  # Fully automatic
            ]
            
            extracted_text = ""
            best_result = ""
            
            for i, config in enumerate(configs):
                print(f"[DEBUG] Trying OCR config {i+1}/{len(configs)}: {config}")
                
                try:
                    result = pytesseract.image_to_string(processed_image, config=config)
                    print(f"[DEBUG] Config {i+1} result length: {len(result)}")
                    print(f"[DEBUG] Config {i+1} result: {repr(result)}")
                    
                    # Return the first successful result with meaningful text
                    if len(result.strip()) > 0 and len(result.strip()) >= 3:
                        extracted_text = result
                        print(f"[DEBUG] Using first successful result from config {i+1}")
                        break
                    elif len(result.strip()) > len(best_result.strip()):
                        best_result = result
                        print(f"[DEBUG] New best result from config {i+1}")
                        
                except Exception as e:
                    print(f"[DEBUG] Config {i+1} failed: {e}")
            
            # If no meaningful text found, use the best result
            if not extracted_text:
                extracted_text = best_result
            
            # If still no text, try with original image (no preprocessing)
            if not extracted_text.strip():
                print("[DEBUG] Trying OCR with original image (no preprocessing)...")
                try:
                    original_gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
                    extracted_text = pytesseract.image_to_string(original_gray, config='--oem 3 --psm 6')
                    print(f"[DEBUG] Original image OCR result length: {len(extracted_text)}")
                    print(f"[DEBUG] Original image OCR result: {repr(extracted_text)}")
                except Exception as e:
                    print(f"[DEBUG] Original image OCR failed: {e}")
            
            metrics.ocr_time = time.time() - ocr_start
            print(f"[PERF] OCR processing: {metrics.ocr_time:.3f}s")
            print(f"[OCR] Extracted {len(extracted_text.strip())} chars, {len(extracted_text.split())} words")
            print(f"[DEBUG] OCR raw result: {repr(extracted_text)}")
            
            # Check if OCR actually extracted meaningful text
            if not extracted_text.strip():
                print("[WARNING] OCR returned empty or whitespace-only text")
                print("[DEBUG] This might indicate image quality issues or text not recognizable")
                print("[DEBUG] Try using a clearer image with larger, more readable text")
            elif len(extracted_text.strip()) < 3:
                print("[WARNING] OCR extracted very little text - might be image quality issue")
            else:
                print("[DEBUG] OCR appears to have extracted meaningful text")
                
        except Exception as ocr_error:
            metrics.ocr_time = time.time() - ocr_start
            print(f"[ERROR] OCR failed after {metrics.ocr_time:.3f}s: {ocr_error}")
            print(f"[DEBUG] OCR error type: {type(ocr_error)}")
            print(f"[DEBUG] OCR error details: {str(ocr_error)}")
            
            # Check if it's a Tesseract-specific error
            if "tesseract" in str(ocr_error).lower():
                print("[DEBUG] Tesseract-specific error detected")
                print("[DEBUG] Check if Tesseract is properly installed and in PATH")
            
            extracted_text = ""
        
        # Log OCR output
        print("="*70)
        print("RAW OCR OUTPUT:")
        print(repr(extracted_text))
        print("="*70)
        
        # Step 5: Text cleaning with metrics
        if not extracted_text.strip():
            print("[WARNING] No text extracted from image")
            default_response["reason"] = "No text could be extracted from image"
            default_response["extracted_text"] = extracted_text
            metrics.total_time = time.time() - start_time
            default_response["processing_time"] = f"{metrics.total_time:.2f}s"
            return JSONResponse(content=default_response)
        
        clean_start = time.time()
        cleaned_text = clean_ocr_text(extracted_text)
        metrics.cleaning_time = time.time() - clean_start
        print(f"[PERF] Text cleaning: {metrics.cleaning_time:.3f}s")
        
        print("="*70)
        print("CLEANED TEXT:")
        print(repr(cleaned_text))
        print("="*70)
        
        # Step 6: Hybrid extraction with metrics
        extract_start = time.time()
        try:
            extraction = hybrid_medicine_extraction(extracted_text)
            metrics.extraction_time = time.time() - extract_start
            print(f"[PERF] Hybrid extraction: {metrics.extraction_time:.3f}s")
            print(f"[EXTRACTION] Method: {extraction.extraction_method}")
            print(f"[EXTRACTION] Confidence: {extraction.confidence:.2f}")
        except Exception as extract_error:
            metrics.extraction_time = time.time() - extract_start
            print(f"[ERROR] Extraction failed: {extract_error}")
            extraction = MedicineExtraction(extraction_method="error")
        
        # Step 7: Production verification with metrics
        verify_start = time.time()
        try:
            verification_result = production_verify_authenticity(extraction, extracted_text)
            metrics.verification_time = time.time() - verify_start
            print(f"[PERF] Verification: {metrics.verification_time:.3f}s")
        except Exception as verify_error:
            metrics.verification_time = time.time() - verify_start
            print(f"[ERROR] Verification failed: {verify_error}")
            verification_result = {
                "status": "Fake",
                "confidence": "0%",
                "reason": "Verification processing failed",
                "fake_indicators": ["Processing error"],
                "extraction_confidence": "0%"
            }
        
        # Log extraction results
        print("="*70)
        print("EXTRACTION RESULTS:")
        print(f"Medicine: {extraction.name or 'Not Found'}")
        print(f"Batch: {extraction.batch_number or 'Not Found'}")
        print(f"Expiry: {extraction.expiry_date or 'Not Found'}")
        print(f"Fake Indicators: {len(extraction.fake_indicators)}")
        print("="*70)
        print("VERIFICATION RESULTS:")
        print(f"Status: {verification_result.get('status')}")
        print(f"Confidence: {verification_result.get('confidence')}")
        print(f"Reason: {verification_result.get('reason')}")
        print("="*70)
        
        # Calculate total metrics
        metrics.total_time = time.time() - start_time
        
        # Performance breakdown
        print("="*70)
        print("PERFORMANCE BREAKDOWN:")
        print(f"  File read: {metrics.file_read_time:.3f}s")
        print(f"  Image validation: {metrics.image_validation_time:.3f}s")
        print(f"  Preprocessing: {metrics.preprocessing_time:.3f}s")
        print(f"  OCR: {metrics.ocr_time:.3f}s")
        print(f"  Cleaning: {metrics.cleaning_time:.3f}s")
        print(f"  Extraction: {metrics.extraction_time:.3f}s")
        print(f"  Verification: {metrics.verification_time:.3f}s")
        print(f"  TOTAL: {metrics.total_time:.3f}s")
        print("="*70)
        print("PILLSAFE SCAN COMPLETED")
        print("="*70)
        
        # Generate unique scan ID
        import uuid
        scan_id = f"scan_{int(time.time())}_{str(uuid.uuid4())[:8]}"
        
        # Build production response
        production_response = {
            "medicine": extraction.name or "Not Found",
            "status": verification_result.get("status", "Fake"),
            "confidence": verification_result.get("confidence", "0%"),
            "reason": verification_result.get("reason", "Analysis completed"),
            "batch_number": extraction.batch_number,
            "expiry_date": extraction.expiry_date,
            "extracted_text": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
            "processing_time": f"{metrics.total_time:.2f}s",
            "extraction_confidence": verification_result.get("extraction_confidence", "0%"),
            "fake_indicators": verification_result.get("fake_indicators", []),
            "extraction_method": extraction.extraction_method,
            "scan_id": scan_id,
            "timestamp": datetime.now().isoformat(),
            "location": "Unknown"  # Will be set by frontend
        }
        
        # Async save to MongoDB (non-blocking)
        try:
            import asyncio
            from scan_service import scan_service
            
            # Create background task for database save
            async def save_to_database():
                try:
                    await scan_service.save_scan_result(
                        api_response=production_response,
                        file_info={
                            "filename": file.filename,
                            "size": len(contents)
                        } if file.filename else None,
                        user_id=None  # Can be added later with authentication
                    )
                    print("[DB] Scan result saved to MongoDB successfully")
                except Exception as db_error:
                    print(f"[DB ERROR] Failed to save to MongoDB: {db_error}")
            
            # Run database save in background without blocking response
            asyncio.create_task(save_to_database())
            
        except ImportError:
            print("[WARNING] MongoDB service not available - scan not saved to database")
        except Exception as bg_error:
            print(f"[WARNING] Background save failed: {bg_error}")
        
        return JSONResponse(content=production_response)
        
    except Exception as e:
        metrics.total_time = time.time() - start_time
        print(f"[CRITICAL ERROR] Scan failed after {metrics.total_time:.3f}s: {e}")
        print("="*70)
        print("PILLSAFE SCAN FAILED")
        print("="*70)
        
        # Production error response
        error_response = {
            "medicine": "Not Found",
            "status": "Fake",
            "confidence": "0%",
            "reason": f"Processing error: {str(e)}",
            "batch_number": None,
            "expiry_date": None,
            "extracted_text": "",
            "processing_time": f"{metrics.total_time:.2f}s",
            "extraction_confidence": "0%",
            "fake_indicators": ["Processing error"],
            "extraction_method": "error"
        }
        return JSONResponse(content=error_response)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
