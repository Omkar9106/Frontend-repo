"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FiUpload, FiCamera, FiShield, FiZap, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { storeScanResult, getUserLocation, generateScanId } from "../utils/storage";

export default function ScanPage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
    const [scanResult, setScanResult] = useState<'idle' | 'scanning' | 'safe' | 'threat'>('idle');
    const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setUploadedFile(file);
    setUseCamera(false);
    setCameraError(null);
    setScanError(null);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setUseCamera(true);
        setUploadedFile(null);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setCameraError('Camera access was denied. Click the camera icon 📷 in your browser\'s address bar to allow camera permissions, or upload a file instead.');
      } else if (err instanceof Error && err.name === 'NotFoundError') {
        setCameraError('No camera device found. Please check if your device has a camera connected, or upload a file instead.');
      } else if (err instanceof Error && err.name === 'NotSecureError' || location.protocol !== 'https:') {
        setCameraError('Camera access requires a secure connection (HTTPS). Please restart the development server with HTTPS enabled, or upload a file instead.');
      } else {
        setCameraError(`Unable to access camera: ${err instanceof Error ? err.message : 'Unknown error'}. You can still use the file upload option instead.`);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setUseCamera(false);
    }
  };

  const captureFromCamera = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
            setUploadedFile(file);
            stopCamera();
            setCameraError(null);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const performScan = async () => {
    if (!uploadedFile && !useCamera) return;
    
    setScanError(null);
    setScanResult('scanning');
    
    try {
      const formData = new FormData();
      
      if (uploadedFile) {
        formData.append('file', uploadedFile);
        sendScanRequest(formData);
      } else if (videoRef.current) {
        // Capture frame from video and use as image
        const canvas = document.createElement('canvas');
        canvas.width = 640; // Fixed size for faster processing
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          // Use faster blob conversion with quality setting
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
              formData.append('file', file);
              sendScanRequest(formData);
            } else {
              console.error('Failed to capture image');
              setScanResult('idle');
            }
          }, 'image/jpeg', 0.8); // Add quality for faster processing
        }
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScanResult('idle');
    }
  };

  const sendScanRequest = async (formData: FormData) => {
    try {
      // Enhanced debug logging before sending
      console.log("[FRONTEND DEBUG] Sending scan request...");
      console.log("[FRONTEND DEBUG] FormData entries:");
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`[FRONTEND DEBUG] ${key}: File - ${value.name}, ${value.size} bytes, ${value.type}`);
        } else {
          console.log(`[FRONTEND DEBUG] ${key}: ${value}`);
        }
      }
      
      // Validate FormData has file
      const fileEntry = formData.get('file');
      if (!fileEntry) {
        console.error("[FRONTEND ERROR] No file found in FormData");
        throw new Error("No file provided");
      }
      
      if (!(fileEntry instanceof File)) {
        console.error("[FRONTEND ERROR] FormData entry is not a File object:", typeof fileEntry);
        throw new Error("Invalid file data");
      }
      
      console.log("[FRONTEND DEBUG] File validation passed");
      
      // Simple timeout handling - no user interaction during fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      console.log("[FRONTEND DEBUG] Sending fetch request...");
      console.log("[FRONTEND DEBUG] Request URL: /api/v1/scan");
      console.log("[FRONTEND DEBUG] Request method: POST");
      console.log("[FRONTEND DEBUG] Request body type:", formData.constructor.name);
      console.log("[FRONTEND DEBUG] FormData entries count:", formData.entries.length);
      
      const response = await fetch('/api/v1/scan', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Note: Don't set Content-Type header - browser will set multipart/form-data with boundary
      });
      
      clearTimeout(timeoutId);
      
      console.log("[FRONTEND DEBUG] Fetch completed, response received");
      console.log("[FRONTEND DEBUG] Response received:", response.status, response.statusText);
      console.log("[FRONTEND DEBUG] Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FRONTEND ERROR] Backend error:', errorText);
        console.error('[FRONTEND ERROR] Response status:', response.status);
        throw new Error(`Scan request failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('[FRONTEND DEBUG] API Response received:', result);
      console.log('[FRONTEND DEBUG] Response structure:', {
        medicine: result.medicine,
        status: result.status,
        confidence: result.confidence,
        extracted_text_length: result.extracted_text?.length || 0,
        processing_time: result.processing_time
      });
      
      // Get user location for analytics
      const userLocation = await getUserLocation();
      
      // Enhance result with additional analytics data
      const enhancedResult = {
        ...result,
        scan_id: generateScanId(),
        location: userLocation,
        timestamp: new Date().toISOString(),
        file_name: uploadedFile?.name || 'camera_capture.jpg'
      };
      
      // Clear old sessionStorage data before storing new result
      sessionStorage.removeItem("scanResult");
      sessionStorage.setItem("scanResult", JSON.stringify(enhancedResult));
      console.log('Stored in sessionStorage:', JSON.parse(sessionStorage.getItem('scanResult') || '{}'));
      
      // Save to backend database (non-blocking)
      const saveToBackend = async () => {
        try {
          console.log('Saving scan to backend database...');
          
          // Prepare save data with all required fields
          const saveData = {
            medicine: result.medicine || 'Unknown',
            status: result.status || 'unknown',
            confidence: result.confidence || '0%',
            batch_number: result.batch_number || null,
            expiry_date: result.expiry_date || null,
            extracted_text: result.extracted_text || '',
            extraction_method: result.extraction_method || 'ocr',
            processing_time: result.processing_time || '0s',
            extraction_confidence: result.extraction_confidence || null,
            reason: result.reason || 'Scan completed',
            fake_indicators: result.fake_indicators || [],
            file_name: uploadedFile?.name || 'camera_capture.jpg',
            file_size: uploadedFile?.size || null,
            user_id: null
          };
          
          console.log('Save data prepared:', saveData);
          
          const saveResponse = await fetch('/api/v1/save-scan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(saveData)
          });
          
          console.log('Save response status:', saveResponse.status);
          
          if (saveResponse.ok) {
            const saveResult = await saveResponse.json();
            console.log('Scan successfully saved to backend database:', saveResult);
            // Notify dashboard that new scan was added
            const timestamp = Date.now().toString();
            sessionStorage.setItem('newScanAdded', timestamp);
            sessionStorage.setItem('lastScanTimestamp', timestamp);
          } else {
            const errorText = await saveResponse.text();
            console.error('Failed to save scan to backend:', saveResponse.status, errorText);
            console.error('Error details:', errorText);
          }
        } catch (error) {
          console.error('Error saving scan to backend:', error);
        }
      };
      
      // Save to backend in background (don't wait for it)
      saveToBackend();
      
      // Store enhanced scan data using storage utility with fallback
      const stored = storeScanResult(enhancedResult);
      
      // Notify dashboard that new scan was added (multiple methods)
      const notificationTimestamp = Date.now().toString();
      
      // Method 1: Storage event
      window.dispatchEvent(new StorageEvent('newScanAdded', {
        key: 'newScanAdded',
        newValue: notificationTimestamp
      }));
      
      // Method 2: Custom event
      window.dispatchEvent(new CustomEvent('newScan', {
        detail: { timestamp: notificationTimestamp, result }
      }));
      
      // Method 3: Direct storage update
      sessionStorage.setItem('scanResult', JSON.stringify(result));
      
      console.log('Scan completed, notifications sent:', {
        storageEvent: true,
        customEvent: true,
        timestamp: notificationTimestamp
      });
      
      if (stored) {
        // Storage successful, navigate normally
        router.push('/result');
      } else {
        // Storage failed, use URL parameters fallback
        console.warn('Storage not available, using URL parameters fallback');
        router.push(`/result?data=${encodeURIComponent(JSON.stringify(result))}`);
      }
    } catch (error) {
      console.error('API error:', error);
      setScanResult('idle');
      
      // Provide specific error messages
      if (error instanceof Error && error.name === 'AbortError') {
        setScanError('Scan timed out after 20 seconds. Try using smaller, clearer images with good lighting.');
      } else {
        setScanError('Scan failed. Please check your connection and try again.');
      }
    }
  };

  const resetScan = () => {
    setScanResult('idle');
    setUploadedFile(null);
    setCameraError(null);
    setScanError(null);
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-indigo-950 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z" fill="#9C92AC" fillOpacity="0.05"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      
      {/* Main Content */}
      <main className="relative z-10 px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className={`text-center mb-12 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              AI Health Surveillance Scanner
            </h1>
            <p className="text-xl text-gray-300">
              Upload a file or use your camera for instant health surveillance analysis
            </p>
          </div>

          {/* Scan Area */}
          <div className={`transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 backdrop-blur-lg rounded-3xl p-8 border border-cyan-500/20">
              
              {scanResult === 'idle' && (
                <div className="space-y-6">
                  {/* Camera Error Display */}
                  {cameraError && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-200">
                      <div className="flex items-start gap-3">
                        <FiAlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm">{cameraError}</p>
                          <button
                            onClick={() => setCameraError(null)}
                            className="text-xs text-red-300 hover:text-red-200 mt-2 underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Scan Error Display */}
                  {scanError && (
                    <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 text-orange-200">
                      <div className="flex items-start gap-3">
                        <FiAlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm">{scanError}</p>
                          <button
                            onClick={() => setScanError(null)}
                            className="text-xs text-orange-300 hover:text-orange-200 mt-2 underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Upload/Camera Area */}
                  <div
                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                      dragActive 
                        ? 'border-cyan-400 bg-cyan-400/10' 
                        : 'border-cyan-500/30 hover:border-cyan-400/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    {useCamera ? (
                      <div className="space-y-4">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full max-w-md mx-auto rounded-xl bg-black"
                          style={{ transform: 'scaleX(-1)' }}
                        />
                        <div className="flex justify-center gap-4">
                          <button
                            onClick={captureFromCamera}
                            className="px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                          >
                            📸 Capture Photo
                          </button>
                          <button
                            onClick={stopCamera}
                            className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                          >
                            Stop Camera
                          </button>
                        </div>
                      </div>
                    ) : uploadedFile ? (
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                          <FiCheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-white text-lg font-semibold">{uploadedFile.name}</p>
                        <button
                          onClick={() => setUploadedFile(null)}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto">
                          <FiUpload className="w-12 h-12 text-white" />
                        </div>
                        <div>
                          <p className="text-white text-xl font-semibold mb-2">
                            Drag & Drop your file here
                          </p>
                          <p className="text-gray-400 mb-4">or</p>
                          <div className="flex justify-center gap-4">
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full hover:from-cyan-700 hover:to-blue-700 transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25"
                            >
                              Browse Files
                            </button>
                            <button
                              onClick={startCamera}
                              className="px-6 py-3 border-2 border-cyan-400 text-cyan-400 rounded-full hover:bg-cyan-400 hover:text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25"
                            >
                              <FiCamera className="inline-block mr-2" />
                              Use Camera
                            </button>
                          </div>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileInput}
                          className="hidden"
                          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                        />
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="text-center">
                    <button
                      onClick={performScan}
                      disabled={!uploadedFile && !useCamera}
                      className={`px-8 py-4 rounded-full font-semibold text-lg transition-all transform ${
                        uploadedFile || useCamera
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <FiZap className="inline-block mr-2" />
                      Start Security Scan
                    </button>
                  </div>
                </div>
              )}

              {scanResult === 'scanning' && (
                <div className="text-center py-16">
                  <div className="relative w-32 h-32 mx-auto mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full animate-pulse"></div>
                    <div className="absolute inset-2 bg-gradient-to-br from-blue-900 to-indigo-900 rounded-full flex items-center justify-center">
                      <FiShield className="w-16 h-16 text-white animate-spin" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">Scanning...</h2>
                  <p className="text-gray-300 text-lg">Analyzing for security threats</p>
                  <div className="mt-8 flex justify-center space-x-2">
                    <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce animation-delay-200"></div>
                    <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce animation-delay-400"></div>
                  </div>
                </div>
              )}

              {(scanResult === 'safe' || scanResult === 'threat') && (
                <div className="text-center py-16">
                  <div className={`w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center ${
                    scanResult === 'safe' 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                      : 'bg-gradient-to-br from-red-500 to-orange-600'
                  }`}>
                    {scanResult === 'safe' ? (
                      <FiCheckCircle className="w-16 h-16 text-white" />
                    ) : (
                      <FiAlertCircle className="w-16 h-16 text-white" />
                    )}
                  </div>
                  <h2 className={`text-3xl font-bold mb-4 ${
                    scanResult === 'safe' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {scanResult === 'safe' ? '✓ Safe' : '⚠ Threat Detected'}
                  </h2>
                  <p className="text-gray-300 text-lg mb-8">
                    {scanResult === 'safe' 
                      ? 'No security threats found. Your file is safe to use.'
                      : 'Potential security threats detected. Please review the file carefully.'
                    }
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={resetScan}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full hover:from-cyan-700 hover:to-blue-700 transition-all hover:shadow-lg hover:shadow-cyan-500/25"
                    >
                      Scan Another File
                    </button>
                    {scanResult === 'safe' && (
                      <button className="px-6 py-3 border-2 border-green-400 text-green-400 rounded-full hover:bg-green-400 hover:text-white transition-all hover:shadow-lg hover:shadow-green-500/25">
                        Download Report
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
