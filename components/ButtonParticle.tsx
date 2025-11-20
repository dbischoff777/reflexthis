'use client';

import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

interface ButtonParticleProps {
  active: boolean;
  x: number;
  y: number;
  color?: string;
}

/**
 * ButtonParticle component - Creates particle burst effect on button press
 */
export function ButtonParticle({
  active,
  x,
  y,
  color = '#00ffff',
}: ButtonParticleProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    // Generate particles for burst effect
    const newParticles: Particle[] = [];
    const particleCount = 8;
    const colors = ['#00ffff', '#ff00ff', '#00f0ff', '#ffff00'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Math.random() * 3 + 2;
      newParticles.push({
        id: i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 2,
        life: 1,
      });
    }

    setParticles(newParticles);

    // Animate particles
    const animate = () => {
      setParticles((prev) => {
        const updated = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.2, // Gravity
            life: p.life - 0.02,
          }))
          .filter((p) => p.life > 0);

        if (updated.length > 0) {
          requestAnimationFrame(animate);
        }
        return updated;
      });
    };

    requestAnimationFrame(animate);
  }, [active, x, y]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[40]">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            opacity: particle.life,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            transform: `translate(-50%, -50%)`,
          }}
        />
      ))}
    </div>
  );
}

