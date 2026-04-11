"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FiHome, FiCamera, FiBarChart2, FiSettings, FiShield, FiActivity, FiUsers, FiFileText, FiTrendingUp } from "react-icons/fi";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  badge?: string;
}

export default function NavigationLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timeoutId);
  }, []);

  const navigationItems: NavItem[] = [
    {
      name: "Home",
      href: "/",
      icon: <FiHome className="w-5 h-5" />,
      description: "Welcome to PhillSafe"
    },
    {
      name: "Scanner",
      href: "/scan",
      icon: <FiCamera className="w-5 h-5" />,
      description: "Upload and scan medicine images",
      badge: "New"
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <FiBarChart2 className="w-5 h-5" />,
      description: "View analytics and scan history"
    },
        {
      name: "Analytics",
      href: "/analytics",
      icon: <FiTrendingUp className="w-5 h-5" />,
      description: "Detailed insights and reports"
    },
    {
      name: "Medicines",
      href: "/medicines",
      icon: <FiFileText className="w-5 h-5" />,
      description: "Medicine database and verification"
    },
    {
      name: "Users",
      href: "/users",
      icon: <FiUsers className="w-5 h-5" />,
      description: "User management and activity"
    },
    {
      name: "Settings",
      href: "/settings",
      icon: <FiSettings className="w-5 h-5" />,
      description: "Application settings"
    }
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-indigo-950">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className={`w-64 bg-gray-900/50 backdrop-blur-lg border-r border-cyan-500/20 min-h-screen transition-all duration-300 ${
          isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'
        }`}>
          <div className="p-6">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                <FiShield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">PhillSafe</h1>
                <p className="text-xs text-gray-400">Medicine Verification System</p>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-200 group ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`transition-transform duration-200 group-hover:scale-110 ${
                        isActive(item.href) ? 'text-white' : 'text-cyan-400'
                      }`}>
                        {item.icon}
                      </div>
                      <div>
                        <div className={`font-medium ${
                          isActive(item.href) ? 'text-white' : 'text-gray-200'
                        }`}>
                          {item.name}
                        </div>
                        <div className={`text-xs ${
                          isActive(item.href) ? 'text-cyan-100' : 'text-gray-400'
                        }`}>
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {item.badge && (
                      <div className={`px-2 py-1 text-xs rounded-full ${
                        isActive(item.href)
                          ? 'bg-white text-cyan-600'
                          : 'bg-cyan-500 text-white'
                      }`}>
                        {item.badge}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Bottom Section */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-4 border border-gray-700">
                <div className="flex items-center space-x-2 text-gray-300">
                  <FiActivity className="w-4 h-4 text-green-400" />
                  <span className="text-sm">System Active</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {/* Top Bar */}
          <header className="bg-gray-900/30 backdrop-blur-lg border-b border-cyan-500/20 px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-gray-300">
                  <span className="text-sm text-gray-400">Current Page:</span>
                  <span className="ml-2 font-medium text-white">
                    {navigationItems.find(item => item.href === pathname)?.name || 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Quick Actions */}
                <button
                  onClick={() => router.push('/scan')}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2"
                >
                  <FiCamera className="w-4 h-4" />
                  <span>Quick Scan</span>
                </button>
                
                <button className="p-2 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200">
                  <FiSettings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
