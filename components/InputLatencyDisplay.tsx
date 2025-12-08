'use client';

import { useEffect, useState } from 'react';
import { InputLatencyMonitor } from '@/lib/inputBuffer';

interface InputLatencyDisplayProps {
  latencyMonitor: InputLatencyMonitor | null;
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Input latency display component for developer mode
 * Shows real-time input-to-visual-feedback latency metrics
 */
export function InputLatencyDisplay({
  latencyMonitor,
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-left',
}: InputLatencyDisplayProps) {
  const [stats, setStats] = useState<ReturnType<InputLatencyMonitor['getStats']> | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || !latencyMonitor) return;

    // Update stats every 500ms
    const interval = setInterval(() => {
      const currentStats = latencyMonitor.getStats();
      setStats(currentStats);
    }, 500);

    // Toggle visibility with 'P' key (same as performance dashboard)
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
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [enabled, latencyMonitor]);

  if (!enabled || !visible || !stats || stats.samples === 0) return null;

  const positionStyles = {
    'top-left': { top: '1rem', left: '1rem' },
    'top-right': { top: '1rem', right: '1rem' },
    'bottom-left': { bottom: '1rem', left: '1rem' },
    'bottom-right': { bottom: '1rem', right: '1rem' },
  };

  const getLatencyColor = (latency: number): string => {
    if (latency < 16) return 'text-green-400'; // < 1 frame at 60fps
    if (latency < 33) return 'text-yellow-400'; // < 2 frames
    return 'text-red-400'; // >= 2 frames
  };

  return (
    <div
      className="bg-black/80 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 font-mono text-xs text-white shadow-lg fixed z-[9999]"
      style={{ minWidth: '200px', ...positionStyles[position] }}
    >
      <div className="flex items-center justify-between mb-2 border-b border-cyan-500/20 pb-1">
        <span className="text-cyan-400 font-bold">Input Latency</span>
        <button
          onClick={() => setVisible(false)}
          className="text-gray-400 hover:text-white"
          aria-label="Close latency display"
        >
          ×
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Average:</span>
          <span className={getLatencyColor(stats.average)}>
            {stats.average.toFixed(2)}ms
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Min:</span>
          <span className={getLatencyColor(stats.min)}>
            {stats.min.toFixed(2)}ms
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Max:</span>
          <span className={getLatencyColor(stats.max)}>
            {stats.max.toFixed(2)}ms
          </span>
        </div>

        <div className="mt-2 pt-2 border-t border-cyan-500/20">
          <div className="text-cyan-400 text-xs mb-1">Percentiles:</div>
          <div className="flex justify-between pl-2 text-xs">
            <span className="text-gray-400">P50:</span>
            <span className={getLatencyColor(stats.p50)}>
              {stats.p50.toFixed(2)}ms
            </span>
          </div>
          <div className="flex justify-between pl-2 text-xs">
            <span className="text-gray-400">P95:</span>
            <span className={getLatencyColor(stats.p95)}>
              {stats.p95.toFixed(2)}ms
            </span>
          </div>
          <div className="flex justify-between pl-2 text-xs">
            <span className="text-gray-400">P99:</span>
            <span className={getLatencyColor(stats.p99)}>
              {stats.p99.toFixed(2)}ms
            </span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-cyan-500/20">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Samples:</span>
            <span className="text-white">{stats.samples}</span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-cyan-500/20">
          <div className="text-gray-500 text-xs">
            Press Ctrl+P to toggle
          </div>
        </div>
      </div>
    </div>
  );
}

