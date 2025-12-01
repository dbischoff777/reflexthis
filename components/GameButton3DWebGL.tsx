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

// ============================================================================
// CAMERA SHAKE COMPONENT
// ============================================================================

interface CameraShakeProps {
  errorEvents: RippleEvent[];
}

const CameraShake = memo(function CameraShake({ errorEvents }: CameraShakeProps) {
  const shakeRef = useRef({ x: 0, y: 0, intensity: 0 });
  const lastErrorTime = useRef(0);
  const baseY = 0.2; // Match camera's base Y position
  
  useFrame((state, delta) => {
    const camera = state.camera;
    
    // Check for new error events
    for (const event of errorEvents) {
      if (event.type === 'error' && event.timestamp > lastErrorTime.current) {
        shakeRef.current.intensity = 0.06;
        lastErrorTime.current = event.timestamp;
      }
    }
    
    // Apply shake with decay
    if (shakeRef.current.intensity > 0.001) {
      const time = state.clock.elapsedTime * 45;
      shakeRef.current.x = Math.sin(time) * shakeRef.current.intensity;
      shakeRef.current.y = Math.cos(time * 1.3) * shakeRef.current.intensity * 0.7;
      
      // Decay shake rapidly
      shakeRef.current.intensity *= 0.88;
      
      // Apply to camera
      camera.position.x = shakeRef.current.x;
      camera.position.y = baseY + shakeRef.current.y;
    } else {
      // Smoothly return to rest position
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, delta * 12);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, baseY, delta * 12);
      shakeRef.current.intensity = 0;
    }
  });
  
  return null;
});

// ============================================================================
// REFLECTION SURFACE COMPONENT
// ============================================================================

const ReflectionSurface = memo(function ReflectionSurface() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Enhanced shader for cyberpunk grid reflection effect
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
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
    });
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
  };
  highlightedCount?: number;
}

const BackgroundGrid = memo(function BackgroundGrid({ gameState, highlightedCount = 0 }: BackgroundGridProps) {
  // Accumulated phases - these increment over time at variable speeds without resetting
  const phaseRef = useRef({ pulse: 0, scan: 0, color: 0 });
  const lastTimeRef = useRef(0);
  const currentSpeedRef = useRef(1.0);
  
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
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
          
          // Game over purple tint
          color = mix(color, gameOverColor * 0.3, uGameOver * 0.4);
          
          // Alpha with edge fade
          float alpha = (0.85 + uIntensity * 0.1) * vignette;
          alpha = max(alpha, edgeGlow * 0.8); // Keep edge glow visible
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
    });
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
// PARTICLE BURST COMPONENT
// ============================================================================

interface Particle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

interface ParticleBurstProps {
  trigger: 'success' | 'error' | null;
  position: [number, number, number];
}

const ParticleBurst = memo(function ParticleBurst({ trigger, position }: ParticleBurstProps) {
  const particlesRef = useRef<Particle[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const prevTrigger = useRef<'success' | 'error' | null>(null);
  
  const PARTICLE_COUNT = 20;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  
  // Spawn particles when trigger changes
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Spawn new particles on trigger change
    if (trigger && trigger !== prevTrigger.current) {
      const isSuccess = trigger === 'success';
      const baseColor = isSuccess 
        ? new THREE.Color(0.2, 1.0, 0.5) 
        : new THREE.Color(1.0, 0.3, 0.2);
      
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 1.5 + Math.random() * 2;
        const upward = 0.5 + Math.random() * 1.5;
        
        particlesRef.current.push({
          id: Date.now() + i,
          position: new THREE.Vector3(position[0], position[1], position[2] + 0.3),
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed * 0.5 + upward,
            Math.random() * 0.5
          ),
          life: 1.0,
          maxLife: 0.6 + Math.random() * 0.3,
          color: baseColor.clone().offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.2),
          size: 0.03 + Math.random() * 0.04,
        });
      }
    }
    prevTrigger.current = trigger;
    
    // Update existing particles
    const gravity = -4;
    particlesRef.current = particlesRef.current.filter((particle, i) => {
      particle.life -= delta / particle.maxLife;
      
      if (particle.life <= 0) return false;
      
      // Physics
      particle.velocity.y += gravity * delta;
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));
      
      // Update instance
      dummy.position.copy(particle.position);
      const scale = particle.size * particle.life;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      
      // Update color with fade
      tempColor.copy(particle.color);
      tempColor.multiplyScalar(particle.life);
      meshRef.current!.setColorAt(i, tempColor);
      
      return true;
    });
    
    // Hide unused instances
    for (let i = particlesRef.current.length; i < PARTICLE_COUNT * 2; i++) {
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
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT * 2]}>
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
// HOLOGRAPHIC RING EFFECT
// ============================================================================

interface HolographicRingProps {
  active: boolean;
  progress: number;
  color: THREE.Color;
}

