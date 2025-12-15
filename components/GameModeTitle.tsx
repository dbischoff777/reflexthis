'use client';

import { GameMode } from '@/lib/gameModes';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface GameModeTitleProps {
  gameMode: GameMode;
  reducedEffects?: boolean;
}

/**
 * GameModeTitle component - Displays the game mode title and icon
 * Shows horizontal title (top-left) and vertical title (left edge) with icon
 */
export function GameModeTitle({ gameMode, reducedEffects = false }: GameModeTitleProps) {
  const { language } = useGameState();

  const getModeTitle = (): string => {
    switch (gameMode) {
      case 'reflex': return t(language, 'mode.reflex.name').toUpperCase();
      case 'sequence': return t(language, 'mode.sequence.name').toUpperCase();
      case 'survival': return t(language, 'mode.survival.name').toUpperCase();
      case 'nightmare': return t(language, 'mode.nightmare.name').toUpperCase();
      case 'oddOneOut': return t(language, 'mode.odd.name').toUpperCase();
      default: return 'GAME';
    }
  };

  const getModeIconPath = (): string => {
    const modeName = gameMode === 'oddOneOut' ? 'oddoneout' : gameMode;
    return `/gameImages/${modeName}Image.png`;
  };

  const title = getModeTitle();
  const iconPath = getModeIconPath();

  return (
    <>
      {/* Icon - Positioned more to the right and down (responsive sizing) */}
      <div 
        className="absolute z-20 pointer-events-none"
        style={{
          // Icon center moved right and down from corner
          // Responsive offsets to move right and down proportionally
          top: 'clamp(20px, 2.5vw, 50px)', // Move down
          left: 'clamp(20px, 2.5vw, 50px)', // Move right
          transform: 'translate(-50%, -50%)', // Center the icon on the point
        }}
      >
        <div 
          className="relative shrink-0"
          style={{
            // Responsive sizing: 3x larger than before, scales down on mobile, scales up on larger screens
            // Icon is 3 times its previous size: clamp(96px, 12vw, 210px)
            width: 'clamp(96px, 12vw, 210px)',
            height: 'clamp(96px, 12vw, 210px)',
          }}
        >
          <img
            src={iconPath}
            alt={title}
            className="w-full h-full object-contain"
            draggable={false}
            style={{
              // Images are 540x540, but container constrains them to clamp(96px, 12vw, 210px)
              // object-contain ensures proper scaling without distortion
              filter: !reducedEffects ? 'drop-shadow(0 0 8px rgba(27,255,254,0.6)) drop-shadow(0 0 12px rgba(27,255,254,0.4))' : 'none',
              imageRendering: 'auto', // Use browser's default high-quality scaling algorithm
            }}
          />
          {!reducedEffects && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                filter: 'blur(3px)',
                opacity: 0.5,
                background: 'radial-gradient(circle, rgba(27,255,254,0.3) 0%, transparent 70%)',
                mixBlendMode: 'screen',
              }}
            />
          )}
        </div>
      </div>

      {/* Horizontal Title - Outside canvas border above top edge */}
      <div 
        className="absolute z-20 flex items-center gap-1 sm:gap-2 md:gap-3 pointer-events-none"
        style={{
          // Position outside above canvas border, baseline flush with top border
          // Icon center moved right and down, text follows
          top: 'clamp(20px, 2.5vw, 50px)', // Match icon's top position
          left: 'clamp(20px, 2.5vw, 50px)', // Match icon's left position
          transform: 'translateY(calc(-100% - 0.5rem))', // Move completely outside above canvas
          // Responsive padding: scales with icon size (icon is ~12vw max, so start at ~6vw + gap)
          paddingLeft: 'clamp(6rem, 6vw + 2rem, 13.5rem)', // Responsive positioning relative to icon (3x larger)
        }}
      >
        {/* Title Text - Large, bold, glowing (responsive sizing) */}
        <h2
          className={cn(
            "font-bold uppercase tracking-wider",
            "text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl",
            "text-[#1BFFFE]",
            "leading-tight"
          )}
          style={{
            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
            textShadow: reducedEffects 
              ? '2px 2px 4px rgba(0,0,0,0.8)'
              : '0 0 10px rgba(27,255,254,0.9), 0 0 20px rgba(27,255,254,0.6), 0 0 30px rgba(27,255,254,0.4), 0 0 40px rgba(27,255,254,0.2), 2px 2px 4px rgba(0,0,0,0.8)',
            letterSpacing: '0.08em',
            fontWeight: 700,
          }}
        >
          {title}
        </h2>
      </div>

      {/* Vertical Title - Inside canvas at left border (reads bottom to top, letters rotated) */}
      <div 
        className="absolute z-20 pointer-events-none"
        style={{
          // Position inside at left border of canvas, almost flush with border
          // Top aligns with icon's vertical midpoint (responsive positioning)
          // Icon moved right, so vertical text also moves right slightly
          left: 'clamp(20px, 2.5vw, 50px)', // Match icon's left offset
          // Responsive top position: icon center moved down, icon height is clamp(96px, 12vw, 210px)
          // So midpoint is icon top + half icon height
          top: 'clamp(68px, 8.5vw, 155px)', // Icon top (20-50px) + half icon height (48-105px)
          paddingLeft: '0.25rem', // Almost flush with left border, minimal gap
        }}
      >
        <h2
          className={cn(
            "font-bold uppercase tracking-wider",
            "text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl",
            "text-[#1BFFFE]",
            "leading-none"
          )}
          style={{
            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
            textShadow: reducedEffects 
              ? '2px 2px 4px rgba(0,0,0,0.8)'
              : '0 0 10px rgba(27,255,254,0.9), 0 0 20px rgba(27,255,254,0.6), 0 0 30px rgba(27,255,254,0.4), 0 0 40px rgba(27,255,254,0.2), 2px 2px 4px rgba(0,0,0,0.8)',
            letterSpacing: '0.12em',
            fontWeight: 700,
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            // Vertical text reading from bottom to top with rotated letters
            writingMode: 'vertical-lr', // Vertical, right-to-left (flows top-to-bottom)
            textOrientation: 'mixed', // Letters are rotated 90 degrees clockwise (sideways)
            transform: 'rotate(180deg)', // Flip vertically to read bottom-to-top
          }}
        >
          {title}
        </h2>
      </div>
    </>
  );
}
