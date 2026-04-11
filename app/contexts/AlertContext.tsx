"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getHighRiskAlerts } from "../utils/storage";

interface Alert {
  id: string;
  type: "HIGH_RISK_MEDICINE";
  message: string;
  severity: "warning" | "error" | "info";
  timestamp: string;
  dismissible: boolean;
}

interface AlertContextType {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, "id" | "timestamp">) => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
  refreshAlerts: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlerts must be used within AlertProvider");
  }
  return context;
}

interface AlertProviderProps {
  children: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const refreshAlerts = () => {
    try {
      const highRiskAlerts = getHighRiskAlerts();
      
      if (highRiskAlerts.length > 0) {
        const newAlerts: Alert[] = highRiskAlerts.map((alert) => ({
          id: `high-risk-${alert.medicineKey}-${alert.count}`,
          type: "HIGH_RISK_MEDICINE" as const,
          message: `High risk medicine detected: ${alert.medicineName} (${alert.count} suspicious detections)`,
          severity: "warning" as const,
          timestamp: alert.timestamp,
          dismissible: true
        }));

        // Add area-wide alert if there are high-risk medicines
        const areaAlert: Alert = {
          id: "area-wide-high-risk",
          type: "HIGH_RISK_MEDICINE",
          message: "High risk medicine detected in your area",
          severity: "warning",
          timestamp: new Date().toISOString(),
          dismissible: false
        };

        setAlerts([areaAlert, ...newAlerts]);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error("Error refreshing alerts:", error);
    }
  };

  const addAlert = (alert: Omit<Alert, "id" | "timestamp">) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    setAlerts(prev => [...prev, newAlert]);
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  // Check for alerts on mount and periodically
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshAlerts();
    }, 0);

    // Refresh alerts every 30 seconds
    const interval = setInterval(refreshAlerts, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Listen for storage events (cross-tab communication)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'highRiskAlerts' || e.key === 'suspiciousHotspots') {
        refreshAlerts();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value: AlertContextType = {
    alerts,
    addAlert,
    dismissAlert,
    clearAlerts,
    refreshAlerts
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
}
