/**
 * React Three Fiber extensions
 * Ensures drei components are properly registered with R3F
 * 
 * Note: drei components are automatically extended by drei itself.
 * This file ensures proper initialization order.
 */

// Import drei to ensure it registers its components with R3F
import '@react-three/drei';

// The Text component from drei uses HTML elements internally (span, div, etc.)
// R3F needs to know these are allowed. Drei should handle this, but we ensure
// the types are available for TypeScript.

