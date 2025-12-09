/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PressDepthIndicatorProps } from '../types';
import { BUTTON_SIZE } from '../constants';

export const PressDepthIndicator = memo(function PressDepthIndicator({ 
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

