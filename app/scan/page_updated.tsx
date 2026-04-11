"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FiUpload, FiCamera, FiShield, FiArrowLeft, FiZap, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { storeScanResult } from "../utils/storage";

export default function ScanPage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
    const [scanResult, setScanResult] = useState<'idle' | 'scanning' | 'safe' | 'threat'>('idle');
    const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useCamera, setUseCamera] = useState(false);

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
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setUseCamera(true);
        setUploadedFile(null);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      if (err instanceof Error && err.name === 'NotAllowedError') {
        alert('Camera access denied. Please allow camera permissions in your browser settings to use this feature.');
      } else {
        alert('Unable to access camera. Please check if your device has a camera and try again.');
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

  const performScan = async () => {
    if (!uploadedFile && !useCamera) return;
    
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
      // Simple timeout handling - no user interaction during fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      const response = await fetch('http://127.0.0.1:8000/scan', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`Scan request failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      // Save to MongoDB (non-blocking)
      try {
        const saveResponse = await fetch('http://127.0.0.1:8000/api/save-scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            medicine: result.medicine,
            status: result.status,
            confidence: result.confidence,
            batch_number: result.batch_number,
            expiry_date: result.expiry_date,
            extracted_text: result.extracted_text,
            extraction_method: result.extraction_method || 'unknown',
            processing_time: result.processing_time,
            extraction_confidence: result.extraction_confidence,
            reason: result.reason,
            fake_indicators: result.fake_indicators || [],
            file_name: uploadedFile?.name || 'camera_capture.jpg',
            file_size: uploadedFile?.size || 0,
            user_id: null // Can be added later with authentication
          })
        });

        if (saveResponse.ok) {
          const saveResult = await saveResponse.json();
          console.log('Saved to MongoDB:', saveResult);
        } else {
          console.warn('Failed to save to MongoDB:', saveResponse.status);
        }
      } catch (saveError) {
        console.warn('MongoDB save failed (non-critical):', saveError);
        // Don't fail the scan if MongoDB save fails
      }
      
      // Clear old sessionStorage data before storing new result
      sessionStorage.removeItem("scanResult");
      sessionStorage.setItem("scanResult", JSON.stringify(result));
      console.log('Stored in sessionStorage:', JSON.parse(sessionStorage.getItem('scanResult') || '{}'));
      
      // Store scan data using storage utility with fallback
      const stored = storeScanResult(result);
      
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
        alert('Scan timed out after 20 seconds. For faster processing:\n\nTips:\n- Use smaller, clearer images\n- Ensure good lighting and focus\n- Try images with larger text\n- Consider cropping to medicine label area only');
      } else {
        alert('Scan failed. Please check your connection and try again.');
      }
    }
  };

  const resetScan = () => {
    setScanResult('idle');
    setUploadedFile(null);
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

      {/* Navigation */}
      <nav className={`relative z-10 px-8 py-6 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center space-x-2">
            <FiShield className="w-8 h-8 text-cyan-400" />
            <span className="text-2xl font-bold text-white">AI Health Surveillance System Scanner</span>
          </div>
          <div className="w-20"></div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className={`text-center mb-12 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Security Scanner
            </h1>
            <p className="text-xl text-gray-300">
              Upload a file or use your camera for instant security analysis
            </p>
          </div>

          {/* Scan Area */}
          <div className={`transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 backdrop-blur-lg rounded-3xl p-8 border border-cyan-500/20">
              
              {scanResult === 'idle' && (
                <div className="space-y-6">
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
                          className="w-full max-w-md mx-auto rounded-xl bg-black"
                        />
                        <div className="flex justify-center gap-4">
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
                    {scanResult === 'safe' ? 'â Safe' : 'â Threat Detected'}
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
