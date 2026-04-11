"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiShield, FiCheckCircle, FiAlertCircle, FiDownload, FiShare2, FiClock, FiBarChart2, FiLoader, FiPackage, FiActivity, FiTrendingUp, FiInfo, FiAlertTriangle, FiList } from "react-icons/fi";
import { CompactAlertBanner } from "../components/AlertBanner";
import { getScanResult, getFullScanHistory } from "../utils/storage";

// API Response interface matching backend exactly
interface ApiResponse {
  medicine: string;
  status: string;
  confidence: string;
  reason: string;
  batch_number: string | null;
  expiry_date: string | null;
  extracted_text: string;
  processing_time: string;
  extraction_confidence?: string;
  fake_indicators?: string[];
  extraction_method?: string;
  timestamp?: string;
  scan_id?: string;
  location?: string;
}

// Scan entry interface for standardized data structure
interface ScanEntry {
  medicine: string;
  status: string;
  confidence: string;
  timestamp: string;
  location: string;
}

// Component state interface
interface ResultState {
  data: ApiResponse | null;
  loading: boolean;
  error: string | null;
  scanHistory: ScanEntry[];
}

export default function ResultPage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [state, setState] = useState<ResultState>({
    data: null,
    loading: true,
    error: null,
    scanHistory: []
  });

  // Load and process data on mount
  useEffect(() => {
    const loadData = () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // Get the most recent scan result
        const scanResult = getScanResult() as unknown as ApiResponse | null;
        const fullHistory = getFullScanHistory() as unknown as ScanEntry[];
        
        if (!scanResult) {
          setState({
            data: null,
            loading: false,
            error: "No scan data found - please scan a medicine first",
            scanHistory: fullHistory
          });
          return;
        }

        console.log("API Response loaded:", scanResult);
        
        // Validate required fields
        if (!scanResult.medicine || !scanResult.status || !scanResult.confidence) {
          throw new Error("Invalid scan data format");
        }

        setState({
          data: scanResult,
          loading: false,
          error: null,
          scanHistory: fullHistory
        });
        
      } catch (error) {
        console.error("Error loading scan data:", error);
        setState({
          data: null,
          loading: false,
          error: "Failed to load scan data. Please try scanning again.",
          scanHistory: []
        });
      }
    };

    const timeoutId = setTimeout(() => {
      setIsLoaded(true);
      loadData();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []); // Run only once on mount

  const getStatusColor = (status: string) => {
    return status.toLowerCase() === 'real' 
      ? 'text-green-400 border-green-400/30 bg-green-400/10' 
      : 'text-red-400 border-red-400/30 bg-red-400/10';
  };

  const getStatusIcon = (status: string) => {
    return status.toLowerCase() === 'real' 
      ? <FiCheckCircle className="w-6 h-6" /> 
      : <FiAlertCircle className="w-6 h-6" />;
  };

  const getConfidenceNumber = (confidence: string) => {
    return parseInt(confidence.replace('%', '')) || 0;
  };

  const getHealthImpactMessage = (status: string, medicine: string) => {
    const isFake = status.toLowerCase() === 'fake' || status.toLowerCase() === 'counterfeit';
    const medicineLower = medicine.toLowerCase();
    
    // Fake medicine messages
    if (isFake) {
      const fakeMessages = [
        "Fake medicines may lead to treatment failure and worsen your condition",
        "Counterfeit drugs can contribute to disease spread and antibiotic resistance",
        "Fake medications may contain harmful substances or incorrect ingredients",
        "Using counterfeit medicines can result in severe health complications",
        "Fake drugs may not contain active ingredients needed for treatment"
      ];
      
      // Specific messages for common medicine types
      if (medicineLower.includes('paracetamol') || medicineLower.includes('acetaminophen')) {
        return "Fake paracetamol may not relieve pain or fever, leading to prolonged discomfort";
      } else if (medicineLower.includes('antibiotic') || medicineLower.includes('amoxicillin') || medicineLower.includes('ciprofloxacin')) {
        return "Fake antibiotics can contribute to antibiotic resistance and treatment failure";
      } else if (medicineLower.includes('insulin') || medicineLower.includes('diabetes')) {
        return "Counterfeit diabetes medications can cause dangerous blood sugar fluctuations";
      } else if (medicineLower.includes('blood pressure') || medicineLower.includes('hypertension')) {
        return "Fake blood pressure medications can lead to uncontrolled hypertension and cardiovascular risks";
      }
      
      return fakeMessages[Math.floor(Math.random() * fakeMessages.length)];
    }
    
    // Authentic medicine messages (positive reinforcement)
    const authenticMessages = [
      "Genuine medicines ensure proper treatment and faster recovery",
      "Authentic medications maintain their intended therapeutic effects",
      "Using verified medicines helps prevent drug resistance and complications",
      "Genuine drugs provide the correct dosage for effective treatment",
      "Authentic medicines meet quality standards for your safety"
    ];
    
    // Specific positive messages for common medicine types
    if (medicineLower.includes('paracetamol') || medicineLower.includes('acetaminophen')) {
      return "Genuine paracetamol provides effective pain and fever relief as expected";
    } else if (medicineLower.includes('antibiotic') || medicineLower.includes('amoxicillin')) {
      return "Authentic antibiotics effectively treat bacterial infections and prevent resistance";
    } else if (medicineLower.includes('insulin') || medicineLower.includes('diabetes')) {
      return "Genuine diabetes medications help maintain stable blood sugar levels";
    } else if (medicineLower.includes('blood pressure') || medicineLower.includes('hypertension')) {
      return "Authentic blood pressure medications effectively control hypertension and reduce heart risks";
    }
    
    return authenticMessages[Math.floor(Math.random() * authenticMessages.length)];
  };

  const downloadReport = () => {
    if (!state.data) return;
    
    const reportData = {
      medicine: state.data.medicine,
      status: state.data.status,
      confidence: state.data.confidence,
      reason: state.data.reason,
      batch_number: state.data.batch_number,
      expiry_date: state.data.expiry_date,
      extracted_text: state.data.extracted_text,
      processing_time: state.data.processing_time,
      extraction_confidence: state.data.extraction_confidence,
      fake_indicators: state.data.fake_indicators,
      extraction_method: state.data.extraction_method,
      health_impact_message: getHealthImpactMessage(state.data.status, state.data.medicine),
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medicine-scan-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareResult = () => {
    if (!state.data || !navigator.share) return;
    
    navigator.share({
      title: `Medicine Scan Result: ${state.data.medicine}`,
      text: `Status: ${state.data.status === 'real' ? 'Authentic' : 'Fake'} - Confidence: ${state.data.confidence}`,
      url: window.location.href
    }).catch(console.error);
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
          {/* Compact Alert Banner */}
          <CompactAlertBanner />
          {state.loading ? (
            <div className="text-center py-16">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-gradient-to-br from-blue-900 to-indigo-900 rounded-full flex items-center justify-center">
                  <FiLoader className="w-16 h-16 text-white animate-spin" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Loading Results...</h2>
              <p className="text-gray-300 text-lg">Analyzing medicine information</p>
            </div>
          ) : state.error ? (
            <div className="text-center py-16">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-full"></div>
                <div className="absolute inset-2 bg-gradient-to-br from-red-900 to-orange-900 rounded-full flex items-center justify-center">
                  <FiAlertCircle className="w-16 h-16 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-red-400 mb-4">Error</h2>
              <p className="text-gray-300 text-lg mb-8">{state.error}</p>
              <button
                onClick={() => router.push('/scan')}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full font-semibold text-lg hover:from-cyan-700 hover:to-blue-700 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25"
              >
                Go to Scanner
              </button>
            </div>
          ) : state.data ? (
            <div className={`space-y-6 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              
              {/* Header Result Card */}
              <div className={`relative overflow-hidden rounded-3xl border-2 ${
                state.data.status.toLowerCase() === 'real' 
                  ? 'bg-gradient-to-br from-green-900/90 via-emerald-900/90 to-green-800/90 border-green-500/30' 
                  : 'bg-gradient-to-br from-red-900/90 via-orange-900/90 to-red-800/90 border-red-500/30'
              } backdrop-blur-lg shadow-2xl`}>
                
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
                
                {/* Status Badge */}
                <div className="absolute top-6 right-6">
                  <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border ${
                    state.data.status.toLowerCase() === 'real'
                      ? 'bg-green-500/20 border-green-400/50 text-green-300'
                      : 'bg-red-500/20 border-red-400/50 text-red-300'
                  }`}>
                    {getStatusIcon(state.data.status)}
                    <span className="font-semibold text-sm">
                      {state.data.status.toLowerCase() === 'real' ? 'AUTHENTIC' : 'COUNTERFEIT'}
                    </span>
                  </div>
                </div>

                {/* Main Content */}
                <div className="relative p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                          state.data.status.toLowerCase() === 'real' 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                            : 'bg-gradient-to-br from-red-500 to-orange-600'
                        }`}>
                          {getStatusIcon(state.data.status)}
                        </div>
                        <div>
                          <h1 className="text-4xl font-bold text-white mb-2">{state.data.medicine}</h1>
                          <p className="text-gray-300">Medicine Verification Result</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confidence Meter */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-300 text-sm font-medium">Confidence Score</span>
                      <span className={`text-2xl font-bold ${
                        state.data.status.toLowerCase() === 'real' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {state.data.confidence}
                      </span>
                    </div>
                    <div className="relative h-6 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur">
                      <div 
                        className={`absolute inset-y-0 left-0 transition-all duration-1500 ease-out rounded-full ${
                          state.data.status.toLowerCase() === 'real' 
                            ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600' 
                            : 'bg-gradient-to-r from-red-500 via-orange-500 to-red-600'
                        }`}
                        style={{ width: `${getConfidenceNumber(state.data.confidence)}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Analysis Summary */}
                  <div className="bg-black/30 rounded-2xl p-4 backdrop-blur">
                    <div className="flex items-start space-x-3">
                      <FiInfo className={`w-5 h-5 mt-0.5 ${
                        state.data.status.toLowerCase() === 'real' ? 'text-green-400' : 'text-red-400'
                      }`} />
                      <div>
                        <h3 className="text-white font-semibold mb-1">Analysis Summary</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">{state.data.reason}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={`relative p-6 border-t ${
                  state.data.status.toLowerCase() === 'real' ? 'border-green-500/20' : 'border-red-500/20'
                } bg-black/20 backdrop-blur`}>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={downloadReport}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25 flex items-center space-x-2"
                    >
                      <FiDownload className="w-4 h-4" />
                      <span>Download Report</span>
                    </button>
                    <button
                      onClick={shareResult}
                      className="px-6 py-3 border-2 border-cyan-400/50 text-cyan-400 rounded-xl hover:bg-cyan-400/10 hover:text-cyan-300 transition-all hover:shadow-lg hover:shadow-cyan-500/25 flex items-center space-x-2"
                    >
                      <FiShare2 className="w-4 h-4" />
                      <span>Share Results</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Health Impact Message */}
              <div className={`relative overflow-hidden rounded-2xl border backdrop-blur-lg ${
                state.data.status.toLowerCase() === 'real' 
                  ? 'bg-gradient-to-br from-green-900/50 via-emerald-900/50 to-green-800/50 border-green-500/20' 
                  : 'bg-gradient-to-br from-red-900/50 via-orange-900/50 to-red-800/50 border-red-500/20'
              }`}>
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      state.data.status.toLowerCase() === 'real' 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                        : 'bg-gradient-to-br from-red-500 to-orange-600'
                    }`}>
                      <FiAlertCircle className={`w-6 h-6 ${
                        state.data.status.toLowerCase() === 'real' ? 'text-white' : 'text-white'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold mb-2 ${
                        state.data.status.toLowerCase() === 'real' ? 'text-green-300' : 'text-red-300'
                      }`}>
                        Health Impact Advisory
                      </h3>
                      <p className={`text-sm leading-relaxed ${
                        state.data.status.toLowerCase() === 'real' ? 'text-green-100' : 'text-red-100'
                      }`}>
                        {getHealthImpactMessage(state.data.status, state.data.medicine)}
                      </p>
                      <div className={`mt-3 text-xs ${
                        state.data.status.toLowerCase() === 'real' ? 'text-green-200/70' : 'text-red-200/70'
                      }`}>
                        {state.data.status.toLowerCase() === 'real' 
                          ? "This medicine has been verified as authentic and safe for use."
                          : "This medicine appears to be counterfeit. Please consult a healthcare professional immediately."
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Medicine Information Card */}
                <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 backdrop-blur-lg rounded-2xl border border-cyan-500/20 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                        <FiPackage className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Medicine Information</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Medicine Name</span>
                          <span className="text-white font-medium">{state.data.medicine}</span>
                        </div>
                      </div>
                      
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Batch Number</span>
                          <span className="text-white font-medium">{state.data.batch_number || "Not Detected"}</span>
                        </div>
                      </div>
                      
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Expiry Date</span>
                          <span className="text-white font-medium">{state.data.expiry_date || "Not Detected"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scan Analytics Card */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-lg rounded-2xl border border-purple-500/20 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <FiActivity className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Scan Analytics</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Processing Time</span>
                          <span className="text-white font-medium">{state.data.processing_time}</span>
                        </div>
                      </div>
                      
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Extraction Method</span>
                          <span className="text-white font-medium capitalize">{state.data.extraction_method || "Unknown"}</span>
                        </div>
                      </div>
                      
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Extraction Confidence</span>
                          <span className="text-white font-medium">{state.data.extraction_confidence || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Details Card */}
                <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 backdrop-blur-lg rounded-2xl border border-emerald-500/20 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                        <FiTrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Verification Details</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Verification Status</span>
                          <span className={`font-medium capitalize ${
                            state.data.status.toLowerCase() === 'real' ? 'text-green-400' : 'text-red-400'
                          }`}>{state.data.status}</span>
                        </div>
                      </div>
                      
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Confidence Level</span>
                          <span className={`font-medium ${
                            state.data.status.toLowerCase() === 'real' ? 'text-green-400' : 'text-red-400'
                          }`}>{state.data.confidence}</span>
                        </div>
                      </div>
                      
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Scan Timestamp</span>
                          <span className="text-white font-medium text-xs">{new Date().toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extracted Text Debug Card */}
              <div className="bg-gradient-to-br from-gray-900/50 to-slate-900/50 backdrop-blur-lg rounded-2xl border border-gray-500/20 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-slate-500 rounded-xl flex items-center justify-center">
                        <FiBarChart2 className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white">OCR Extracted Text</h3>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">Debug View</span>
                  </div>
                  
                  <div className="bg-black/40 rounded-xl p-4 max-h-64 overflow-y-auto">
                    <pre className="text-cyan-300 text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">
                      {state.data.extracted_text || "No text extracted"}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Warning Indicators */}
              {state.data.fake_indicators && state.data.fake_indicators.length > 0 && (
                <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 backdrop-blur-lg rounded-2xl border border-red-500/20 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <FiAlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-red-400">Suspicious Indicators</h3>
                    </div>
                    
                    <div className="space-y-3">
                      {state.data.fake_indicators.map((warning: string, index: number) => (
                        <div key={index} className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                          <div className="flex items-start space-x-3">
                            <FiAlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-red-300 text-sm leading-relaxed">{warning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Scan History Section */}
              {state.scanHistory && state.scanHistory.length > 1 && (
                <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-lg rounded-2xl border border-purple-500/20 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                          <FiList className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Scan History</h3>
                      </div>
                      <span className="text-xs text-gray-400 bg-purple-800/50 px-3 py-1 rounded-full">
                        {state.scanHistory.length} scans
                      </span>
                    </div>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {state.scanHistory.slice(1).map((scan: ScanEntry, index: number) => (
                        <div key={index} className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 hover:bg-purple-900/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  scan.status.toLowerCase() === 'real' 
                                    ? 'bg-green-500/20 border border-green-400/50' 
                                    : 'bg-red-500/20 border border-red-400/50'
                                }`}>
                                  {scan.status.toLowerCase() === 'real' 
                                    ? <FiCheckCircle className="w-4 h-4 text-green-400" /> 
                                    : <FiAlertCircle className="w-4 h-4 text-red-400" />
                                  }
                                </div>
                                <div>
                                  <div className="text-white font-medium">{scan.medicine}</div>
                                  <div className="text-gray-400 text-sm">
                                    {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : 'No timestamp'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-gray-300 text-sm leading-relaxed">
                                Scan from {scan.location}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${
                                scan.status.toLowerCase() === 'real' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {scan.confidence}
                              </div>
                              <div className="text-gray-400 text-xs">
                                confidence
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Footer */}
              <div className="text-center pt-8">
                <button
                  onClick={() => router.push('/scan')}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl font-semibold text-lg hover:from-cyan-700 hover:to-blue-700 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25 flex items-center space-x-2 mx-auto"
                >
                  <FiShield className="w-5 h-5" />
                  <span>Scan Another Medicine</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <h2 className="text-3xl font-bold text-white mb-4">No Data Available</h2>
              <button
                onClick={() => router.push('/scan')}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full font-semibold text-lg hover:from-cyan-700 hover:to-blue-700 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25"
              >
                Go to Scanner
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
