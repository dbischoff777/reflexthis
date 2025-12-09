/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { memo, useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getSharedParticlePool, type PooledParticle } from '@/lib/webglOptimizations';
import { ParticleBurstProps } from '../types';
import { calculateIntensity, getColorByReactionTime } from '../helpers';

export const ParticleBurst = memo(function ParticleBurst({ 
  trigger, 
  position, 
  reactionTime = null,
  intensity: providedIntensity,
  reducedEffects = false 
}: ParticleBurstProps & { reducedEffects?: boolean }) {
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
    let activeCount = 0;
    
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
      meshRef.current!.setMatrixAt(activeCount, dummy.matrix);
      
      // Update color with fade
      tempColor.copy(particle.color);
      tempColor.multiplyScalar(particle.life);
      meshRef.current!.setColorAt(activeCount, tempColor);
      
      activeParticles.push(particle);
      activeCount += 1;
    });
    
    // Update particles array
    particlesRef.current = activeParticles;
    
    // Render only the active instances
    meshRef.current.count = activeCount;
    if (activeCount > 0) {
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
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

