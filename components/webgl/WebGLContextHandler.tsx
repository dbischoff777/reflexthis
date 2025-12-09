/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Component that handles WebGL context lost/restored events
 * Prevents crashes and provides graceful degradation
 */
export function WebGLContextHandler() {
  const { gl } = useThree();
  const contextLostRef = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLostRef.current = true;
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WebGL] Context lost - attempting recovery...');
      }
    };

    const handleContextRestored = () => {
      contextLostRef.current = false;
      
      // React Three Fiber will automatically reinitialize the renderer
      // Just clear any cached resources that might be stale
      if (gl.extensions) {
        // Clear extension cache to force re-initialization
        Object.keys(gl.extensions).forEach(key => {
          delete (gl.extensions as Record<string, unknown>)[key];
        });
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.info('[WebGL] Context restored - renderer will reinitialize');
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl]);

  return null;
}

