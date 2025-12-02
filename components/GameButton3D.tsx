'use client';

import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/hapticUtils';

export interface GameButton3DProps {
  id: number;
  highlighted?: boolean;
  onPress?: () => void;
  highlightStartTime?: number;
  highlightDuration?: number;
  pressFeedback?: 'correct' | 'incorrect' | null;
}

// Base button depth when not active
const BASE_DEPTH = 8;
// Maximum depth when fully highlighted
const MAX_DEPTH = 32;
// Pressed depth (pushed into surface)
const PRESSED_DEPTH = 4;

/**
 * GameButton3D - A true 3D button that GROWS in depth when highlighted
 * The button extrudes outward, with visible sides that increase in height
 */
export const GameButton3D = memo(function GameButton3D({
  id,
  highlighted = false,
  onPress,
  highlightStartTime,
  highlightDuration,
  pressFeedback,
}: GameButton3DProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastPressTimeRef = useRef<number>(0);
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverGlowIntensity, setHoverGlowIntensity] = useState(0);
  const [ripplePosition, setRipplePosition] = useState<{ x: number; y: number } | null>(null);
  const [progress, setProgress] = useState(100);
  const hoverGlowRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_DELAY = 100;

  // Track countdown progress
  useEffect(() => {
    if (!highlightStartTime || !highlightDuration || highlightDuration <= 0 || !highlighted) {
      setProgress(100);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - highlightStartTime;
      const newProgress = Math.max(0, ((highlightDuration - elapsed) / highlightDuration) * 100);
      setProgress(newProgress);
    }, 16);

    return () => clearInterval(interval);
  }, [highlightStartTime, highlightDuration, highlighted]);

  // Reset press feedback after animation
  useEffect(() => {
    if (pressFeedback) {
      const timer = setTimeout(() => setIsPressed(false), 300);
      return () => clearTimeout(timer);
    }
  }, [pressFeedback]);

  // Reset when highlight removed
  useEffect(() => {
    if (!highlighted && !pressFeedback) {
      setIsPressed(false);
      setProgress(100);
    }
  }, [highlighted, pressFeedback]);

  // Debounced press handler
  const handlePress = useCallback((event?: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    const now = Date.now();
    if (now - lastPressTimeRef.current < DEBOUNCE_DELAY) return;
    lastPressTimeRef.current = now;
    
    triggerHaptic('light');
    setIsPressed(true);
    
    if (buttonRef.current && event) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = 'touches' in event ? event.touches[0].clientX - rect.left : event.clientX - rect.left;
      const y = 'touches' in event ? event.touches[0].clientY - rect.top : event.clientY - rect.top;
      setRipplePosition({ x, y });
      setTimeout(() => setRipplePosition(null), 600);
    }
    
    onPress?.();
  }, [onPress]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLButtonElement>) => handlePress(e), [handlePress]);
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => handlePress(e), [handlePress]);
  const handleDragStart = useCallback((e: React.DragEvent<HTMLButtonElement>) => { e.preventDefault(); e.stopPropagation(); return false; }, []);
  
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    if (e.button !== 0) { e.preventDefault(); e.stopPropagation(); }
  }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (mouseDownPosRef.current) {
      const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);
      if (deltaX > 5 || deltaY > 5) { e.preventDefault(); e.stopPropagation(); }
    }
  }, []);
  const handleMouseUp = useCallback(() => { mouseDownPosRef.current = null; }, []);
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); e.stopPropagation(); return false; }, []);
  
  // Hover handlers - create pulsing glow effect without affecting size
  const handleMouseEnter = useCallback(() => {
    // Don't show hover effect if already highlighted or has feedback
    if (highlighted || pressFeedback) return;
    
    setIsHovered(true);
    
    // Start with a bright flash, then pulse
    setHoverGlowIntensity(1.2); // Initial flash
    
    // Clear any existing interval
    if (hoverGlowRef.current) {
      clearInterval(hoverGlowRef.current);
    }
    
    // After initial flash, start pulsing
    setTimeout(() => {
      let increasing = false;
      let intensity = 1;
      
      hoverGlowRef.current = setInterval(() => {
        if (increasing) {
          intensity += 0.04;
          if (intensity >= 1) {
            intensity = 1;
            increasing = false;
          }
        } else {
          intensity -= 0.025;
          if (intensity <= 0.5) {
            intensity = 0.5;
            increasing = true;
          }
        }
        setHoverGlowIntensity(intensity);
      }, 40);
    }, 100);
  }, [highlighted, pressFeedback]);
  
  const handleMouseLeave = useCallback(() => {
    // Clear pulsing animation
    if (hoverGlowRef.current) {
      clearInterval(hoverGlowRef.current);
      hoverGlowRef.current = null;
    }
    
    // Reset all hover states
    setIsHovered(false);
    setHoverGlowIntensity(0);
    mouseDownPosRef.current = null;
  }, []);
  
  // Cleanup hover animation on unmount or when highlighted/feedback changes
  useEffect(() => {
    if (highlighted || pressFeedback) {
      if (hoverGlowRef.current) {
        clearInterval(hoverGlowRef.current);
        hoverGlowRef.current = null;
      }
      setIsHovered(false);
      setHoverGlowIntensity(0);
    }
    
    return () => {
      if (hoverGlowRef.current) {
        clearInterval(hoverGlowRef.current);
        hoverGlowRef.current = null;
      }
    };
  }, [highlighted, pressFeedback]);

  // Get urgency color based on countdown progress
  const getUrgencyColor = () => {
    if (!highlighted) return null;
    if (progress > 60) return { bg: '#00ffff', border: '#00ffff', glow: 'rgba(0, 255, 255, 0.8)', dark: '#008888' };
    if (progress > 40) return { bg: '#ffff00', border: '#ffff00', glow: 'rgba(255, 255, 0, 0.8)', dark: '#888800' };
    if (progress > 20) return { bg: '#ff8800', border: '#ff8800', glow: 'rgba(255, 136, 0, 0.9)', dark: '#884400' };
    return { bg: '#ff0000', border: '#ff0000', glow: 'rgba(255, 0, 0, 1)', dark: '#880000' };
  };

  const urgencyColor = getUrgencyColor();
  const isUrgent = highlighted && progress < 40;
  const isCritical = highlighted && progress < 20;

  // Calculate the ACTUAL DEPTH of the button (how thick it is)
  // Hover does NOT affect depth - only highlighted, pressed, and feedback states do
  const getButtonDepth = () => {
    if (isPressed) return PRESSED_DEPTH;
    if (highlighted) return MAX_DEPTH;
    if (pressFeedback === 'correct') return MAX_DEPTH * 0.7;
    if (pressFeedback === 'incorrect') return PRESSED_DEPTH;
    return BASE_DEPTH;
  };

  const currentDepth = getButtonDepth();

  // The rise animation duration matches the highlight duration exactly
  const getRiseSpeed = () => {
    if (isPressed) return 0.1;
    if (pressFeedback) return 0.15;
    if (!highlighted) return 0.25;
    if (!highlightDuration) return 0.35;
    return highlightDuration / 1000;
  };

  const riseSpeed = getRiseSpeed();

  // Get colors for faces
  const getColors = () => {
    if (pressFeedback === 'correct') {
      return {
        topFace: 'linear-gradient(135deg, #00ff88 0%, #00dd66 30%, #00bb44 70%, #009933 100%)',
        leftSide: '#007744',
        bottomSide: '#004422',
        rightSide: '#006633',
        frontSide: '#005528',
        border: '#00ff88',
        glow: 'rgba(0, 255, 136, 0.7)',
        edgeHighlight: 'rgba(150, 255, 200, 0.5)',
      };
    }
    if (pressFeedback === 'incorrect') {
      return {
        topFace: 'linear-gradient(135deg, #ff5555 0%, #dd3333 30%, #bb2222 70%, #991111 100%)',
        leftSide: '#771111',
        bottomSide: '#440808',
        rightSide: '#661010',
        frontSide: '#550d0d',
        border: '#ff4444',
        glow: 'rgba(255, 68, 68, 0.6)',
        edgeHighlight: 'rgba(255, 150, 150, 0.4)',
      };
    }
    if (highlighted && urgencyColor) {
      return {
        topFace: `linear-gradient(135deg, ${urgencyColor.bg} 0%, ${adjustBrightness(urgencyColor.bg, -10)} 30%, ${adjustBrightness(urgencyColor.bg, -25)} 70%, ${adjustBrightness(urgencyColor.bg, -40)} 100%)`,
        leftSide: adjustBrightness(urgencyColor.bg, -55),
        bottomSide: adjustBrightness(urgencyColor.bg, -75),
        rightSide: adjustBrightness(urgencyColor.bg, -45),
        frontSide: adjustBrightness(urgencyColor.bg, -65),
        border: urgencyColor.border,
        glow: urgencyColor.glow,
        edgeHighlight: `rgba(255, 255, 255, 0.4)`,
      };
    }
    // Default / hover state
    const glowAlpha = 0.2 + hoverGlowIntensity * 0.4; // 0.2 → 0.6
    const borderAlpha = 0.2 + hoverGlowIntensity * 0.4; // 0.2 → 0.6

    if (isHovered) {
      // Warm yellow/orange hover to clearly distinguish from cyan highlight state
      const baseHue = '#ffdd55';
      const darkerHue = adjustBrightness(baseHue, -18);
      const deepestHue = adjustBrightness(baseHue, -38);

      return {
        topFace: `linear-gradient(135deg, ${baseHue} 0%, ${darkerHue} 35%, ${deepestHue} 75%, #8a4b00 100%)`,
        leftSide: 'rgba(110, 70, 0, 0.95)',
        bottomSide: 'rgba(50, 30, 0, 1)',
        rightSide: 'rgba(130, 80, 0, 0.95)',
        frontSide: 'rgba(90, 55, 0, 0.96)',
        border: `rgba(255, 230, 130, ${borderAlpha})`,
        glow: `rgba(255, 210, 80, ${glowAlpha})`,
        edgeHighlight: `rgba(255, 255, 200, ${0.18 + hoverGlowIntensity * 0.25})`,
      };
    }

    // Resting (non-hover, non-highlight) state – cool neutral
    const baseColor = '#2a2a4a';
    return {
      topFace: `linear-gradient(135deg, ${baseColor} 0%, ${adjustBrightness(baseColor, -15)} 30%, ${adjustBrightness(baseColor, -30)} 70%, ${adjustBrightness(baseColor, -45)} 100%)`,
      leftSide: '#0a0a18',
      bottomSide: '#050508',
      rightSide: '#0c0c1a',
      frontSide: '#080810',
      border: 'rgba(0, 255, 255, 0.3)',
      glow: 'rgba(0, 255, 255, 0.1)',
      edgeHighlight: 'rgba(100, 200, 255, 0.15)',
    };
  };

  const colors = getColors();

  // Calculate box shadow with enhanced effects
  const getBoxShadow = () => {
    const shadowDepth = currentDepth * 0.5;
    const glowIntensity = isCritical ? 1.5 : isUrgent ? 1.2 : 1;
    
    if (highlighted) {
      return `
        0 ${shadowDepth}px ${shadowDepth * 2}px rgba(0, 0, 0, 0.5),
        0 ${shadowDepth * 2}px ${shadowDepth * 3}px rgba(0, 0, 0, 0.3),
        0 0 ${30 * glowIntensity}px ${colors.glow},
        0 0 ${60 * glowIntensity}px ${colors.glow},
        inset 0 1px 0 ${colors.edgeHighlight}
      `;
    }
    
    if (pressFeedback) {
      return `
        0 ${shadowDepth}px ${shadowDepth * 2}px rgba(0, 0, 0, 0.4),
        0 0 25px ${colors.glow},
        0 0 50px ${colors.glow},
        inset 0 1px 0 ${colors.edgeHighlight}
      `;
    }
    
    // Default/hover state with dynamic glow
    if (isHovered && hoverGlowIntensity > 0) {
      const glowSize1 = 15 + (hoverGlowIntensity * 15); // 15 to 30
      const glowSize2 = 30 + (hoverGlowIntensity * 20); // 30 to 50
      return `
        0 ${shadowDepth}px ${shadowDepth * 2}px rgba(0, 0, 0, 0.4),
        0 ${shadowDepth * 1.5}px ${shadowDepth * 2.5}px rgba(0, 0, 0, 0.2),
        0 0 ${glowSize1}px ${colors.glow},
        0 0 ${glowSize2}px ${colors.glow},
        inset 0 1px 0 ${colors.edgeHighlight},
        inset 0 0 ${8 + hoverGlowIntensity * 8}px rgba(0, 255, 255, ${hoverGlowIntensity * 0.15})
      `;
    }
    
    return `
      0 ${shadowDepth}px ${shadowDepth * 2}px rgba(0, 0, 0, 0.4),
      0 ${shadowDepth * 1.5}px ${shadowDepth * 2.5}px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 ${colors.edgeHighlight}
    `;
  };

  return (
    <div 
      className="button-3d-wrapper relative"
      style={{
        perspective: '500px',
        perspectiveOrigin: 'center 60%',
        width: 'fit-content',
        height: 'fit-content',
      }}
    >
      {/* Ground shadow that grows with depth */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: `-${8 + currentDepth * 0.2}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${70 + currentDepth * 1.5}%`,
          height: `${6 + currentDepth * 0.4}px`,
          background: `radial-gradient(ellipse at center, rgba(0, 0, 0, ${0.3 + currentDepth * 0.01}) 0%, transparent 70%)`,
          borderRadius: '50%',
          filter: `blur(${3 + currentDepth * 0.15}px)`,
          transition: highlighted 
            ? `all ${riseSpeed}s linear` 
            : `all ${riseSpeed}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`, // Spring physics
          zIndex: -1,
        }}
      />

      <button
        ref={buttonRef}
        className={cn(
          'game-button-3d relative',
          'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28',
          'min-w-[44px] min-h-[44px]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'touch-manipulation no-select',
          isCritical && 'animate-pulse'
        )}
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(20deg)',
          transition: highlighted 
            ? `transform ${riseSpeed}s linear` 
            : `transform ${riseSpeed}s ease-out`,
          background: 'transparent',
          border: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'pointer',
        }}
        draggable={false}
        onDragStart={handleDragStart}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        aria-label={`Game button ${id}`}
        aria-pressed={highlighted}
        data-button-id={id}
      >
        {/* ===== 3D BOX WITH VARIABLE DEPTH ===== */}
        
          {/* TOP FACE - Main visible surface */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            background: colors.topFace,
            borderRadius: '8px',
            border: `3px solid ${colors.border}`,
            transform: `translateZ(${currentDepth}px)`,
            boxShadow: getBoxShadow(),
            transition: highlighted 
              ? `transform ${riseSpeed}s linear, box-shadow 0.3s ease` 
              : `all ${riseSpeed}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`, // Spring physics
          }}
        >
          {/* Primary shine - top edge highlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(180deg, 
                rgba(255, 255, 255, 0.4) 0%, 
                rgba(255, 255, 255, 0.15) 15%, 
                rgba(255, 255, 255, 0.05) 30%, 
                transparent 50%
              )`,
              borderRadius: '6px',
            }}
          />

          {/* Secondary shine - diagonal highlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.2) 0%, 
                transparent 40%
              )`,
              borderRadius: '6px',
            }}
          />

          {/* Reflection sweep - animated shine on highlight */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{ borderRadius: '6px' }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '60%',
                height: '100%',
                background: `linear-gradient(
                  90deg,
                  transparent 0%,
                  rgba(255, 255, 255, 0.1) 30%,
                  rgba(255, 255, 255, 0.3) 50%,
                  rgba(255, 255, 255, 0.1) 70%,
                  transparent 100%
                )`,
                transform: highlighted ? 'translateX(350%)' : 'translateX(0%)',
                transition: highlighted 
                  ? `transform ${riseSpeed * 0.8}s ease-in-out`
                  : 'none',
                opacity: highlighted ? 1 : 0,
              }}
            />
          </div>

          {/* Scanline effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `repeating-linear-gradient(
                0deg,
                transparent 0px,
                transparent 2px,
                rgba(0, 0, 0, 0.03) 2px,
                rgba(0, 0, 0, 0.03) 4px
              )`,
              borderRadius: '6px',
              opacity: highlighted ? 0.8 : 0.5,
            }}
          />

          {/* Surface noise texture - adds material quality */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              borderRadius: '6px',
              opacity: highlighted ? 0.06 : 0.04,
              mixBlendMode: 'overlay',
            }}
          />

          {/* Neon edge trace - animated glowing border */}
          {highlighted && (
            <div
              className="absolute pointer-events-none"
              style={{
                inset: '-2px',
                borderRadius: '10px',
                background: `
                  linear-gradient(90deg, ${colors.border} 50%, transparent 50%) 0% 0% / 200% 3px no-repeat,
                  linear-gradient(90deg, transparent 50%, ${colors.border} 50%) 0% 100% / 200% 3px no-repeat,
                  linear-gradient(0deg, ${colors.border} 50%, transparent 50%) 0% 0% / 3px 200% no-repeat,
                  linear-gradient(0deg, transparent 50%, ${colors.border} 50%) 100% 0% / 3px 200% no-repeat
                `,
                animation: `neon-trace ${Math.max(0.5, riseSpeed * 0.6)}s linear infinite`,
                filter: `drop-shadow(0 0 4px ${colors.glow}) drop-shadow(0 0 8px ${colors.glow})`,
              }}
            />
          )}

          {/* Neon glow layer - pulsing outer glow */}
          {highlighted && (
            <div
              className="absolute pointer-events-none"
              style={{
                inset: '-4px',
                borderRadius: '12px',
                border: `2px solid ${colors.border}`,
                opacity: 0.5,
                animation: 'neon-glow-pulse 0.8s ease-in-out infinite',
                boxShadow: `0 0 15px ${colors.glow}, 0 0 30px ${colors.glow}`,
              }}
            />
          )}

          {/* Inner glow ring */}
          <div
            className="absolute pointer-events-none"
            style={{
              inset: '4px',
              border: highlighted 
                ? `2px solid ${colors.border}` 
                : isHovered 
                  ? `${1 + hoverGlowIntensity}px solid rgba(0, 255, 255, ${0.2 + hoverGlowIntensity * 0.4})`
                  : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              opacity: highlighted ? 0.9 : isHovered ? 0.6 + hoverGlowIntensity * 0.4 : 0.5,
              boxShadow: highlighted 
                ? `inset 0 0 15px ${colors.glow}, inset 0 0 30px ${adjustBrightness(colors.glow, -30)}` 
                : isHovered 
                  ? `inset 0 0 ${10 + hoverGlowIntensity * 15}px rgba(0, 255, 255, ${0.1 + hoverGlowIntensity * 0.2})`
                  : 'none',
              transition: highlighted ? 'none' : 'border 0.1s ease, opacity 0.1s ease',
            }}
          />

          {/* Countdown shrinking border */}
          {highlighted && highlightDuration && highlightDuration > 0 && (
            <div
              className="absolute pointer-events-none"
              style={{
                inset: `${(100 - progress) * 0.4}%`,
                border: `3px solid ${colors.border}`,
                borderRadius: '4px',
                opacity: 0.9,
                transition: 'inset 0.05s linear',
                boxShadow: `0 0 10px ${colors.glow}, 0 0 20px ${colors.glow}`,
              }}
            />
          )}

          {/* Ripple effect */}
          {ripplePosition && (
            <span
              className="absolute pointer-events-none z-30 animate-ripple"
              style={{
                left: ripplePosition.x,
                top: ripplePosition.y,
                width: '0',
                height: '0',
                borderRadius: '50%',
                background: pressFeedback === 'correct' 
                  ? 'rgba(0, 255, 136, 0.6)' 
                  : pressFeedback === 'incorrect'
                  ? 'rgba(255, 68, 68, 0.6)'
                  : 'rgba(255, 255, 255, 0.5)',
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}

          {/* Corner accents - enhanced with dynamic glow */}
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
            const hoverColor = `rgba(0, 255, 255, ${0.3 + hoverGlowIntensity * 0.5})`;
            return (
              <span
                key={corner}
                className="absolute pointer-events-none"
                style={{
                  [corner.includes('top') ? 'top' : 'bottom']: '5px',
                  [corner.includes('left') ? 'left' : 'right']: '5px',
                  width: isHovered ? `${8 + hoverGlowIntensity * 2}px` : '8px',
                  height: isHovered ? `${8 + hoverGlowIntensity * 2}px` : '8px',
                  borderTop: corner.includes('top') ? `2px solid ${highlighted ? colors.border : isHovered ? hoverColor : 'rgba(255, 255, 255, 0.2)'}` : 'none',
                  borderBottom: corner.includes('bottom') ? `2px solid ${highlighted ? colors.border : isHovered ? hoverColor : 'rgba(255, 255, 255, 0.2)'}` : 'none',
                  borderLeft: corner.includes('left') ? `2px solid ${highlighted ? colors.border : isHovered ? hoverColor : 'rgba(255, 255, 255, 0.2)'}` : 'none',
                  borderRight: corner.includes('right') ? `2px solid ${highlighted ? colors.border : isHovered ? hoverColor : 'rgba(255, 255, 255, 0.2)'}` : 'none',
                  boxShadow: isHovered && !highlighted ? `0 0 ${4 + hoverGlowIntensity * 6}px rgba(0, 255, 255, ${hoverGlowIntensity * 0.4})` : 'none',
                  opacity: highlighted ? 1 : isHovered ? 0.7 + hoverGlowIntensity * 0.3 : 0.5,
                  transition: highlighted ? 'none' : 'width 0.1s, height 0.1s, opacity 0.1s',
                }}
              />
            );
          })}

          {/* Center dot indicator - pulses with hover */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: highlighted ? '6px' : isHovered ? `${4 + hoverGlowIntensity * 3}px` : '4px',
              height: highlighted ? '6px' : isHovered ? `${4 + hoverGlowIntensity * 3}px` : '4px',
              borderRadius: '50%',
              background: highlighted 
                ? colors.border 
                : isHovered 
                  ? `rgba(0, 255, 255, ${0.4 + hoverGlowIntensity * 0.5})` 
                  : 'rgba(255, 255, 255, 0.15)',
              boxShadow: highlighted 
                ? `0 0 8px ${colors.glow}` 
                : isHovered 
                  ? `0 0 ${6 + hoverGlowIntensity * 10}px rgba(0, 255, 255, ${0.3 + hoverGlowIntensity * 0.5})`
                  : 'none',
              transition: highlighted ? 'none' : 'all 0.1s ease',
            }}
          />
        </div>

        {/* FRONT FACE - The side facing the player */}
        <div
          className="absolute left-0 right-0"
          style={{
            bottom: 0,
            height: `${currentDepth}px`,
            background: `linear-gradient(180deg, ${colors.frontSide} 0%, ${adjustBrightness(colors.frontSide, -40)} 100%)`,
            borderLeft: `3px solid ${adjustBrightness(colors.border, -35)}`,
            borderRight: `3px solid ${adjustBrightness(colors.border, -35)}`,
            borderBottom: `3px solid ${adjustBrightness(colors.border, -55)}`,
            borderRadius: '0 0 8px 8px',
            transform: 'rotateX(-90deg)',
            transformOrigin: 'bottom center',
            transition: highlighted 
              ? `all ${riseSpeed}s linear` 
              : `all ${riseSpeed}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`, // Spring physics
          }}
        >
          {/* Front face lighting with edge glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(180deg, 
                rgba(255,255,255,0.15) 0%, 
                rgba(255,255,255,0.05) 20%,
                transparent 40%, 
                rgba(0,0,0,0.3) 100%
              )`,
              borderRadius: '0 0 6px 6px',
            }}
          />
          {/* Vertical stripe detail */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `repeating-linear-gradient(
                90deg,
                transparent 0px,
                transparent 4px,
                rgba(255, 255, 255, 0.02) 4px,
                rgba(255, 255, 255, 0.02) 8px
              )`,
              borderRadius: '0 0 6px 6px',
            }}
          />
        </div>

        {/* BACK FACE - Opposite to front */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: 0,
            height: `${currentDepth}px`,
            background: `linear-gradient(180deg, ${adjustBrightness(colors.frontSide, 25)} 0%, ${colors.frontSide} 100%)`,
            borderLeft: `3px solid ${adjustBrightness(colors.border, -25)}`,
            borderRight: `3px solid ${adjustBrightness(colors.border, -25)}`,
            borderTop: `3px solid ${adjustBrightness(colors.border, -15)}`,
            borderRadius: '8px 8px 0 0',
            transform: 'rotateX(90deg)',
            transformOrigin: 'top center',
            transition: highlighted 
              ? `all ${riseSpeed}s linear` 
              : `all ${riseSpeed}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`, // Spring physics
          }}
        >
          {/* Back face lighting */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(180deg, 
                transparent 0%, 
                rgba(255,255,255,0.12) 30%,
                rgba(255,255,255,0.08) 70%,
                transparent 100%
              )`,
              borderRadius: '6px 6px 0 0',
            }}
          />
        </div>

        {/* LEFT FACE - Side wall */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: 0,
            width: `${currentDepth}px`,
            background: `linear-gradient(90deg, ${adjustBrightness(colors.leftSide, -25)} 0%, ${colors.leftSide} 100%)`,
            borderTop: `3px solid ${adjustBrightness(colors.border, -35)}`,
            borderBottom: `3px solid ${adjustBrightness(colors.border, -55)}`,
            borderLeft: `3px solid ${adjustBrightness(colors.border, -45)}`,
            borderRadius: '8px 0 0 8px',
            transform: 'rotateY(90deg)',
            transformOrigin: 'left center',
            transition: highlighted 
              ? `all ${riseSpeed}s linear` 
              : `all ${riseSpeed}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`, // Spring physics
          }}
        >
          {/* Left face lighting - darker side */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, 
                rgba(0,0,0,0.4) 0%, 
                rgba(0,0,0,0.2) 30%,
                transparent 60%, 
                rgba(255,255,255,0.03) 100%
              )`,
              borderRadius: '6px 0 0 6px',
            }}
          />
        </div>

        {/* RIGHT FACE - Side wall */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            right: 0,
            width: `${currentDepth}px`,
            background: `linear-gradient(90deg, ${colors.rightSide} 0%, ${adjustBrightness(colors.rightSide, -25)} 100%)`,
            borderTop: `3px solid ${adjustBrightness(colors.border, -25)}`,
            borderBottom: `3px solid ${adjustBrightness(colors.border, -45)}`,
            borderRight: `3px solid ${adjustBrightness(colors.border, -35)}`,
            borderRadius: '0 8px 8px 0',
            transform: 'rotateY(-90deg)',
            transformOrigin: 'right center',
            transition: highlighted 
              ? `all ${riseSpeed}s linear` 
              : `all ${riseSpeed}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`, // Spring physics
          }}
        >
          {/* Right face lighting - lighter side */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, 
                rgba(255,255,255,0.08) 0%, 
                rgba(255,255,255,0.04) 40%,
                transparent 70%, 
                rgba(0,0,0,0.25) 100%
              )`,
              borderRadius: '0 6px 6px 0',
            }}
          />
        </div>

        {/* BOTTOM FACE - Base of the button */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, ${adjustBrightness(colors.bottomSide, 15)} 0%, ${colors.bottomSide} 100%)`,
            borderRadius: '8px',
            border: `2px solid ${adjustBrightness(colors.border, -65)}`,
            transform: 'translateZ(0px)',
          }}
        />
      </button>
    </div>
  );
});

// Helper function to adjust color brightness
function adjustBrightness(hex: string, percent: number): string {
  if (hex.startsWith('rgb')) return hex;
  hex = hex.replace('#', '');
  
  // Handle short hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const adjust = (c: number) => Math.max(0, Math.min(255, c + (c * percent / 100)));
  
  const newR = Math.round(adjust(r));
  const newG = Math.round(adjust(g));
  const newB = Math.round(adjust(b));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}
