"use client";

import { useRouter, usePathname } from "next/navigation";
import { FiHome, FiBarChart2, FiPackage, FiFileText, FiActivity, FiCamera, FiMenu, FiX } from "react-icons/fi";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Close menu when route changes
    setTimeout(() => setIsMenuOpen(false), 0);
  }, [pathname]);

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 border-b border-cyan-500/20 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 text-cyan-400 flex-shrink-0 relative">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="0.5" fill="currentColor" opacity="0.1"/>
                <path d="M12 6v12M7 11h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8 8c0-1 1-2 2-2s2 1 2 2c0 1-1 2-2 2s-2-1-2-2zM8 16c0-1 1-2 2-2s2 1 2 2c0 1-1 2-2 2s-2-1-2-2z" 
                      stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none"/>
                <circle cx="18" cy="6" r="1.5" fill="#10b981"/>
                <path d="M17 6l0.5 0.5L18.5 5.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20 blur-sm"></div>
            </div>
            <span className="text-lg font-bold text-white">PillSafe</span>
          </div>

          {/* Menu Toggle */}
          <button
            onClick={toggleMenu}
            className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <FiX className="w-5 h-5 text-cyan-400" />
            ) : (
              <FiMenu className="w-5 h-5 text-cyan-400" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={toggleMenu}
          />
          
          {/* Menu Panel */}
          <div className="fixed right-0 top-0 h-full w-80 max-w-[85vw] bg-gradient-to-b from-gray-900 via-blue-900 to-indigo-900 border-l border-cyan-500/20 shadow-2xl transform transition-transform duration-300 ease-out">
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 text-cyan-400 flex-shrink-0 relative">
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                      <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M12 6v12M7 11h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M8 8c0-1 1-2 2-2s2 1 2 2c0 1-1 2-2 2s-2-1-2-2zM8 16c0-1 1-2 2-2s2 1 2 2c0 1-1 2-2 2s-2-1-2-2z" 
                            stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none"/>
                      <circle cx="18" cy="6" r="1.5" fill="#10b981"/>
                      <path d="M17 6l0.5 0.5L18.5 5.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20 blur-sm"></div>
                  </div>
                  <span className="text-lg font-bold text-white">PillSafe</span>
                </div>
                <button
                  onClick={toggleMenu}
                  className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 transition-colors"
                  aria-label="Close menu"
                >
                  <FiX className="w-5 h-5 text-cyan-400" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
                      {item.id === 'medicines' ? (
                        <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? "text-white" : "text-gray-300"
                        }`}>
                          <path d="M12 2L3 7v10l9 5 9-5V7z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M12 6v12M7 11h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M8 8c0-1 1-2 2-2s2 1 2 2c0 1-1 2-2 2s-2-1-2-2z" 
                                stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none"/>
                        </svg>
                      ) : (
                        <Icon className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? "text-white" : "text-gray-300"
                        }`} />
                      )}
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
              <div className="p-4 border-t border-cyan-500/20">
                <div className="text-center">
                  <p className="text-xs text-gray-400">© 2024 PillSafe</p>
                  <p className="text-xs text-gray-500">AI Health Surveillance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add top padding to content to account for fixed header */}
      <div className="h-16"></div>
    </>
  );
}
