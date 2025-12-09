/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { memo, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderCache } from '@/lib/webglOptimizations';

export const ReflectionSurface = memo(function ReflectionSurface() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Enhanced shader for cyberpunk grid reflection effect (cached)
  const shaderMaterial = useMemo(() => {
    return shaderCache.getOrCreate('reflection-surface', () => new THREE.ShaderMaterial({
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
    }));
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

