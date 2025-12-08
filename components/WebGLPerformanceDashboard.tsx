'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { WebGLPerformanceMonitor, WebGLPerformanceMetrics, shaderCache, geometryCache, materialCache } from '@/lib/webglOptimizations';

interface WebGLPerformanceDashboardProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function WebGLPerformanceDashboard({ 
  enabled = process.env.NODE_ENV === 'development',
  position = 'top-right'
}: WebGLPerformanceDashboardProps) {
  const { gl } = useThree();
  const monitorRef = useRef<WebGLPerformanceMonitor | null>(null);
  const [metrics, setMetrics] = useState<WebGLPerformanceMetrics | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // Create and start monitor
    const monitor = new WebGLPerformanceMonitor();
    monitor.start(gl);
    monitorRef.current = monitor;

    // Update metrics every 500ms
    const interval = setInterval(() => {
      const currentMetrics = monitor.getMetrics();
      if (currentMetrics) {
        setMetrics(currentMetrics);
      }
    }, 500);

    // Toggle visibility with 'P' key
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        if (e.ctrlKey || e.metaKey) {
          setVisible(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      clearInterval(interval);
      monitor.stop();
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [enabled, gl]);

  if (!enabled || !visible || !metrics) return null;

  const positionStyles = {
    'top-left': { top: '1rem', left: '1rem' },
    'top-right': { top: '1rem', right: '1rem' },
    'bottom-left': { bottom: '1rem', left: '1rem' },
    'bottom-right': { bottom: '1rem', right: '1rem' },
  };

  const fpsColor = metrics.fps >= 58 
    ? 'text-green-400' 
    : metrics.fps >= 45 
    ? 'text-yellow-400' 
    : 'text-red-400';

  return (
    <Html
      center={false}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9999,
        ...positionStyles[position],
      }}
      portal={{ current: document.body }}
    >
      <div
        className="bg-black/80 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 font-mono text-xs text-white shadow-lg"
        style={{ minWidth: '200px', pointerEvents: 'auto' }}
      >
      <div className="flex items-center justify-between mb-2 border-b border-cyan-500/20 pb-1">
        <span className="text-cyan-400 font-bold">WebGL Performance</span>
        <button
          onClick={() => setVisible(false)}
          className="text-gray-400 hover:text-white"
          aria-label="Close performance dashboard"
        >
          ×
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">FPS:</span>
          <span className={fpsColor}>{metrics.fps}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Frame Time:</span>
          <span className="text-white">{metrics.frameTime.toFixed(2)}ms</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Draw Calls:</span>
          <span className="text-white">{metrics.drawCalls}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Triangles:</span>
          <span className="text-white">{metrics.triangles.toLocaleString()}</span>
        </div>

        <div className="mt-2 pt-2 border-t border-cyan-500/20">
          <div className="text-cyan-400 text-xs mb-1">Memory:</div>
          <div className="flex justify-between pl-2">
            <span className="text-gray-400">Geometries:</span>
            <span className="text-white">{metrics.memory.geometries}</span>
          </div>
          <div className="flex justify-between pl-2">
            <span className="text-gray-400">Textures:</span>
            <span className="text-white">{metrics.memory.textures}</span>
          </div>
          <div className="flex justify-between pl-2">
            <span className="text-gray-400">Programs:</span>
            <span className="text-white">{metrics.memory.programs}</span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-cyan-500/20">
          <div className="text-cyan-400 text-xs mb-1">Cache Stats:</div>
          <div className="flex justify-between pl-2 text-xs">
            <span className="text-gray-400">Shaders:</span>
            <span className="text-white">{shaderCache.getStats().cachedShaders}</span>
          </div>
          <div className="flex justify-between pl-2 text-xs">
            <span className="text-gray-400">Geometries:</span>
            <span className="text-white">{geometryCache.getStats().cachedGeometries}</span>
          </div>
          <div className="flex justify-between pl-2 text-xs">
            <span className="text-gray-400">Materials:</span>
            <span className="text-white">{materialCache.getStats().cachedMaterials}</span>
          </div>
        </div>

        {monitorRef.current && (
          <div className="mt-2 pt-2 border-t border-cyan-500/20">
            <div className="text-gray-500 text-xs">
              Press Ctrl+P to toggle
            </div>
          </div>
        )}
      </div>
    </div>
    </Html>
  );
}

