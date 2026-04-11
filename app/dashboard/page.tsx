"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiAlertCircle, FiRefreshCw, FiTrendingUp, FiActivity, FiShield, FiAlertTriangle } from "react-icons/fi";
import { getFullScanHistory } from "../utils/storage";

// API Response interface
interface ScanHistory {
  id: string;
  medicine: string;
  status: string;
  confidence: string;
  batch_number: string | null;
  expiry_date: string | null;
  extracted_text: string;
  extraction_method: string;
  processing_time: string;
  extraction_confidence: string | null;
  reason: string;
  fake_indicators: string[];
  timestamp: string;
  file_name: string | null;
}

interface TrendData {
  medicine: string;
  scan_count?: number;
  total_scans?: number;
  fake_scans?: number;
  suspicious_scans?: number;
  suspicious_ratio?: number;
  avg_confidence: number;
  latest_scan: string;
}

interface Trends {
  most_frequent: TrendData[];
  most_suspicious: TrendData[];
  last_updated: string;
}

interface StorageScanData {
  scan_id?: string | number;
  medicine?: string;
  status?: string;
  confidence?: string | number;
  timestamp?: string;
  location?: string;
}

interface BackendScanData {
  _id?: string;
  id?: string;
  medicine?: string;
  status?: string;
  confidence?: string;
  batch_number?: string | null;
  expiry_date?: string | null;
  extracted_text?: string;
  extraction_method?: string;
  processing_time?: string;
  extraction_confidence?: string | null;
  reason?: string;
  fake_indicators?: string[];
  timestamp?: string;
  file_name?: string | null;
}

interface DashboardState {
  scans: ScanHistory[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  filteredScans: ScanHistory[];
  stats: {
    totalScans: number;
    realScans: number;
    fakeScans: number;
    suspiciousScans: number;
    avgConfidence: number;
  };
  trends: Trends;
  dataSource: 'backend' | 'local' | 'unknown';
}

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<DashboardState>({
    scans: [],
    loading: true,
    error: null,
    searchTerm: "",
    filteredScans: [],
    stats: {
      totalScans: 0,
      realScans: 0,
      fakeScans: 0,
      suspiciousScans: 0,
      avgConfidence: 0
    },
    trends: {
      most_frequent: [],
      most_suspicious: [],
      last_updated: ""
    },
    dataSource: 'unknown'
  });

