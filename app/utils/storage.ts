// Storage utility with fallback handling

export interface StorageData {
  [key: string]: unknown;
}

// Scan entry interface for standardized data structure
export interface ScanEntry {
  medicine: string;
  status: string;
  confidence: string;
  timestamp: string;
  location: string;
}

class StorageManager {
  private isSessionStorageAvailable: boolean = false;
  private isLocalStorageAvailable: boolean = false;

  constructor() {
    this.checkStorageAvailability();
  }

  private checkStorageAvailability() {
    try {
      // Check sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        const testKey = '__storage_test__';
        sessionStorage.setItem(testKey, 'test');
        sessionStorage.removeItem(testKey);
        this.isSessionStorageAvailable = true;
      }
    } catch (error) {
      console.warn('SessionStorage not available:', error);
      this.isSessionStorageAvailable = false;
    }

    try {
      // Check localStorage
      if (typeof localStorage !== 'undefined') {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        this.isLocalStorageAvailable = true;
      }
    } catch (error) {
      console.warn('LocalStorage not available:', error);
      this.isLocalStorageAvailable = false;
    }
  }

  setItem(key: string, value: string): boolean {
    try {
      if (this.isSessionStorageAvailable) {
        sessionStorage.setItem(key, value);
        return true;
      }
    } catch (error) {
      console.warn('SessionStorage setItem failed:', error);
    }

    try {
      if (this.isLocalStorageAvailable) {
        localStorage.setItem(key, value);
        return true;
      }
    } catch (error) {
      console.warn('LocalStorage setItem failed:', error);
    }

    return false;
  }

  getItem(key: string): string | null {
    try {
      if (this.isSessionStorageAvailable) {
        return sessionStorage.getItem(key);
      }
    } catch (error) {
      console.warn('SessionStorage getItem failed:', error);
    }

    try {
      if (this.isLocalStorageAvailable) {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.warn('LocalStorage getItem failed:', error);
    }

    return null;
  }

  removeItem(key: string): boolean {
    try {
      if (this.isSessionStorageAvailable) {
        sessionStorage.removeItem(key);
        return true;
      }
    } catch (error) {
      console.warn('SessionStorage removeItem failed:', error);
    }

    try {
      if (this.isLocalStorageAvailable) {
        localStorage.removeItem(key);
        return true;
      }
    } catch (error) {
      console.warn('LocalStorage removeItem failed:', error);
    }

    return false;
  }

  isAvailable(): boolean {
    return this.isSessionStorageAvailable || this.isLocalStorageAvailable;
  }
}

// Create singleton instance
const storageManager = new StorageManager();

export const storage = {
  setItem: (key: string, value: string) => storageManager.setItem(key, value),
  getItem: (key: string) => storageManager.getItem(key),
  removeItem: (key: string) => storageManager.removeItem(key),
  isAvailable: () => storageManager.isAvailable(),
};

// Helper functions for scan data
export const storeScanResult = (data: StorageData): boolean => {
  try {
    // Create standardized scan entry object
    const scanEntry: ScanEntry = {
      medicine: String(data.medicine || ''),
      status: String(data.status || ''),
      confidence: String(data.confidence || ''),
      timestamp: new Date().toISOString(), // current time
      location: 'Pune' // fixed location as requested
    };
    
    // Store in scanHistory array
    const historyKey = 'scanHistory';
    const existingHistory = storage.getItem(historyKey);
    let history: ScanEntry[] = [];
    
    if (existingHistory) {
      try {
        history = JSON.parse(existingHistory);
      } catch (parseError) {
        console.warn('Failed to parse scan history, starting fresh:', parseError);
        history = [];
      }
    }
    
    // Add new scan to beginning of array
    history.unshift(scanEntry);
    
    // Keep only last 100 scans to prevent storage overflow
    if (history.length > 100) {
      history = history.slice(0, 100);
    }
    
    const jsonData = JSON.stringify(history);
    const success = storage.setItem(historyKey, jsonData);
    
    if (success) {
      console.log('Scan result stored successfully in scanHistory');
      
      // Also store in scan history for analytics (this maintains existing functionality)
      const enhancedData = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
        scan_id: data.scan_id || generateScanId(),
        location: data.location || 'Unknown'
      };
      storeScanInHistory(enhancedData);
    } else {
      console.warn('Failed to store scan result - storage not available');
    }
    return success;
  } catch (error) {
    console.error('Error storing scan result:', error);
    return false;
  }
};

// Generate unique scan ID
export const generateScanId = (): string => {
  return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get user location (city/area)
export const getUserLocation = async (): Promise<string> => {
  try {
    if (navigator.geolocation) {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false
        });
      });
      
      // Reverse geocoding (simplified - in production, use a proper geocoding API)
      const { latitude, longitude } = position.coords;
      return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    } else {
      return 'Location unavailable';
    }
  } catch (error) {
    console.warn('Location access denied or unavailable:', error);
    return 'Location denied';
  }
};

// Store scan in history for analytics
export const storeScanInHistory = (scanData: StorageData): void => {
  try {
    const historyKey = 'scanHistory';
    const existingHistory = storage.getItem(historyKey);
    let history: StorageData[] = [];
    
    if (existingHistory) {
      try {
        history = JSON.parse(existingHistory);
      } catch (parseError) {
        console.warn('Failed to parse scan history, starting fresh:', parseError);
        history = [];
      }
    }
    
    // Add new scan to history
    history.unshift(scanData);
    
    // Keep only last 100 scans to prevent storage overflow
    if (history.length > 100) {
      history = history.slice(0, 100);
    }
    
    storage.setItem(historyKey, JSON.stringify(history));
    console.log('Scan stored in history for analytics');
    
    // Check for hotspot detection
    checkAndUpdateHotspots(scanData);
  } catch (error) {
    console.error('Error storing scan in history:', error);
  }
};

