#!/bin/bash

# AI Health Surveillance System - Mobile Deployment Script
# This script prepares the application for mobile deployment

echo "Starting mobile deployment preparation..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create production build
echo "Creating production build..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Build successful!"
else
    echo "Error: Build failed. Please check the error messages above."
    exit 1
fi

# Start production server
echo "Starting production server..."
npm run start

echo "Mobile deployment preparation complete!"
echo "Your application is now running in production mode."
echo "Access it at: http://localhost:3000"
echo ""
echo "Mobile optimization features enabled:"
echo "- Responsive design for all screen sizes"
echo "- Touch-friendly navigation"
echo "- PWA capabilities"
echo "- Optimized performance"
echo "- Secure headers"
echo "- Image optimization"
echo ""
echo "To test on mobile devices:"
echo "1. Connect your mobile device to the same network"
echo "2. Access your computer's IP address followed by :3000"
echo "3. Test the responsive design and mobile features"
