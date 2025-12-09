/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { memo, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderCache } from '@/lib/webglOptimizations';
import { CountdownRingProps } from '../types';

export const CountdownRing = memo(function CountdownRing({ 
  active, 
  highlightStartTime,
  highlightDuration 
}: CountdownRingProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const shaderMaterial = useMemo(() => {
    return shaderCache.getOrCreate('countdown-ring', () => new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uActive: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uActive;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        // Color palette for urgency levels
        vec3 getUrgencyColor(float progress) {
          // Cyan (0%) -> Green (25%) -> Yellow (50%) -> Orange (75%) -> Red (100%)
          vec3 cyan = vec3(0.0, 1.0, 1.0);
          vec3 green = vec3(0.2, 1.0, 0.4);
          vec3 yellow = vec3(1.0, 1.0, 0.0);
          vec3 orange = vec3(1.0, 0.5, 0.0);
          vec3 red = vec3(1.0, 0.15, 0.1);
          
          if (progress < 0.25) {
            return mix(cyan, green, progress * 4.0);
          } else if (progress < 0.5) {
            return mix(green, yellow, (progress - 0.25) * 4.0);
          } else if (progress < 0.75) {
            return mix(yellow, orange, (progress - 0.5) * 4.0);
          } else {
            return mix(orange, red, (progress - 0.75) * 4.0);
          }
        }
        
        void main() {
          // Calculate angle from top (12 o'clock position)
          float angle = atan(vPosition.x, vPosition.y); // Swapped for top-start
          float normalizedAngle = (angle + 3.14159) / (2.0 * 3.14159);
          
          // Remaining time fills from top, clockwise
          float remaining = 1.0 - uProgress;
          float fillMask = step(normalizedAngle, remaining);
          
          // Ring geometry
          float dist = length(vPosition.xy);
          float innerRadius = 0.52;
          float outerRadius = 0.62;
          
          // Smooth ring edges
          float ring = smoothstep(innerRadius - 0.02, innerRadius + 0.01, dist) * 
                       smoothstep(outerRadius + 0.02, outerRadius - 0.01, dist);
          
          // Urgency pulse - faster when time is running out
          float pulseSpeed = 2.0 + uProgress * 15.0;
          float pulseIntensity = 0.15 + uProgress * 0.35;
          float pulse = 1.0 + sin(uTime * pulseSpeed) * pulseIntensity;
          
          // Glow at the leading edge of the countdown
          float edgeGlow = 0.0;
          float edgeWidth = 0.08;
          if (abs(normalizedAngle - remaining) < edgeWidth && remaining > 0.02) {
            edgeGlow = (1.0 - abs(normalizedAngle - remaining) / edgeWidth) * 2.0;
          }
          
          // Get color based on urgency
          vec3 baseColor = getUrgencyColor(uProgress);
          
          // Add brightness boost when critical
          float criticalBoost = uProgress > 0.7 ? (uProgress - 0.7) * 3.0 : 0.0;
          vec3 finalColor = baseColor * (1.2 + criticalBoost) * pulse;
          
          // Combine fill and glow
          float alpha = (ring * fillMask + edgeGlow * ring) * uActive;
          
          // Add subtle background ring to show full circle
          float bgRing = ring * (1.0 - fillMask) * 0.15 * uActive;
          vec3 bgColor = vec3(0.3, 0.3, 0.4);
          
          vec3 outputColor = finalColor * (ring * fillMask + edgeGlow * ring) + bgColor * bgRing;
          float outputAlpha = alpha + bgRing;
          
          gl_FragColor = vec4(outputColor, outputAlpha * 0.95);
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
    const mat = shaderMaterial;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    
    // Calculate progress directly from highlightStartTime and highlightDuration
    // This ensures it updates every frame even if props don't change
    let progress = 0;
    if (active && highlightStartTime && highlightDuration > 0) {
      const elapsed = Date.now() - highlightStartTime;
      progress = Math.max(0, Math.min(1, elapsed / highlightDuration));
    }
    
    mat.uniforms.uProgress.value = progress;
    mat.uniforms.uActive.value = THREE.MathUtils.lerp(
      mat.uniforms.uActive.value,
      active ? 1 : 0,
      0.2
    );
  });
  
  return (
    <mesh 
      ref={ringRef} 
      position={[0, 0, 0.06]} 
      rotation={[0, 0, 0]}
      frustumCulled={false}
    >
      <ringGeometry args={[0.48, 0.66, 64]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
});

