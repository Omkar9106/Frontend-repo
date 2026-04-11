# PillSafe Backend API

Simple FastAPI backend for medicine scanning.

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python main.py
```

## API Endpoint

### POST /scan

Accepts an image file and returns medicine analysis.

**Request:**
- Multipart form data with file upload

**Response:**
```json
{
  "medicine": "Paracetamol",
  "status": "Real",
  "confidence": "90%",
  "reason": "Demo response"
}
```

## Usage

The server runs on `http://127.0.0.1:8000` (or `http://localhost:8000`)

Use tools like Postman or curl to test the API:

```bash
curl -X POST "http://localhost:8000/scan" -F "file=@medicine_image.jpg"
```
