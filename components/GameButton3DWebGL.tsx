/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - React Three Fiber uses its own JSX namespace which TypeScript doesn't fully recognize
'use client';

import React, { useRef, useState, useMemo, useCallback, memo, Suspense, useEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { RoundedBox, Environment, Text, Float } from '@react-three/drei';
import { 
  EffectComposer, 
  Bloom, 
  ToneMapping,
  ChromaticAberration,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { triggerHaptic } from '@/lib/hapticUtils';
import { 
  getSharedParticlePool, 
  type PooledParticle, 
  shaderCache,
  isInFrustum,
  calculateLOD,
  getLODRadius,
  getLODSegments,
} from '@/lib/webglOptimizations';

// ============================================================================
// DYNAMIC BLOOM COMPONENT (responds to combo milestones)
// ============================================================================

interface DynamicBloomProps {
  comboMilestone?: number | null;
  baseIntensity?: number;
}

const DynamicBloom = memo(function DynamicBloom({ comboMilestone, baseIntensity = 0.7 }: DynamicBloomProps) {
  const [intensity, setIntensity] = useState(baseIntensity);
  const celebrationIntensityRef = useRef(0);
  const lastMilestoneRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Detect new combo milestone
    if (comboMilestone && comboMilestone !== lastMilestoneRef.current) {
      lastMilestoneRef.current = comboMilestone;
      startTimeRef.current = time;
      
      // Higher milestones = more intense bloom burst
      if (comboMilestone >= 50) {
        celebrationIntensityRef.current = 2.5; // Maximum burst
      } else if (comboMilestone >= 30) {
        celebrationIntensityRef.current = 2.0; // Strong burst
      } else if (comboMilestone >= 20) {
        celebrationIntensityRef.current = 1.5; // Moderate burst
      } else if (comboMilestone >= 10) {
        celebrationIntensityRef.current = 1.2; // Subtle burst
      } else {
        celebrationIntensityRef.current = 1.0; // Small burst
      }
    }
    
    // Animate bloom burst (fade out over time)
    if (celebrationIntensityRef.current > 0) {
      const elapsed = time - startTimeRef.current;
      const duration = 0.6; // 600ms bloom burst
      
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const fade = 1 - progress * progress; // Ease out
        const currentBurst = celebrationIntensityRef.current * fade;
        setIntensity(baseIntensity + currentBurst);
      } else {
        celebrationIntensityRef.current = 0;
        setIntensity(baseIntensity);
      }
    } else {
      // Smoothly return to base intensity
      setIntensity(prev => THREE.MathUtils.lerp(prev, baseIntensity, 0.1));
    }
  });
  
  return (
    <Bloom
      intensity={intensity}
      luminanceThreshold={0.3}
      luminanceSmoothing={0.9}
      mipmapBlur
      radius={0.7}
    />
  );
});

// ============================================================================
// CAMERA SHAKE COMPONENT
// ============================================================================

interface CameraShakeProps {
  errorEvents: RippleEvent[];
  comboMilestone?: number | null;
}

const CameraShake = memo(function CameraShake({ errorEvents, comboMilestone }: CameraShakeProps) {
  const shakeRef = useRef({ x: 0, y: 0, intensity: 0 });
  const celebrationShakeRef = useRef({ x: 0, y: 0, intensity: 0, startTime: 0 });
  const lastErrorTime = useRef(0);
  const lastMilestoneRef = useRef<number | null>(null);
  const baseY = 0.2; // Match camera's base Y position
  
  useFrame((state, delta) => {
    const camera = state.camera;
    const time = state.clock.elapsedTime;
    
    // Check for new error events
    for (const event of errorEvents) {
      if (event.type === 'error' && event.timestamp > lastErrorTime.current) {
        shakeRef.current.intensity = 0.06;
        lastErrorTime.current = event.timestamp;
      }
    }
    
    // Check for combo milestone celebration shake
    if (comboMilestone && comboMilestone !== lastMilestoneRef.current) {
      lastMilestoneRef.current = comboMilestone;
      celebrationShakeRef.current.startTime = time;
      
      // Higher milestones = more intense shake
      if (comboMilestone >= 30) {
        celebrationShakeRef.current.intensity = 0.12; // Strong shake
      } else if (comboMilestone >= 20) {
        celebrationShakeRef.current.intensity = 0.08; // Moderate shake
      } else {
        celebrationShakeRef.current.intensity = 0.04; // Subtle shake
      }
    }
    
    // Apply celebration shake (upward pulse + horizontal shake)
    let totalShakeX = 0;
    let totalShakeY = 0;
    
    if (celebrationShakeRef.current.intensity > 0.001) {
      const elapsed = time - celebrationShakeRef.current.startTime;
      const duration = 0.4; // 400ms celebration shake
      
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const decay = 1 - progress; // Linear decay
        
        // Upward pulse (celebratory bounce)
        const pulse = Math.sin(progress * Math.PI * 2) * 0.3 + 0.7;
        celebrationShakeRef.current.y = pulse * celebrationShakeRef.current.intensity * decay;
        
        // Horizontal shake (excitement)
        const shakeTime = time * 35;
        celebrationShakeRef.current.x = Math.sin(shakeTime) * celebrationShakeRef.current.intensity * decay * 0.6;
        
        totalShakeX += celebrationShakeRef.current.x;
        totalShakeY += celebrationShakeRef.current.y;
        
        // Decay intensity
        celebrationShakeRef.current.intensity *= 0.92;
      } else {
        celebrationShakeRef.current.intensity = 0;
      }
    }
    
    // Apply error shake with decay
    if (shakeRef.current.intensity > 0.001) {
      const shakeTime = time * 45;
      shakeRef.current.x = Math.sin(shakeTime) * shakeRef.current.intensity;
      shakeRef.current.y = Math.cos(shakeTime * 1.3) * shakeRef.current.intensity * 0.7;
      
      totalShakeX += shakeRef.current.x;
      totalShakeY += shakeRef.current.y;
      
      // Decay shake rapidly
      shakeRef.current.intensity *= 0.88;
    }
      
    // Apply combined shake to camera
    if (Math.abs(totalShakeX) > 0.001 || Math.abs(totalShakeY) > 0.001) {
      camera.position.x = totalShakeX;
      camera.position.y = baseY + totalShakeY;
    } else {
      // Smoothly return to rest position
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, delta * 12);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, baseY, delta * 12);
      shakeRef.current.intensity = 0;
      celebrationShakeRef.current.intensity = 0;
    }
  });
  
  return null;
});

// ============================================================================
// REFLECTION SURFACE COMPONENT
// ============================================================================

const ReflectionSurface = memo(function ReflectionSurface() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Enhanced shader for cyberpunk grid reflection effect (cached)
  const shaderMaterial = useMemo(() => {
    return shaderCache.getOrCreate('reflection-surface', () => new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x0a0a18) },
        uColor2: { value: new THREE.Color(0x000008) },
        uAccent: { value: new THREE.Color(0x00ffff) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uAccent;
        varying vec2 vUv;
        
        void main() {
          // Radial gradient from center
          float dist = length(vUv - 0.5) * 2.0;
          float alpha = smoothstep(1.0, 0.2, dist) * 0.5;
          
          // Grid pattern
          vec2 gridUv = vUv * 20.0;
          float gridX = smoothstep(0.95, 1.0, fract(gridUv.x)) + smoothstep(0.05, 0.0, fract(gridUv.x));
          float gridY = smoothstep(0.95, 1.0, fract(gridUv.y)) + smoothstep(0.05, 0.0, fract(gridUv.y));
          float grid = max(gridX, gridY) * 0.15;
          
          // Animated pulse lines
          float pulse = sin(vUv.y * 30.0 - uTime * 2.0) * 0.5 + 0.5;
          pulse = pulse * pulse * 0.1;
          
          // Horizon glow
          float horizon = smoothstep(0.6, 0.5, vUv.y) * 0.3;
          
          // Combine effects
          vec3 color = mix(uColor1, uColor2, dist);
          color += uAccent * (grid + pulse + horizon) * (1.0 - dist * 0.5);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    }));
  }, []);
  
  useFrame((state) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime * 0.8;
    }
  });
  
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -1.8, -0.5]}
    >
      <planeGeometry args={[10, 8]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
});

// ============================================================================
// BACKGROUND GRID (Vertical backdrop behind buttons) - Reacts to game state
// ============================================================================

interface BackgroundGridProps {
  gameState?: {
    combo: number;
    lives: number;
    maxLives: number;
    gameOver: boolean;
    score: number;
    difficulty: string; // DifficultyPreset from game context
    reducedEffects?: boolean;
  };
  highlightedCount?: number;
  comboMilestone?: number | null; // Triggered when combo hits 5, 10, 20, 30, 50
}

