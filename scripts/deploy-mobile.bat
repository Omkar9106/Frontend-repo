@echo off
REM AI Health Surveillance System - Mobile Deployment Script
REM This script prepares the application for mobile deployment

echo Starting mobile deployment preparation...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies.
    pause
    exit /b 1
)

REM Create production build
echo Creating production build...
npm run build
if %errorlevel% neq 0 (
    echo Error: Build failed. Please check the error messages above.
    pause
    exit /b 1
)

echo Build successful!

REM Start production server
echo Starting production server...
npm run start

echo.
echo Mobile deployment preparation complete!
echo Your application is now running in production mode.
echo Access it at: http://localhost:3000
echo.
echo Mobile optimization features enabled:
echo - Responsive design for all screen sizes
echo - Touch-friendly navigation
echo - PWA capabilities
echo - Optimized performance
echo - Secure headers
echo - Image optimization
echo.
echo To test on mobile devices:
echo 1. Connect your mobile device to the same network
echo 2. Find your computer's IP address using: ipconfig
echo 3. Access your IP address followed by :3000
echo 4. Test the responsive design and mobile features
echo.
pause
