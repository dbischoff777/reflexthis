/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraShakeProps } from '../types';

export const CameraShake = memo(function CameraShake({ errorEvents, comboMilestone }: CameraShakeProps) {
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

