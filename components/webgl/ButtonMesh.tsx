/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import React, { useRef, useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { triggerHaptic } from '@/lib/hapticUtils';
import { isInFrustum, calculateLOD, getLODRadius } from '@/lib/webglOptimizations';
import { ButtonMeshProps, RippleEvent } from './types';
import { BASE_DEPTH, MAX_DEPTH, BUTTON_SIZE, THEME_COLORS } from './constants';
import { getUrgencyColor, calculateIntensity } from './helpers';
import {
  FloatingParticles,
  EnergyCore,
  CountdownRing,
  Shockwave,
  ParticleBurst,
  PressDepthIndicator,
  GlowTrail,
  ElectricArc,
} from './effects';

export const ButtonMesh = memo(function ButtonMesh({
  buttonIndex,
  highlighted,
  isDistractor = false,
  isOddTarget = false,
  isPatternButton = false,
  isBonus = false,
  highlightStartTime,
  highlightDuration,
  pressFeedback,
  reactionTime = null,
  remainingHits = 0,
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
  const hitCountTextRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const rippleOffset = useRef(0);
  
  // Track current urgency color for child components
  const urgencyColorRef = useRef(new THREE.Color(0, 1, 1));
  const progressRef = useRef(0);
  
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lodLevel, setLodLevel] = useState(0);
  const isVisibleRef = useRef(true);
  const lodLevelRef = useRef(0);
  const buttonPositionRef = useMemo(() => new THREE.Vector3(...position), [position]);

  useEffect(() => {
    buttonPositionRef.set(position[0], position[1], position[2]);
  }, [position, buttonPositionRef]);
  
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
      if (visible !== isVisibleRef.current) {
        isVisibleRef.current = visible;
        setIsVisible(visible);
      }
      
      if (visible) {
        const lod = calculateLOD(buttonPositionRef, state.camera);
        if (lod !== lodLevelRef.current) {
          lodLevelRef.current = lod;
          setLodLevel(lod);
        }
      }
    }
    cullCheckFrame.current++;
    
    // Skip rendering if not visible
    if (!isVisibleRef.current && !highlighted) {
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
          THEME_COLORS.b
        );
      } else if (isDistractor && gameMode === 'sequence') {
        // Sequence distractor: soft purple highlight
        urgencyColorRef.current.setRGB(0.8, 0.4, 1.0);
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
        : isDistractor && gameMode === 'sequence'
        ? { r: 0.8, g: 0.4, b: 1.0 } // distinct purple for distractor track
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
     
     // Update multi-hit indicator position to follow button surface
     // The button's front face is at currentDepth.current, so position text above it
     if (hitCountTextRef.current) {
       hitCountTextRef.current.position.z = currentDepth.current + 0.05;
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
      
      {/* Multi-hit indicator - shows remaining hits */}
      {highlighted && remainingHits > 0 && (
        <Text
          ref={hitCountTextRef}
          position={[0, -0.4, BASE_DEPTH + 0.02]}
          fontSize={0.35}
          color="#ffaa00"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
          fillOpacity={1}
          fontWeight="bold"
        >
          {remainingHits}
        </Text>
      )}
    </group>
  );
});

