"use client";

import { useState, useEffect, useCallback } from "react";
import { FiBarChart, FiPieChart, FiDatabase, FiAlertCircle, FiShield, FiActivity, FiList, FiAlertTriangle } from "react-icons/fi";
import { getScanHistory, getHighRiskAlerts, getHighRiskMedicines } from "../utils/storage";
import { CompactAlertBanner } from "../components/AlertBanner";

interface AnalyticsData {
  total_scans: number;
  recent_scans_24h: number;
  unique_medicines: number;
  status_breakdown: Array<{
    _id: string;
    count: number;
    avg_confidence: number;
  }>;
  last_updated: string;
}

interface RecentScan {
  scan_id: string;
  medicine: string;
  status: string;
  confidence: string;
  timestamp: string;
  location?: string;
  file_name?: string;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [highRiskAlerts, setHighRiskAlerts] = useState<Array<{
  medicineKey: string;
  medicineName: string;
  count: number;
  lastDetected: string;
  alertType: string;
  timestamp: string;
}>>([]);
  const [highRiskMedicines, setHighRiskMedicines] = useState<Record<string, { count: number; lastDetected: string; medicineName: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("7d");

  const fetchAnalytics = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Add a small delay to ensure backend is ready
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Simplified approach - try direct connection with comprehensive error handling
      console.log('Starting analytics fetch attempt...');
      
      let response: Response | null = null;
      let lastError: Error | null = null;

      // Using Next.js API rewrites - use relative URLs
      console.log('Fetching analytics through Next.js rewrites...');
      
      try {
        console.log('Fetching /api/proxy?path=/api/v1/stats through Next.js API route...');
        response = await fetch('/api/proxy?path=/api/v1/stats', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log(`Response received: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          // Try to get more error details
          let errorDetails = '';
          try {
            const errorText = await response.text();
            errorDetails = ` - Details: ${errorText}`;
            console.error('Error response body:', errorText);
          } catch (e) {
            console.error('Could not read error response body:', e);
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}${errorDetails}`);
        }
        
        console.log('Successfully connected to backend through Next.js rewrite');
        
      } catch (error) {
        console.log('Failed to fetch through Next.js rewrite:', error);
        lastError = error as Error;
        response = null;
      }

      if (!response) {
        throw lastError || new Error('Failed to connect to backend');
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setAnalytics(data);
      console.log("Analytics loaded:", data);

    } catch (error) {
      console.error("Error fetching analytics:", error);
      
      // Retry logic for network errors
      if (retryCount < 3 && error instanceof Error && 
          (error.message.includes('Failed to fetch') || 
           error.message.includes('NetworkError') ||
           error.message.includes('AbortError') ||
           error.message.includes('Failed to connect'))) {
        console.log(`Retrying analytics fetch (${retryCount + 1}/3)...`);
        setTimeout(() => fetchAnalytics(retryCount + 1), 2000 * (retryCount + 1));
        return;
      }
      
      // Fallback to local storage if backend is not available
      console.log("Backend not available after retries, falling back to local storage...");
      const scanHistory = getScanHistory() as Array<{status?: string; medicine?: string}>;
      const realScans = scanHistory.filter(scan => scan.status?.toLowerCase() === 'real');
      const fakeScans = scanHistory.filter(scan => scan.status?.toLowerCase() === 'fake' || scan.status?.toLowerCase() === 'counterfeit');
      const suspiciousScans = scanHistory.filter(scan => scan.status?.toLowerCase() === 'suspicious');
      
      const fallbackData = {
        total_scans: scanHistory.length,
        recent_scans_24h: scanHistory.length, // All scans in local storage
        unique_medicines: new Set(scanHistory.map(scan => scan.medicine)).size,
        status_breakdown: [
          { _id: 'Real', count: realScans.length, avg_confidence: 95.0 },
          { _id: 'Fake', count: fakeScans.length, avg_confidence: 25.0 },
          { _id: 'Suspicious', count: suspiciousScans.length, avg_confidence: 50.0 }
        ],
        last_updated: new Date().toISOString()
      };
      
      setAnalytics(fallbackData);
      console.log("Analytics loaded from local storage:", fallbackData);
      // Don't set error state when using fallback
      setError(null);
    } finally {
      if (retryCount === 0) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    loadRecentScans();
    loadHotspotData();
  }, [timeRange, fetchAnalytics]);

  const loadRecentScans = () => {
    try {
      const scanHistory = getScanHistory();
      const recent = (scanHistory.slice(0, 10) as unknown) as RecentScan[]; // Get last 10 scans
      setRecentScans(recent);
    } catch (error) {
      console.error("Error loading recent scans:", error);
    }
  };

  const loadHotspotData = () => {
    try {
      const alerts = getHighRiskAlerts();
      const medicines = getHighRiskMedicines();
      setHighRiskAlerts(alerts);
      setHighRiskMedicines(medicines);
      console.log('Hotspot data loaded:', { alertsCount: alerts.length, medicinesCount: Object.keys(medicines).length });
    } catch (error) {
      console.error("Error loading hotspot data:", error);
    }
  };

