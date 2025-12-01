/// <reference types="@react-three/fiber" />

import '@react-three/fiber';
import '@react-three/drei';
import '@react-three/postprocessing';
import 'postprocessing';

// Extend the ThreeElements namespace with custom types
declare module '@react-three/fiber' {
  interface ThreeElements {
    // All standard Three.js elements are automatically available
  }
}