// Check and update hotspots based on suspicious medicine counts
export const checkAndUpdateHotspots = (scanData: StorageData): void => {
  try {
    // Only check if status is suspicious
    if (scanData.status && (scanData.status as string).toLowerCase() === 'suspicious' && scanData.medicine) {
      const hotspotsKey = 'suspiciousHotspots';
      const existingHotspots = storage.getItem(hotspotsKey);
      let hotspots: Record<string, { count: number; lastDetected: string; medicineName: string }> = {};
      
      if (existingHotspots) {
        try {
          hotspots = JSON.parse(existingHotspots);
        } catch (parseError) {
          console.warn('Failed to parse hotspots, starting fresh:', parseError);
          hotspots = {};
        }
      }
      
      const medicineKey = (scanData.medicine as string).toLowerCase().trim();
      
      // Update count for this medicine
      if (hotspots[medicineKey]) {
        hotspots[medicineKey].count += 1;
        hotspots[medicineKey].lastDetected = new Date().toISOString();
      } else {
        hotspots[medicineKey] = {
          count: 1,
          lastDetected: new Date().toISOString(),
          medicineName: scanData.medicine as string
        };
      }
      
      // Check if this is now a high-risk medicine (more than 3 suspicious detections)
      if (hotspots[medicineKey].count > 3) {
        console.warn(`HIGH RISK MEDICINE DETECTED: ${scanData.medicine} (${hotspots[medicineKey].count} suspicious detections)`);
        
        // Store high-risk alert
        const alertsKey = 'highRiskAlerts';
        const existingAlerts = storage.getItem(alertsKey);
        let alerts: Array<{
          medicineKey: string;
          medicineName: string;
          count: number;
          lastDetected: string;
          alertType: string;
          timestamp: string;
        }> = [];
        
        if (existingAlerts) {
          try {
            alerts = JSON.parse(existingAlerts);
          } catch {
            alerts = [];
          }
        }
        
        // Add new alert if not already present
        const alertExists = alerts.some(alert => 
          alert.medicineKey === medicineKey && alert.count === hotspots[medicineKey].count
        );
        
        if (!alertExists) {
          alerts.unshift({
            medicineKey,
            medicineName: scanData.medicine as string,
            count: hotspots[medicineKey].count,
            lastDetected: hotspots[medicineKey].lastDetected,
            alertType: 'HIGH_RISK_MEDICINE',
            timestamp: new Date().toISOString()
          });
          
          // Keep only last 10 alerts
          if (alerts.length > 10) {
            alerts = alerts.slice(0, 10);
          }
          
          storage.setItem(alertsKey, JSON.stringify(alerts));
        }
      }
      
      storage.setItem(hotspotsKey, JSON.stringify(hotspots));
    }
  } catch (error) {
    console.error('Error checking hotspots:', error);
  }
};

// Get high-risk medicines (hotspots)
export const getHighRiskMedicines = (): Record<string, { count: number; lastDetected: string; medicineName: string }> => {
  try {
    const hotspotsKey = 'suspiciousHotspots';
    const existingHotspots = storage.getItem(hotspotsKey);
    
    if (existingHotspots) {
      const hotspots = JSON.parse(existingHotspots);
      // Return only medicines with count > 3
      const highRisk: Record<string, { count: number; lastDetected: string; medicineName: string }> = {};
      
      Object.entries(hotspots as Record<string, { count: number; lastDetected: string; medicineName: string }>).forEach(([key, data]) => {
        if (data.count > 3) {
          highRisk[key] = data;
        }
      });
      
      return highRisk;
    }
    
    return {};
  } catch (error) {
    console.error('Error retrieving high-risk medicines:', error);
    return {};
  }
};

// Get high-risk alerts
export const getHighRiskAlerts = (): Array<{
  medicineKey: string;
  medicineName: string;
  count: number;
  lastDetected: string;
  alertType: string;
  timestamp: string;
}> => {
  try {
    const alertsKey = 'highRiskAlerts';
    const existingAlerts = storage.getItem(alertsKey);
    
    if (existingAlerts) {
      return JSON.parse(existingAlerts);
    }
    
    return [];
  } catch (error) {
    console.error('Error retrieving high-risk alerts:', error);
    return [];
  }
};

// Get scan history for analytics
export const getScanHistory = (): StorageData[] => {
  try {
    const historyKey = 'scanHistory';
    const existingHistory = storage.getItem(historyKey);
    
    if (existingHistory) {
      return JSON.parse(existingHistory);
    }
    return [];
  } catch (error) {
    console.error('Error retrieving scan history:', error);
    return [];
  }
};

export const getScanResult = (): StorageData | null => {
  try {
    const historyKey = 'scanHistory';
    const data = storage.getItem(historyKey);
    if (data) {
      const history = JSON.parse(data) as StorageData[];
      // Return the most recent scan (first item in array)
      if (history.length > 0) {
        return history[0];
      }
    }
    return null;
  } catch (error) {
    console.error('Error retrieving scan result:', error);
    return null;
  }
};

// Get full scan history for frontend display
export const getFullScanHistory = (): StorageData[] => {
  try {
    const historyKey = 'scanHistory';
    const data = storage.getItem(historyKey);
    if (data) {
      return JSON.parse(data) as StorageData[];
    }
    return [];
  } catch (error) {
    console.error('Error retrieving full scan history:', error);
    return [];
  }
};