const BackgroundGrid = memo(function BackgroundGrid({ gameState, highlightedCount = 0, comboMilestone }: BackgroundGridProps) {
  // Accumulated phases - these increment over time at variable speeds without resetting
  const phaseRef = useRef({ pulse: 0, scan: 0, color: 0 });
  const lastTimeRef = useRef(0);
  const currentSpeedRef = useRef(1.0);
  
  // Combo celebration state
  const celebrationRef = useRef({ active: false, startTime: 0, intensity: 0 });
  const prevMilestoneRef = useRef<number | null>(null);
  
  const shaderMaterial = useMemo(() => {
    return shaderCache.getOrCreate('background-grid', () => new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x050510) },
        uColor2: { value: new THREE.Color(0x000000) },
        uAccent: { value: new THREE.Color(0x00ffff) },
        uAccent2: { value: new THREE.Color(0xff00ff) },
        // Game state uniforms
        uIntensity: { value: 0.5 },
        uUrgency: { value: 0 },
        uComboGlow: { value: 0 },
        uGameOver: { value: 0 },
        // Accumulated phase values (no resets on state change)
        uPulsePhase: { value: 0 },
        uScanPhase: { value: 0 },
        uColorPhase: { value: 0 },
        // Celebration effect
        uCelebration: { value: 0 },        // Intensity (brightness)
        uCelebrationProgress: { value: 0 }, // Animation progress 0→1 (ring expansion)
        uCelebrationColor: { value: new THREE.Color(0x00ffff) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uAccent;
        uniform vec3 uAccent2;
        uniform float uIntensity;
        uniform float uUrgency;
        uniform float uComboGlow;
        uniform float uGameOver;
        uniform float uPulsePhase;
        uniform float uScanPhase;
        uniform float uColorPhase;
        uniform float uCelebration;
        uniform float uCelebrationProgress;
        uniform vec3 uCelebrationColor;
        varying vec2 vUv;
        
        void main() {
          // Vertical gradient (darker at top)
          float vGrad = smoothstep(0.0, 1.0, vUv.y);
          vec3 baseColor = mix(uColor2, uColor1, vGrad * 0.7);
          
          // Game over darkening
          baseColor *= (1.0 - uGameOver * 0.5);
          
          // Main grid pattern - larger cells
          vec2 gridUv = vUv * vec2(24.0, 16.0);
          float gridX = smoothstep(0.96, 1.0, fract(gridUv.x)) + smoothstep(0.04, 0.0, fract(gridUv.x));
          float gridY = smoothstep(0.96, 1.0, fract(gridUv.y)) + smoothstep(0.04, 0.0, fract(gridUv.y));
          float grid = max(gridX, gridY);
          
          // Secondary finer grid
          vec2 fineGridUv = vUv * vec2(48.0, 32.0);
          float fineGridX = smoothstep(0.98, 1.0, fract(fineGridUv.x)) + smoothstep(0.02, 0.0, fract(fineGridUv.x));
          float fineGridY = smoothstep(0.98, 1.0, fract(fineGridUv.y)) + smoothstep(0.02, 0.0, fract(fineGridUv.y));
          float fineGrid = max(fineGridX, fineGridY) * 0.3;
          
          // Horizontal scan lines - uses accumulated phase (no reset on state change)
          float scanLine = sin(vUv.y * 200.0 + uScanPhase) * 0.5 + 0.5;
          scanLine = pow(scanLine, 8.0) * (0.08 + uIntensity * 0.08);
          
          // Animated vertical pulse lines - uses accumulated phase
          float pulse1 = smoothstep(0.02, 0.0, abs(fract(vUv.x * 4.0 - uPulsePhase * 0.3) - 0.5));
          float pulse2 = smoothstep(0.015, 0.0, abs(fract(vUv.x * 6.0 + uPulsePhase * 0.21) - 0.5));
          float pulses = (pulse1 + pulse2 * 0.6) * (0.4 + uIntensity * 0.4);
          
          // Urgency warning pulses (low lives) - uses raw time for consistent speed
          float urgencyPulse = sin(uTime * 8.0) * 0.5 + 0.5;
          float urgencyEffect = uUrgency * urgencyPulse * 0.3;
          
          // Center glow (where buttons are) - enhanced by combo
          vec2 center = vec2(0.5, 0.45);
          float centerDist = length((vUv - center) * vec2(1.0, 1.5));
          float centerGlow = smoothstep(0.8, 0.2, centerDist) * (0.15 + uComboGlow * 0.25);
          
          // Edge vignette - darker when game over
          float vignetteStrength = 0.3 + uGameOver * 0.2;
          float vignette = smoothstep(0.0, vignetteStrength, vUv.x) * smoothstep(1.0, 1.0 - vignetteStrength, vUv.x);
          vignette *= smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
          
          // Edge warning glow (urgency)
          float edgeGlow = (1.0 - vignette) * uUrgency * urgencyPulse * 0.5;
          
          // COMBO CELEBRATION EFFECT - expanding ring burst from center
          float celebrationRing = 0.0;
          if (uCelebration > 0.01) {
            // Ring expands from center outward as progress goes 0→1
            float ringRadius = uCelebrationProgress * 1.2; // Starts at 0, expands to 1.2
            float ringWidth = 0.12 * (1.0 - uCelebrationProgress * 0.7); // Thinner as it expands
            float distFromCenter = length((vUv - center) * vec2(1.2, 1.0));
            
            // Create ring shape
            celebrationRing = smoothstep(ringRadius - ringWidth, ringRadius, distFromCenter) *
                             smoothstep(ringRadius + ringWidth, ringRadius, distFromCenter);
            celebrationRing *= uCelebration * 1.5; // Brightness controlled by intensity
            
            // Add radial burst lines emanating from center
            float angle = atan(vUv.y - center.y, vUv.x - center.x);
            float rays = abs(sin(angle * 8.0)) * 0.5 + 0.5;
            float rayFade = smoothstep(ringRadius + 0.1, ringRadius - 0.2, distFromCenter);
            rays *= rayFade * uCelebration * (1.0 - uCelebrationProgress * 0.5);
            celebrationRing += rays * 0.4;
            
            // Add center flash at the very start
            float centerFlash = smoothstep(0.3, 0.0, distFromCenter) * (1.0 - uCelebrationProgress) * uCelebration;
            celebrationRing += centerFlash * 0.5;
          }
          
          // Dynamic accent color mixing based on state - uses accumulated color phase
          vec3 urgencyColor = vec3(1.0, 0.2, 0.3);
          vec3 comboColor = mix(uAccent, uAccent2, 0.5 + sin(uColorPhase) * 0.3);
          vec3 gameOverColor = vec3(0.5, 0.0, 0.5);
          
          // Base grid color with state influence - uses accumulated color phase
          vec3 gridColor = mix(uAccent, uAccent2, vUv.y + sin(uColorPhase * 0.5) * 0.2);
          gridColor = mix(gridColor, urgencyColor, uUrgency * 0.5);
          gridColor = mix(gridColor, comboColor, uComboGlow * 0.3);
          gridColor = mix(gridColor, gameOverColor, uGameOver * 0.7);
          
          // Combine colors
          vec3 color = baseColor;
          color += gridColor * grid * (0.25 + uIntensity * 0.2) * vignette;
          color += uAccent * fineGrid * (0.15 + uComboGlow * 0.1) * vignette;
          color += gridColor * scanLine;
          color += gridColor * pulses * vignette;
          color += comboColor * centerGlow;
          color += urgencyColor * edgeGlow;
          
          // Add celebration effect
          color += uCelebrationColor * celebrationRing;
          
          // Game over purple tint
          color = mix(color, gameOverColor * 0.3, uGameOver * 0.4);
          
          // Alpha with edge fade
          float alpha = (0.85 + uIntensity * 0.1) * vignette;
          alpha = max(alpha, edgeGlow * 0.8); // Keep edge glow visible
          alpha = max(alpha, celebrationRing * 0.5); // Keep celebration visible
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
    }));
  }, []);
  
  useFrame((state) => {
    const mat = shaderMaterial;
    const currentTime = state.clock.elapsedTime;
    
    // On first frame, initialize lastTimeRef to current time to prevent large delta jump
    const isFirstFrame = lastTimeRef.current === 0;
    const delta = isFirstFrame ? 0 : currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;
    
    mat.uniforms.uTime.value = currentTime;
    
    // Calculate target speed based on game state
    let targetSpeed = 1.0;
    
    if (gameState) {
      const { combo, lives, maxLives, gameOver, score, difficulty } = gameState;
      
      // Calculate intensity based on score and difficulty
      const diffMultiplier = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.5 : difficulty === 'hard' ? 0.7 : 0.85;
      const intensity = Math.min(1.0, score * 0.002 * diffMultiplier + highlightedCount * 0.15);
      
      // Urgency increases as lives decrease
      const lifeRatio = lives / maxLives;
      const urgency = lifeRatio <= 0.2 ? 1.0 : lifeRatio <= 0.4 ? 0.5 : 0;
      
      // Combo glow
      const comboGlow = Math.min(1.0, combo / 30);
      
      // Target speed increases with intensity
      targetSpeed = 1.0 + intensity * 2.0;
      
      // Smooth transitions for visual properties
      mat.uniforms.uIntensity.value = THREE.MathUtils.lerp(mat.uniforms.uIntensity.value, intensity, 0.05);
      mat.uniforms.uUrgency.value = THREE.MathUtils.lerp(mat.uniforms.uUrgency.value, urgency, 0.1);
      mat.uniforms.uComboGlow.value = THREE.MathUtils.lerp(mat.uniforms.uComboGlow.value, comboGlow, 0.08);
      mat.uniforms.uGameOver.value = THREE.MathUtils.lerp(mat.uniforms.uGameOver.value, gameOver ? 1.0 : 0.0, 0.1);
    }
    
    // COMBO CELEBRATION DETECTION AND EFFECT
    // Detect when comboMilestone prop changes (triggered by game page)
    if (comboMilestone && comboMilestone !== prevMilestoneRef.current) {
      prevMilestoneRef.current = comboMilestone;
      celebrationRef.current.active = true;
      celebrationRef.current.startTime = currentTime;
      
      // Set celebration color and intensity based on milestone level
      if (comboMilestone >= 50) {
        celebrationRef.current.intensity = 1.5;
        mat.uniforms.uCelebrationColor.value.setRGB(1.0, 0.3, 1.0); // Magenta/gold
      } else if (comboMilestone >= 30) {
        celebrationRef.current.intensity = 1.2;
        mat.uniforms.uCelebrationColor.value.setRGB(1.0, 0.5, 0.0); // Orange
      } else if (comboMilestone >= 20) {
        celebrationRef.current.intensity = 1.0;
        mat.uniforms.uCelebrationColor.value.setRGB(1.0, 0.0, 1.0); // Magenta
      } else if (comboMilestone >= 10) {
        celebrationRef.current.intensity = 0.8;
        mat.uniforms.uCelebrationColor.value.setRGB(0.0, 1.0, 1.0); // Cyan
      } else {
        celebrationRef.current.intensity = 0.6;
        mat.uniforms.uCelebrationColor.value.setRGB(0.2, 1.0, 0.5); // Green
      }
    }
    
    // Reset milestone tracking when prop becomes null
    if (!comboMilestone) {
      prevMilestoneRef.current = null;
    }
    
    // Animate celebration effect (fade out over time)
    if (celebrationRef.current.active) {
      const celebrationDuration = 0.8; // seconds
      const elapsed = currentTime - celebrationRef.current.startTime;
      const progress = Math.min(elapsed / celebrationDuration, 1.0);
      
      // Progress goes 0→1 for ring expansion (ease out for smooth expansion)
      const easedProgress = 1.0 - Math.pow(1.0 - progress, 2); // Ease out
      mat.uniforms.uCelebrationProgress.value = easedProgress;
      
      // Intensity fades out (brightness)
      const intensity = (1.0 - progress * progress) * celebrationRef.current.intensity;
      mat.uniforms.uCelebration.value = intensity;
      
      if (progress >= 1.0) {
        celebrationRef.current.active = false;
        mat.uniforms.uCelebration.value = 0;
        mat.uniforms.uCelebrationProgress.value = 0;
      }
    }
    
    // Smoothly transition speed (no sudden jumps)
    currentSpeedRef.current = THREE.MathUtils.lerp(currentSpeedRef.current, targetSpeed, 0.05);
    
    // Accumulate phases based on current speed - this prevents position resets
    // Phase accumulates continuously, only the rate of accumulation changes
    phaseRef.current.pulse += delta * currentSpeedRef.current;
    phaseRef.current.scan += delta * currentSpeedRef.current * 2.0;
    phaseRef.current.color += delta * currentSpeedRef.current;
    
    // Pass accumulated phases to shader
    mat.uniforms.uPulsePhase.value = phaseRef.current.pulse;
    mat.uniforms.uScanPhase.value = phaseRef.current.scan;
    mat.uniforms.uColorPhase.value = phaseRef.current.color;
  });
  
  return (
    <mesh position={[0, 0.5, -3]}>
      <planeGeometry args={[12, 8]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
});

