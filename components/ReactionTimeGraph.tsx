'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ReactionTimeGraphProps {
  reactionTimes: number[];
  duration: number; // Game duration in milliseconds
  className?: string;
}

/**
 * ReactionTimeGraph component - Visualizes reaction times over game duration
 */
export function ReactionTimeGraph({
  reactionTimes,
  duration,
  className,
}: ReactionTimeGraphProps) {
  const graphData = useMemo(() => {
    if (reactionTimes.length === 0 || duration === 0) {
      return { points: [], maxTime: 1000, minTime: 0 };
    }

    // Calculate time points for each reaction (relative to game start)
    // Since we don't have exact timestamps, distribute evenly across duration
    const points = reactionTimes.map((time, index) => {
      const x = (index / Math.max(reactionTimes.length - 1, 1)) * 100; // Percentage of game duration
      return { x, y: time };
    });

    const maxTime = Math.max(...reactionTimes, 1000);
    const minTime = Math.min(...reactionTimes, 0);
    const padding = (maxTime - minTime) * 0.1; // 10% padding

    return {
      points,
      maxTime: maxTime + padding,
      minTime: Math.max(0, minTime - padding),
    };
  }, [reactionTimes, duration]);

  if (reactionTimes.length === 0) {
    return (
      <div
        className={cn(
          'h-32 flex items-center justify-center text-muted-foreground text-sm',
          className
        )}
      >
        No reaction time data available
      </div>
    );
  }

  const { points, maxTime, minTime } = graphData;
  const range = maxTime - minTime;

  // Generate SVG path for the line
  const pathData = points
    .map((point, index) => {
      const x = point.x;
      const y = 100 - ((point.y - minTime) / range) * 100; // Invert Y for SVG coordinates
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Generate area path (for fill)
  const areaPath = `${pathData} L 100 100 L 0 100 Z`;

  // Calculate average line
  const average = reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length;
  const avgY = 100 - ((average - minTime) / range) * 100;

  return (
    <div className={cn('relative', className)}>
      <div className="h-24 w-full border-2 pixel-border" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.3)' }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="#3E7CAC"
                strokeWidth="0.2"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Area fill */}
          <path
            d={areaPath}
            fill="rgba(62, 124, 172, 0.2)"
            stroke="none"
          />

          {/* Average line */}
          <line
            x1="0"
            y1={avgY}
            x2="100"
            y2={avgY}
            stroke="#3E7CAC"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            opacity="0.6"
          />

          {/* Main line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3E7CAC"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => {
            const y = 100 - ((point.y - minTime) / range) * 100;
            const isFast = point.y < 300;
            const isSlow = point.y > 500;
            
            return (
              <circle
                key={index}
                cx={point.x}
                cy={y}
                r="0.8"
                fill={isFast ? '#00ff88' : isSlow ? '#ff4444' : '#3E7CAC'}
                stroke="rgba(0, 0, 0, 0.5)"
                strokeWidth="0.2"
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
            <span>&lt;300ms</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3E7CAC' }} />
            <span>300-500ms</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#ff4444]" />
            <span>&gt;500ms</span>
          </div>
        </div>
        <div className="text-foreground/60">
          Avg: {Math.round(average)}ms
        </div>
      </div>
    </div>
  );
}

