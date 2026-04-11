"use client";

import { FiCheckCircle, FiAlertCircle, FiAlertTriangle } from "react-icons/fi";

interface StatusAnimationProps {
  status: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function StatusAnimation({ status, size = 'medium', className = "" }: StatusAnimationProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  const animationClasses = {
    real: 'animate-pulse-emerald',
    fake: 'animate-shake-red',
    suspicious: 'animate-glow-amber'
  };

  const iconColors = {
    real: 'text-emerald-400',
    fake: 'text-red-500',
    suspicious: 'text-amber-500'
  };

  const getIcon = () => {
    switch (status.toLowerCase()) {
      case 'real':
        return <FiCheckCircle className={`${sizeClasses[size]} ${iconColors.real} ${animationClasses.real}`} />;
      case 'fake':
        return <FiAlertCircle className={`${sizeClasses[size]} ${iconColors.fake} ${animationClasses.fake}`} />;
      case 'suspicious':
        return <FiAlertTriangle className={`${sizeClasses[size]} ${iconColors.suspicious} ${animationClasses.suspicious}`} />;
      default:
        return <FiAlertCircle className={`${sizeClasses[size]} text-gray-400`} />;
    }
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {getIcon()}
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className = "", showIcon = true }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case 'real':
        return {
          bg: 'bg-emerald-500/20',
          border: 'border-emerald-500/50',
          text: 'text-emerald-300',
          animation: 'animate-pulse-emerald',
          label: 'AUTHENTIC'
        };
      case 'fake':
        return {
          bg: 'bg-red-500/20',
          border: 'border-red-500/50',
          text: 'text-red-300',
          animation: 'animate-shake-red',
          label: 'COUNTERFEIT'
        };
      case 'suspicious':
        return {
          bg: 'bg-amber-500/20',
          border: 'border-amber-500/50',
          text: 'text-amber-300',
          animation: 'animate-glow-amber',
          label: 'SUSPICIOUS'
        };
      default:
        return {
          bg: 'bg-gray-500/20',
          border: 'border-gray-500/50',
          text: 'text-gray-300',
          animation: '',
          label: 'UNKNOWN'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${config.bg} ${config.border} ${config.animation} ${className}`}>
      {showIcon && <StatusAnimation status={status} size="small" />}
      <span className={`font-semibold text-sm ${config.text}`}>
        {config.label}
      </span>
    </div>
  );
}

interface StatusCardProps {
  status: string;
  children: React.ReactNode;
  className?: string;
}

export function StatusCard({ status, children, className = "" }: StatusCardProps) {
  const getCardAnimation = () => {
    switch (status.toLowerCase()) {
      case 'real':
        return 'animate-card-pulse-green';
      case 'fake':
        return 'animate-card-shake-red';
      case 'suspicious':
        return 'animate-card-glow-yellow';
      default:
        return '';
    }
  };

  return (
    <div className={`relative ${getCardAnimation()} ${className}`}>
      {children}
    </div>
  );
}

interface ConfidenceBarProps {
  confidence: string;
  status: string;
  className?: string;
}

export function ConfidenceBar({ confidence, status, className = "" }: ConfidenceBarProps) {
  const confidenceValue = parseInt(confidence.replace('%', ''));
  const getBarAnimation = () => {
    switch (status.toLowerCase()) {
      case 'real':
        return 'animate-bar-pulse-green';
      case 'fake':
        return 'animate-bar-pulse-red';
      case 'suspicious':
        return 'animate-bar-pulse-yellow';
      default:
        return '';
    }
  };

  const getBarColor = () => {
    if (status.toLowerCase() === 'real') return 'bg-gradient-to-r from-green-500 to-emerald-600';
    if (status.toLowerCase() === 'fake') return 'bg-gradient-to-r from-red-500 to-orange-600';
    return 'bg-gradient-to-r from-yellow-500 to-amber-600';
  };

  return (
    <div className={`w-full h-3 bg-gray-700 rounded-full overflow-hidden ${className}`}>
      <div 
        className={`h-full transition-all duration-1000 ease-out rounded-full ${getBarColor()} ${getBarAnimation()}`}
        style={{ width: `${confidenceValue}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
      </div>
    </div>
  );
}
