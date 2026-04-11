#!/usr/bin/env python3
"""
Simple OCR debug script to test your specific image
"""

import pytesseract
from PIL import Image
import cv2
import numpy as np

def test_image_ocr(image_path):
    """Test OCR on a specific image with multiple approaches"""
    print(f"Testing OCR on: {image_path}")
    print("="*60)
    
    try:
        # Load image
        image = Image.open(image_path)
        print(f"Image info: {image.format}, {image.mode}, {image.size}")
        
        # Test 1: Direct OCR on original image
        print("\n1. Direct OCR on original image:")
        try:
            text1 = pytesseract.image_to_string(image)
            print(f"Result: {repr(text1)}")
            print(f"Length: {len(text1.strip())}")
        except Exception as e:
            print(f"Error: {e}")
        
        # Test 2: Convert to RGB first
        print("\n2. Convert to RGB then OCR:")
        try:
            if image.mode != 'RGB':
                rgb_image = image.convert('RGB')
            else:
                rgb_image = image
            text2 = pytesseract.image_to_string(rgb_image)
            print(f"Result: {repr(text2)}")
            print(f"Length: {len(text2.strip())}")
        except Exception as e:
            print(f"Error: {e}")
        
        # Test 3: Grayscale + OCR
        print("\n3. Grayscale then OCR:")
        try:
            gray_image = image.convert('L')
            text3 = pytesseract.image_to_string(gray_image)
            print(f"Result: {repr(text3)}")
            print(f"Length: {len(text3.strip())}")
        except Exception as e:
            print(f"Error: {e}")
        
        # Test 4: OpenCV approach
        print("\n4. OpenCV approach:")
        try:
            # Convert to OpenCV format
            if image.mode != 'RGB':
                image = image.convert('RGB')
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
            
            # Try different preprocessing
            methods = {
                "Original grayscale": gray,
                "Blurred": cv2.GaussianBlur(gray, (3, 3), 0),
                "Threshold": cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
                "Adaptive": cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
            }
            
            for method_name, processed in methods.items():
                print(f"\n  4.{method_name}:")
                try:
                    text = pytesseract.image_to_string(processed)
                    print(f"  Result: {repr(text)}")
                    print(f"  Length: {len(text.strip())}")
                except Exception as e:
                    print(f"  Error: {e}")
                    
        except Exception as e:
            print(f"OpenCV error: {e}")
        
        # Test 5: Different PSM modes
        print("\n5. Different PSM modes:")
        try:
            rgb_image = image.convert('RGB') if image.mode != 'RGB' else image
            psm_modes = [3, 6, 11, 12, 13]
            
            for psm in psm_modes:
                print(f"\n  PSM {psm}:")
                try:
                    text = pytesseract.image_to_string(rgb_image, config=f'--psm {psm}')
                    print(f"  Result: {repr(text)}")
                    print(f"  Length: {len(text.strip())}")
                except Exception as e:
                    print(f"  Error: {e}")
                    
        except Exception as e:
            print(f"PSM testing error: {e}")
        
    except Exception as e:
        print(f"Image loading error: {e}")

if __name__ == "__main__":
    # Test with your uploaded image
    test_image_ocr("med5.jpg")