// ============================================================================
// PARTICLE BURST COMPONENT (Optimized with Object Pooling)
// ============================================================================

interface ParticleBurstProps {
  trigger: 'success' | 'error' | null;
  position: [number, number, number];
  reactionTime?: number | null;
  intensity?: number;
}

interface ParticleBurstPropsWithQuality extends ParticleBurstProps {
  reducedEffects?: boolean;
}

const ParticleBurst = memo(function ParticleBurst({ 
  trigger, 
  position, 
  reactionTime = null,
  intensity: providedIntensity,
  reducedEffects = false 
}: ParticleBurstPropsWithQuality) {
  const particlesRef = useRef<PooledParticle[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const prevTrigger = useRef<'success' | 'error' | null>(null);
  const particlePool = useMemo(() => getSharedParticlePool(), []);
  
  // Calculate intensity from reaction time if not provided
  const intensity = providedIntensity ?? calculateIntensity(reactionTime);
  
  // Adaptive particle count based on reducedEffects and intensity
  const baseCount = reducedEffects ? 8 : 20;
  const PARTICLE_COUNT = Math.floor(baseCount * intensity);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  
  // Cleanup: release all particles when component unmounts
  useEffect(() => {
    return () => {
      particlesRef.current.forEach(particle => {
        particlePool.release(particle);
      });
      particlesRef.current = [];
    };
  }, [particlePool]);
  
  // Spawn particles when trigger changes
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Spawn new particles on trigger change
    if (trigger && trigger !== prevTrigger.current) {
      const isSuccess = trigger === 'success';
      // Use reaction time-based color for success, error color for errors
      const baseColor = isSuccess 
        ? getColorByReactionTime(reactionTime)
        : new THREE.Color(1.0, 0.3, 0.2);
      
      // Release old particles back to pool
      particlesRef.current.forEach(particle => {
        particlePool.release(particle);
      });
      particlesRef.current = [];
      
      // Scale speed and upward velocity based on intensity
      const speedMultiplier = 0.8 + (intensity * 1.2); // 0.8-2.0
      const upwardMultiplier = 0.5 + (intensity * 1.0); // 0.5-1.5
      
      // Acquire particles from pool
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const particle = particlePool.acquire();
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.5;
        const speed = (1.5 + Math.random() * 2) * speedMultiplier;
        const upward = (0.5 + Math.random() * 1.5) * upwardMultiplier;
        
        // Initialize particle properties (reusing pooled objects)
        particle.position.set(position[0], position[1], position[2] + 0.3);
        particle.velocity.set(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed * 0.5 + upward,
          Math.random() * 0.5
        );
        particle.life = 1.0;
        particle.maxLife = 0.6 + Math.random() * 0.3;
        particle.color.copy(baseColor);
        particle.color.offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.2);
        particle.size = (0.03 + Math.random() * 0.04) * (0.8 + intensity * 0.4);
        
        particlesRef.current.push(particle);
      }
    }
    prevTrigger.current = trigger;
    
    // Update existing particles
    const gravity = -4;
    const activeParticles: PooledParticle[] = [];
    
    particlesRef.current.forEach((particle, i) => {
      particle.life -= delta / particle.maxLife;
      
      if (particle.life <= 0) {
        // Return dead particle to pool
        particlePool.release(particle);
        return;
      }
      
      // Physics (reuse existing vectors, no cloning)
      particle.velocity.y += gravity * delta;
      particle.position.x += particle.velocity.x * delta;
      particle.position.y += particle.velocity.y * delta;
      particle.position.z += particle.velocity.z * delta;
      
      // Update instance
      dummy.position.copy(particle.position);
      const scale = particle.size * particle.life;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(activeParticles.length, dummy.matrix);
      
      // Update color with fade
      tempColor.copy(particle.color);
      tempColor.multiplyScalar(particle.life);
      meshRef.current!.setColorAt(activeParticles.length, tempColor);
      
      activeParticles.push(particle);
    });
    
    // Update particles array
    particlesRef.current = activeParticles;
    
    // Hide unused instances
    for (let i = activeParticles.length; i < PARTICLE_COUNT * 2; i++) {
      dummy.position.set(0, -100, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });
  
  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, PARTICLE_COUNT * 2]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial 
        transparent 
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
});

// ============================================================================
// PRESS DEPTH INDICATOR COMPONENT
// ============================================================================

interface PressDepthIndicatorProps {
  active: boolean;
  depth: number; // 0-1, where 1 = maximum depth
  position: [number, number, number];
}

