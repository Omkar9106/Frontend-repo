"use client";

import { useState, useEffect } from "react";

export default function ResponsiveTest() {
  const [screenSize, setScreenSize] = useState({
    width: 0,
    height: 0,
    isMobile: false
  });

  useEffect(() => {
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 768
      });
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);

    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white p-2 rounded-lg text-xs">
      <div>W: {screenSize.width}px</div>
      <div>H: {screenSize.height}px</div>
      <div className={screenSize.isMobile ? "text-red-400" : "text-green-400"}>
        {screenSize.isMobile ? "Mobile" : "Desktop"}
      </div>
    </div>
  );
}
