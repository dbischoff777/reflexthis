'use client';

import { useEffect, useState } from 'react';

/**
 * CRTOverlay component provides a global CRT monitor effect
 * over the entire application, including scanlines, curvature, and vignette.
 */
export function CRTOverlay() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden crt-overlay">
      {/* Scanlines */}
      <div className="absolute inset-0 crt-scanlines" />
      
      {/* Vignette / Curvature Shadow */}
      <div 
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 0 100px 20px rgba(0, 0, 0, 0.4)',
        }}
      />
      
    </div>
  );
}