const HolographicRing = memo(function HolographicRing({ active, progress, color }: HolographicRingProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(0, 1, 1) },
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
        uniform vec3 uColor;
        uniform float uActive;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          // Create ring pattern
          float angle = atan(vPosition.y, vPosition.x);
          float normalizedAngle = (angle + 3.14159) / (2.0 * 3.14159);
          
          // Animated segments
          float segments = 12.0;
          float segmentProgress = fract(normalizedAngle * segments - uTime * 2.0);
          float segmentGlow = smoothstep(0.0, 0.3, segmentProgress) * smoothstep(1.0, 0.7, segmentProgress);
          
          // Urgency pulse - faster as progress increases
          float pulseSpeed = 3.0 + uProgress * 12.0;
          float pulse = sin(uTime * pulseSpeed) * 0.3 + 0.7;
          
          // Edge glow
          float dist = length(vPosition.xy);
          float ringWidth = 0.08;
          float innerRadius = 0.42;
          float ring = smoothstep(innerRadius - ringWidth, innerRadius, dist) * 
                       smoothstep(innerRadius + ringWidth * 2.0, innerRadius + ringWidth, dist);
          
          // Combine effects
          float alpha = ring * segmentGlow * pulse * uActive;
          vec3 finalColor = uColor * (1.0 + uProgress * 0.5);
          
          gl_FragColor = vec4(finalColor, alpha * 0.8);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);
  
  useFrame((state) => {
    if (!materialRef.current) return;
    const mat = shaderMaterial;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uProgress.value = progress;
    mat.uniforms.uColor.value.copy(color);
    mat.uniforms.uActive.value = THREE.MathUtils.lerp(
      mat.uniforms.uActive.value,
      active ? 1 : 0,
      0.15
    );
  });
  
  return (
    <mesh ref={ringRef} position={[0, 0, 0.08]} rotation={[0, 0, 0]}>
      <ringGeometry args={[0.38, 0.52, 64]} />
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
    return new THREE.ShaderMaterial({
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
    });
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
    <mesh ref={meshRef} position={[position[0], position[1], position[2] + 0.05]}>
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
    <points ref={particlesRef} position={position}>
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
    <line ref={lineRef}>
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

// ============================================================================
// 3D BUTTON MESH COMPONENT
// ============================================================================

interface ButtonMeshProps {
  buttonIndex: number;
  highlighted: boolean;
  highlightStartTime?: number;
  highlightDuration: number;
  pressFeedback?: 'success' | 'error' | null;
  onPress: () => void;
  disabled?: boolean;
  position: [number, number, number];
  rippleEvents?: RippleEvent[];
  allButtonPositions?: Array<{ index: number; position: [number, number, number] }>;
  keyLabel?: string; // Keyboard key to display on button
  showLabel?: boolean; // Whether to show label
  highlightedButtons?: number[]; // All currently highlighted button indices for arc effects
}

const ButtonMesh = memo(function ButtonMesh({
  buttonIndex,
  highlighted,
  highlightStartTime,
  highlightDuration,
  pressFeedback,
  onPress,
  disabled,
  position,
  rippleEvents = [],
  allButtonPositions = [],
  keyLabel,
  showLabel = true,
  highlightedButtons = [],
}: ButtonMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const textRef = useRef<THREE.Mesh>(null);
  const rippleOffset = useRef(0);
  
  // Track current urgency color for child components
  const [currentUrgencyColor, setCurrentUrgencyColor] = useState(new THREE.Color(0, 1, 1));
  const urgencyColorRef = useRef(new THREE.Color(0, 1, 1));
  const progressRef = useRef(0);
  
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  
  // Animation state
  const targetDepth = useRef(BASE_DEPTH);
  const currentDepth = useRef(BASE_DEPTH);
  const progress = useRef(0);
  const pulsePhase = useRef(0);
  const feedbackStartTime = useRef(0);
  const prevFeedback = useRef<'success' | 'error' | null>(null);
  const prevHighlighted = useRef(false);
  const anticipationPhase = useRef(0); // 0 = none, 0-1 = anticipation in progress
  
  
  
  // Smooth animation using useFrame
  useFrame((state, delta) => {
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
    
    // Calculate progress for highlighted state
    if (highlighted && highlightStartTime) {
      const elapsed = Date.now() - highlightStartTime;
      progress.current = Math.min(elapsed / highlightDuration, 1);
    } else {
      progress.current = Math.max(0, progress.current - delta * 4);
    }
    
    // Update progress and color refs for child effects
    progressRef.current = progress.current;
    if (highlighted) {
      const urgencyColor = getUrgencyColor(progress.current);
      urgencyColorRef.current.setRGB(urgencyColor.r, urgencyColor.g, urgencyColor.b);
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
    
    // Determine target depth with spring physics feel
    if (pressed) {
      targetDepth.current = BASE_DEPTH * 0.3;
    } else if (pressFeedback === 'success') {
      // Success: quick squash then spring back
      const successBounce = feedbackElapsed < 0.1 
        ? BASE_DEPTH * 0.2  // Initial squash
        : BASE_DEPTH * (0.8 + Math.sin(feedbackElapsed * 15) * 0.2 * Math.exp(-feedbackElapsed * 5));
      targetDepth.current = successBounce;
    } else if (pressFeedback === 'error') {
      // Error: pushed down hard then slight bounce
      const errorBounce = feedbackElapsed < 0.08
        ? BASE_DEPTH * 0.15  // Hard push
        : BASE_DEPTH * (0.6 + Math.sin(feedbackElapsed * 20) * 0.1 * Math.exp(-feedbackElapsed * 6));
      targetDepth.current = errorBounce;
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
      const urgencyColor = getUrgencyColor(progress.current);
      const pulse = Math.sin(pulsePhase.current) * 0.05 + 0.95;
      
      material.color.setRGB(
        urgencyColor.r * pulse * 0.7, 
        urgencyColor.g * pulse * 0.7, 
        urgencyColor.b * pulse * 0.7
      );
      material.emissive.setRGB(
        urgencyColor.r * 0.25,
        urgencyColor.g * 0.25,
        urgencyColor.b * 0.25
      );
      material.emissiveIntensity = 0.3 + progress.current * 0.5;
      material.metalness = baseMetalness - progress.current * 0.1;
      material.roughness = baseRoughness + progress.current * 0.1;
      material.clearcoat = baseClearcoat;
      material.clearcoatRoughness = 0.1 + progress.current * 0.1;
    } else if (pressFeedback === 'success') {
      // Success animation: pop scale + pulsing green glow
      const popProgress = Math.min(feedbackElapsed * 8, 1); // Quick 125ms pop
      const popScale = popProgress < 0.5 
        ? 1 + Math.sin(popProgress * Math.PI) * 0.15  // Scale up
        : 1 + Math.sin(popProgress * Math.PI) * 0.15 * (1 - (popProgress - 0.5) * 2); // Scale back
      
      // Pulsing glow that fades
      const glowPulse = Math.sin(feedbackElapsed * 20) * 0.3 + 0.7;
      const glowFade = Math.max(0, 1 - feedbackElapsed * 2.5);
      
      const success = THEME_COLORS.success;
      material.color.setRGB(success.r * 0.5, success.g * glowPulse, success.b * 0.5);
      material.emissive.setRGB(success.r * 0.3 * glowFade, success.g * 0.6 * glowFade * glowPulse, success.b * 0.3 * glowFade);
      material.emissiveIntensity = 1.2 * glowFade;
      material.metalness = 0.4;
      material.roughness = 0.15;
      material.clearcoat = 1.0;
      
      // Apply pop scale
      mesh.scale.x = popScale;
      mesh.scale.y = popScale;
      
    } else if (pressFeedback === 'error') {
      // Error animation: shake with decay + red flash
      const shakeDecay = Math.exp(-feedbackElapsed * 8); // Fast decay over ~300ms
      const shakeIntensity = 0.12 * shakeDecay;
      const shakeSpeed = 50;
      
      // Flash intensity fades out
      const flashIntensity = Math.max(0, 1 - feedbackElapsed * 3);
      const flashPulse = Math.sin(feedbackElapsed * 30) * 0.2 + 0.8;
      
      const error = THEME_COLORS.error;
      material.color.setRGB(error.r * (0.6 + 0.2 * flashIntensity * flashPulse), error.g, error.b);
      material.emissive.setRGB(error.r * 0.5 * flashIntensity, 0.0, 0.0);
      material.emissiveIntensity = 1.0 * flashIntensity;
      material.metalness = 0.3;
      material.roughness = 0.35;
      
      // Shake effect with proper decay
      mesh.rotation.z = Math.sin(feedbackElapsed * shakeSpeed) * shakeIntensity;
      mesh.rotation.x = Math.cos(feedbackElapsed * shakeSpeed * 0.8) * shakeIntensity * 0.5;
      mesh.position.x = Math.sin(feedbackElapsed * shakeSpeed * 1.3) * shakeIntensity * 0.3;
      
    } else {
      // Idle state - deep blue matching game theme
      const idlePulse = 0.03 * Math.sin(time * 2 + position[0] * 2);
      const baseBlue = THEME_COLORS.idle;
      
      if (hovered) {
        // Hover: brighter cyan-blue
        material.color.setRGB(
          THEME_COLORS.hover.r + idlePulse, 
          THEME_COLORS.hover.g + idlePulse, 
          THEME_COLORS.hover.b + idlePulse
        );
        material.emissive.setRGB(0.0, 0.3, 0.5);
        material.emissiveIntensity = 0.6 + Math.sin(time * 5) * 0.15;
      } else {
        material.color.setRGB(
          baseBlue.r + idlePulse, 
          baseBlue.g + idlePulse, 
          baseBlue.b + idlePulse
        );
        material.emissive.setRGB(0.0, 0.0, 0.15);
        material.emissiveIntensity = 0.2;
      }
      
      material.metalness = baseMetalness;
      material.roughness = baseRoughness;
      material.clearcoat = baseClearcoat;
      material.clearcoatRoughness = 0.1;
      
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
        const rippleAmount = waveStrength * timeFade * 0.15;
        totalRipple += event.type === 'success' ? rippleAmount : -rippleAmount * 0.5;
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
    <group position={position}>
      {/* Floating Particles around highlighted buttons */}
      <FloatingParticles 
        active={highlighted} 
        color={urgencyColorRef.current}
        position={[0, 0, 0]}
      />
      
      {/* Energy Core (inner glow) */}
      <EnergyCore 
        active={highlighted} 
        progress={progressRef.current}
        color={urgencyColorRef.current}
      />
      
      {/* Holographic Ring Effect */}
      <HolographicRing 
        active={highlighted} 
        progress={progressRef.current}
        color={urgencyColorRef.current}
      />
      
      {/* Shockwave Effect on press */}
      <Shockwave 
        trigger={pressFeedback} 
        position={[0, 0, 0]} 
      />
      
      {/* Particle Burst Effect */}
      <ParticleBurst 
        trigger={pressFeedback} 
        position={[0, 0, 0]} 
      />
      
      {/* Electric Arcs to other highlighted buttons */}
      {connectedHighlightedButtons.map(targetIdx => {
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
        radius={0.08}
        smoothness={8}
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
    highlightStartTime?: number;
    pressFeedback?: 'success' | 'error' | null;
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
  };
}

// Ripple event for cross-button communication
interface RippleEvent {
  sourceIndex: number;
  timestamp: number;
  type: 'success' | 'error';
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
}: GameButtonGridWebGLProps) {
  const lastPressTime = useRef<number>(0);
  const [rippleEvents, setRippleEvents] = useState<RippleEvent[]>([]);
  
  // Clean up old ripple events
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setRippleEvents(prev => prev.filter(e => now - e.timestamp < 500));
    }, 500);
    return () => clearInterval(cleanup);
  }, []);
  
  // Track feedback changes to create ripple events
  const prevFeedbackRef = useRef<Map<number, 'success' | 'error' | null>>(new Map());
  useEffect(() => {
    buttons.forEach(button => {
      const prevFeedback = prevFeedbackRef.current.get(button.index);
      if (button.pressFeedback && button.pressFeedback !== prevFeedback) {
        setRippleEvents(prev => [
          ...prev,
          {
            sourceIndex: button.index,
            timestamp: Date.now(),
            type: button.pressFeedback!,
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
  
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{
          position: [0, 0.2, 6.5],  // Closer view for larger buttons
          fov: 38,  // Wider FOV to see all buttons clearly
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
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
          <CameraShake errorEvents={rippleEvents} />
          
          {/* Background Grid (vertical backdrop) - reacts to game state */}
          <BackgroundGrid 
            gameState={gameState} 
            highlightedCount={buttons.filter(b => b.highlighted).length}
          />
          
          {/* Reflection Surface (floor) */}
          <ReflectionSurface />
          
          {/* Button grid - 3-4-3 layout matching actual game */}
          <group rotation={[0.1, 0, 0]} position={[0, 0, 0]}>
            {buttonPositions.map(({ index, position }) => {
              const buttonData = buttons.find(b => b.index === index) || {
                index,
                highlighted: false,
                pressFeedback: null,
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
                  highlightStartTime={buttonData.highlightStartTime}
                  highlightDuration={highlightDuration}
                  pressFeedback={buttonData.pressFeedback}
                  onPress={() => handlePress(index)}
                  disabled={disabled}
                  position={position}
                  rippleEvents={rippleEvents}
                  allButtonPositions={buttonPositions}
                  keyLabel={keyLabels[index]}
                  showLabel={showLabels}
                  highlightedButtons={highlightedButtonIndices}
                />
              );
            })}
          </group>
          
          
          {/* Post-processing effects - enhanced for next-level visuals */}
          <EffectComposer multisampling={4}>
            {/* Enhanced Bloom for dramatic glow effects */}
            <Bloom
              intensity={0.7}
              luminanceThreshold={0.3}
              luminanceSmoothing={0.9}
              mipmapBlur
              radius={0.7}
            />
            
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
            highlightStartTime={highlightStartTime}
            highlightDuration={highlightDuration}
            pressFeedback={pressFeedback}
            onPress={handlePress}
            disabled={disabled}
            position={[0, 0, 0]}
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

