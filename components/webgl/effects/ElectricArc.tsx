/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { memo, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ElectricArcProps } from '../types';

export const ElectricArc = memo(function ElectricArc({ startPos, endPos, active, color }: ElectricArcProps) {
  const lineRef = useRef<THREE.Line>(null);
  const pointCount = 20;
  
  const { positions, basePositions } = useMemo(() => {
    const positions = new Float32Array(pointCount * 3);
    const basePositions: THREE.Vector3[] = [];
    
    for (let i = 0; i < pointCount; i++) {
      const t = i / (pointCount - 1);
      const x = startPos[0] + (endPos[0] - startPos[0]) * t;
      const y = startPos[1] + (endPos[1] - startPos[1]) * t;
      const z = startPos[2] + (endPos[2] - startPos[2]) * t + 0.1;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      basePositions.push(new THREE.Vector3(x, y, z));
    }
    
    return { positions, basePositions };
    // Use individual values to avoid recreating on every render due to new array references
  }, [startPos[0], startPos[1], startPos[2], endPos[0], endPos[1], endPos[2]]);
  
  useFrame((state) => {
    if (!lineRef.current || !active) return;
    
    const positionAttr = lineRef.current.geometry.attributes.position;
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < pointCount; i++) {
      const t = i / (pointCount - 1);
      const midFactor = Math.sin(t * Math.PI); // More displacement in middle
      
      // Random jagged lightning effect
      const noise1 = Math.sin(time * 30 + i * 2) * midFactor * 0.08;
      const noise2 = Math.cos(time * 25 + i * 3) * midFactor * 0.06;
      
      positionAttr.setXYZ(
        i,
        basePositions[i].x + noise1,
        basePositions[i].y + noise2,
        basePositions[i].z + Math.sin(time * 20 + i) * 0.03
      );
    }
    
    positionAttr.needsUpdate = true;
    
    // Update material
    const material = lineRef.current.material as THREE.LineBasicMaterial;
    material.color.copy(color);
    material.opacity = active ? 0.6 + Math.sin(time * 15) * 0.3 : 0;
  });
  
  if (!active) return null;
  
  return (
    <line ref={lineRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={pointCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        linewidth={2}
      />
    </line>
  );
});

