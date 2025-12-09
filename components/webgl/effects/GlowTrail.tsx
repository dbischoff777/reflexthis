/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GlowTrailProps } from '../types';
import { BUTTON_SIZE } from '../constants';

export const GlowTrail = memo(function GlowTrail({ 
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

