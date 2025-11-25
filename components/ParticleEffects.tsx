'use client';

import { useEffect, useState, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface ExplosionParticlesProps {
  active: boolean;
  x: number;
  y: number;
  color?: string;
  intensity?: 'low' | 'medium' | 'high';
}

/**
 * ExplosionParticles - Creates explosion effect on correct button press
 */
export function ExplosionParticles({
  active,
  x,
  y,
  color = '#00ff00',
  intensity = 'medium',
}: ExplosionParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    // Particle count based on intensity
    const countMap = { low: 12, medium: 20, high: 30 };
    const particleCount = countMap[intensity];
    const colors = [
      color,
      '#00ffff', // Cyan
      '#ffff00', // Yellow
      '#ff00ff', // Magenta
      '#ffffff', // White
    ];

    // Create explosion particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      const life = 0.8 + Math.random() * 0.2;
      
      newParticles.push({
        id: i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4,
        life,
        maxLife: life,
      });
    }

    setParticles(newParticles);

    // Animate particles
    const animate = () => {
      setParticles((prev) => {
        const updated = prev
          .map((p) => {
            const newVx = p.vx * 0.98; // Friction
            const newVy = p.vy * 0.98 + 0.15; // Gravity
            return {
              ...p,
              x: p.x + newVx,
              y: p.y + newVy,
              vx: newVx,
              vy: newVy,
              life: p.life - 0.02,
            };
          })
          .filter((p) => p.life > 0);

        if (updated.length > 0) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
        return updated;
      });
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [active, x, y, color, intensity]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[45]" style={{ imageRendering: 'pixelated' }}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            opacity: particle.life,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}, 0 0 ${particle.size * 4}px ${particle.color}`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '0',
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </div>
  );
}

interface TrailParticlesProps {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color?: string;
}

/**
 * TrailParticles - Creates trail effect following button press path
 */
export function TrailParticles({
  active,
  startX,
  startY,
  endX,
  endY,
  color = '#00ffff',
}: TrailParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    // Create trail particles along the path
    const trailCount = 8;
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < trailCount; i++) {
      const progress = i / trailCount;
      const px = startX + (endX - startX) * progress;
      const py = startY + (endY - startY) * progress;
      const delay = i * 0.05;
      
      newParticles.push({
        id: i,
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color,
        size: 2 + Math.random() * 3,
        life: 1 - delay,
        maxLife: 1,
      });
    }

    setParticles(newParticles);

    // Animate trail particles
    const animate = () => {
      setParticles((prev) => {
        const updated = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx * 0.5,
            y: p.y + p.vy * 0.5,
            vx: p.vx * 0.9,
            vy: p.vy * 0.9,
            life: p.life - 0.05,
          }))
          .filter((p) => p.life > 0);

        if (updated.length > 0) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
        return updated;
      });
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [active, startX, startY, endX, endY, color]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[44]" style={{ imageRendering: 'pixelated' }}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            opacity: particle.life * 0.7,
            boxShadow: `0 0 ${particle.size}px ${particle.color}`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '0',
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </div>
  );
}

interface ScreenShakeProps {
  active: boolean;
  intensity?: 'light' | 'medium' | 'heavy';
}

/**
 * ScreenShake - Creates screen shake effect on errors
 */
export function ScreenShake({ active, intensity = 'medium' }: ScreenShakeProps) {
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (active) {
      setIsShaking(true);
      const timer = setTimeout(() => {
        setIsShaking(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!isShaking) return null;

  const intensityMap = {
    light: 'screen-shake-light',
    medium: 'screen-shake-medium',
    heavy: 'screen-shake-heavy',
  };

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[60] ${intensityMap[intensity]}`}
      style={{
        imageRendering: 'pixelated',
      }}
    />
  );
}

