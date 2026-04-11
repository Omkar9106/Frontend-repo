#!/usr/bin/env python3
"""
Test script to verify Tesseract OCR installation and functionality
"""

import sys
import os
import platform
import pytesseract
from PIL import Image, ImageDraw, ImageFont
import numpy as np

def test_tesseract_installation():
    """Test if Tesseract is properly installed"""
    print("="*60)
    print("TESSERACT OCR INSTALLATION TEST")
    print("="*60)
    
    # Check Tesseract availability
    try:
        version = pytesseract.get_tesseract_version()
        print(f"SUCCESS: Tesseract version {version} is installed")
        return True
    except Exception as e:
        print(f"ERROR: Tesseract not available: {e}")
        print("\nINSTALLATION INSTRUCTIONS:")
        
        if platform.system() == "Windows":
            print("1. Download Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki")
            print("2. Install to: C:\\Program Files\\Tesseract-OCR")
            print("3. Add to PATH: C:\\Program Files\\Tesseract-OCR")
        elif platform.system() == "Darwin":  # macOS
            print("Run: brew install tesseract")
        else:  # Linux
            print("Run: sudo apt-get install tesseract-ocr")
        
        return False

def test_basic_ocr():
    """Test basic OCR functionality with a simple test image"""
    print("\n" + "="*60)
    print("BASIC OCR FUNCTIONALITY TEST")
    print("="*60)
    
    try:
        # Create a test image with text
        img = Image.new('RGB', (400, 100), color='white')
        draw = ImageDraw.Draw(img)
        
        # Add text (try to use a font, fallback to default)
        try:
            # Try to use a common font
            if platform.system() == "Windows":
                font = ImageFont.truetype("arial.ttf", 32)
            else:
                font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()
        
        # Draw test text
        test_text = "PARACETAMOL 500MG BATCH: ABC123 EXP: 12/2025"
        draw.text((20, 30), test_text, fill='black', font=font)
        
        # Save test image
        test_image_path = "test_ocr_image.png"
        img.save(test_image_path)
        print(f"Created test image: {test_image_path}")
        
        # Perform OCR
        print("Performing OCR on test image...")
        ocr_result = pytesseract.image_to_string(img)
        
        print(f"Expected: {test_text}")
        print(f"OCR Result: {repr(ocr_result)}")
        
        # Check if OCR worked
        if len(ocr_result.strip()) > 0:
            print("SUCCESS: OCR extracted text from test image")
            
            # Calculate accuracy
            expected_words = set(test_text.lower().split())
            ocr_words = set(ocr_result.lower().split())
            common_words = expected_words.intersection(ocr_words)
            accuracy = len(common_words) / len(expected_words) * 100
            
            print(f"Word accuracy: {accuracy:.1f}% ({len(common_words)}/{len(expected_words)} words)")
            
            if accuracy > 50:
                print("OCR is working reasonably well")
                return True
            else:
                print("WARNING: OCR accuracy is low")
                return False
        else:
            print("ERROR: OCR returned empty text")
            return False
            
    except Exception as e:
        print(f"ERROR: OCR test failed: {e}")
        return False
    finally:
        # Clean up test image
        if os.path.exists("test_ocr_image.png"):
            os.remove("test_ocr_image.png")

def test_different_configs():
    """Test different OCR configurations"""
    print("\n" + "="*60)
    print("OCR CONFIGURATION TESTS")
    print("="*60)
    
    try:
        # Create a simple test image
        img = Image.new('RGB', (300, 80), color='white')
        draw = ImageDraw.Draw(img)
        
        try:
            if platform.system() == "Windows":
                font = ImageFont.truetype("arial.ttf", 24)
            else:
                font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()
        
        draw.text((10, 25), "MEDICINE NAME", fill='black', font=font)
        
        # Test different PSM modes
        configs = [
            '--psm 6',  # Assume uniform block of text
            '--psm 11', # Sparse text
            '--psm 13', # Raw line
        ]
        
        for config in configs:
            print(f"\nTesting config: {config}")
            try:
                result = pytesseract.image_to_string(img, config=config)
                print(f"Result: {repr(result.strip())}")
            except Exception as e:
                print(f"Error with config {config}: {e}")
        
        return True
        
    except Exception as e:
        print(f"Configuration test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("PhillSafe OCR Diagnostic Tool")
    print("This tool will test your Tesseract OCR installation")
    
    # Test 1: Installation
    if not test_tesseract_installation():
        print("\n" + "="*60)
        print("RESULT: Tesseract not properly installed")
        print("Please install Tesseract and try again")
        return False
    
    # Test 2: Basic OCR
    if not test_basic_ocr():
        print("\n" + "="*60)
        print("RESULT: OCR not working properly")
        return False
    
    # Test 3: Different configurations
    test_different_configs()
    
    print("\n" + "="*60)
    print("RESULT: All tests passed!")
    print("Tesseract OCR is working correctly")
    print("="*60)
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
