# FastAPI Backend Deployment Guide for Render.com

## Overview

This guide explains how to deploy the AI Health Surveillance System FastAPI backend to Render.com with full Tesseract OCR support.

## Prerequisites

- Render.com account
- Git repository with the backend code
- Tesseract OCR support (handled by build.sh)

## Files for Deployment

### 1. build.sh
- **Purpose**: Installs Tesseract OCR and all dependencies
- **Runs during**: Build phase on Render
- **Installs**: Tesseract OCR, language packs, Python dependencies

### 2. render.yaml
- **Purpose**: Render.com deployment configuration
- **Defines**: Service type, environment variables, health checks
- **Configures**: Auto-deploy, scaling, and build settings

### 3. main.py updates
- **Purpose**: Production-ready Tesseract configuration
- **Features**: Linux path detection, fallback handling, CORS for Render
- **Handles**: Render environment detection and error scenarios

## Deployment Steps

### 1. Push to Git Repository
```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### 2. Connect Render.com
1. Go to [Render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Select the repository containing the backend

### 3. Configure Service
- **Name**: ai-health-surveillance-api
- **Environment**: Python 3
- **Build Command**: `./build.sh`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Instance Type**: Free (or paid for production)

### 4. Environment Variables
Set these in Render dashboard:
```
PYTHON_VERSION=3.11
PORT=10000
RENDER=true
```

### 5. Deploy
- Click "Create Web Service"
- Wait for build to complete
- Check deployment logs

## Build Process

The `build.sh` script will:

1. **Update packages**: `apt-get update`
2. **Install Tesseract OCR**: Full installation with language packs
3. **Install dependencies**: Python packages from requirements.txt
4. **Verify installation**: Test Tesseract functionality
5. **Set permissions**: Proper file permissions
6. **Create directories**: Uploads, temp, logs directories

## Tesseract Configuration

### Linux Path Configuration
```python
# Automatically detected in main.py
if os.path.exists('/usr/bin/tesseract'):
    pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'
```

### Language Support
The build script installs these language packs:
- English (eng)
- Hindi (hin)
- Arabic (ara)
- Chinese (chi_sim, chi_tra)
- Japanese (jpn)
- Korean (kor)
- Thai (tha)
- Vietnamese (vie)
- And many more...

### Fallback Handling
If Tesseract fails:
```json
{
  "medicine": "Unknown",
  "status": "unknown", 
  "confidence": "0%",
  "error": "OCR_ENGINE_UNAVAILABLE",
  "fallback_used": true
}
```

## CORS Configuration

### Development Origins
- http://localhost:3000
- http://127.0.0.1:3000
- http://localhost:8001
- http://127.0.0.1:8001

### Production Origins
- https://*.onrender.com
- https://*.render.com
- Your custom domain

## Health Checks

### Health Endpoint
```
GET /health
```

Response:
```json
{
  "message": "Backend is working!",
  "status": "ok", 
  "timestamp": 1234567890
}
```

### Health Check Configuration
- **Path**: `/health`
- **Timeout**: 30 seconds
- **Interval**: 10 seconds
- **Grace Period**: 60 seconds

## API Endpoints

### Core Endpoints
- `POST /api/v1/scan` - Main OCR scanning endpoint
- `POST /api/v1/save-scan` - Save scan results
- `GET /api/v1/scans` - Get scan history
- `GET /api/v1/stats` - Get analytics statistics
- `GET /api/v1/medicines` - Get medicines database

### Test Endpoints
- `GET /health` - Health check
- `GET /test` - Basic connectivity test
- `POST /test-ocr` - OCR functionality test

## Environment Detection

The application automatically detects Render environment:
```python
if os.environ.get('RENDER') == 'true':
    print("[DEPLOYMENT] Detected Render.com environment")
```

## Troubleshooting

### Common Issues

#### 1. Tesseract Not Found
**Error**: `Tesseract not found at /usr/bin/tesseract`
**Solution**: Check build logs for Tesseract installation

#### 2. OCR Fails
**Error**: `OCR_ENGINE_UNAVAILABLE`
**Solution**: Verify Tesseract installation in build logs

#### 3. CORS Issues
**Error**: `CORS policy error`
**Solution**: Check frontend URL in CORS configuration

#### 4. Build Fails
**Error**: Build process fails
**Solution**: Check build.sh permissions and dependencies

### Debugging

#### View Build Logs
1. Go to Render dashboard
2. Select your service
3. Click "Logs" tab
4. Check "Build" logs

#### View Runtime Logs
1. In service dashboard
2. Click "Logs" tab
3. Check "Server" logs

#### Common Log Messages
```
[TESSERACT] Found at: /usr/bin/tesseract
[DEPLOYMENT] Detected Render.com environment
[OCR] Success: Extracted 45 characters
```

## Performance Optimization

### Memory Management
- Image processing with memory limits
- Temporary file cleanup
- Error handling for large files

### Processing Limits
- Maximum file size: 10MB
- Supported formats: JPG, PNG, WEBP
- Processing timeout: 30 seconds

## Security

### Input Validation
- File type validation
- Size limits
- Malicious file detection

### Error Handling
- Graceful degradation
- Informative error messages
- Fallback responses

## Monitoring

### Health Monitoring
- Automatic health checks
- Response time monitoring
- Error rate tracking

### Performance Metrics
- OCR processing time
- Memory usage
- Request success rate

## Scaling

### Free Tier
- 1 instance
- 512MB RAM
- Shared CPU
- 750 hours/month

### Paid Tiers
- Multiple instances
- More RAM/CPU
- Custom domains
- SSL certificates

## Production Checklist

Before going to production:

- [ ] Tesseract OCR installed and working
- [ ] All API endpoints tested
- [ ] CORS configured correctly
- [ ] Health checks passing
- [ ] Environment variables set
- [ ] Error handling tested
- [ ] Performance optimized
- [ ] Security measures in place
- [ ] Monitoring configured

## Support

For deployment issues:
1. Check build logs
2. Verify environment variables
3. Test API endpoints
4. Monitor health checks
5. Review error logs

## Conclusion

The FastAPI backend is now production-ready for Render.com deployment with full Tesseract OCR support, comprehensive error handling, and automatic fallback mechanisms.