const PressDepthIndicator = memo(function PressDepthIndicator({ 
  active, 
  depth, 
  position 
}: PressDepthIndicatorProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const startTimeRef = useRef<number | null>(null);
  
  useFrame((state, delta) => {
    if (!ringRef.current || !materialRef.current) return;
    
    const ring = ringRef.current;
    const material = materialRef.current;
    const time = state.clock.elapsedTime;
    
    if (active && startTimeRef.current === null) {
      startTimeRef.current = time;
    }
    
    if (!active) {
      startTimeRef.current = null;
      material.opacity = 0;
      return;
    }
    
    if (startTimeRef.current === null) return;
    
    const elapsed = time - startTimeRef.current;
    const duration = 0.3; // 300ms animation
    
    if (elapsed > duration) {
      material.opacity = 0;
      return;
    }
    
    // Animate depth indicator - pulse effect
    const pulse = Math.sin(time * 10) * 0.1 + 0.9;
    const scale = 1 + (depth * 0.3 * pulse);
    ring.scale.set(scale, scale, 1);
    
    // Fade out over time
    const opacity = (1 - elapsed / duration) * depth * 0.6;
    material.opacity = opacity;
  });
  
  if (!active || depth <= 0) return null;
  
  return (
    <mesh 
      ref={ringRef} 
      position={[position[0], position[1], position[2] - depth * 0.1]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[BUTTON_SIZE * 0.4, BUTTON_SIZE * 0.5, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#00ffff"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
});

// ============================================================================
// GLOW TRAIL COMPONENT (for sequence mode)
// ============================================================================

interface GlowTrailProps {
  active: boolean;
  intensity: number;
  position: [number, number, number];
}

const GlowTrail = memo(function GlowTrail({ 
  active, 
  intensity, 
  position 
}: GlowTrailProps) {
  const trailRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const startTimeRef = useRef<number | null>(null);
  
  useFrame((state, delta) => {
    if (!trailRef.current || !materialRef.current) return;
    
    const trail = trailRef.current;
    const material = materialRef.current;
    const time = state.clock.elapsedTime;
    
    if (active && startTimeRef.current === null) {
      startTimeRef.current = time;
    }
    
    if (!active) {
      startTimeRef.current = null;
      material.opacity = 0;
      trail.scale.set(1, 1, 1);
      return;
    }
    
    if (startTimeRef.current === null) return;
    
    const elapsed = time - startTimeRef.current;
    const duration = 0.5; // 500ms animation
    
    if (elapsed > duration) {
      material.opacity = 0;
      return;
    }
    
    // Animate trail - expanding ring effect
    const progress = elapsed / duration;
    const scale = 1 + progress * 2;
    trail.scale.set(scale, scale, 1);
    
    // Fade out as it expands
    material.opacity = (1 - progress) * intensity * 0.4;
  });
  
  if (!active || intensity <= 0) return null;
  
  return (
    <mesh 
      ref={trailRef} 
      position={[position[0], position[1], position[2] + 0.1]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[BUTTON_SIZE * 0.3, BUTTON_SIZE * 0.35, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#00ffff"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
});

// ============================================================================
// COUNTDOWN RING (Visual timer showing remaining time)
// ============================================================================

interface CountdownRingProps {
  active: boolean;
  highlightStartTime?: number;
  highlightDuration: number;
}

const CountdownRing = memo(function CountdownRing({ 
  active, 
  highlightStartTime,
  highlightDuration 
}: CountdownRingProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const shaderMaterial = useMemo(() => {
    return shaderCache.getOrCreate('countdown-ring', () => new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uActive: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uActive;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        // Color palette for urgency levels
        vec3 getUrgencyColor(float progress) {
          // Cyan (0%) -> Green (25%) -> Yellow (50%) -> Orange (75%) -> Red (100%)
          vec3 cyan = vec3(0.0, 1.0, 1.0);
          vec3 green = vec3(0.2, 1.0, 0.4);
          vec3 yellow = vec3(1.0, 1.0, 0.0);
          vec3 orange = vec3(1.0, 0.5, 0.0);
          vec3 red = vec3(1.0, 0.15, 0.1);
          
          if (progress < 0.25) {
            return mix(cyan, green, progress * 4.0);
          } else if (progress < 0.5) {
            return mix(green, yellow, (progress - 0.25) * 4.0);
          } else if (progress < 0.75) {
            return mix(yellow, orange, (progress - 0.5) * 4.0);
          } else {
            return mix(orange, red, (progress - 0.75) * 4.0);
          }
        }
        
        void main() {
          // Calculate angle from top (12 o'clock position)
          float angle = atan(vPosition.x, vPosition.y); // Swapped for top-start
          float normalizedAngle = (angle + 3.14159) / (2.0 * 3.14159);
          
          // Remaining time fills from top, clockwise
          float remaining = 1.0 - uProgress;
          float fillMask = step(normalizedAngle, remaining);
          
          // Ring geometry
          float dist = length(vPosition.xy);
          float innerRadius = 0.52;
          float outerRadius = 0.62;
          
          // Smooth ring edges
          float ring = smoothstep(innerRadius - 0.02, innerRadius + 0.01, dist) * 
                       smoothstep(outerRadius + 0.02, outerRadius - 0.01, dist);
          
          // Urgency pulse - faster when time is running out
          float pulseSpeed = 2.0 + uProgress * 15.0;
          float pulseIntensity = 0.15 + uProgress * 0.35;
          float pulse = 1.0 + sin(uTime * pulseSpeed) * pulseIntensity;
          
          // Glow at the leading edge of the countdown
          float edgeGlow = 0.0;
          float edgeWidth = 0.08;
          if (abs(normalizedAngle - remaining) < edgeWidth && remaining > 0.02) {
            edgeGlow = (1.0 - abs(normalizedAngle - remaining) / edgeWidth) * 2.0;
          }
          
          // Get color based on urgency
          vec3 baseColor = getUrgencyColor(uProgress);
          
          // Add brightness boost when critical
          float criticalBoost = uProgress > 0.7 ? (uProgress - 0.7) * 3.0 : 0.0;
          vec3 finalColor = baseColor * (1.2 + criticalBoost) * pulse;
          
          // Combine fill and glow
          float alpha = (ring * fillMask + edgeGlow * ring) * uActive;
          
          // Add subtle background ring to show full circle
          float bgRing = ring * (1.0 - fillMask) * 0.15 * uActive;
          vec3 bgColor = vec3(0.3, 0.3, 0.4);
          
          vec3 outputColor = finalColor * (ring * fillMask + edgeGlow * ring) + bgColor * bgRing;
          float outputAlpha = alpha + bgRing;
          
          gl_FragColor = vec4(outputColor, outputAlpha * 0.95);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }), true); // Clone for per-instance uniforms
  }, []);
  
  useFrame((state) => {
    if (!materialRef.current) return;
    const mat = shaderMaterial;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    
    // Calculate progress directly from highlightStartTime and highlightDuration
    // This ensures it updates every frame even if props don't change
    let progress = 0;
    if (active && highlightStartTime && highlightDuration > 0) {
      const elapsed = Date.now() - highlightStartTime;
      progress = Math.max(0, Math.min(1, elapsed / highlightDuration));
    }
    
    mat.uniforms.uProgress.value = progress;
    mat.uniforms.uActive.value = THREE.MathUtils.lerp(
      mat.uniforms.uActive.value,
      active ? 1 : 0,
      0.2
    );
  });
  
  return (
    <mesh 
      ref={ringRef} 
      position={[0, 0, 0.06]} 
      rotation={[0, 0, 0]}
      frustumCulled={false}
    >
      <ringGeometry args={[0.48, 0.66, 64]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
});

// ============================================================================
// SHOCKWAVE EFFECT
// ============================================================================

interface ShockwaveProps {
  trigger: 'success' | 'error' | null;
  position: [number, number, number];
}

const Shockwave = memo(function Shockwave({ trigger, position }: ShockwaveProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const triggerTime = useRef(0);
  const prevTrigger = useRef<'success' | 'error' | null>(null);
  const isActive = useRef(false);
  
  const shaderMaterial = useMemo(() => {
    return shaderCache.getOrCreate('shockwave', () => new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(0, 1, 1) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform vec3 uColor;
        varying vec2 vUv;
        
        void main() {
          vec2 center = vec2(0.5);
          float dist = length(vUv - center) * 2.0;
          
          // Expanding ring
          float ringPos = uProgress * 1.5;
          float ringWidth = 0.15 * (1.0 - uProgress);
          float ring = smoothstep(ringPos - ringWidth, ringPos, dist) * 
                       smoothstep(ringPos + ringWidth, ringPos, dist);
          
          // Fade out
          float alpha = ring * (1.0 - uProgress) * 2.0;
          
          gl_FragColor = vec4(uColor * 2.0, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }), true); // Clone for per-instance uniforms
  }, []);
  
  useFrame((state) => {
    if (!materialRef.current) return;
    
    // Detect trigger change
    if (trigger && trigger !== prevTrigger.current) {
      triggerTime.current = state.clock.elapsedTime;
      isActive.current = true;
      
      // Set color based on trigger type
      const color = trigger === 'success' 
        ? new THREE.Color(0.2, 1.0, 0.5) 
        : new THREE.Color(1.0, 0.3, 0.2);
      shaderMaterial.uniforms.uColor.value.copy(color);
    }
    prevTrigger.current = trigger;
    
    // Update progress
    const elapsed = state.clock.elapsedTime - triggerTime.current;
    const duration = 0.5;
    const progress = Math.min(elapsed / duration, 1);
    
    shaderMaterial.uniforms.uProgress.value = progress;
    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    
    if (progress >= 1) {
      isActive.current = false;
    }
    
    // Scale the mesh
    if (meshRef.current) {
      const scale = 1 + progress * 2;
      meshRef.current.scale.set(scale, scale, 1);
    }
  });
  
  return (
    <mesh 
      ref={meshRef} 
      position={[position[0], position[1], position[2] + 0.05]}
      frustumCulled={false}
    >
      <planeGeometry args={[1.2, 1.2]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
});

// ============================================================================
// ENERGY CORE EFFECT (inner glow)
// ============================================================================

interface EnergyCoreProps {
  active: boolean;
  progress: number;
  color: THREE.Color;
}

const EnergyCore = memo(function EnergyCore({ active, progress, color }: EnergyCoreProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;
    
    const time = state.clock.elapsedTime;
    const pulseSpeed = 4 + progress * 10;
    const pulse = Math.sin(time * pulseSpeed) * 0.3 + 0.7;
    
    // Intensity increases with urgency
    const intensity = active ? (0.3 + progress * 0.7) * pulse : 0;
    
    materialRef.current.color.copy(color);
    materialRef.current.opacity = THREE.MathUtils.lerp(
      materialRef.current.opacity,
      intensity,
      0.2
    );
    
    // Subtle scale pulsing
    const scale = active ? 0.5 + pulse * 0.1 + progress * 0.2 : 0.4;
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, scale, 0.1));
  });
  
  return (
    <mesh ref={meshRef} position={[0, 0, 0.02]}>
      <circleGeometry args={[0.4, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
});

// ============================================================================
// FLOATING PARTICLES AROUND BUTTON
// ============================================================================

interface FloatingParticlesProps {
  active: boolean;
  color: THREE.Color;
  position: [number, number, number];
}

const FloatingParticles = memo(function FloatingParticles({ active, color, position }: FloatingParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const PARTICLE_COUNT = 24;
  
  const { positions, velocities, phases } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities: THREE.Vector3[] = [];
    const phases: number[] = [];
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const radius = 0.5 + Math.random() * 0.3;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = Math.random() * 0.3;
      
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.01
      ));
      
      phases.push(Math.random() * Math.PI * 2);
    }
    
    return { positions, velocities, phases };
  }, []);
  
  useFrame((state) => {
    if (!particlesRef.current) return;
    
    const positionAttr = particlesRef.current.geometry.attributes.position;
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + time * 0.5;
      const radius = 0.55 + Math.sin(time * 2 + phases[i]) * 0.1;
      const height = Math.sin(time * 1.5 + phases[i]) * 0.15;
      
      if (active) {
        positionAttr.setXYZ(
          i,
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0.1 + height
        );
      } else {
        // Particles drift away when inactive
        const currentX = positionAttr.getX(i);
        const currentY = positionAttr.getY(i);
        const currentZ = positionAttr.getZ(i);
        positionAttr.setXYZ(
          i,
          THREE.MathUtils.lerp(currentX, Math.cos(angle) * 0.8, 0.02),
          THREE.MathUtils.lerp(currentY, Math.sin(angle) * 0.8, 0.02),
          THREE.MathUtils.lerp(currentZ, -0.5, 0.02)
        );
      }
    }
    
    positionAttr.needsUpdate = true;
    
    // Update material
    const material = particlesRef.current.material as THREE.PointsMaterial;
    material.color.copy(color);
    material.opacity = THREE.MathUtils.lerp(material.opacity, active ? 0.8 : 0, 0.1);
    material.size = THREE.MathUtils.lerp(material.size, active ? 0.04 : 0.01, 0.1);
  });
  
  return (
    <points ref={particlesRef} position={position} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        transparent
        opacity={0}
        size={0.01}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
});

// ============================================================================
// ELECTRIC ARC BETWEEN BUTTONS
// ============================================================================

interface ElectricArcProps {
  startPos: [number, number, number];
  endPos: [number, number, number];
  active: boolean;
  color: THREE.Color;
}

const ElectricArc = memo(function ElectricArc({ startPos, endPos, active, color }: ElectricArcProps) {
  const lineRef = useRef<THREE.Line>(null);
  const pointCount = 20;
  
  const { positions, basePositions } = useMemo(() => {
    const positions = new Float32Array(pointCount * 3);
    const basePositions: THREE.Vector3[] = [];
    
    for (let i = 0; i < pointCount; i++) {
      const t = i / (pointCount - 1);
      const x = startPos[0] + (endPos[0] - startPos[0]) * t;
      const y = startPos[1] + (endPos[1] - startPos[1]) * t;
      const z = startPos[2] + (endPos[2] - startPos[2]) * t + 0.1;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      basePositions.push(new THREE.Vector3(x, y, z));
    }
    
    return { positions, basePositions };
    // Use individual values to avoid recreating on every render due to new array references
  }, [startPos[0], startPos[1], startPos[2], endPos[0], endPos[1], endPos[2]]);
  
  useFrame((state) => {
    if (!lineRef.current || !active) return;
    
    const positionAttr = lineRef.current.geometry.attributes.position;
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < pointCount; i++) {
      const t = i / (pointCount - 1);
      const midFactor = Math.sin(t * Math.PI); // More displacement in middle
      
      // Random jagged lightning effect
      const noise1 = Math.sin(time * 30 + i * 2) * midFactor * 0.08;
      const noise2 = Math.cos(time * 25 + i * 3) * midFactor * 0.06;
      
      positionAttr.setXYZ(
        i,
        basePositions[i].x + noise1,
        basePositions[i].y + noise2,
        basePositions[i].z + Math.sin(time * 20 + i) * 0.03
      );
    }
    
    positionAttr.needsUpdate = true;
    
    // Update material
    const material = lineRef.current.material as THREE.LineBasicMaterial;
    material.color.copy(color);
    material.opacity = active ? 0.6 + Math.sin(time * 15) * 0.3 : 0;
  });
  
  if (!active) return null;
  
  return (
    <line ref={lineRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={pointCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        linewidth={2}
      />
    </line>
  );
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GameButton3DWebGLProps {
  index: number;
  highlighted: boolean;
  isOddTarget?: boolean;
  isBonus?: boolean;
  highlightStartTime?: number;
  highlightDuration: number;
  pressFeedback?: 'success' | 'error' | null;
  onPress: (index: number) => void;
  disabled?: boolean;
  baseColor?: string;
  highlightColor?: string;
  size?: number;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BASE_DEPTH = 0.15;
const MAX_DEPTH = 0.6;
const DEBOUNCE_DELAY = 100;
const BUTTON_SIZE = 0.85;  // Button size in 3D units - matches game proportions

// Color palette matching game theme
const THEME_COLORS = {
  idle: { r: 0.0, g: 0.0, b: 0.6 },       // Deep blue (card color)
  hover: { r: 0.0, g: 0.5, b: 0.8 },      // Brighter blue
  primary: { r: 0.0, g: 1.0, b: 1.0 },    // Cyan (primary)
  secondary: { r: 1.0, g: 0.0, b: 1.0 },  // Magenta (secondary/accent)
  success: { r: 0.2, g: 0.9, b: 0.4 },    // Green
  error: { r: 1.0, g: 0.1, b: 0.1 },      // Red (destructive)
};

// Color palette for urgency states (cyan → magenta → red)
const URGENCY_COLORS = {
  safe: { r: 0.0, g: 1.0, b: 1.0 },       // Cyan (primary)
  caution: { r: 0.5, g: 0.8, b: 1.0 },    // Light cyan-blue
  warning: { r: 1.0, g: 0.0, b: 1.0 },    // Magenta (secondary)
  danger: { r: 1.0, g: 0.2, b: 0.5 },     // Pink-red
  critical: { r: 1.0, g: 0.1, b: 0.2 },   // Deep red
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getUrgencyColor(progress: number): { r: number; g: number; b: number } {
  if (progress < 0.25) return URGENCY_COLORS.safe;
  if (progress < 0.5) {
    const t = (progress - 0.25) / 0.25;
    return lerpColor(URGENCY_COLORS.safe, URGENCY_COLORS.caution, t);
  }
  if (progress < 0.75) {
    const t = (progress - 0.5) / 0.25;
    return lerpColor(URGENCY_COLORS.caution, URGENCY_COLORS.warning, t);
  }
  if (progress < 0.9) {
    const t = (progress - 0.75) / 0.15;
    return lerpColor(URGENCY_COLORS.warning, URGENCY_COLORS.danger, t);
  }
  const t = (progress - 0.9) / 0.1;
  return lerpColor(URGENCY_COLORS.danger, URGENCY_COLORS.critical, t);
}

function lerpColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/**
 * Calculate feedback intensity based on reaction time
 * Faster reactions (lower ms) = higher intensity (closer to 1.0)
 * Slower reactions (higher ms) = lower intensity (closer to 0.3)
 * Perfect reactions (<150ms) = maximum intensity (1.0)
 */
function calculateIntensity(reactionTime: number | null): number {
  if (!reactionTime || reactionTime <= 0) return 0.5; // Default for no reaction time
  
  // Perfect reaction (<150ms) = 1.0
  if (reactionTime < 150) return 1.0;
  
  // Excellent reaction (150-200ms) = 0.9-1.0
  if (reactionTime < 200) {
    return 0.9 + (0.1 * (1 - (reactionTime - 150) / 50));
  }
  
  // Good reaction (200-350ms) = 0.7-0.9
  if (reactionTime < 350) {
    return 0.7 + (0.2 * (1 - (reactionTime - 200) / 150));
  }
  
  // Slow reaction (350-500ms) = 0.5-0.7
  if (reactionTime < 500) {
    return 0.5 + (0.2 * (1 - (reactionTime - 350) / 150));
  }
  
  // Very slow reaction (>500ms) = 0.3-0.5
  return Math.max(0.3, 0.5 - ((reactionTime - 500) / 1000) * 0.2);
}

/**
 * Get color based on reaction time performance
 */
function getColorByReactionTime(reactionTime: number | null): THREE.Color {
  if (!reactionTime || reactionTime <= 0) {
    return new THREE.Color(0.2, 1.0, 0.5); // Default green
  }
  
  if (reactionTime < 150) {
    // Perfect - bright cyan-green
    return new THREE.Color(0.0, 1.0, 0.8);
  } else if (reactionTime < 200) {
    // Excellent - bright green
    return new THREE.Color(0.2, 1.0, 0.5);
  } else if (reactionTime < 350) {
    // Good - yellow-green
    return new THREE.Color(0.6, 1.0, 0.3);
  } else if (reactionTime < 500) {
    // Slow - yellow
    return new THREE.Color(1.0, 0.8, 0.2);
  } else {
    // Very slow - orange
    return new THREE.Color(1.0, 0.5, 0.1);
  }
}

// ============================================================================
// 3D BUTTON MESH COMPONENT
// ============================================================================

interface ButtonMeshProps {
  buttonIndex: number;
  highlighted: boolean;
  isOddTarget?: boolean;
  isBonus?: boolean;
  highlightStartTime?: number;
  highlightDuration: number;
  pressFeedback?: 'success' | 'error' | null;
  reactionTime?: number | null;
  gameMode?: string;
  onPress: () => void;
  disabled?: boolean;
  position: [number, number, number];
  rippleEvents?: RippleEvent[];
  allButtonPositions?: Array<{ index: number; position: [number, number, number] }>;
  keyLabel?: string; // Keyboard key to display on button
  showLabel?: boolean; // Whether to show label
  highlightedButtons?: number[]; // All currently highlighted button indices for arc effects
  reducedEffects?: boolean;
}

const ButtonMesh = memo(function ButtonMesh({
  buttonIndex,
  highlighted,
  isOddTarget = false,
  isBonus = false,
  highlightStartTime,
  highlightDuration,
  pressFeedback,
  reactionTime = null,
  gameMode,
  onPress,
  disabled,
  position,
  rippleEvents = [],
  allButtonPositions = [],
  keyLabel,
  showLabel = true,
  highlightedButtons = [],
  reducedEffects = false,
}: ButtonMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const textRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const rippleOffset = useRef(0);
  
  // Track current urgency color for child components
  const [currentUrgencyColor, setCurrentUrgencyColor] = useState(new THREE.Color(0, 1, 1));
  const urgencyColorRef = useRef(new THREE.Color(0, 1, 1));
  const progressRef = useRef(0);
  
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lodLevel, setLodLevel] = useState(0);
  
  // Animation state
  const targetDepth = useRef(BASE_DEPTH);
  const currentDepth = useRef(BASE_DEPTH);
  const progress = useRef(0);
  const pulsePhase = useRef(0);
  const feedbackStartTime = useRef(0);
  const prevFeedback = useRef<'success' | 'error' | null>(null);
  const prevHighlighted = useRef(false);
  const prevHighlightStartTime = useRef<number | undefined>(undefined);
  const anticipationPhase = useRef(0); // 0 = none, 0-1 = anticipation in progress
  
  // Frustum culling and LOD check (throttled to every 10 frames)
  const cullCheckFrame = useRef(0);
  
  // Smooth animation using useFrame
  useFrame((state, delta) => {
    // Frustum culling and LOD check (every 10 frames for performance)
    if (cullCheckFrame.current % 10 === 0 && groupRef.current) {
      const visible = isInFrustum(groupRef.current, state.camera);
      setIsVisible(visible);
      
      if (visible) {
        const buttonPosition = new THREE.Vector3(...position);
        const lod = calculateLOD(buttonPosition, state.camera);
        setLodLevel(lod);
      }
    }
    cullCheckFrame.current++;
    
    // Skip rendering if not visible
    if (!isVisible && !highlighted) {
      if (groupRef.current) {
        groupRef.current.visible = false;
      }
      return;
    }
    
    if (groupRef.current) {
      groupRef.current.visible = true;
    }
    if (!meshRef.current || !materialRef.current) return;
    
    const mesh = meshRef.current;
    const material = materialRef.current;
    const time = state.clock.elapsedTime;
    
    // Update pulse phase
    pulsePhase.current += delta * 8;
    
    // Track when feedback state changes for proper animation timing
    if (pressFeedback !== prevFeedback.current) {
      if (pressFeedback) {
        feedbackStartTime.current = time;
      }
      prevFeedback.current = pressFeedback;
    }
    
    // Time since feedback started (for animations)
    const feedbackElapsed = pressFeedback ? time - feedbackStartTime.current : 0;
    
    // Reset progress if highlight start time changed (new highlight cycle)
    if (highlightStartTime !== prevHighlightStartTime.current) {
      prevHighlightStartTime.current = highlightStartTime;
      if (!highlighted || !highlightStartTime) {
        progress.current = 0;
      }
    }
    
    // Calculate progress for highlighted state
    if (highlighted && highlightStartTime && highlightDuration > 0) {
      const elapsed = Date.now() - highlightStartTime;
      progress.current = Math.min(Math.max(0, elapsed / highlightDuration), 1);
    } else if (!highlighted) {
      // Reset progress when not highlighted
      progress.current = 0;
    } else {
      // Fade out progress if highlighted but no start time
      progress.current = Math.max(0, progress.current - delta * 4);
    }
    
    // Update progress and color refs for child effects
    progressRef.current = progress.current;
    if (highlighted) {
      if (isBonus) {
        // Bonus button: golden accent
        urgencyColorRef.current.setRGB(1.0, 0.84, 0.2);
      } else if (isOddTarget) {
        // Odd One Out target gets a distinct magenta glow
        urgencyColorRef.current.setRGB(
          THEME_COLORS.secondary.r,
          THEME_COLORS.secondary.g,
          THEME_COLORS.secondary.b
        );
      } else {
        const urgencyColor = getUrgencyColor(progress.current);
        urgencyColorRef.current.setRGB(urgencyColor.r, urgencyColor.g, urgencyColor.b);
      }
    }
    
    // Track highlight state changes for anticipation
    if (highlighted && !prevHighlighted.current) {
      // Just started highlighting - begin anticipation
      anticipationPhase.current = 0.01; // Start anticipation
    }
    prevHighlighted.current = highlighted;
    
    // Update anticipation phase
    const ANTICIPATION_DURATION = 0.08; // 80ms wind-up
    if (anticipationPhase.current > 0 && anticipationPhase.current < 1) {
      anticipationPhase.current = Math.min(1, anticipationPhase.current + delta / ANTICIPATION_DURATION);
    } else if (!highlighted) {
      anticipationPhase.current = 0;
    }
    
    // Determine target depth with enhanced spring physics feel
    if (pressed) {
      // Immediate press: quick depress
      targetDepth.current = BASE_DEPTH * 0.25;
    } else if (pressFeedback === 'success') {
      // Success: enhanced spring-back with multiple bounces
      if (feedbackElapsed < 0.05) {
        // Initial squash (50ms)
        targetDepth.current = BASE_DEPTH * 0.15;
      } else if (feedbackElapsed < 0.15) {
        // First bounce up (100ms)
        const bounce1 = (feedbackElapsed - 0.05) / 0.1;
        const easeOut = 1 - Math.pow(1 - bounce1, 3);
        targetDepth.current = BASE_DEPTH * (0.15 + easeOut * 0.25); // Bounce to 0.4
      } else if (feedbackElapsed < 0.3) {
        // Second smaller bounce (150ms) - starts from 0.4 where first bounce ended
        const bounce2 = (feedbackElapsed - 0.15) / 0.15;
        // Bounce from 0.4 up to ~1.0, then settle back to ~0.4
        // Use sine wave for smooth bounce, with damping for natural decay
        const sineBounce = Math.sin(bounce2 * Math.PI); // 0 → 1 → 0
        const damping = Math.exp(-bounce2 * 2); // Exponential decay
        const overshoot = sineBounce * 0.6 * damping; // Peaks at midpoint, decays smoothly
        targetDepth.current = BASE_DEPTH * (0.4 + overshoot); // Smoothly transitions from 0.4 → ~1.0 → ~0.4
      } else {
        // Settle back to normal with slight overshoot
        const settle = Math.min((feedbackElapsed - 0.3) / 0.2, 1);
        const finalOvershoot = Math.sin(settle * Math.PI * 0.5) * 0.05 * (1 - settle);
        targetDepth.current = BASE_DEPTH * (1.0 + finalOvershoot);
      }
    } else if (pressFeedback === 'error') {
      // Error: hard push down then quick recovery with shake
      if (feedbackElapsed < 0.06) {
        // Hard push (60ms)
        targetDepth.current = BASE_DEPTH * 0.12;
      } else if (feedbackElapsed < 0.2) {
        // Quick recovery with slight overshoot
        const recover = (feedbackElapsed - 0.06) / 0.14;
        const easeOut = 1 - Math.pow(1 - recover, 2);
        const shake = Math.sin(feedbackElapsed * 40) * 0.03 * (1 - recover);
        targetDepth.current = BASE_DEPTH * (0.12 + easeOut * 0.88 + shake);
      } else {
        // Settle with final small bounce
        const settle = Math.min((feedbackElapsed - 0.2) / 0.15, 1);
        const finalBounce = Math.sin(settle * Math.PI) * 0.02 * (1 - settle);
        targetDepth.current = BASE_DEPTH * (1.0 + finalBounce);
      }
    } else if (highlighted) {
      // Anticipation: brief sink before rising
      if (anticipationPhase.current < 1) {
        // Ease-out sink: quick dip down
        const anticipationEase = 1 - Math.pow(1 - anticipationPhase.current, 2);
        const sinkAmount = Math.sin(anticipationEase * Math.PI) * 0.3; // Dip then recover
        targetDepth.current = BASE_DEPTH * (1 - sinkAmount * 0.5);
      } else {
        // After anticipation: smooth growth matching highlight duration
        targetDepth.current = BASE_DEPTH + (MAX_DEPTH - BASE_DEPTH) * progress.current;
      }
    } else {
      // Breathing idle animation - subtle depth oscillation
      // Each button has a unique phase offset based on index
      const breathePhase = time * 1.2 + buttonIndex * 0.7;
      const breatheAmount = Math.sin(breathePhase) * 0.02;
      targetDepth.current = BASE_DEPTH * (1 + breatheAmount);
    }
    
    // Spring-like interpolation with different speeds for rise/fall
    const isRising = targetDepth.current > currentDepth.current;
    const springFactor = isRising 
      ? delta * (highlighted ? 2 : 12)  // Slow rise when highlighted
      : delta * 12;  // Fast fall back
    currentDepth.current = THREE.MathUtils.lerp(
      currentDepth.current, 
      targetDepth.current, 
      springFactor
    );
    
    // Apply scale only - position is handled by parent group
    mesh.scale.z = currentDepth.current / BASE_DEPTH;
    mesh.position.z = currentDepth.current / 2; // Offset to keep front face at same position
    
    // Enhanced material properties based on state
    const baseMetalness = 0.7;
    const baseRoughness = 0.25;
    const baseClearcoat = 0.8;
    
    if (highlighted) {
      const baseHighlightColor = isBonus
        ? { r: 1.0, g: 0.84, b: 0.2 } // gold
        : isOddTarget
        ? THEME_COLORS.secondary
        : getUrgencyColor(progress.current);
      const pulse = Math.sin(pulsePhase.current) * 0.05 + 0.95;
      
      // Modern radial gradient: brighter at center, darker at edges
      const centerDist = Math.sqrt(position[0] * position[0] + position[1] * position[1]);
      const maxDist = 2.5;
      const gradientFactor = 1.0 - (centerDist / maxDist) * 0.3; // 0.7 to 1.0
      
      // Base color with gradient variation
      const baseIntensity = 0.7 * pulse;
      const centerIntensity = 0.9 * pulse;
      const colorIntensity = THREE.MathUtils.lerp(baseIntensity, centerIntensity, gradientFactor);
      
      material.color.setRGB(
        baseHighlightColor.r * colorIntensity,
        baseHighlightColor.g * colorIntensity,
        baseHighlightColor.b * colorIntensity
      );
      
      // Enhanced emissive gradient (stronger glow at center)
      const emissiveBase = 0.25;
      const emissiveCenter = 0.4;
      const emissiveIntensity = THREE.MathUtils.lerp(emissiveBase, emissiveCenter, gradientFactor);
      
      material.emissive.setRGB(
        baseHighlightColor.r * emissiveIntensity,
        baseHighlightColor.g * emissiveIntensity,
        baseHighlightColor.b * emissiveIntensity
      );
      material.emissiveIntensity = (0.3 + progress.current * 0.5) * (1.0 + gradientFactor * 0.3);
      material.metalness = baseMetalness - progress.current * 0.1;
      material.roughness = baseRoughness + progress.current * 0.1;
      material.clearcoat = baseClearcoat;
      material.clearcoatRoughness = 0.1 + progress.current * 0.1;
    } else if (pressFeedback === 'success') {
      // Enhanced success animation: multi-stage scale pulse + vibrant color flash
      let popScale = 1.0;
      
      if (feedbackElapsed < 0.05) {
        // Stage 1: Initial press down (50ms)
        popScale = 0.92;
      } else if (feedbackElapsed < 0.12) {
        // Stage 2: Quick pop up with overshoot (70ms)
        const t = (feedbackElapsed - 0.05) / 0.07;
        const overshoot = Math.sin(t * Math.PI * 0.5) * 0.18;
        popScale = 0.92 + overshoot; // Up to 1.10
      } else if (feedbackElapsed < 0.25) {
        // Stage 3: Bounce back with second smaller pulse (130ms)
        const t = (feedbackElapsed - 0.12) / 0.13;
        const bounce = Math.sin(t * Math.PI) * 0.08 * Math.exp(-t * 2);
        popScale = 1.0 + bounce;
      } else {
        // Stage 4: Settle to normal with final micro-bounce
        const t = Math.min((feedbackElapsed - 0.25) / 0.15, 1);
        const settle = Math.sin(t * Math.PI * 0.5) * 0.03 * (1 - t);
        popScale = 1.0 + settle;
      }
      
      // Enhanced color flash with gradient: bright initial flash then pulsing glow
      const flashPhase = Math.min(feedbackElapsed * 12, 1);
      const initialFlash = flashPhase < 0.3 ? 1.0 : Math.max(0.3, 1 - (flashPhase - 0.3) * 2);
      const glowPulse = Math.sin(feedbackElapsed * 18) * 0.25 + 0.75;
      const glowFade = Math.max(0, 1 - feedbackElapsed * 2);
      
      // Radial gradient factor for success state
      const centerDist = Math.sqrt(position[0] * position[0] + position[1] * position[1]);
      const maxDist = 2.5;
      const gradientFactor = 1.0 - (centerDist / maxDist) * 0.25; // 0.75 to 1.0
      
      const success = THEME_COLORS.success;
      // Bright flash at start, then pulsing glow with gradient
      const colorIntensity = initialFlash * 0.7 + glowPulse * 0.3 * glowFade;
      const baseColor = {
        r: success.r * (0.4 + colorIntensity * 0.6),
        g: success.g * (0.5 + colorIntensity * 0.5),
        b: success.b * (0.4 + colorIntensity * 0.6),
      };
      // Gradient: brighter green at center, darker at edges
      const centerColor = {
        r: success.r * (0.6 + colorIntensity * 0.4),
        g: success.g * (0.7 + colorIntensity * 0.3),
        b: success.b * (0.6 + colorIntensity * 0.4),
      };
      const finalColor = {
        r: THREE.MathUtils.lerp(baseColor.r, centerColor.r, gradientFactor),
        g: THREE.MathUtils.lerp(baseColor.g, centerColor.g, gradientFactor),
        b: THREE.MathUtils.lerp(baseColor.b, centerColor.b, gradientFactor),
      };
      material.color.setRGB(finalColor.r, finalColor.g, finalColor.b);
      
      // Enhanced emissive gradient (stronger glow at center)
      const emissiveBase = 0.4 * initialFlash * glowFade;
      const emissiveCenter = 0.8 * initialFlash * glowFade;
      const emissiveIntensity = THREE.MathUtils.lerp(emissiveBase, emissiveCenter, gradientFactor);
      material.emissive.setRGB(
        success.r * emissiveIntensity, 
        success.g * emissiveIntensity * 1.2, 
        success.b * emissiveIntensity
      );
      material.emissiveIntensity = (1.5 * initialFlash + 0.8 * glowPulse) * glowFade * (1.0 + gradientFactor * 0.2);
      material.metalness = 0.5 - initialFlash * 0.2;
      material.roughness = 0.1 + (1 - initialFlash) * 0.1;
      material.clearcoat = 1.0;
      material.clearcoatRoughness = 0.05;
      
      // Apply enhanced scale animation
      mesh.scale.x = popScale;
      mesh.scale.y = popScale;
      
    } else if (pressFeedback === 'error') {
      // Enhanced error animation: hard push + shake + red flash
      const shakeDecay = Math.exp(-feedbackElapsed * 6); // Decay over ~400ms
      const shakeIntensity = 0.15 * shakeDecay;
      const shakeSpeed = 45;
      
      // Enhanced scale: push down then quick recovery
      let errorScale = 1.0;
      if (feedbackElapsed < 0.06) {
        errorScale = 0.88; // Hard push down
      } else if (feedbackElapsed < 0.18) {
        const t = (feedbackElapsed - 0.06) / 0.12;
        errorScale = 0.88 + t * 0.12; // Quick recovery
      } else {
        const t = Math.min((feedbackElapsed - 0.18) / 0.15, 1);
        const microBounce = Math.sin(t * Math.PI) * 0.02 * (1 - t);
        errorScale = 1.0 + microBounce;
      }
      
      // Enhanced flash with gradient: bright initial flash then pulsing fade
      const flashPhase = Math.min(feedbackElapsed * 10, 1);
      const initialFlash = flashPhase < 0.4 ? 1.0 : Math.max(0.2, 1 - (flashPhase - 0.4) * 1.5);
      const flashPulse = Math.sin(feedbackElapsed * 35) * 0.3 + 0.7;
      const flashFade = Math.max(0, 1 - feedbackElapsed * 2.5);
      
      // Radial gradient factor for error state
      const centerDist = Math.sqrt(position[0] * position[0] + position[1] * position[1]);
      const maxDist = 2.5;
      const gradientFactor = 1.0 - (centerDist / maxDist) * 0.25; // 0.75 to 1.0
      
      const error = THEME_COLORS.error;
      const colorIntensity = initialFlash * 0.8 + flashPulse * 0.2 * flashFade;
      const baseColor = {
        r: error.r * (0.5 + colorIntensity * 0.5),
        g: error.g * 0.1,
        b: error.b * 0.1,
      };
      // Gradient: brighter red at center, darker at edges
      const centerColor = {
        r: error.r * (0.7 + colorIntensity * 0.3),
        g: error.g * 0.15,
        b: error.b * 0.15,
      };
      const finalColor = {
        r: THREE.MathUtils.lerp(baseColor.r, centerColor.r, gradientFactor),
        g: THREE.MathUtils.lerp(baseColor.g, centerColor.g, gradientFactor),
        b: THREE.MathUtils.lerp(baseColor.b, centerColor.b, gradientFactor),
      };
      material.color.setRGB(finalColor.r, finalColor.g, finalColor.b);
      
      // Enhanced emissive gradient (stronger glow at center)
      const emissiveBase = 0.7 * initialFlash * flashFade;
      const emissiveCenter = 1.2 * initialFlash * flashFade;
      const emissiveIntensity = THREE.MathUtils.lerp(emissiveBase, emissiveCenter, gradientFactor);
      material.emissive.setRGB(
        error.r * emissiveIntensity, 
        0.0, 
        0.0
      );
      material.emissiveIntensity = (1.8 * initialFlash + 0.6 * flashPulse) * flashFade * (1.0 + gradientFactor * 0.2);
      material.metalness = 0.2;
      material.roughness = 0.4;
      material.clearcoat = 0.6;
      
      // Enhanced shake effect with multiple frequencies
      mesh.rotation.z = Math.sin(feedbackElapsed * shakeSpeed) * shakeIntensity;
      mesh.rotation.x = Math.cos(feedbackElapsed * shakeSpeed * 0.7) * shakeIntensity * 0.6;
      mesh.rotation.y = Math.sin(feedbackElapsed * shakeSpeed * 1.2) * shakeIntensity * 0.3;
      mesh.position.x = Math.sin(feedbackElapsed * shakeSpeed * 1.4) * shakeIntensity * 0.4;
      mesh.position.y = Math.cos(feedbackElapsed * shakeSpeed * 0.9) * shakeIntensity * 0.2;
      
      // Apply scale
      mesh.scale.x = errorScale;
      mesh.scale.y = errorScale;
      
    } else {
      // Idle state - modern stylish gradient with animated effects
      const idlePulse = 0.04 * Math.sin(time * 1.5 + position[0] * 1.8 + position[1] * 1.2);
      const shimmer = Math.sin((position[0] + position[1]) * 2.5 + time * 1.2) * 0.02 + 0.98;
      
      // Calculate gradient factor based on button position (radial gradient)
      const centerDist = Math.sqrt(position[0] * position[0] + position[1] * position[1]);
      const maxDist = 2.5;
      const gradientFactor = 1.0 - (centerDist / maxDist) * 0.5; // 0.5 to 1.0 range (more pronounced)
      
      // Modern gradient colors: deep navy at edges → bright cyan-blue at center (idle)
      const edgeColor = { r: 0.05, g: 0.05, b: 0.4 }; // Deep navy edge (idle)
      const midColor = { r: 0.0, g: 0.15, b: 0.6 }; // Mid-tone blue (idle)
      const centerColor = { r: 0.1, g: 0.4, b: 0.85 }; // Bright cyan-blue center (idle)
      
      if (hovered) {
        // Hover state: subtle dark-blue shift + soft rim glow
        // Goal: clearly show cursor hover without looking like a game highlight
        const hoverEdge = { r: 0.02, g: 0.03, b: 0.22 };  // Slightly lighter than idle edge
        const hoverCenter = { r: 0.05, g: 0.16, b: 0.50 }; // Muted deep blue – NOT cyan
        
        // Multi-stage gradient interpolation
        let hoverColor;
        if (gradientFactor < 0.5) {
          // Edge to mid
          const t = gradientFactor * 2;
          hoverColor = {
            r: THREE.MathUtils.lerp(hoverEdge.r, midColor.r, t) + idlePulse,
            g: THREE.MathUtils.lerp(hoverEdge.g, midColor.g, t) + idlePulse,
            b: THREE.MathUtils.lerp(hoverEdge.b, midColor.b, t) + idlePulse,
          };
        } else {
          // Mid to center
          const t = (gradientFactor - 0.5) * 2;
          hoverColor = {
            r: THREE.MathUtils.lerp(midColor.r, hoverCenter.r, t) + idlePulse,
            g: THREE.MathUtils.lerp(midColor.g, hoverCenter.g, t) + idlePulse,
            b: THREE.MathUtils.lerp(midColor.b, hoverCenter.b, t) + idlePulse,
          };
        }
        
        material.color.setRGB(
          hoverColor.r * shimmer, 
          hoverColor.g * shimmer, 
          hoverColor.b * shimmer
        );
        
        // Enhanced emissive gradient with animated pulse
        const emissivePulse = Math.sin(time * 4) * 0.1 + 0.9;
        const emissiveBase = 0.3;
        const emissiveCenter = 0.7;
        const emissiveIntensity = THREE.MathUtils.lerp(emissiveBase, emissiveCenter, gradientFactor) * emissivePulse;
        // Very subtle neutral-blue emissive glow so it doesn't compete with highlight effects
        material.emissive.setRGB(
          0.04 + emissiveIntensity * 0.10, // R
          0.08 + emissiveIntensity * 0.18, // G
          0.16 + emissiveIntensity * 0.22  // B
        );
        material.emissiveIntensity = 0.3 + Math.sin(time * 4) * 0.08;
        material.metalness = 0.75;
        material.roughness = 0.2;
        material.clearcoat = 1.0;
        material.clearcoatRoughness = 0.08;
      } else {
        // Idle: stylish multi-stage gradient with subtle shimmer
        let idleColor;
        if (gradientFactor < 0.5) {
          // Edge to mid
          const t = gradientFactor * 2;
          idleColor = {
            r: THREE.MathUtils.lerp(edgeColor.r, midColor.r, t) + idlePulse,
            g: THREE.MathUtils.lerp(edgeColor.g, midColor.g, t) + idlePulse,
            b: THREE.MathUtils.lerp(edgeColor.b, midColor.b, t) + idlePulse,
          };
        } else {
          // Mid to center
          const t = (gradientFactor - 0.5) * 2;
          idleColor = {
            r: THREE.MathUtils.lerp(midColor.r, centerColor.r, t) + idlePulse,
            g: THREE.MathUtils.lerp(midColor.g, centerColor.g, t) + idlePulse,
            b: THREE.MathUtils.lerp(midColor.b, centerColor.b, t) + idlePulse,
          };
        }
        
        // Apply shimmer effect for modern feel
        material.color.setRGB(
          idleColor.r * shimmer, 
          idleColor.g * shimmer, 
          idleColor.b * shimmer
        );
        
        // Enhanced emissive gradient (subtle but present)
        const emissiveBase = 0.15;
        const emissiveCenter = 0.35;
        const emissiveIntensity = THREE.MathUtils.lerp(emissiveBase, emissiveCenter, gradientFactor);
        material.emissive.setRGB(
          0.0, 
          0.05 + emissiveIntensity * 0.15, 
          0.1 + emissiveIntensity * 0.25
        );
        material.emissiveIntensity = 0.25 + Math.sin(time * 1.5) * 0.05; // Subtle breathing effect
        material.metalness = 0.7;
        material.roughness = 0.25;
        material.clearcoat = 0.85;
      material.clearcoatRoughness = 0.1;
      }
      
      // Smoothly return to default transforms
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0, delta * 12);
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, 0, delta * 12);
      mesh.scale.x = THREE.MathUtils.lerp(mesh.scale.x, 1, delta * 15);
      mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, 1, delta * 15);
      mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, 0, delta * 12);
    }
    
    // Enhanced hover effect (cyan glow) - only when not in other states
    if (hovered && !highlighted && !pressFeedback) {
      material.clearcoat = 1.0;
    }
    
    // Update text position to follow button
    if (textRef.current) {
      textRef.current.position.z = currentDepth.current + 0.01;
    }
    
    // Calculate ripple effect from nearby button presses
    let totalRipple = 0;
    const now = Date.now();
    const RIPPLE_DURATION = 400; // ms
    const RIPPLE_SPEED = 3; // units per second
    
    for (const event of rippleEvents) {
      if (event.sourceIndex === buttonIndex) continue;
      
      const elapsed = now - event.timestamp;
      if (elapsed > RIPPLE_DURATION) continue;
      
      // Find source button position
      const sourceButton = allButtonPositions.find(b => b.index === event.sourceIndex);
      if (!sourceButton) continue;
      
      // Calculate distance
      const dx = position[0] - sourceButton.position[0];
      const dy = position[1] - sourceButton.position[1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Wave travels outward
      const wavePosition = (elapsed / 1000) * RIPPLE_SPEED;
      const distanceFromWave = Math.abs(distance - wavePosition);
      
      if (distanceFromWave < 0.5) {
        const waveStrength = 1 - distanceFromWave / 0.5;
        const timeFade = 1 - elapsed / RIPPLE_DURATION;
        // Scale ripple amount based on intensity (default to 0.5 if not provided)
        const intensity = event.intensity ?? 0.5;
        const baseRippleAmount = waveStrength * timeFade * 0.15;
        const scaledRippleAmount = baseRippleAmount * (0.5 + intensity * 0.5); // Scale from 0.5x to 1.0x
        totalRipple += event.type === 'success' ? scaledRippleAmount : -scaledRippleAmount * 0.5;
      }
    }
    
    // Apply ripple to scale
    rippleOffset.current = THREE.MathUtils.lerp(rippleOffset.current, totalRipple, delta * 15);
    if (Math.abs(rippleOffset.current) > 0.001 && !pressFeedback) {
      mesh.scale.x = 1 + rippleOffset.current;
      mesh.scale.y = 1 + rippleOffset.current;
    }
    
  });
  
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (disabled) return;
    setPressed(true);
    triggerHaptic('light');
  }, [disabled]);
  
  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (disabled || !pressed) return;
    setPressed(false);
    onPress();
    triggerHaptic('medium');
  }, [disabled, pressed, onPress]);
  
  const handlePointerEnter = useCallback(() => {
    if (!disabled) {
      setHovered(true);
      document.body.style.cursor = 'pointer';
    }
  }, [disabled]);
  
  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    setPressed(false);
    document.body.style.cursor = 'auto';
  }, []);
  
  // Find connected highlighted buttons for arc effects
  const connectedHighlightedButtons = useMemo(() => {
    if (!highlighted || highlightedButtons.length < 2) return [];
    return highlightedButtons
      .filter(idx => idx !== buttonIndex && idx > buttonIndex) // Only connect to higher indices to avoid duplicates
      .slice(0, 2); // Max 2 connections per button
  }, [highlighted, highlightedButtons, buttonIndex]);
  
  return (
    <group ref={groupRef} position={position} frustumCulled={true}>
      {/* Floating Particles around highlighted buttons - LOD: only show at close distance */}
      {lodLevel <= 1 && (
        <FloatingParticles 
          active={highlighted} 
          color={urgencyColorRef.current}
          position={[0, 0, 0]}
        />
      )}
      
      {/* Energy Core (inner glow) - LOD: only show at close distance */}
      {lodLevel <= 1 && (
        <EnergyCore 
          active={highlighted} 
          progress={progressRef.current}
          color={urgencyColorRef.current}
        />
      )}
      
      {/* Countdown Ring - clear visual timer showing remaining time - Always show when highlighted */}
      <CountdownRing 
        active={highlighted} 
        highlightStartTime={highlightStartTime}
        highlightDuration={highlightDuration}
      />
      
      {/* Shockwave Effect on press - Always show */}
      <Shockwave 
        trigger={pressFeedback} 
        position={[0, 0, 0]} 
      />
      
      {/* Particle Burst Effect - LOD: reduce particles at distance */}
      {!reducedEffects && lodLevel <= 2 && (
        <ParticleBurst 
          trigger={pressFeedback} 
          position={[0, 0, 0]}
          reactionTime={reactionTime ?? null}
          reducedEffects={reducedEffects || lodLevel > 1}
        />
      )}
      
      {/* Press Depth Indicator - LOD: only show at close distance */}
      {pressFeedback === 'success' && reactionTime !== null && lodLevel <= 1 && (
        <PressDepthIndicator
          active={pressFeedback === 'success'}
          depth={calculateIntensity(reactionTime) * 0.2}
          position={[0, 0, 0]}
        />
      )}
      
      {/* Glow Trail for sequence mode - LOD: only show at close distance */}
      {gameMode === 'sequence' && pressFeedback === 'success' && reactionTime !== null && !reducedEffects && lodLevel <= 1 && (
        <GlowTrail
          active={pressFeedback === 'success'}
          intensity={calculateIntensity(reactionTime)}
          position={[0, 0, 0]}
        />
      )}
      
      {/* Electric Arcs to other highlighted buttons - LOD: only show at close distance */}
      {lodLevel <= 1 && connectedHighlightedButtons.map(targetIdx => {
        const targetButton = allButtonPositions.find(b => b.index === targetIdx);
        if (!targetButton) return null;
        return (
          <ElectricArc
            key={`arc-${buttonIndex}-${targetIdx}`}
            startPos={[0, 0, 0.15]}
            endPos={[
              targetButton.position[0] - position[0],
              targetButton.position[1] - position[1],
              0.15
            ]}
            active={highlighted}
            color={urgencyColorRef.current}
          />
        );
      })}
      
      {/* Main button with PBR Physical Material */}
      <RoundedBox
        ref={meshRef}
        args={[BUTTON_SIZE, BUTTON_SIZE, BASE_DEPTH]}
        radius={lodLevel > 2 ? getLODRadius(0.08, lodLevel) : 0.08}
        smoothness={lodLevel > 1 ? Math.max(4, 8 - lodLevel * 2) : 8}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <meshPhysicalMaterial
          ref={materialRef}
          color="#0000aa"
          metalness={0.7}
          roughness={0.2}
          clearcoat={0.9}
          clearcoatRoughness={0.1}
          reflectivity={1.0}
          envMapIntensity={1.8}
          sheen={0.3}
          sheenRoughness={0.4}
          sheenColor="#00ffff"
          transmission={0.05}
          thickness={0.5}
          ior={1.5}
        />
      </RoundedBox>
      
      {/* Button Key Label */}
      {showLabel && (
        <Text
          ref={textRef}
          position={[0, 0, BASE_DEPTH + 0.01]}
          fontSize={0.28}
          color={highlighted ? "#000000" : hovered ? "#00ffff" : "#6688aa"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={highlighted ? 0.01 : 0}
          outlineColor="#ffffff"
          fillOpacity={highlighted ? 1 : 0.85}
          fontWeight="bold"
        >
          {keyLabel || buttonIndex}
        </Text>
      )}
    </group>
  );
});

