"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiClock, FiAlertCircle, FiRefreshCw, FiSearch, FiTrendingUp, FiActivity, FiShield, FiCheckCircle, FiXCircle, FiAlertTriangle } from "react-icons/fi";

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
    }
  });

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
        fetchScanHistory();
        fetchTrends();
      }
    };
    
    // Also listen for custom events
    const handleCustomEvent = (event: Event) => {
      console.log('Custom event received:', event);
      if (event.type === 'newScan') {
        console.log('New scan custom event detected, refreshing dashboard...');
        fetchScanHistory();
        fetchTrends();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('newScan', handleCustomEvent);
    
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
    
    // Check sessionStorage every 5 seconds (reduced frequency)
    const storageInterval = setInterval(checkSessionStorage, 5000);
    
    return () => {
      clearInterval(interval);
      clearInterval(storageInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('newScan', handleCustomEvent);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter scans based on search term
  useEffect(() => {
    if (state.searchTerm.trim() === "") {
      setState(prev => ({ ...prev, filteredScans: prev.scans }));
    } else {
      const filtered = state.scans.filter(scan =>
        scan.medicine.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        scan.status.toLowerCase().includes(state.searchTerm.toLowerCase())
      );
      setState(prev => ({ ...prev, filteredScans: filtered }));
    }
  }, [state.searchTerm, state.scans]);

  const fetchScanHistory = async (retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`http://127.0.0.1:8001/api/v1/scans?limit=50&_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Scan service not available');
        } else if (response.status >= 500) {
          throw new Error('Server error - please try again');
        } else {
          throw new Error(`Failed to fetch scan history: ${response.status}`);
        }
      }

      const data = await response.json();
      // Handle different response formats
      let scans: ScanHistory[] = [];
      
      if (Array.isArray(data)) {
        // Direct array response
        scans = data;
      } else if (data.scans && Array.isArray(data.scans)) {
        // Wrapped in scans property
        scans = data.scans;
      } else if (data.data && Array.isArray(data.data)) {
        // Wrapped in data property
        scans = data.data;
      } else {
        console.warn('Unexpected API response format:', data);
        scans = [];
      }
      
      // Calculate stats
      const stats = {
        totalScans: scans.length,
        realScans: scans.filter(s => s.status.toLowerCase() === 'real').length,
        fakeScans: scans.filter(s => s.status.toLowerCase() === 'fake').length,
        suspiciousScans: scans.filter(s => s.status.toLowerCase() === 'suspicious').length,
        avgConfidence: scans.length > 0 
          ? scans.reduce((sum, scan) => {
              const conf = parseFloat(scan.confidence.replace('%', ''));
              return sum + (isNaN(conf) ? 0 : conf);
            }, 0) / scans.length
          : 0
      };

      setState(prev => ({
        ...prev,
        scans,
        filteredScans: prev.searchTerm.trim() === "" ? scans : prev.filteredScans,
        stats,
        loading: false,
        error: null
      }));

      console.log("Dashboard loaded:", scans.length, "scans");

    } catch (error) {
      console.error("Error fetching scan history:", error);
      
      // Retry logic
      if (retryCount < maxRetries) {
        console.log(`Retrying... Attempt ${retryCount + 1}/${maxRetries}`);
        setTimeout(() => fetchScanHistory(retryCount + 1), 2000 * (retryCount + 1));
        return;
      }
      
      setState(prev => ({
        ...prev,
        error: typeof error === 'string' ? error : "Failed to load scan history",
        loading: false
      }));
    }
  };

  const fetchTrends = async (retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`http://127.0.0.1:8001/api/v1/trends?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Trends endpoint not available');
          return;
        } else if (response.status >= 500) {
          throw new Error('Server error - please try again');
        } else {
          throw new Error(`Failed to fetch trends: ${response.status}`);
        }
      }

      const trends = await response.json();
      
      setState(prev => ({
        ...prev,
        trends: {
          most_frequent: trends.most_frequent || [],
          most_suspicious: trends.most_suspicious || [],
          last_updated: trends.last_updated || new Date().toISOString()
        }
      }));

      console.log("Trends loaded:", trends);

    } catch (error) {
      console.error("Error fetching trends:", error);
      
      // Retry logic for trends
      if (retryCount < maxRetries) {
        console.log(`Retrying trends... Attempt ${retryCount + 1}/${maxRetries}`);
        setTimeout(() => fetchTrends(retryCount + 1), 2000 * (retryCount + 1));
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'real':
        return 'status-authentic';
      case 'fake':
        return 'status-counterfeit';
      case 'suspicious':
        return 'status-suspicious';
      default:
        return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'real':
        return <FiCheckCircle className="w-4 h-4" />;
      case 'fake':
        return <FiXCircle className="w-4 h-4" />;
      case 'suspicious':
        return <FiAlertTriangle className="w-4 h-4" />;
      default:
        return <FiAlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'real':
        return 'text-emerald-400';
      case 'fake':
        return 'text-red-400';
      case 'suspicious':
        return 'text-amber-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleScanClick = (scanId: string) => {
    const scan = state.scans.find(s => s.id === scanId);
    if (scan) {
      sessionStorage.setItem('scanResult', JSON.stringify(scan));
      router.push('/result');
    }
  };

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          <div className="card-classic p-6 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <FiActivity className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-blue-400 mb-2">{state.stats.totalScans}</div>
              <div className="text-gray-300 text-sm">Total Scans</div>
            </div>
          </div>

          <div className="card-classic p-6 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <FiCheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-emerald-400 mb-2">{state.stats.realScans}</div>
              <div className="text-gray-300 text-sm">Authentic</div>
            </div>
          </div>

          <div className="card-classic p-6 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <FiXCircle className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-3xl font-bold text-red-400 mb-2">{state.stats.fakeScans}</div>
              <div className="text-gray-300 text-sm">Counterfeit</div>
            </div>
          </div>

          <div className="card-classic p-6 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <FiAlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-amber-400 mb-2">{state.stats.suspiciousScans}</div>
              <div className="text-gray-300 text-sm">Suspicious</div>
            </div>
          </div>

          <div className="card-classic p-6 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <FiTrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-2">{state.stats.avgConfidence.toFixed(1)}%</div>
              <div className="text-gray-300 text-sm">Avg Confidence</div>
            </div>
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

        {/* Search Bar */}
        <div className="glass-morphism p-8 rounded-2xl mb-10">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={state.searchTerm}
                onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                placeholder="Search by medicine name, status, or confidence..."
                className="input-classic w-full pl-14 pr-4 py-4 text-lg"
              />
            </div>
            <button
              onClick={() => {
                fetchScanHistory();
                fetchTrends();
              }}
              className="btn-classic px-6 py-4 flex items-center gap-2"
              title="Refresh dashboard data"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => router.push('/scan')}
              className="btn-classic px-8 py-4 flex items-center gap-3 text-lg"
            >
              <FiActivity className="w-5 h-5" />
              New Scan
            </button>
          </div>
        </div>

        {/* Scan History */}
        {state.filteredScans.length === 0 ? (
          <div className="glass-morphism p-16 rounded-2xl text-center">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-full"></div>
              <div className="absolute inset-2 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                <FiClock className="w-12 h-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">No Scans Found</h3>
            <p className="text-gray-300 text-lg mb-8 max-w-md mx-auto">
              {state.searchTerm ? 'No scans match your search criteria. Try adjusting your search terms.' : 'No scans have been performed yet. Start your first scan to see results here.'}
            </p>
            <button
              onClick={() => router.push('/scan')}
              className="btn-classic px-8 py-4 flex items-center gap-3 mx-auto text-lg"
            >
              <FiActivity className="w-5 h-5" />
              Start Your First Scan
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <FiClock className="w-6 h-6 text-emerald-400" />
                Recent Scans ({state.filteredScans.length})
              </h2>
              <div className="text-gray-400">
                Last updated: {formatDate(state.scans[0]?.timestamp || new Date().toISOString())}
              </div>
            </div>
            
            <div className="grid gap-6">
              {state.filteredScans.map((scan, index) => (
                <div
                  key={scan.id}
                  onClick={() => handleScanClick(scan.id)}
                  className="card-classic p-8 cursor-pointer group relative overflow-hidden"
                  style={{
                    animation: `slideIn 0.5s ease-out ${index * 0.1}s both`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
                          {scan.medicine}
                        </h3>
                        <div className="flex items-center gap-4 mb-4">
                          <span className={`status-badge-classic ${getStatusBadge(scan.status)} flex items-center gap-2 text-sm`}>
                            {getStatusIcon(scan.status)}
                            {scan.status.toUpperCase()}
                          </span>
                          <span className={`text-lg font-semibold ${getStatusColor(scan.status)}`}>
                            {scan.confidence}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-400 text-sm mb-2">
                          {formatDate(scan.timestamp)}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {scan.processing_time}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {scan.batch_number && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Batch:</span>
                          <span className="text-white font-medium">{scan.batch_number}</span>
                        </div>
                      )}
                      {scan.expiry_date && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Expiry:</span>
                          <span className="text-white font-medium">{scan.expiry_date}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Method:</span>
                        <span className="text-white font-medium">{scan.extraction_method}</span>
                      </div>
                    </div>

                    {scan.fake_indicators && scan.fake_indicators.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="text-gray-400 text-sm mb-2">Indicators:</div>
                        <div className="flex flex-wrap gap-2">
                          {scan.fake_indicators.map((indicator, idx) => (
                            <span key={idx} className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-xs">
                              {indicator}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <FiActivity className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
