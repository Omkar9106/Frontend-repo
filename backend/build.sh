#!/bin/bash

# FastAPI Backend Build Script for Render Deployment
# Installs Tesseract OCR and dependencies for production deployment

set -e  # Exit on any error

echo "Starting FastAPI backend build process for Render..."

# Update package lists
echo "Updating package lists..."
apt-get update -y

# Install Tesseract OCR and dependencies
echo "Installing Tesseract OCR..."
apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-osd \
    tesseract-ocr-script-lat \
    tesseract-ocr-script-deva \
    tesseract-ocr-script-arab \
    tesseract-ocr-script-hans \
    tesseract-ocr-script-hant \
    tesseract-ocr-script-jpan \
    tesseract-ocr-script-kore \
    tesseract-ocr-script-thai \
    tesseract-ocr-script-viet \
    tesseract-ocr-script-hang \
    tesseract-ocr-script-hebr \
    tesseract-ocr-script-beng \
    tesseract-ocr-script-taml \
    tesseract-ocr-script-gujr \
    tesseract-ocr-script-guru \
    tesseract-ocr-script-knda \
    tesseract-ocr-script-mlym \
    tesseract-ocr-script-orya \
    tesseract-ocr-script-sinh \
    tesseract-ocr-script-tibt \
    tesseract-ocr-script-mymr \
    tesseract-ocr-script-khmr \
    tesseract-ocr-script-mtei

# Install additional OCR dependencies
echo "Installing additional OCR dependencies..."
apt-get install -y \
    libtesseract-dev \
    libleptonica-dev \
    pkg-config \
    python3-dev \
    build-essential \
    cmake \
    git \
    curl \
    wget \
    unzip

# Install Python dependencies
echo "Installing Python dependencies from requirements.txt..."
if [ -f "requirements.txt" ]; then
    pip install --no-cache-dir -r requirements.txt
else
    echo "Warning: requirements.txt not found, installing basic dependencies..."
    pip install --no-cache-dir \
        fastapi \
        uvicorn[standard] \
        python-multipart \
        python-jose[cryptography] \
        passlib[bcrypt] \
        motor \
        pymongo \
        pydantic \
        pydantic-settings \
        python-dotenv \
        pillow \
        opencv-python \
        pytesseract \
        numpy \
        requests
fi

# Verify Tesseract installation
echo "Verifying Tesseract installation..."
if command -v tesseract &> /dev/null; then
    echo "Tesseract installed successfully at: $(which tesseract)"
    echo "Tesseract version: $(tesseract --version 2>&1 | head -n1)"
else
    echo "Error: Tesseract installation failed"
    exit 1
fi

# Check Tesseract data files
echo "Checking Tesseract data files..."
if [ -d "/usr/share/tesseract-ocr/4.00/tessdata" ]; then
    echo "Tesseract data directory found: /usr/share/tesseract-ocr/4.00/tessdata"
    echo "Available languages:"
    ls /usr/share/tesseract-ocr/4.00/tessdata/ | grep -E '\.traineddata$' | head -10
elif [ -d "/usr/share/tesseract-ocr/tessdata" ]; then
    echo "Tesseract data directory found: /usr/share/tesseract-ocr/tessdata"
    echo "Available languages:"
    ls /usr/share/tesseract-ocr/tessdata/ | grep -E '\.traineddata$' | head -10
else
    echo "Warning: Tesseract data directory not found in standard locations"
fi

# Set permissions for Tesseract
echo "Setting permissions for Tesseract..."
chmod +x /usr/bin/tesseract
chmod -R 755 /usr/share/tesseract-ocr/

# Test Tesseract with a simple command
echo "Testing Tesseract functionality..."
echo "Quick test - Tesseract help output:"
tesseract --help | head -5

# Create necessary directories for the application
echo "Creating application directories..."
mkdir -p uploads
mkdir -p temp
mkdir -p logs

# Set permissions for application directories
chmod 755 uploads temp logs

echo "Build process completed successfully!"
echo "FastAPI backend is ready for deployment with Tesseract OCR support."

# Print environment information
echo "=== Environment Information ==="
echo "Python version: $(python3 --version)"
echo "Pip version: $(pip --version)"
echo "Tesseract version: $(tesseract --version 2>&1 | head -n1)"
echo "Working directory: $(pwd)"
echo "Available disk space: $(df -h / | tail -1 | awk '{print $4}')"
echo "============================="