// ============================================================================
// MAIN CANVAS COMPONENT
// ============================================================================

interface GameButtonGridWebGLProps {
  buttons: Array<{
    index: number;
    highlighted: boolean;
    isBonus?: boolean;
    highlightStartTime?: number;
    pressFeedback?: 'success' | 'error' | null;
    reactionTime?: number | null;
    isOddTarget?: boolean;
  }>;
  highlightDuration: number;
  onPress: (index: number) => void;
  disabled?: boolean;
  keyLabels?: Record<number, string>; // Keyboard key labels for each button (1-10)
  showLabels?: boolean; // Whether to show labels on buttons (default: true)
  // Game state for dynamic background effects
  gameState?: {
    combo: number;
    lives: number;
    maxLives: number;
    gameOver: boolean;
    score: number;
    difficulty: string; // DifficultyPreset from game context
    reducedEffects?: boolean;
    gameMode?: string;
  };
  // Combo milestone for celebration effects (5, 10, 20, 30, 50)
  comboMilestone?: number | null;
  performance?: {
    maxDpr?: number;
    renderScale?: number;
    gridScale?: number;
    disablePostprocessing?: boolean;
    powerPreference?: WebGLPowerPreference;
  };
}

// Ripple event for cross-button communication
interface RippleEvent {
  sourceIndex: number;
  timestamp: number;
  type: 'success' | 'error';
  intensity?: number; // Reaction time-based intensity (0-1)
}

