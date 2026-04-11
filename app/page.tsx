"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiShield, FiDatabase, FiActivity, FiCpu, FiCloud, FiZap, FiArrowRight } from "react-icons/fi";

export default function Home() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timeoutId);
  }, []);

  const features = [
    { icon: FiShield, title: "Health Protection", description: "Advanced AI algorithms for medicine verification and safety" },
    { icon: FiDatabase, title: "Smart Analytics", description: "Comprehensive health data management and trend analysis" },
    { icon: FiActivity, title: "Real-time Surveillance", description: "24/7 health monitoring and instant counterfeit detection" },
    { icon: FiCpu, title: "AI-Powered Detection", description: "Machine learning for predictive health threat analysis" },
    { icon: FiCloud, title: "Global Health Network", description: "Connected surveillance system for public health safety" },
    { icon: FiZap, title: "Instant Results", description: "Rapid analysis for immediate health decisions" }
  ];

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Hero Section */}
      <section className="relative z-10 px-8 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                AI Health Surveillance
              </span>
              <br />
              <span className="text-2xl md:text-3xl text-gray-300 font-light">for Public Health Safety</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Experience the future of health protection with AI-powered surveillance, real-time medicine verification, and advanced counterfeit detection.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <button
                onClick={() => router.push('/scan')}
                className="btn-classic px-8 py-4 text-lg font-semibold flex items-center gap-3 group"
              >
                <FiShield className="w-6 h-6" />
                Start Scanning
                <FiArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="glass-morphism px-8 py-4 text-lg font-semibold text-white hover:border-emerald-500/50 transition-all"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            Why Choose <span className="text-emerald-400">AI Health Surveillance System</span>?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card-classic p-8 text-center group cursor-pointer hover:scale-105 transition-all duration-300">
                <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-emerald-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="glass-morphism p-12 rounded-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-emerald-400 mb-2">99.9%</div>
                <div className="text-gray-300">Detection Accuracy</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-400 mb-2">24/7</div>
                <div className="text-gray-300">Health Surveillance</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-amber-400 mb-2">1M+</div>
                <div className="text-gray-300">Lives Protected</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="card-classic p-12">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to Protect Your <span className="text-emerald-400">Public Health</span>?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join millions of users who trust AI Health Surveillance System for their health surveillance and medicine verification needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/scan')}
                className="btn-classic px-6 py-3"
              >
                Get Started Free
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="glass-morphism px-6 py-3 text-white hover:border-blue-500/50 transition-all"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-12">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-gray-400">
            © 2024 AI Health Surveillance System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
