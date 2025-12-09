/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { memo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { DynamicBloomProps } from '../types';

export const DynamicBloom = memo(function DynamicBloom({ comboMilestone, baseIntensity = 0.7 }: DynamicBloomProps) {
  const [intensity, setIntensity] = useState(baseIntensity);
  const celebrationIntensityRef = useRef(0);
  const lastMilestoneRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const lastSetRef = useRef(baseIntensity);
  
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
    let targetIntensity = baseIntensity;
    if (celebrationIntensityRef.current > 0) {
      const elapsed = time - startTimeRef.current;
      const duration = 0.6; // 600ms bloom burst
      
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const fade = 1 - progress * progress; // Ease out
        const currentBurst = celebrationIntensityRef.current * fade;
        targetIntensity = baseIntensity + currentBurst;
      } else {
        celebrationIntensityRef.current = 0;
        targetIntensity = baseIntensity;
      }
    } else {
      // Smoothly return to base intensity
      targetIntensity = THREE.MathUtils.lerp(lastSetRef.current, baseIntensity, 0.1);
    }

    // Avoid per-frame state updates when changes are negligible
    if (Math.abs(targetIntensity - lastSetRef.current) > 0.02) {
      lastSetRef.current = targetIntensity;
      setIntensity(targetIntensity);
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

