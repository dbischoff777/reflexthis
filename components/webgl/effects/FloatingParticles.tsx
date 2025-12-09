/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { memo, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloatingParticlesProps } from '../types';

export const FloatingParticles = memo(function FloatingParticles({ active, color, position }: FloatingParticlesProps) {
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

