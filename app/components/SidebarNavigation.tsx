"use client";

import { useRouter, usePathname } from "next/navigation";
import { FiHome, FiBarChart2, FiPackage, FiFileText, FiActivity, FiCamera, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useState, useEffect } from "react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
}

const navItems: NavItem[] = [
  {
    id: "home",
    label: "Home",
    icon: FiHome,
    path: "/",
    color: "from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: FiActivity,
    path: "/dashboard",
    color: "from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: FiBarChart2,
    path: "/analytics",
    color: "from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
  },
  {
    id: "medicines",
    label: "Medicines",
    icon: FiPackage,
    path: "/medicines",
    color: "from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
  },
  {
    id: "scan",
    label: "Scanner",
    icon: FiCamera,
    path: "/scan",
    color: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
  },
  {
    id: "results",
    label: "Results",
    icon: FiFileText,
    path: "/result",
    color: "from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
  }
];

export default function SidebarNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Don't render sidebar on mobile
  if (isMobile) {
    return null;
  }

  return (
    <div className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-indigo-900 border-r border-cyan-500/20 transition-all duration-300 z-50 ${
      isCollapsed ? "w-20" : "w-64"
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-3 ${isCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 text-cyan-400 flex-shrink-0 relative">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                {/* Outer hexagon frame - professional structure */}
                <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="0.5" fill="currentColor" opacity="0.1"/>
                
                {/* Medical cross - professional healthcare symbol */}
                <path d="M12 6v12M7 11h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                
                {/* DNA helix - biotechnology element */}
                <path d="M8 8c0-1 1-2 2-2s2 1 2 2c0 1-1 2-2 2s-2-1-2-2zM8 16c0-1 1-2 2-2s2 1 2 2c0 1-1 2-2 2s-2-1-2-2z" 
                      stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none"/>
                
                {/* Verification checkmark */}
                <circle cx="18" cy="6" r="1.5" fill="#10b981"/>
                <path d="M17 6l0.5 0.5L18.5 5.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              
              {/* Professional badge effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20 blur-sm"></div>
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold text-white">AI Health Surveillance System</span>
            )}
          </div>
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 transition-colors"
          >
            {isCollapsed ? (
              <FiChevronRight className="w-4 h-4 text-cyan-400" />
            ) : (
              <FiChevronLeft className="w-4 h-4 text-cyan-400" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center ${isCollapsed ? "justify-center" : "justify-start"} space-x-3 px-4 py-3 rounded-lg transition-all transform hover:scale-105 ${
                isActive
                  ? `bg-gradient-to-r ${item.color} shadow-lg shadow-cyan-500/25`
                  : "bg-gray-800/50 hover:bg-gray-700/50"
              }`}
              title={isCollapsed ? item.label : ""}
            >
              {item.id === 'medicines' ? (
                <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? "text-white" : "text-gray-300"
                }`}>
                  {/* Hexagon frame - professional structure */}
                  <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  {/* Medical cross */}
                  <path d="M12 6v12M7 11h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  {/* DNA helix - biotechnology */}
                  <path d="M8 8c0-1 1-2 2-2s2 1 2 2c0 1-1 2-2 2s-2-1-2-2z" 
                        stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none"/>
                </svg>
              ) : (
                <Icon className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? "text-white" : "text-gray-300"
                }`} />
              )}
              {!isCollapsed && (
                <span className={`font-medium ${
                  isActive ? "text-white" : "text-gray-300"
                }`}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cyan-500/20">
        <div className={`text-center ${isCollapsed ? "hidden" : ""}`}>
          <p className="text-xs text-gray-400">© 2026 AI Health Surveillance System</p>
          <p className="text-xs text-gray-500">AI Health Surveillance System</p>
        </div>
        {isCollapsed && (
          <div className="text-center">
            <div className="w-6 h-6 text-cyan-400 mx-auto relative">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                {/* Hexagon frame */}
                <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                {/* Medical cross */}
                <path d="M12 6v12M7 11h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                {/* Verification badge */}
                <circle cx="18" cy="6" r="1" fill="#10b981"/>
              </svg>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20 blur-sm"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