  const refreshHotspotData = () => {
    loadHotspotData();
  };

  
  const getAvgConfidence = (analytics: AnalyticsData) => {
    const totalConfidence = analytics.status_breakdown.reduce((sum, item) => sum + (item.avg_confidence * item.count), 0);
    const totalCount = analytics.status_breakdown.reduce((sum, item) => sum + item.count, 0);
    return totalCount > 0 ? totalConfidence / totalCount : 0;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getHealthMetrics = () => {
    if (!analytics) return { authentic: 0, fake: 0, suspicious: 0 };

    const authentic = analytics.status_breakdown.find(item => item._id.toLowerCase() === 'real')?.count || 0;
    const fake = analytics.status_breakdown.find(item => item._id.toLowerCase() === 'fake')?.count || 0;
    const suspicious = analytics.status_breakdown.find(item => item._id.toLowerCase() === 'suspicious')?.count || 0;

    return { authentic, fake, suspicious };
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'real':
      case 'authentic':
        return 'text-emerald-400';
      case 'fake':
        return 'text-red-400';
      case 'suspicious':
        return 'text-amber-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'real':
      case 'authentic':
        return FiShield;
      case 'fake':
        return FiAlertCircle;
      case 'suspicious':
        return FiActivity;
      default:
        return FiDatabase;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-classic"></div>
          <p className="mt-4 text-xl text-gray-300">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <FiAlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-classic px-6 py-3"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-classic"></div>
          <p className="mt-4 text-xl text-gray-300">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Health Surveillance Dashboard</h1>
          <p className="text-gray-400">Real-time medicine authentication monitoring and insights</p>
        </div>

        {/* Compact Alert Banner */}
        <CompactAlertBanner />

        {/* Time Range Selector */}
        <div className="glass-morphism p-6 rounded-xl mb-8">
          <div className="flex flex-wrap gap-4 justify-center">
            {["24h", "7d", "30d", "90d"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  timeRange === range 
                    ? 'btn-classic' 
                    : 'glass-morphism text-white hover:border-emerald-500/50'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Health Surveillance Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card-classic p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FiDatabase className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {formatNumber(analytics.total_scans)}
            </div>
            <div className="text-gray-300">Total Scans</div>
          </div>

          <div className="card-classic p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FiShield className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-400 mb-2">
              {formatNumber(getHealthMetrics().authentic)}
            </div>
            <div className="text-gray-300">Authentic</div>
          </div>

          <div className="card-classic p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FiAlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-400 mb-2">
              {formatNumber(getHealthMetrics().fake)}
            </div>
            <div className="text-gray-300">Fake</div>
          </div>

          <div className="card-classic p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FiAlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-red-500 mb-2">
              {formatNumber(Object.keys(highRiskMedicines).length)}
            </div>
            <div className="text-gray-300">High Risk Medicines</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Breakdown Chart */}
          <div className="card-classic p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <FiPieChart className="w-6 h-6 mr-2 text-emerald-400" />
              Status Breakdown
            </h3>
            <div className="space-y-4">
              {analytics.status_breakdown.map((item) => (
                <div key={item._id} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      item._id === 'Real' ? 'bg-emerald-500' :
                      item._id === 'Fake' ? 'bg-red-500' : 'bg-amber-500'
                    }`}></div>
                    <span className="text-white font-medium capitalize">{item._id}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{item.count}</div>
                    <div className="text-sm text-gray-300">scans</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence Trend Chart */}
          <div className="card-classic p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <FiBarChart className="w-6 h-6 mr-2 text-blue-400" />
              Confidence Trends
            </h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-2">
                  {getAvgConfidence(analytics).toFixed(1)}%
                </div>
                <div className="text-gray-300">Overall Average</div>
                <div className="mt-4 text-sm text-gray-400">
                  Based on {analytics.total_scans} scans
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* High Risk Alerts Section */}
        {highRiskAlerts.length > 0 && (
          <div className="card-classic p-6 mb-8 border-2 border-red-500/30">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <FiAlertTriangle className="w-6 h-6 mr-2 text-red-500" />
                High Risk Medicine Alerts
              </h3>
              <button
                onClick={refreshHotspotData}
                className="px-4 py-2 text-sm border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-3">
              {highRiskAlerts.map((alert, index) => (
                <div key={`${alert.medicineKey}-${alert.count}-${index}`} className="flex items-center justify-between p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-4">
                    <FiAlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <div className="text-white font-medium">{alert.medicineName}</div>
                      <div className="text-sm text-red-300">Flagged as High Risk Medicine</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-red-400">
                      {alert.count} Suspicious Detections
                    </div>
                    <div className="text-xs text-gray-400">
                      Last detected: {new Date(alert.lastDetected).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Scans Section */}
        <div className="card-classic p-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <FiList className="w-6 h-6 mr-2 text-blue-400" />
            Recent Scans
          </h3>
          <div className="space-y-3">
            {recentScans.length > 0 ? (
              recentScans.map((scan, index) => {
                const StatusIcon = getStatusIcon(scan.status);
                return (
                  <div key={scan.scan_id || index} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <StatusIcon className={`w-5 h-5 ${getStatusColor(scan.status)}`} />
                      <div>
                        <div className="text-white font-medium">{scan.medicine}</div>
                        <div className="text-sm text-gray-400">{scan.scan_id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getStatusColor(scan.status)}`}>
                        {scan.status} - {scan.confidence}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(scan.timestamp).toLocaleString()}
                      </div>
                      {scan.location && (
                        <div className="text-xs text-gray-400">{scan.location}</div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FiList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recent scans available</p>
              </div>
            )}
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Last updated: {new Date(analytics.last_updated).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