// The actual game layout: 3-4-3 (10 buttons total)
const GAME_LAYOUT = [
  [1, 2, 3],       // Top row: 3 buttons
  [4, 5, 6, 7],   // Middle row: 4 buttons
  [8, 9, 10],     // Bottom row: 3 buttons
];

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
  
  // Clean up old ripple events - reduced frequency for better performance
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setRippleEvents(prev => prev.filter(e => now - e.timestamp < 500));
    }, 1000); // Reduced from 500ms to 1000ms
    return () => clearInterval(cleanup);
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
        dpr={[1, maxDpr]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
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
                  isBonus={buttonData.isBonus}
                  isOddTarget={buttonData.isOddTarget}
                  highlightStartTime={buttonData.highlightStartTime}
                  highlightDuration={highlightDuration}
                  pressFeedback={buttonData.pressFeedback}
                  reactionTime={buttonData.reactionTime ?? null}
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
          
          
          {/* Post-processing effects - adaptive quality based on reducedEffects */}
          {!disablePostprocessing && (
            <EffectComposer multisampling={disablePostprocessing ? 0 : 4}>
              {/* Dynamic Bloom - responds to combo milestones */}
              <DynamicBloom comboMilestone={comboMilestone} baseIntensity={0.7} />
              
              {/* Subtle chromatic aberration for energy feel */}
              <ChromaticAberration
                blendFunction={BlendFunction.NORMAL}
                offset={[0.0008, 0.0008]}
                radialModulation={true}
                modulationOffset={0.5}
              />
              
              {/* Vignette for focus effect */}
              <Vignette
                offset={0.35}
                darkness={0.4}
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
          
          {!gameState?.reducedEffects && (
            <EffectComposer multisampling={4}>
              <Bloom
                intensity={0.8}
                luminanceThreshold={0.25}
                luminanceSmoothing={0.9}
                mipmapBlur
              />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
});

export default GameButton3DWebGL;

