"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiShield, FiArrowLeft, FiClock, FiCheckCircle, FiAlertCircle, FiLoader, FiRefreshCw, FiSearch, FiTrendingUp, FiDatabase, FiPackage, FiActivity } from "react-icons/fi";

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

interface DashboardStats {
  total_scans: number;
  real_scans: number;
  fake_scans: number;
  suspicious_scans: number;
  avg_confidence: number;
  recent_scans: number;
}

export default function ModernDashboard() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanHistory[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_scans: 0,
    real_scans: 0,
    fake_scans: 0,
    suspicious_scans: 0,
    avg_confidence: 0,
    recent_scans: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Calculate stats when scans change
  useEffect(() => {
    calculateStats();
  }, [scans]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter scans based on search and status
  const filteredScans = scans.filter(scan => {
    const matchesSearch = scan.medicine.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scan.status.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || scan.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://127.0.0.1:8000/api/scans?limit=100');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const data = await response.json();
      setScans(data);
      console.log("Dashboard data loaded:", data.length, "scans");

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const realCount = scans.filter(s => s.status.toLowerCase() === 'real').length;
    const fakeCount = scans.filter(s => s.status.toLowerCase() === 'fake').length;
    const suspiciousCount = scans.filter(s => s.status.toLowerCase() === 'suspicious').length;
    
    // Calculate average confidence
    const validConfidences = scans
      .map(s => parseInt(s.confidence.replace('%', '')))
      .filter(c => !isNaN(c));
    const avgConfidence = validConfidences.length > 0 
      ? Math.round(validConfidences.reduce((a, b) => a + b, 0) / validConfidences.length)
      : 0;

    // Recent scans (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = scans.filter(s => new Date(s.timestamp) > yesterday).length;

    setStats({
      total_scans: scans.length,
      real_scans: realCount,
      fake_scans: fakeCount,
      suspicious_scans: suspiciousCount,
      avg_confidence: avgConfidence,
      recent_scans: recentCount
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'real':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
          text: 'text-green-400',
          icon: 'text-green-500',
          badge: 'bg-green-500/20 text-green-300 border-green-500/50'
        };
      case 'fake':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          icon: 'text-red-500',
          badge: 'bg-red-500/20 text-red-300 border-red-500/50'
        };
      case 'suspicious':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400',
          icon: 'text-yellow-500',
          badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
        };
      default:
        return {
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/30',
          text: 'text-gray-400',
          icon: 'text-gray-500',
          badge: 'bg-gray-500/20 text-gray-300 border-gray-500/50'
        };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'real':
        return <FiCheckCircle className="w-4 h-4" />;
      case 'fake':
        return <FiAlertCircle className="w-4 h-4" />;
      default:
        return <FiAlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (confidence: string) => {
    const value = parseInt(confidence.replace('%', ''));
    if (value >= 80) return 'text-green-400';
    if (value >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleScanClick = (scanId: string) => {
    const scan = scans.find(s => s.id === scanId);
    if (scan) {
      sessionStorage.setItem('scanResult', JSON.stringify(scan));
      router.push('/result');
    }
  };

  // Stat Card Component
  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    trend 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ReactNode; 
    color: { 
      bg: string; 
      border: string; 
      text: string; 
      icon: string; 
    }; 
    trend?: number; 
  }) => (
    <div className={`${color.bg} ${color.border} backdrop-blur-lg rounded-2xl border p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${color.icon} rounded-xl bg-black/30`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            <FiTrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className={`text-3xl font-bold ${color.text}`}>{value.toLocaleString()}</div>
        <div className="text-gray-400 text-sm">{title}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full animate-pulse"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-blue-900 to-indigo-900 rounded-full flex items-center justify-center">
              <FiLoader className="w-16 h-16 text-white animate-spin" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Loading Dashboard...</h2>
          <p className="text-gray-300">Fetching your scan analytics</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-full"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-red-900 to-orange-900 rounded-full flex items-center justify-center">
              <FiAlertCircle className="w-16 h-16 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-red-400 mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-300 mb-8">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all transform hover:scale-105"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-indigo-950">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => router.push('/scan')}
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Back to Scanner</span>
          </button>
          <div className="flex items-center space-x-2">
            <FiShield className="w-8 h-8 text-cyan-400" />
            <span className="text-2xl font-bold text-white">Analytics Dashboard</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-900/50 border border-cyan-500/30 rounded-xl text-cyan-400 hover:bg-blue-900/70 transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 px-8 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Medicine Scan Analytics</h1>
            <p className="text-gray-300">Comprehensive overview of your medicine verification results</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Scans"
              value={stats.total_scans}
              icon={<FiDatabase className="w-6 h-6" />}
              color={{ bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'text-blue-500' }}
              trend={stats.recent_scans > 0 ? 12 : 0}
            />
            <StatCard
              title="Authentic"
              value={stats.real_scans}
              icon={<FiCheckCircle className="w-6 h-6" />}
              color={{ bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: 'text-green-500' }}
              trend={stats.real_scans > 0 ? 8 : 0}
            />
            <StatCard
              title="Counterfeit"
              value={stats.fake_scans}
              icon={<FiAlertCircle className="w-6 h-6" />}
              color={{ bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: 'text-red-500' }}
              trend={stats.fake_scans > 0 ? -5 : 0}
            />
            <StatCard
              title="Avg Confidence"
              value={`${stats.avg_confidence}%`}
              icon={<FiTrendingUp className="w-6 h-6" />}
              color={{ bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: 'text-purple-500' }}
              trend={stats.avg_confidence > 70 ? 15 : 0}
            />
          </div>

          {/* Filters and Search */}
          <div className="bg-blue-900/30 backdrop-blur-lg rounded-2xl border border-cyan-500/20 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search scans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <div className="flex gap-2">
                {['all', 'real', 'fake', 'suspicious'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      filterStatus === status
                        ? 'bg-cyan-600 text-white'
                        : 'bg-black/30 text-gray-400 hover:bg-black/50 hover:text-white'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Scans */}
          <div className="bg-blue-900/30 backdrop-blur-lg rounded-2xl border border-cyan-500/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <FiClock className="w-6 h-6 mr-3 text-cyan-400" />
                Recent Scans
              </h2>
              <div className="text-gray-400 text-sm">
                Showing {filteredScans.length} of {scans.length} scans
              </div>
            </div>

            {filteredScans.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiSearch className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No scans found</h3>
                <p className="text-gray-400">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Start scanning medicines to see results here'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredScans.slice(0, 10).map((scan) => {
                  const colors = getStatusColor(scan.status);
                  return (
                    <div
                      key={scan.id}
                      onClick={() => handleScanClick(scan.id)}
                      className={`${colors.bg} ${colors.border} backdrop-blur-lg rounded-xl border p-4 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-102`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-white">{scan.medicine}</h3>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${colors.badge} border`}>
                              {getStatusIcon(scan.status)}
                              <span className="ml-1 capitalize">{scan.status}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span className="flex items-center space-x-1">
                              <FiClock className="w-3 h-3" />
                              <span>{formatDate(scan.timestamp)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <FiActivity className="w-3 h-3" />
                              <span className={getConfidenceColor(scan.confidence)}>{scan.confidence}</span>
                            </span>
                            {scan.batch_number && (
                              <span className="flex items-center space-x-1">
                                <FiPackage className="w-3 h-3" />
                                <span>{scan.batch_number}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className={`text-sm font-medium ${colors.text}`}>{scan.confidence}</div>
                            <div className="text-xs text-gray-400">confidence</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredScans.length > 10 && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 transition-all transform hover:scale-105"
                >
                  View All Scans
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => router.push('/scan')}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl p-6 hover:from-cyan-700 hover:to-blue-700 transition-all transform hover:scale-105 text-left"
            >
              <FiShield className="w-8 h-8 mb-3" />
              <h3 className="text-xl font-bold mb-2">New Scan</h3>
              <p className="text-cyan-100">Scan a new medicine for verification</p>
            </button>
            
            <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-6 hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 text-left">
              <FiDatabase className="w-8 h-8 mb-3" />
              <h3 className="text-xl font-bold mb-2">Full History</h3>
              <p className="text-purple-100">View complete scan history</p>
            </button>
            
            <button className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl p-6 hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 text-left">
              <FiTrendingUp className="w-8 h-8 mb-3" />
              <h3 className="text-xl font-bold mb-2">Analytics</h3>
              <p className="text-green-100">Detailed insights and reports</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
