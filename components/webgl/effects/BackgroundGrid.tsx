/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { memo, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderCache } from '@/lib/webglOptimizations';
import { BackgroundGridProps, GameState } from '../types';

export const BackgroundGrid = memo(function BackgroundGrid({ gameState, highlightedCount = 0, comboMilestone }: BackgroundGridProps) {
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

