import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/animations.css";
import SidebarNavigation from "./components/SidebarNavigation";
import MobileNavigation from "./components/MobileNavigation";
import { AlertProvider } from "./contexts/AlertContext";
import { AlertBanner } from "./components/AlertBanner";
import ResponsiveTest from "./components/ResponsiveTest";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Health Surveillance System",
  description: "Advanced AI-powered health surveillance system for medicine verification, counterfeit detection, and public health monitoring.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col antialiased bg-animated-gradient`}>
      <AlertProvider>
        {/* Alert Banner - Fixed at top */}
        <AlertBanner />
        
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/10 rounded-full mix-blend-multiply filter blur-xl floating-orb"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-xl floating-orb animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-amber-500/10 rounded-full mix-blend-multiply filter blur-xl floating-orb animation-delay-4000"></div>
          <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-purple-500/10 rounded-full rotating-element"></div>
          <div className="absolute bottom-1/3 left-1/4 w-24 h-24 bg-pink-500/10 rounded-full rotating-element animation-delay-1000"></div>
        </div>
        
        <div className="relative z-10 flex flex-1">
          <MobileNavigation />
          <SidebarNavigation />
          <main className="flex-1 ml-0 md:ml-64 transition-all duration-300 pt-16 md:pt-0">
            {children}
          </main>
          <ResponsiveTest />
        </div>
      </AlertProvider>
    </body>
    </html>
  );
}
