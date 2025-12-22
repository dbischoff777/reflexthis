/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - React Three Fiber uses its own JSX namespace which TypeScript doesn't fully recognize
'use client';

import React, { useRef, useState, useMemo, useCallback, memo, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { 
  EffectComposer, 
  Bloom, 
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';
// ChromaticAberration removed for better FPS
import * as THREE from 'three';

// Import types and constants
import type { 
  GameButton3DWebGLProps,
  GameButtonGridWebGLProps,
  RippleEvent,
} from './webgl/types';
import { 
  DEBOUNCE_DELAY,
  BUTTON_SIZE,
  GAME_LAYOUT,
} from './webgl/constants';
import { calculateIntensity } from './webgl/helpers';

// Import components
import { WebGLContextHandler } from './webgl/WebGLContextHandler';
import {
  DynamicBloom,
  CameraShake,
  ReflectionSurface,
  BackgroundGrid,
} from './webgl/effects';
import { ButtonMesh } from './webgl/ButtonMesh';

// ============================================================================
// MAIN CANVAS COMPONENT
// ============================================================================

export const GameButtonGridWebGL = memo(function GameButtonGridWebGL({
  buttons,
  highlightDuration,
  onPress,
  disabled = false,
  keyLabels = {},
  showLabels = true,
  gameState,
  comboMilestone,
  performance,
}: GameButtonGridWebGLProps) {
  const lastPressTime = useRef<number>(0);
  const [rippleEvents, setRippleEvents] = useState<RippleEvent[]>([]);
  
  // Clean up old ripple events - use requestIdleCallback for better FPS
  useEffect(() => {
    let timeoutId: number;
    
    const cleanup = () => {
      const now = Date.now();
      setRippleEvents(prev => {
        const filtered = prev.filter(e => now - e.timestamp < 500);
        // Only update if array actually changed
        return filtered.length !== prev.length ? filtered : prev;
      });
      // Schedule next cleanup during idle time
      timeoutId = window.setTimeout(() => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => cleanup(), { timeout: 2000 });
        } else {
          cleanup();
        }
      }, 1500);
    };
    
    timeoutId = window.setTimeout(cleanup, 1500);
    return () => window.clearTimeout(timeoutId);
  }, []);
  
  // Track feedback changes to create ripple events
  const prevFeedbackRef = useRef<Map<number, 'success' | 'error' | null>>(new Map());
  useEffect(() => {
    buttons.forEach(button => {
      const prevFeedback = prevFeedbackRef.current.get(button.index);
      if (button.pressFeedback && button.pressFeedback !== prevFeedback) {
        // Calculate intensity from reaction time if available
        const intensity = button.reactionTime !== null && button.reactionTime !== undefined
          ? calculateIntensity(button.reactionTime)
          : 0.5; // Default intensity
        
        setRippleEvents(prev => [
          ...prev,
          {
            sourceIndex: button.index,
            timestamp: Date.now(),
            type: button.pressFeedback!,
            intensity,
          }
        ]);
      }
      prevFeedbackRef.current.set(button.index, button.pressFeedback || null);
    });
  }, [buttons]);
  
  const handlePress = useCallback((index: number) => {
    const now = Date.now();
    if (now - lastPressTime.current < DEBOUNCE_DELAY) return;
    lastPressTime.current = now;
    
    // Note: Reaction time is calculated by the game handlers using highlightStartTimeRef
    // This keeps the interface simple and consistent with keyboard controls
    onPress(index);
  }, [onPress]);
  
  // Calculate button positions in the 3-4-3 layout (matching actual game)
  const buttonPositions = useMemo(() => {
    const positions: Array<{ index: number; position: [number, number, number] }> = [];
    // Spacing matches the game's gap proportions relative to button size
    const spacingX = BUTTON_SIZE * 1.25;  // ~25% gap between buttons horizontally
    const spacingY = BUTTON_SIZE * 1.35;  // ~35% gap between rows
    
    GAME_LAYOUT.forEach((row, rowIndex) => {
      const rowWidth = (row.length - 1) * spacingX;
      const startX = -rowWidth / 2;
      // Center the grid vertically (row 0 at top, row 2 at bottom)
      const y = (1 - rowIndex) * spacingY;
      
      row.forEach((buttonId, colIndex) => {
        positions.push({
          index: buttonId,
          position: [
            startX + colIndex * spacingX,
            y,
            0,
          ],
        });
      });
    });
    
    return positions;
  }, []);
  
  const maxDpr = performance?.maxDpr ?? 2;
  const gridScale = performance?.gridScale ?? 1;
  const renderScale = performance?.renderScale ?? 1;
  const disablePostprocessing = gameState?.reducedEffects || performance?.disablePostprocessing;
  const powerPreference = performance?.powerPreference ?? 'high-performance';

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{
          position: [0, 0.2, 6.5 * renderScale],  // Adjusted based on device render scale
          fov: 38,  // Wider FOV to see all buttons clearly
          near: 0.1,
          far: 100,
        }}
        dpr={[1, Math.min(maxDpr, 1.5)]} // Cap DPR at 1.5 for better FPS on high-DPI displays
        gl={{
          antialias: true,
          alpha: true,
          powerPreference,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          // Performance optimizations
          stencil: false, // Disable unused stencil buffer
          depth: true,
          preserveDrawingBuffer: false, // Better memory management
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <WebGLContextHandler />
          {/* Ambient fill light - slightly brighter for better visibility */}
          <ambientLight intensity={0.4} color="#8899cc" />
          
          {/* Key light - main directional with slight cyan tint */}
          <directionalLight
            position={[5, 8, 6]}
            intensity={1.4}
            color="#f0f8ff"
          />
          
          {/* Fill light - cooler cyan-blue for cyber feel */}
          <directionalLight 
            position={[-5, 4, 4]} 
            intensity={0.6} 
            color="#4488ee" 
          />
          
          {/* Top accent light - adds highlight to button tops */}
          <pointLight
            position={[0, 5, 3]}
            intensity={0.5}
            color="#00ffff"
            distance={15}
            decay={2}
          />
          
          {/* Environment for reflections - night preset for darker mood */}
          <Environment preset="night" background={false} />
          
          {/* Camera Shake Effect */}
          <CameraShake errorEvents={rippleEvents} comboMilestone={comboMilestone} />
          
          {/* Background Grid (vertical backdrop) - reacts to game state */}
          <BackgroundGrid 
            gameState={gameState} 
            highlightedCount={buttons.filter(b => b.highlighted).length}
            comboMilestone={comboMilestone}
          />
          
          {/* Reflection Surface (floor) */}
          <ReflectionSurface />
          
          {/* Button grid - 3-4-3 layout matching actual game */}
          <group rotation={[0.1, 0, 0]} position={[0, 0, 0]} scale={[gridScale, gridScale, gridScale]}>
            {buttonPositions.map(({ index, position }) => {
              const buttonData = buttons.find(b => b.index === index) || {
                index,
                highlighted: false,
                isBonus: false,
                isDistractor: false,
                isOddTarget: false,
                pressFeedback: null,
                reactionTime: null,
              };
              
              // Get all currently highlighted button indices for arc effects
              const highlightedButtonIndices = buttons
                .filter(b => b.highlighted)
                .map(b => b.index);
              
              return (
                <ButtonMesh
                  key={index}
                  buttonIndex={index}
                  highlighted={buttonData.highlighted}
                  isDistractor={buttonData.isDistractor}
                  isBonus={buttonData.isBonus}
                  isOddTarget={buttonData.isOddTarget}
                  isPatternButton={buttonData.isPatternButton}
                  highlightStartTime={buttonData.highlightStartTime}
                  highlightDuration={highlightDuration}
                  pressFeedback={buttonData.pressFeedback}
                  reactionTime={buttonData.reactionTime ?? null}
                  remainingHits={buttonData.remainingHits}
                  gameMode={gameState?.gameMode}
                  onPress={() => handlePress(index)}
                  disabled={disabled}
                  position={position}
                  rippleEvents={rippleEvents}
                  allButtonPositions={buttonPositions}
                  keyLabel={keyLabels[index]}
                  showLabel={showLabels}
                  highlightedButtons={highlightedButtonIndices}
                  reducedEffects={gameState?.reducedEffects}
                />
              );
            })}
          </group>
          
          
          {/* Post-processing effects - reduced for better FPS */}
          {!disablePostprocessing && (
            <EffectComposer multisampling={0}> {/* Disabled MSAA - handled by WebGL antialias */}
              {/* Dynamic Bloom - responds to combo milestones */}
              <DynamicBloom comboMilestone={comboMilestone} baseIntensity={0.5} />
              
              {/* Removed ChromaticAberration - expensive for marginal visual benefit */}
              
              {/* Vignette for focus effect - reduced intensity */}
              <Vignette
                offset={0.4}
                darkness={0.3}
                blendFunction={BlendFunction.NORMAL}
              />
              
              {/* Tone mapping for cinematic look */}
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
});

// ============================================================================
// SINGLE BUTTON WRAPPER (for compatibility with existing code)
// ============================================================================

export const GameButton3DWebGL = memo(function GameButton3DWebGL({
  index,
  highlighted,
  isOddTarget,
  isBonus,
  highlightStartTime,
  highlightDuration,
  pressFeedback,
  onPress,
  disabled = false,
  className,
}: GameButton3DWebGLProps) {
  const lastPressTime = useRef<number>(0);
  
  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastPressTime.current < DEBOUNCE_DELAY) return;
    lastPressTime.current = now;
    // Note: Reaction time is calculated by the game handlers using highlightStartTimeRef
    // This keeps the interface simple and consistent with keyboard controls
    onPress(index);
  }, [onPress, index]);
  
  return (
    <div className={`w-32 h-32 ${className || ''}`}>
      <Canvas
        camera={{
          position: [0, -0.5, 2.5],
          fov: 42,
        }}
        dpr={[1, 2]}
        gl={{ 
          antialias: true, 
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <WebGLContextHandler />
          <ambientLight intensity={0.3} color="#8899bb" />
          <directionalLight position={[3, 4, 5]} intensity={1.2} castShadow />
          <directionalLight position={[-2, 2, 3]} intensity={0.5} color="#6688cc" />
          <pointLight position={[0, 0, 2]} intensity={0.4} color="#ffffff" />
          
          <Environment preset="city" background={false} />
          
          <ButtonMesh
            buttonIndex={index}
            highlighted={highlighted}
            isOddTarget={isOddTarget}
            isBonus={isBonus}
            highlightStartTime={highlightStartTime}
            highlightDuration={highlightDuration}
            pressFeedback={pressFeedback}
            onPress={handlePress}
            disabled={disabled}
            position={[0, 0, 0]}
            reducedEffects={false}
          />
          
            <EffectComposer multisampling={4}>
              <Bloom
                intensity={0.8}
                luminanceThreshold={0.25}
                luminanceSmoothing={0.9}
                mipmapBlur
              />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
});

export default GameButton3DWebGL;
