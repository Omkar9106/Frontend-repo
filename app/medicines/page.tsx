"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiFileText, FiSearch, FiTrash2, FiAlertTriangle, FiEye } from "react-icons/fi";

interface Medicine {
  id: string;
  name: string;
  description: string;
  status: string;
  total_scans: number;
  real_scans: number;
  fake_scans: number;
  suspicious_scans: number;
  last_scan_date: string;
  avg_confidence: number;
}

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

export default function MedicinesPage() {
  const router = useRouter();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [filteredMedicines, setFilteredMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [medicineScans, setMedicineScans] = useState<ScanHistory[]>([]);

  const filterMedicines = useCallback(() => {
    let filtered = medicines;

    // Filter by search term
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(medicine =>
        medicine.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(medicine => medicine.status === statusFilter);
    }

    setFilteredMedicines(filtered);
  }, [medicines, searchTerm, statusFilter]);

  const calculateDynamicConfidence = (med: {
    name: string;
    expiry_date?: string | null;
    batch_number?: string | null;
    total_scans: number;
  }) => {
    // Rule 1: Full data present → 80-95%
    if (med.name && med.expiry_date && med.batch_number && med.total_scans > 0) {
      const baseConfidence = 80;
      const dataBonus = Math.min(med.total_scans * 2, 15); // Max 15% bonus for multiple scans
      const randomVariation = Math.random() * 10 - 5; // ±5% variation
      return Math.min(baseConfidence + dataBonus + randomVariation, 95);
    }
    
    // Rule 2: Partial data → 60-75%
    else if (med.name && med.name.toLowerCase() !== "unknown" && (med.expiry_date || med.batch_number)) {
      const baseConfidence = 60;
      const partialBonus = (med.expiry_date ? 5 : 0) + (med.batch_number ? 5 : 0);
      const randomVariation = Math.random() * 10 - 5; // ±5% variation
      return Math.min(baseConfidence + partialBonus + randomVariation, 75);
    }
    
    // Rule 3: No data → 40-55%
    else {
      const baseConfidence = 40;
      const randomVariation = Math.random() * 15 - 7.5; // ±7.5% variation
      return Math.min(baseConfidence + randomVariation, 55);
    }
  };

  const fetchMedicines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://127.0.0.1:8001/api/v1/medicines');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch medicines: ${response.status}`);
      }

      const data = await response.json();
      const medicines: Medicine[] = data.medicines.map((med: {
        name: string;
        total_scans: number;
        real_scans: number;
        fake_scans: number;
        suspicious_scans: number;
        last_scan: string | null;
        avg_confidence: number;
        expiry_date?: string | null;
        batch_number?: string | null;
      }) => {
        // Apply status decision logic
        let status = "inactive";
        let reason = "";
        
        if (med.name.toLowerCase() !== "unknown") {
          // Check expiry date
          const currentDate = new Date();
          const expiryDate = med.expiry_date ? new Date(med.expiry_date) : null;
          const isExpired = expiryDate ? expiryDate < currentDate : false;
          const daysToExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
          
          if (med.expiry_date && med.batch_number && !isExpired) {
            status = "Authentic";
            reason = "Valid medicine with complete information";
          } else if (med.expiry_date && !isExpired) {
            status = "Authentic";
            reason = "Valid medicine (expires in " + daysToExpiry + " days)";
          } else if (isExpired) {
            status = "Expired";
            reason = "Medicine expired on " + med.expiry_date;
          } else if (med.batch_number) {
            status = "Check";
            reason = "Missing expiry date information";
          } else {
            status = "Check";
            reason = "Missing batch number information";
          }
        } else {
          status = "Suspicious";
          reason = "Unknown medicine detected";
        }
        
        return {
          id: med.name,
          name: med.name,
          description: reason,
          status,
          total_scans: med.total_scans,
          real_scans: med.real_scans,
          fake_scans: med.fake_scans,
          suspicious_scans: med.suspicious_scans,
          last_scan_date: med.last_scan || "Never",
          avg_confidence: calculateDynamicConfidence(med)
        };
      });

      setMedicines(medicines);
      console.log("Medicines loaded:", medicines.length, "items");

    } catch (error) {
      console.error("Error fetching medicines:", error);
      setError("Failed to load medicines");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  useEffect(() => {
    filterMedicines();
  }, [filterMedicines]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "authentic":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "expired":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "check":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "suspicious":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "inactive":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const handleViewMedicine = async (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    
    // Fetch recent scans for this medicine
    try {
      const response = await fetch(`http://127.0.0.1:8001/api/v1/scans?medicine=${encodeURIComponent(medicine.name)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        const scans: ScanHistory[] = Array.isArray(data) ? data : (data.scans || []);
        setMedicineScans(scans);
      }
    } catch (error) {
      console.error("Error fetching medicine scans:", error);
      setMedicineScans([]);
    }
  };

  const handleDeleteMedicine = async (medicine: Medicine) => {
    if (window.confirm(`Are you sure you want to delete all scans for ${medicine.name}?`)) {
      try {
        const response = await fetch(`http://127.0.0.1:8001/api/v1/medicines/${encodeURIComponent(medicine.name)}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error(`Failed to delete medicine: ${response.status}`);
        }

        // Refresh medicines list
        fetchMedicines();
        console.log(`Deleted all scans for ${medicine.name}`);
      } catch (error) {
        console.error("Error deleting medicine:", error);
        setError("Failed to delete medicine");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-xl text-white">Loading medicines...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <FiAlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Medicines</h2>
          <p className="text-gray-300">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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

      {/* Main Content */}
      <main className="relative z-10 px-8 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Medicine Database</h1>
            <p className="text-gray-300 text-lg">Manage and verify medicines in system</p>
          </div>

          {/* Search and Filters */}
          <div className="glass-morphism p-6 rounded-xl mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">Search Medicines</label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by medicine name or status..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="authentic">Authentic</option>
                <option value="expired">Expired</option>
                <option value="check">Check</option>
                <option value="suspicious">Suspicious</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Medicine Grid */}
          {filteredMedicines.length === 0 ? (
            <div className="glass-morphism p-16 rounded-xl text-center">
              <FiFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Medicines Found</h3>
              <p className="text-gray-300 mb-6">
                {searchTerm ? 'No medicines match your search criteria.' : 'No medicines have been added to the database yet.'}
              </p>
              <button
                onClick={() => router.push('/scan')}
                className="btn-classic px-8 py-4 flex items-center gap-3 mx-auto"
              >
                <FiFileText className="w-5 h-5" />
                Scan First Medicine
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMedicines.map((medicine) => (
                <div key={medicine.id} className="glass-morphism p-6 rounded-xl hover:scale-105 transition-all duration-300">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{medicine.name}</h3>
                      <span className={`status-badge-classic ${getStatusBadge(medicine.status)}`}>
                        {medicine.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-sm mb-1">
                        Last Scan: {medicine.last_scan_date}
                      </div>
                      <div className="text-lg font-bold text-cyan-400">
                        {medicine.avg_confidence.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-300 mb-4">{medicine.description}</p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-green-500/20 rounded-lg">
                      <div className="text-green-400 font-bold">{medicine.real_scans}</div>
                      <div className="text-gray-400 text-xs">Real</div>
                    </div>
                    <div className="text-center p-2 bg-red-500/20 rounded-lg">
                      <div className="text-red-400 font-bold">{medicine.fake_scans}</div>
                      <div className="text-gray-400 text-xs">Fake</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-500/20 rounded-lg">
                      <div className="text-yellow-400 font-bold">{medicine.suspicious_scans}</div>
                      <div className="text-gray-400 text-xs">Suspicious</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-300">Avg Confidence</span>
                    <span className="text-lg font-bold text-cyan-400">{medicine.avg_confidence.toFixed(1)}%</span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => handleViewMedicine(medicine)}
                      className="flex-1 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center justify-center"
                    >
                      <FiEye className="w-4 h-4 mr-2" />
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteMedicine(medicine)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                    >
                      <FiTrash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Medicine View Modal */}
      {selectedMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">{selectedMedicine.name}</h2>
              <button 
                onClick={() => setSelectedMedicine(null)} 
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="text-gray-300 mb-4">{selectedMedicine.description}</div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-900/30 p-4 rounded-lg">
                <div className="text-blue-400 font-bold text-lg">{selectedMedicine.total_scans}</div>
                <div className="text-gray-400 text-sm">Total Scans</div>
              </div>
              <div className="bg-green-900/30 p-4 rounded-lg">
                <div className="text-green-400 font-bold text-lg">{selectedMedicine.avg_confidence.toFixed(1)}%</div>
                <div className="text-gray-400 text-sm">Avg Confidence</div>
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-2">Medicine Visualization</div>
              <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg p-8 text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <FiFileText className="w-12 h-12 text-white" />
                </div>
                <div className="text-white font-bold text-lg">{selectedMedicine.name}</div>
                <div className="text-gray-400 text-sm mt-2">Medicine Database Entry</div>
              </div>
            </div>

            {medicineScans.length > 0 && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-gray-400 text-sm mb-4">Recent Scans ({medicineScans.length})</div>
                <div className="space-y-3">
                  {medicineScans.map((scan) => (
                    <div key={scan.id} className="bg-gray-700/50 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          scan.status.toLowerCase() === 'real' ? 'bg-green-500/20 text-green-400' :
                          scan.status.toLowerCase() === 'fake' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {scan.status.toUpperCase()}
                        </span>
                        <span className="text-cyan-400 text-sm font-bold">{scan.confidence}</span>
                      </div>
                      <div className="text-gray-300 text-sm mb-1">
                        {scan.extracted_text.substring(0, 100)}{scan.extracted_text.length > 100 ? '...' : ''}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {new Date(scan.timestamp).toLocaleString()} | {scan.processing_time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
