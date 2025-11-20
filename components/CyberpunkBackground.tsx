'use client';

/**
 * CyberpunkBackground component provides animated cyberpunk-inspired background effects
 */
export function CyberpunkBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-background">
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, rgba(0, 255, 255, 0.1) 25%, rgba(0, 255, 255, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.1) 75%, rgba(0, 255, 255, 0.1) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(0, 255, 255, 0.1) 25%, rgba(0, 255, 255, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.1) 75%, rgba(0, 255, 255, 0.1) 76%, transparent 77%, transparent)
            `,
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Animated glow effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -inset-[100%] animate-[spin_20s_linear_infinite] bg-gradient-to-r from-transparent via-primary to-transparent blur-3xl" />
        </div>
        
        {/* Secondary glow */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -inset-[50%] animate-[spin_15s_linear_infinite_reverse] bg-gradient-to-r from-transparent via-secondary to-transparent blur-3xl" />
        </div>
      </div>
    </div>
  );
}

