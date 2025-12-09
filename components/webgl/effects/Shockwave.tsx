/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { memo, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderCache } from '@/lib/webglOptimizations';
import { ShockwaveProps } from '../types';

export const Shockwave = memo(function Shockwave({ trigger, position }: ShockwaveProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const triggerTime = useRef(0);
  const prevTrigger = useRef<'success' | 'error' | null>(null);
  const isActive = useRef(false);
  
  const shaderMaterial = useMemo(() => {
    return shaderCache.getOrCreate('shockwave', () => new THREE.ShaderMaterial({
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
    }), true); // Clone for per-instance uniforms
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
    <mesh 
      ref={meshRef} 
      position={[position[0], position[1], position[2] + 0.05]}
      frustumCulled={false}
    >
      <planeGeometry args={[1.2, 1.2]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
});

