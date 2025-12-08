/**
 * WebGL/Three.js optimization utilities
 * Provides object pooling, shader caching, and performance monitoring
 */

import * as THREE from 'three';

// ============================================================================
// OBJECT POOLING SYSTEM
// ============================================================================

/**
 * Generic object pool for reusing objects to reduce garbage collection
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void = () => {},
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    
    // Pre-create initial pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  /**
   * Get an object from the pool
   */
  acquire(): T {
    let obj: T;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.createFn();
    }
    
    this.active.add(obj);
    return obj;
  }

  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    if (!this.active.has(obj)) return;
    
    this.resetFn(obj);
    this.active.delete(obj);
    
    // Only add back to pool if under max size
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  /**
   * Release all active objects
   */
  releaseAll(): void {
    const activeArray = Array.from(this.active);
    activeArray.forEach(obj => this.release(obj));
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      poolSize: this.pool.length,
      activeCount: this.active.size,
      totalObjects: this.pool.length + this.active.size,
    };
  }
}

/**
 * Particle object pool for particle effects
 */
export interface PooledParticle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
  active: boolean;
}

export class ParticlePool extends ObjectPool<PooledParticle> {
  private nextId: number = 0;

  constructor(initialSize: number = 50, maxSize: number = 200) {
    super(
      () => ({
        id: 0,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
        color: new THREE.Color(),
        size: 0,
        active: false,
      }),
      (particle) => {
        particle.position.set(0, 0, 0);
        particle.velocity.set(0, 0, 0);
        particle.life = 0;
        particle.maxLife = 0;
        particle.color.setRGB(1, 1, 1);
        particle.size = 0;
        particle.active = false;
      },
      initialSize,
      maxSize
    );
  }

  acquire(): PooledParticle {
    const particle = super.acquire();
    particle.id = this.nextId++;
    particle.active = true;
    return particle;
  }
}

// ============================================================================
// SHADER CACHE
// ============================================================================

/**
 * Cache for compiled shaders to avoid recompilation
 */
class ShaderCache {
  private cache: Map<string, THREE.ShaderMaterial> = new Map();

  /**
   * Get or create a shader material
   * @param clone - If true, returns a cloned material for per-instance use
   */
  getOrCreate(
    key: string,
    createFn: () => THREE.ShaderMaterial,
    clone: boolean = false
  ): THREE.ShaderMaterial {
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!;
      return clone ? cached.clone() : cached;
    }

    const material = createFn();
    this.cache.set(key, material);
    return clone ? material.clone() : material;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.forEach((material) => {
      material.dispose();
    });
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cachedShaders: this.cache.size,
    };
  }
}

export const shaderCache = new ShaderCache();

// ============================================================================
// SHARED PARTICLE POOL (Singleton)
// ============================================================================

/**
 * Shared particle pool instance for use across all particle effects
 */
let sharedParticlePool: ParticlePool | null = null;

export function getSharedParticlePool(): ParticlePool {
  if (!sharedParticlePool) {
    sharedParticlePool = new ParticlePool(50, 200);
  }
  return sharedParticlePool;
}

/**
 * Reset the shared particle pool (useful for cleanup)
 */
export function resetSharedParticlePool(): void {
  if (sharedParticlePool) {
    sharedParticlePool.releaseAll();
  }
}

// ============================================================================
// WEBGL PERFORMANCE MONITOR
// ============================================================================

export interface WebGLPerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  memory: {
    geometries: number;
    textures: number;
    programs: number;
  };
}

/**
 * Enhanced performance monitor for WebGL rendering
 */
export class WebGLPerformanceMonitor {
  private renderer: THREE.WebGLRenderer | null = null;
  private frames: number[] = [];
  private frameTimes: number[] = [];
  private lastTime: number = 0;
  private frameCount: number = 0;
  private isMonitoring: boolean = false;
  private rafId: number | null = null;
  private info: THREE.WebGLInfo | null = null;

  /**
   * Start monitoring with a WebGL renderer
   */
  start(renderer: THREE.WebGLRenderer) {
    if (this.isMonitoring) return;

    this.renderer = renderer;
    this.info = renderer.info;
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.frames = [];
    this.frameTimes = [];

    const measure = () => {
      if (!this.isMonitoring) return;

      this.frameCount++;
      const currentTime = performance.now();
      const delta = currentTime - this.lastTime;
      const frameTime = delta;

      if (delta >= 1000) {
        // Calculate FPS every second
        const fps = Math.round((this.frameCount * 1000) / delta);
        this.frames.push(fps);
        this.frameTimes.push(frameTime);

        // Keep only last 60 measurements
        if (this.frames.length > 60) {
          this.frames.shift();
          this.frameTimes.shift();
        }

        // Log if FPS drops below 55
        if (process.env.NODE_ENV === 'development' && fps < 55) {
          console.warn(`[WebGL Performance] Low FPS detected: ${fps}fps`);
        }

        this.frameCount = 0;
        this.lastTime = currentTime;
      }

      this.rafId = requestAnimationFrame(measure);
    };

    this.rafId = requestAnimationFrame(measure);
  }

  stop() {
    this.isMonitoring = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.renderer = null;
    this.info = null;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): WebGLPerformanceMetrics | null {
    if (!this.renderer || !this.info) return null;

    const currentFPS = this.frames.length > 0 
      ? this.frames[this.frames.length - 1] 
      : 0;
    const avgFrameTime = this.frameTimes.length > 0
      ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      : 0;

    return {
      fps: currentFPS,
      frameTime: avgFrameTime,
      drawCalls: this.info.render.calls,
      triangles: this.info.render.triangles,
      geometries: this.info.memory.geometries,
      textures: this.info.memory.textures,
      programs: this.info.programs?.length ?? 0,
      memory: {
        geometries: this.info.memory.geometries,
        textures: this.info.memory.textures,
        programs: this.info.programs?.length ?? 0,
      },
    };
  }