  const fetchScanHistory = useCallback(async () => {
    try {
      // Use setTimeout to make setState asynchronous
      setTimeout(() => {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }, 0);
      
      // Try to fetch from backend API first using proxy
      console.log("Loading scan history from backend API via proxy");
      try {
        const response = await fetch('/api/proxy?path=/api/v1/scans?limit=100');
        if (response.ok) {
          const backendScans = await response.json();
          console.log("Backend scans loaded:", backendScans.length);
          
          setTimeout(() => {
            setState(prev => ({
              ...prev,
              scans: (backendScans as BackendScanData[]).map((scan) => ({
                id: scan.id || String(scan._id || ''),
                medicine: scan.medicine || 'Unknown',
                status: scan.status || 'unknown',
                confidence: scan.confidence || '0%',
                batch_number: scan.batch_number || null,
                expiry_date: scan.expiry_date || null,
                extracted_text: scan.extracted_text || '',
                extraction_method: scan.extraction_method || 'backend',
                processing_time: scan.processing_time || 'N/A',
                extraction_confidence: scan.extraction_confidence || null,
                reason: scan.reason || 'Backend scan',
                fake_indicators: scan.fake_indicators || [],
                timestamp: scan.timestamp || new Date().toISOString(),
                file_name: scan.file_name || 'backend-scan'
              })),
              error: null,
              loading: false,
              dataSource: 'backend'
            }));
          }, 0);
          return;
        }
      } catch (backendError) {
        console.log("Backend fetch failed, falling back to local storage:", backendError);
      }
      
      // Fallback to local storage
      console.log("Loading scan history from local storage (fallback)");
      const localHistory = getFullScanHistory();
      
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          scans: localHistory.map((scan, index) => ({
            id: String(scan.scan_id || `local-${index}`),
            medicine: String(scan.medicine || ''),
            status: String(scan.status || ''),
            confidence: String(scan.confidence || ''),
            batch_number: null,
            expiry_date: null,
            extracted_text: '',
            extraction_method: 'local',
            processing_time: 'N/A',
            extraction_confidence: null,
            reason: `Scan from ${scan.location || 'Pune'}`,
            fake_indicators: [],
            timestamp: String(scan.timestamp || new Date().toISOString()),
            file_name: 'local-scan'
          })),
          error: null,
          loading: false,
          dataSource: 'local'
        }));
      }, 0);
      
    } catch (error) {
      console.error("Error loading scan history:", error);
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          error: "Failed to load scan history",
          loading: false
        }));
      }, 0);
    }
  }, []);

  const fetchTrends = useCallback(async () => {
    try {
      console.log("Generating trends from local storage");
      const localHistory = getFullScanHistory();
      
      // Generate trends from local data
      const medicineCounts: Record<string, number> = {};
      const suspiciousCounts: Record<string, number> = {};
      const medicineData: Record<string, { confidence: number[]; timestamp: string }> = {};
      
      localHistory.forEach((scan: StorageScanData) => {
        const medicine = String(scan.medicine || '').toLowerCase();
        const status = String(scan.status || '').toLowerCase();
        const confidence = parseFloat(String(scan.confidence || '0'));
        const timestamp = String(scan.timestamp || new Date().toISOString());
        
        medicineCounts[medicine] = (medicineCounts[medicine] || 0) + 1;
        
        if (!medicineData[medicine]) {
          medicineData[medicine] = { confidence: [], timestamp };
        }
        medicineData[medicine].confidence.push(confidence);
        
        if (status === 'fake' || status === 'counterfeit') {
          suspiciousCounts[medicine] = (suspiciousCounts[medicine] || 0) + 1;
        }
      });
      
      // Sort by count and get top 5
      const mostFrequent: TrendData[] = Object.entries(medicineCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([medicine, count]) => ({
          medicine,
          scan_count: count,
          avg_confidence: medicineData[medicine]?.confidence.reduce((a, b) => a + b, 0) / medicineData[medicine].confidence.length || 0,
          latest_scan: medicineData[medicine]?.timestamp || new Date().toISOString()
        }));
      
      const mostSuspicious: TrendData[] = Object.entries(suspiciousCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([medicine, suspiciousCount]) => ({
          medicine,
          total_scans: medicineCounts[medicine] || 0,
          fake_scans: suspiciousCount,
          suspicious_scans: suspiciousCount,
          suspicious_ratio: suspiciousCount / (medicineCounts[medicine] || 1),
          avg_confidence: medicineData[medicine]?.confidence.reduce((a, b) => a + b, 0) / medicineData[medicine].confidence.length || 0,
          latest_scan: medicineData[medicine]?.timestamp || new Date().toISOString()
        }));
      
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          trends: {
            most_frequent: mostFrequent,
            most_suspicious: mostSuspicious,
            last_updated: new Date().toISOString()
          }
        }));
      }, 0);

      console.log("Trends generated from local data:", { mostFrequent, mostSuspicious });

    } catch (error) {
      console.error("Error generating trends:", error);
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          trends: {
            most_frequent: [],
            most_suspicious: [],
            last_updated: new Date().toISOString()
          }
        }));
      }, 0);
    }
  }, []);

  // Fetch scan history on mount and set up real-time updates
  useEffect(() => {
    fetchScanHistory();
    fetchTrends();
    
    // Set up smart refresh - only when needed
    
    const smartRefresh = () => {
      // Only refresh if we haven't refreshed recently (avoid spam)
      const now = Date.now();
      const lastRefresh = sessionStorage.getItem('lastDashboardRefresh');
      const timeSinceLastRefresh = lastRefresh ? now - parseInt(lastRefresh) : 60000; // 1 minute cooldown
      
      if (timeSinceLastRefresh >= 10000) { // Minimum 10 seconds between refreshes
        console.log('Smart refresh triggered');
        fetchScanHistory();
        fetchTrends();
        sessionStorage.setItem('lastDashboardRefresh', now.toString());
      }
    };
    
    const interval = setInterval(smartRefresh, 5000);
    
    // Listen for storage events from scan page
    const handleStorageChange = (e: StorageEvent) => {
      console.log('Storage event received:', e);
      if (e.key === 'newScanAdded' || e.key === 'scanResult') {
        console.log('New scan detected, refreshing dashboard...');
        // Immediate refresh
        fetchScanHistory();
        fetchTrends();
        // Also refresh after a short delay to ensure backend is updated
        setTimeout(() => {
          console.log('Delayed refresh after scan...');
          fetchScanHistory();
          fetchTrends();
        }, 2000);
      }
    };
    
    // Also listen for custom events
    const handleCustomEvent = (event: Event) => {
      console.log('Custom event received:', event);
      if (event.type === 'newScan') {
        console.log('New scan custom event detected, refreshing dashboard...');
        // Immediate refresh
        fetchScanHistory();
        fetchTrends();
        // Also refresh after a short delay to ensure backend is updated
        setTimeout(() => {
          console.log('Delayed refresh after custom event...');
          fetchScanHistory();
          fetchTrends();
        }, 2000);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('newScan', handleCustomEvent);
    
    // Listen for direct dashboard refresh events
    const handleDashboardRefresh = () => {
      console.log('Direct dashboard refresh event received');
      fetchScanHistory();
      fetchTrends();
    };
    
    window.addEventListener('dashboardRefresh', handleDashboardRefresh);
    
    // Also check for direct sessionStorage changes (smarter approach)
    let lastKnownTimestamp = 0;
    
    const checkSessionStorage = () => {
      const currentScan = sessionStorage.getItem('scanResult');
      if (currentScan) {
        try {
          const scanData = JSON.parse(currentScan);
          const currentTimestamp = sessionStorage.getItem('lastScanTimestamp');
          const scanTimestamp = new Date(scanData.timestamp).getTime();
          
          // Only refresh if there's a new scan or timestamp changed
          if (currentTimestamp && scanTimestamp > Number(lastKnownTimestamp)) {
            console.log('New scan detected, refreshing dashboard...', {
              newTimestamp: scanTimestamp,
              lastKnown: lastKnownTimestamp,
              scanId: scanData.id || 'unknown'
            });
            
            sessionStorage.setItem('lastScanTimestamp', scanTimestamp.toString());
            lastKnownTimestamp = scanTimestamp;
            fetchScanHistory();
            fetchTrends();
          }
        } catch (error) {
          console.error('Error parsing sessionStorage:', error);
        }
      }
    };
    
    // Check sessionStorage every 2 seconds for better responsiveness
    const storageInterval = setInterval(checkSessionStorage, 2000);
    
    return () => {
      clearInterval(interval);
      clearInterval(storageInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('newScan', handleCustomEvent);
      window.removeEventListener('dashboardRefresh', handleDashboardRefresh);
    };
  }, [fetchScanHistory, fetchTrends]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter scans based on search term
  useEffect(() => {
    setTimeout(() => {
      if (state.searchTerm.trim() === "") {
        setState(prev => ({ ...prev, filteredScans: prev.scans }));
      } else {
        const filtered = state.scans.filter(scan =>
          scan.medicine.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
          scan.status.toLowerCase().includes(state.searchTerm.toLowerCase())
        );
        setState(prev => ({ ...prev, filteredScans: filtered }));
      }
    }, 0);
  }, [state.searchTerm, state.scans]);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full animate-pulse-emerald"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-emerald-600 to-blue-600 rounded-full flex items-center justify-center">
              <FiActivity className="w-12 h-12 text-white animate-pulse" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-2">Loading Dashboard...</p>
          <p className="text-gray-400">Analyzing your scan history</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-shake-red"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-red-600 to-orange-600 rounded-full flex items-center justify-center">
              <FiAlertCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-red-400 mb-4">Error Loading Data</h2>
          <p className="text-gray-300 mb-8">{state.error}</p>
          <button
            onClick={() => {
              fetchScanHistory();
              fetchTrends();
            }}
            className="btn-classic px-8 py-4 flex items-center gap-3 mx-auto"
          >
            <FiRefreshCw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (state.scans.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full animate-pulse-emerald"></div>
          <div className="absolute inset-2 bg-gradient-to-br from-emerald-600 to-blue-600 rounded-full flex items-center justify-center">
            <FiActivity className="w-12 h-12 text-white animate-pulse" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">No Scans Yet</h3>
        <p className="text-gray-400 mb-8">Start scanning medicines to see your results here</p>
        <button
          onClick={() => router.push('/scan')}
          className="btn-classic px-8 py-4 flex items-center gap-3 mx-auto text-lg"
        >
          <FiActivity className="w-5 h-5" />
          Start Your First Scan
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <FiShield className="w-6 h-6 text-white" />
                </div>
                Dashboard
              </h1>
              <p className="text-gray-400 text-lg">Real-time scan monitoring and analysis</p>
            </div>
            <button
              onClick={() => {
                fetchScanHistory();
                fetchTrends();
              }}
              className="btn-classic px-6 py-3 flex items-center gap-2"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        
        {/* Trends Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Most Frequently Scanned */}
          <div className="glass-morphism p-8 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <FiTrendingUp className="w-5 h-5 text-emerald-400" />
                Most Frequently Scanned
              </h3>
              <span className="text-xs text-gray-400">
                {state.trends.last_updated ? formatDate(state.trends.last_updated) : ''}
              </span>
            </div>
            
            {state.trends.most_frequent.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center">
                  <FiTrendingUp className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-400">No scan data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {state.trends.most_frequent.map((item, index) => (
                  <div key={item.medicine} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">{item.medicine}</div>
                        <div className="text-gray-400 text-sm">{item.scan_count} scans</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 font-semibold">{item.avg_confidence}%</div>
                      <div className="text-gray-500 text-xs">avg confidence</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most Suspicious Medicines */}
          <div className="glass-morphism p-8 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <FiAlertTriangle className="w-5 h-5 text-red-400" />
                Most Suspicious Medicines
              </h3>
              <span className="text-xs text-gray-400">
                {state.trends.last_updated ? formatDate(state.trends.last_updated) : ''}
              </span>
            </div>
            
            {state.trends.most_suspicious.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center">
                  <FiAlertTriangle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-400">No suspicious activity detected</p>
              </div>
            ) : (
              <div className="space-y-4">
                {state.trends.most_suspicious.map((item, index) => (
                  <div key={item.medicine} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">{item.medicine}</div>
                        <div className="text-gray-400 text-sm">
                          {item.fake_scans || 0} fake, {item.suspicious_scans || 0} suspicious
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-400 font-semibold">
                        {((item.suspicious_ratio || 0) * 100).toFixed(0)}%
                      </div>
                      <div className="text-gray-500 text-xs">suspicious ratio</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-morphism p-8 rounded-2xl mb-10">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => {
                fetchScanHistory();
                fetchTrends();
              }}
              className="btn-classic px-6 py-4 flex items-center gap-2"
              title="Refresh dashboard data"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
            <button
              onClick={() => router.push('/scan')}
              className="btn-classic px-8 py-4 flex items-center gap-3 text-lg"
            >
              <FiActivity className="w-5 h-5" />
              Start New Scan
            </button>
          </div>
        </div>

              </div>
    </div>
  );
}
