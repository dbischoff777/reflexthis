'use client';

import { useEffect, useState } from 'react';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  rotationSpeed: number;
}

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

/**
 * Confetti component - Celebratory particle effects for achievements
 */
export function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  const colors = ['#00ffff', '#ff00ff', '#00f0ff', '#ffff00', '#ff0080'];

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    // Generate particles
    const newParticles: ConfettiParticle[] = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100, // Percentage of viewport width
        y: -10, // Start above viewport
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4, // 4-12px
        speedX: (Math.random() - 0.5) * 2, // -1 to 1
        speedY: Math.random() * 3 + 2, // 2 to 5
        rotationSpeed: (Math.random() - 0.5) * 10, // -5 to 5
      });
    }

    setParticles(newParticles);

    // Animate particles
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed < duration) {
        setParticles((prev) =>
          prev.map((particle) => ({
            ...particle,
            x: particle.x + particle.speedX,
            y: particle.y + particle.speedY + elapsed * 0.001, // Gravity effect
            rotation: particle.rotation + particle.rotationSpeed,
          }))
        );
        requestAnimationFrame(animate);
      } else {
        setParticles([]);
      }
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [active, duration]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-60 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-sm"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            boxShadow: `0 0 ${particle.size}px ${particle.color}`,
            opacity: particle.y > 100 ? 0 : 1, // Fade out as particles fall
          }}
        />
      ))}
    </div>
  );
}