  /**
   * Get average FPS
   */
  getAverageFPS(): number {
    if (this.frames.length === 0) return 0;
    const sum = this.frames.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.frames.length);
  }

  /**
   * Get minimum FPS
   */
  getMinFPS(): number {
    if (this.frames.length === 0) return 0;
    return Math.min(...this.frames);
  }

  /**
   * Get maximum FPS
   */
  getMaxFPS(): number {
    if (this.frames.length === 0) return 0;
    return Math.max(...this.frames);
  }

  /**
   * Reset statistics
   */
  reset() {
    this.frames = [];
    this.frameTimes = [];
    this.frameCount = 0;
    this.lastTime = performance.now();
  }
}

// ============================================================================
// FRUSTUM CULLING UTILITIES
// ============================================================================

/**
 * Check if an object is within the camera frustum
 */
export function isInFrustum(
  object: THREE.Object3D,
  camera: THREE.Camera
): boolean {
  const frustum = new THREE.Frustum();
  const matrix = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  frustum.setFromProjectionMatrix(matrix);
  
  // Check bounding box
  const box = new THREE.Box3().setFromObject(object);
  return frustum.intersectsBox(box);
}

// ============================================================================
// TEXTURE OPTIMIZATION
// ============================================================================

/**
 * Create a texture with optimized settings
 */
export function createOptimizedTexture(
  image: HTMLImageElement | HTMLCanvasElement,
  generateMipmaps: boolean = true
): THREE.Texture {
  const texture = new THREE.Texture(image);
  texture.generateMipmaps = generateMipmaps;
  texture.minFilter = generateMipmaps 
    ? THREE.LinearMipmapLinearFilter 
    : THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(16, (window as any).devicePixelRatio || 1);
  texture.needsUpdate = true;
  return texture;
}

// ============================================================================
// SHARED GEOMETRY AND MATERIAL CACHE
// ============================================================================

/**
 * Cache for shared geometries to reduce memory usage
 */
class GeometryCache {
  private cache: Map<string, THREE.BufferGeometry> = new Map();

  getOrCreate(
    key: string,
    createFn: () => THREE.BufferGeometry
  ): THREE.BufferGeometry {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const geometry = createFn();
    this.cache.set(key, geometry);
    return geometry;
  }

  clear(): void {
    this.cache.forEach((geometry) => {
      geometry.dispose();
    });
    this.cache.clear();
  }

  getStats() {
    return {
      cachedGeometries: this.cache.size,
    };
  }
}

/**
 * Cache for shared materials to reduce draw calls
 */
class MaterialCache {
  private cache: Map<string, THREE.Material> = new Map();

  getOrCreate(
    key: string,
    createFn: () => THREE.Material
  ): THREE.Material {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const material = createFn();
    this.cache.set(key, material);
    return material;
  }

  clear(): void {
    this.cache.forEach((material) => {
      material.dispose();
    });
    this.cache.clear();
  }

  getStats() {
    return {
      cachedMaterials: this.cache.size,
    };
  }
}

export const geometryCache = new GeometryCache();
export const materialCache = new MaterialCache();

// ============================================================================
// WEBGL STATE CHANGE OPTIMIZATION
// ============================================================================

/**
 * Batch WebGL state changes to minimize state switches
 */
export class WebGLStateBatcher {
  private renderer: THREE.WebGLRenderer | null = null;
  private currentMaterial: THREE.Material | null = null;
  private currentGeometry: THREE.BufferGeometry | null = null;
  private stateChanges: number = 0;

  setRenderer(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
  }

  /**
   * Render an object with batched state changes
   */
  renderObject(
    object: THREE.Object3D,
    scene: THREE.Scene,
    camera: THREE.Camera
  ): void {
    if (!this.renderer) return;

    // Traverse and batch similar materials/geometries
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child as THREE.Mesh;
        const material = Array.isArray(mesh.material) 
          ? mesh.material[0] 
          : mesh.material;
        const geometry = mesh.geometry;

        // Track state changes
        if (material !== this.currentMaterial) {
          this.currentMaterial = material;
          this.stateChanges++;
        }
        if (geometry !== this.currentGeometry) {
          this.currentGeometry = geometry;
          this.stateChanges++;
        }

        // Render
        this.renderer!.render(mesh, camera);
      }
    });
  }

  /**
   * Get state change statistics
   */
  getStats() {
    return {
      stateChanges: this.stateChanges,
    };
  }

  /**
   * Reset statistics
   */
  reset() {
    this.stateChanges = 0;
    this.currentMaterial = null;
    this.currentGeometry = null;
  }
}

// ============================================================================
// LOD (LEVEL OF DETAIL) UTILITIES
// ============================================================================

/**
 * Calculate LOD level based on distance from camera
 */
export function calculateLOD(
  position: THREE.Vector3,
  camera: THREE.Camera,
  distances: number[] = [5, 10, 20]
): number {
  const distance = position.distanceTo(camera.position);
  
  if (distance < distances[0]) return 0; // High detail
  if (distance < distances[1]) return 1; // Medium detail
  if (distance < distances[2]) return 2; // Low detail
  return 3; // Very low detail
}

/**
 * Get geometry detail level based on LOD
 */
export function getLODGeometry(
  baseGeometry: THREE.BufferGeometry,
  lodLevel: number
): THREE.BufferGeometry {
  if (lodLevel === 0) return baseGeometry;
  
  // For higher LOD levels, we could simplify the geometry
  // For now, we'll just return the base geometry
  // In a full implementation, you'd create simplified versions
  return baseGeometry;
}

