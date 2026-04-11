"use client";

import { useRouter, usePathname } from "next/navigation";
import { FiHome, FiBarChart2, FiPackage, FiFileText, FiActivity, FiCamera, FiMenu, FiX } from "react-icons/fi";
import { useState } from "react";

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
    color: "from-cyan-600 to-blue-600"
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: FiActivity,
    path: "/dashboard",
    color: "from-purple-600 to-pink-600"
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: FiBarChart2,
    path: "/analytics",
    color: "from-green-600 to-teal-600"
  },
  {
    id: "medicines",
    label: "Medicines",
    icon: FiPackage,
    path: "/medicines",
    color: "from-indigo-600 to-purple-600"
  },
  {
    id: "scan",
    label: "Scanner",
    icon: FiCamera,
    path: "/scan",
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: "results",
    label: "Results",
    icon: FiFileText,
    path: "/result",
    color: "from-pink-600 to-rose-600"
  }
];

export default function MobileNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 border-b border-cyan-500/20">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 text-cyan-400 flex-shrink-0 relative">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                {/* Outer hexagon frame */}
                <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="0.5" fill="currentColor" opacity="0.1"/>
                
                {/* Medical cross */}
                <path d="M12 6v12M7 11h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                
                {/* DNA helix */}
                <path d="M8 8c0-1 1-2 2-2s2 1 2 2c0 1-1 2-2 2s-2-1-2-2zM8 16c0-1 1-2 2-2s2 1 2 2c0 1-1 2-2 2s-2-1-2-2z" 
                      stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none"/>
                
                {/* Verification checkmark */}
                <circle cx="18" cy="6" r="1.5" fill="#10b981"/>
                <path d="M17 6l0.5 0.5L18.5 5.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              
              {/* Professional badge effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20 blur-sm"></div>
            </div>
            <span className="text-sm font-bold text-white">AI Health</span>
          </div>

          {/* Menu Button */}
          <button
            onClick={toggleMenu}
            className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 transition-colors"
          >
            {isOpen ? (
              <FiX className="w-5 h-5 text-cyan-400" />
            ) : (
              <FiMenu className="w-5 h-5 text-cyan-400" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={toggleMenu}>
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-gray-900 via-blue-900 to-indigo-900 border-r border-cyan-500/20" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-cyan-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 text-cyan-400 flex-shrink-0 relative">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    {/* Outer hexagon frame */}
                    <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    {/* Medical cross */}
                    <path d="M12 6v12M7 11h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    {/* DNA helix */}
                    <path d="M8 8c0-1 1-2 2-2s2 1 2 2c0 1-1 2-2 2s-2-1-2-2z" 
                          stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none"/>
                    {/* Verification checkmark */}
                    <circle cx="18" cy="6" r="1.5" fill="#10b981"/>
                    <path d="M17 6l0.5 0.5L18.5 5.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20 blur-sm"></div>
                </div>
                <div>
                  <span className="text-lg font-bold text-white">AI Health Surveillance</span>
                  <p className="text-xs text-gray-400">Mobile Navigation</p>
                </div>
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
                    className={`w-full flex items-center justify-start space-x-3 px-4 py-3 rounded-lg transition-all transform hover:scale-105 ${
                      isActive
                        ? `bg-gradient-to-r ${item.color} shadow-lg shadow-cyan-500/25`
                        : "bg-gray-800/50 hover:bg-gray-700/50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? "text-white" : "text-gray-300"
                    }`} />
                    <span className={`font-medium ${
                      isActive ? "text-white" : "text-gray-300"
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cyan-500/20">
              <div className="text-center">
                <p className="text-xs text-gray-400">© 2024 AI Health Surveillance</p>
                <p className="text-xs text-gray-500">Mobile Optimized</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 border-t border-cyan-500/20">
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center p-2 rounded-lg transition-all transform hover:scale-110 ${
                  isActive
                    ? `bg-gradient-to-r ${item.color} shadow-lg shadow-cyan-500/25`
                    : "bg-gray-800/50 hover:bg-gray-700/50"
                }`}
                title={item.label}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? "text-white" : "text-gray-300"
                }`} />
                <span className={`text-xs mt-1 ${
                  isActive ? "text-white" : "text-gray-400"
                }`}>
                  {item.label.length > 8 ? item.label.slice(0, 6) + '...' : item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
