'use client';

import { useState, useEffect } from 'react';
import {
  getAllCosmetics,
  getCosmeticsByCategory,
  getActiveCosmetic,
  setActiveCosmetic,
  isCosmeticUnlocked,
  canPurchaseWithTickets,
  type CosmeticCategory,
  type CosmeticItem,
} from '@/lib/cosmetics';
import { getUserProgress, unlockCosmetic, saveUserProgress } from '@/lib/progression';
import { useGameState } from '@/lib/GameContext';

export function CosmeticSelector() {
  const { language } = useGameState();
  const [activeCategory, setActiveCategory] = useState<CosmeticCategory>('theme');
  const [progress, setProgress] = useState(getUserProgress());
  const [activeCosmetics, setActiveCosmetics] = useState({
    theme: getActiveCosmetic('theme') || 'theme-default',
    particleTrail: getActiveCosmetic('particleTrail'),
    hitSound: getActiveCosmetic('hitSound') || 'sound-default',
  });

  useEffect(() => {
    // Refresh progress
    setProgress(getUserProgress());
  }, []);

  const categories: { id: CosmeticCategory; label: string }[] = [
    { id: 'theme', label: 'Themes' },
    { id: 'particleTrail', label: 'Particle Trails' },
    { id: 'hitSound', label: 'Hit Sounds' },
  ];

  const cosmetics = getCosmeticsByCategory(activeCategory);

  const handleSelect = (cosmeticId: string) => {
    const cosmetic = cosmetics.find(c => c.id === cosmeticId);
    if (!cosmetic) return;

    // Check if unlocked
    if (!isCosmeticUnlocked(cosmeticId, progress.level, progress.unlockedCosmetics)) {
      // Try to purchase with tickets
      if (canPurchaseWithTickets(cosmeticId, progress.cosmeticTickets, progress.level, progress.unlockedCosmetics)) {
        // Purchase with tickets
        const updatedProgress = getUserProgress();
        const ticketCost = cosmetic.ticketCost || 0;
        
        // Anti-abuse: Double-check ticket cost and availability
        if (updatedProgress.cosmeticTickets >= ticketCost && ticketCost > 0 && ticketCost <= 1000) {
          updatedProgress.cosmeticTickets = Math.max(0, updatedProgress.cosmeticTickets - ticketCost);
          
          // Anti-abuse: Only unlock if not already unlocked
          if (!updatedProgress.unlockedCosmetics.includes(cosmeticId)) {
            unlockCosmetic(cosmeticId);
            updatedProgress.unlockedCosmetics.push(cosmeticId);
          }
          
          saveUserProgress(updatedProgress);
          setProgress(updatedProgress);
        } else {
          alert('Invalid purchase attempt. Please refresh and try again.');
          return;
        }
      } else {
        // Cannot purchase - show message
        alert(`This cosmetic requires ${cosmetic.unlockLevel ? `level ${cosmetic.unlockLevel}` : `${cosmetic.ticketCost} tickets`}`);
        return;
      }
    }

    // Set as active
    setActiveCosmetic(activeCategory, cosmeticId);
    setActiveCosmetics(prev => ({
      ...prev,
      [activeCategory]: cosmeticId,
    }));
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#9ca3af';
      case 'rare': return '#3b82f6';
      case 'epic': return '#a855f7';
      case 'legendary': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: '#3E7CAC' }}>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-4 py-2 text-sm font-semibold transition-all ${
              activeCategory === category.id
                ? 'text-foreground border-b-2'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={
              activeCategory === category.id
                ? { borderBottomColor: '#3E7CAC' }
                : {}
            }
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Cosmetic Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cosmetics.map((cosmetic) => {
          const isUnlocked = isCosmeticUnlocked(cosmetic.id, progress.level, progress.unlockedCosmetics);
          const isActive = activeCosmetics[activeCategory] === cosmetic.id;
          const canPurchase = canPurchaseWithTickets(cosmetic.id, progress.cosmeticTickets, progress.level, progress.unlockedCosmetics);

          return (
            <CosmeticCard
              key={cosmetic.id}
              cosmetic={cosmetic}
              isUnlocked={isUnlocked}
              isActive={isActive}
              canPurchase={canPurchase}
              ticketCost={cosmetic.ticketCost}
              onSelect={() => handleSelect(cosmetic.id)}
              getRarityColor={getRarityColor}
            />
          );
        })}
      </div>
    </div>
  );
}

function CosmeticCard({
  cosmetic,
  isUnlocked,
  isActive,
  canPurchase,
  ticketCost,
  onSelect,
  getRarityColor,
}: {
  cosmetic: CosmeticItem;
  isUnlocked: boolean;
  isActive: boolean;
  canPurchase: boolean;
  ticketCost?: number;
  onSelect: () => void;
  getRarityColor: (rarity: string) => string;
}) {
  return (
    <button
      onClick={onSelect}
      className={`relative p-3 border-2 pixel-border text-left transition-all ${
        isActive
          ? 'ring-2 ring-offset-2'
          : 'hover:opacity-80'
      }`}
      style={{
        backgroundColor: isActive
          ? 'rgba(62, 124, 172, 0.4)'
          : 'rgba(0, 58, 99, 0.4)',
        borderColor: isActive ? '#3E7CAC' : '#3E7CAC',
      }}
      disabled={!isUnlocked && !canPurchase}
    >
      {/* Rarity indicator */}
      <div
        className="absolute top-1 right-1 w-2 h-2 rounded-full"
        style={{ backgroundColor: getRarityColor(cosmetic.rarity) }}
      />

      {/* Preview (for themes, show color swatches) */}
      {cosmetic.category === 'theme' && cosmetic.colors && (
        <div className="flex gap-1 mb-2">
          <div
            className="w-6 h-6 border border-white/20"
            style={{ backgroundColor: cosmetic.colors.accent }}
          />
          <div
            className="w-6 h-6 border border-white/20"
            style={{ backgroundColor: cosmetic.colors.accent2 }}
          />
        </div>
      )}

      {/* Name */}
      <div className="font-semibold text-sm text-foreground mb-1">{cosmetic.name}</div>

      {/* Description */}
      <div className="text-xs text-muted-foreground mb-2">{cosmetic.description}</div>

      {/* Status */}
      {isActive && (
        <div className="text-xs font-semibold text-foreground">Active</div>
      )}
      {!isUnlocked && !canPurchase && cosmetic.unlockLevel && (
        <div className="text-xs text-muted-foreground">Level {cosmetic.unlockLevel}</div>
      )}
      {!isUnlocked && canPurchase && ticketCost && (
        <div className="text-xs text-foreground">
          🎫 {ticketCost} tickets
        </div>
      )}
      {!isUnlocked && !canPurchase && !cosmetic.unlockLevel && (
        <div className="text-xs text-muted-foreground">Locked</div>
      )}
    </button>
  );
}

