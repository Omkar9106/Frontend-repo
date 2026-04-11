"use client";

import { FiAlertTriangle, FiX, FiAlertCircle, FiInfo } from "react-icons/fi";
import { useAlerts } from "../contexts/AlertContext";

export function AlertBanner() {
  const { alerts, dismissAlert } = useAlerts();

  if (alerts.length === 0) {
    return null;
  }

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "warning":
        return <FiAlertTriangle className="w-5 h-5" />;
      case "error":
        return <FiAlertCircle className="w-5 h-5" />;
      case "info":
        return <FiInfo className="w-5 h-5" />;
      default:
        return <FiAlertTriangle className="w-5 h-5" />;
    }
  };

  const getAlertStyles = (severity: string) => {
    switch (severity) {
      case "warning":
        return "bg-amber-900/20 border-amber-500/30 text-amber-200";
      case "error":
        return "bg-red-900/20 border-red-500/30 text-red-200";
      case "info":
        return "bg-blue-900/20 border-blue-500/30 text-blue-200";
      default:
        return "bg-gray-900/20 border-gray-500/30 text-gray-200";
    }
  };

  const getIconColor = (severity: string) => {
    switch (severity) {
      case "warning":
        return "text-amber-400";
      case "error":
        return "text-red-400";
      case "info":
        return "text-blue-400";
      default:
        return "text-gray-400";
    }
  };

  // Show only the most important alert (area-wide alert first, then others)
  const primaryAlert = alerts.find(alert => alert.id === "area-wide-high-risk") || alerts[0];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-pulse">
      <div className={`border-b ${getAlertStyles(primaryAlert.severity)}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`${getIconColor(primaryAlert.severity)}`}>
                {getAlertIcon(primaryAlert.severity)}
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {primaryAlert.message}
                </p>
                {alerts.length > 1 && (
                  <p className="text-sm opacity-75 mt-1">
                    {alerts.length - 1} more alert{alerts.length > 2 ? 's' : ''} available
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {primaryAlert.dismissible && (
                <button
                  onClick={() => dismissAlert(primaryAlert.id)}
                  className={`p-1 rounded hover:bg-black/20 transition-colors ${getIconColor(primaryAlert.severity)}`}
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompactAlertBanner() {
  const { alerts, dismissAlert } = useAlerts();

  if (alerts.length === 0) {
    return null;
  }

  const primaryAlert = alerts.find(alert => alert.id === "area-wide-high-risk") || alerts[0];

  return (
    <div className={`border-l-4 border-amber-500 bg-amber-900/20 p-3 rounded-r-lg mb-4`}>
      <div className="flex items-center gap-2">
        <FiAlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <p className="text-amber-200 text-sm font-medium">
          {primaryAlert.message}
        </p>
        {primaryAlert.dismissible && (
          <button
            onClick={() => dismissAlert(primaryAlert.id)}
            className="ml-auto text-amber-400 hover:text-amber-300"
          >
            <FiX className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
