'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PixelParticleProps {
  x: number;
  y: number;
  color: string;
  onComplete: () => void;
}

/**
 * Individual pixel particle for button press effects
 */
function PixelParticle({ x, y, color, onComplete }: PixelParticleProps) {
  const [opacity, setOpacity] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    // Random direction and distance
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 30;
    const speed = 0.5 + Math.random() * 0.5;

    let frame = 0;
    const maxFrames = 20;

    const animate = () => {
      frame++;
      const progress = frame / maxFrames;
      
      setOffsetX(Math.cos(angle) * distance * progress);
      setOffsetY(Math.sin(angle) * distance * progress);
      setOpacity(1 - progress);

      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }, [onComplete]);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: '4px',
        height: '4px',
        backgroundColor: color,
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        opacity,
        imageRendering: 'pixelated' as any,
      }}
    />
  );
}

interface PixelParticleBurstProps {
  buttonId: number;
  x: number;
  y: number;
  color?: string;
}

/**
 * PixelParticleBurst component - Creates pixelated particle burst on button press
 */
export function PixelParticleBurst({ buttonId, x, y, color = '#00ffff' }: PixelParticleBurstProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    // Create 8-12 particles in a burst pattern
    const count = 8 + Math.floor(Math.random() * 5);
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
    }));

    setParticles(newParticles);
  }, [buttonId, x, y]);

  const handleParticleComplete = (id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      {particles.map((particle) => (
        <PixelParticle
          key={particle.id}
          x={particle.x}
          y={particle.y}
          color={color}
          onComplete={() => handleParticleComplete(particle.id)}
        />
      ))}
    </>
  );
}

