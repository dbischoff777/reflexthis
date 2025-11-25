'use client';

/**
 * SinclairBackground component provides retro ZX Spectrum-style background effects
 * with enhanced CRT effects
 */
export function SinclairBackground() {

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Screen Curvature Effect */}
      <div 
        className="absolute inset-0"
        style={{
          clipPath: 'polygon(2% 2%, 98% 2%, 96% 98%, 4% 98%)',
        }}
      >
        <div className="absolute inset-0 bg-background">
          {/* CRT Scanlines */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                rgba(0, 255, 255, 0.03) 0px,
                rgba(0, 255, 255, 0.03) 1px,
                transparent 1px,
                transparent 2px
              )`,
            }}
          />
          
          {/* Pixel grid pattern */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(0deg, transparent 24%, rgba(0, 255, 255, 0.1) 25%, rgba(0, 255, 255, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.1) 75%, rgba(0, 255, 255, 0.1) 76%, transparent 77%, transparent),
                linear-gradient(90deg, transparent 24%, rgba(0, 255, 255, 0.1) 25%, rgba(0, 255, 255, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.1) 75%, rgba(0, 255, 255, 0.1) 76%, transparent 77%, transparent)
              `,
              backgroundSize: '8px 8px',
              imageRendering: 'pixelated',
            }}
          />

          {/* Color Bleed Effect - Horizontal */}
          <div 
            className="absolute inset-0 opacity-15"
            style={{
              background: `
                radial-gradient(ellipse at center, transparent 0%, rgba(0, 255, 255, 0.1) 50%, transparent 100%),
                radial-gradient(ellipse at 30% 30%, transparent 0%, rgba(255, 0, 255, 0.08) 40%, transparent 70%),
                radial-gradient(ellipse at 70% 70%, transparent 0%, rgba(0, 255, 0, 0.08) 40%, transparent 70%)
              `,
              filter: 'blur(2px)',
            }}
          />
          
          {/* Phosphor Trails - Subtle glow effect */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              background: `
                repeating-linear-gradient(
                  0deg,
                  transparent 0px,
                  rgba(0, 255, 255, 0.05) 1px,
                  transparent 2px,
                  transparent 3px
                )
              `,
              filter: 'blur(1px)',
              animation: 'phosphor-trail 3s ease-in-out infinite',
            }}
          />
          
          {/* Attribute clash zones (color limitation effect) */}
          <div className="absolute inset-0 opacity-10">
            <div 
              className="absolute top-0 left-0 w-1/2 h-1/2"
              style={{
                background: 'repeating-linear-gradient(0deg, #00ffff 0px, #00ffff 8px, #ff00ff 8px, #ff00ff 16px)',
              }}
            />
            <div 
              className="absolute top-0 right-0 w-1/2 h-1/2"
              style={{
                background: 'repeating-linear-gradient(90deg, #00ff00 0px, #00ff00 8px, #ffff00 8px, #ffff00 16px)',
              }}
            />
          </div>
          
          
          {/* Screen curvature shadow */}
          <div 
            className="absolute inset-0"
            style={{
              boxShadow: 'inset 0 0 100px 20px rgba(0, 0, 0, 0.3)',
              borderRadius: '2%',
            }}
          />
        </div>
      </div>
    </div>
  );
}

