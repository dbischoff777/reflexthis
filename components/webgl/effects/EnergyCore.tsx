/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EnergyCoreProps } from '../types';

export const EnergyCore = memo(function EnergyCore({ active, progress, color }: EnergyCoreProps) {
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

