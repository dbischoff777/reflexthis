'use client';

import { useState, useEffect, useCallback } from 'react';
import { getKeybindings, saveKeybindings, resetKeybindings, getKeyDisplayName, isKeyBound, type Keybindings } from '@/lib/keybindings';
import { cn } from '@/lib/utils';

interface KeybindingsSettingsProps {
  onClose: () => void;
}

/**
 * KeybindingsSettings component - Allows players to view and customize keybindings
 */
export function KeybindingsSettings({ onClose }: KeybindingsSettingsProps) {
  const [currentKeybindings, setCurrentKeybindings] = useState<Keybindings>(getKeybindings());
  const [editingButtonId, setEditingButtonId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Button layout matching the game (3-4-3)
  const buttonLayout = [
    [1, 2, 3],      // Top row
    [4, 5, 6, 7],   // Middle row
    [8, 9, 10],     // Bottom row
  ];

  // Handle key press when editing
  useEffect(() => {
    if (editingButtonId === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const key = e.key;
      
      // Don't allow Escape or Enter to be bound
      if (key === 'Escape' || key === 'Enter') {
        setEditingButtonId(null);
        return;
      }

      // Check if key is already bound
      if (isKeyBound(key, editingButtonId, currentKeybindings)) {
        setError(`Key "${getKeyDisplayName(key)}" is already bound to another button`);
        setTimeout(() => setError(null), 2000);
        return;
      }

      // Update keybinding
      const newKeybindings = {
        ...currentKeybindings,
        [editingButtonId]: key,
      };
      setCurrentKeybindings(newKeybindings);
      saveKeybindings(newKeybindings);
      setEditingButtonId(null);
      setError(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingButtonId, currentKeybindings]);

  // Handle ESC to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingButtonId === null) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, editingButtonId]);

  const handleStartEdit = (buttonId: number) => {
    setEditingButtonId(buttonId);
    setError(null);
  };

  const handleReset = () => {
    const defaults = resetKeybindings();
    setCurrentKeybindings(defaults);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pixel-border">
      <div className="bg-card border-4 border-primary pixel-border p-4 sm:p-6 md:p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2 pixel-border px-4 py-2 inline-block">
            KEYBINDINGS
          </h2>
          <p className="text-sm text-foreground/70 mt-2">
            Click a button to change its keybinding. Press ESC to cancel editing or close.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/20 border-2 border-destructive pixel-border">
            <p className="text-destructive text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Keybindings Grid */}
        <div className="space-y-6 mb-6">
          {buttonLayout.map((row, rowIndex) => (
            <div key={rowIndex} className="flex flex-col items-center gap-3">
              <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap">
                {row.map((buttonId) => (
                  <div
                    key={buttonId}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="text-xs sm:text-sm text-foreground/60 font-bold">
                      BUTTON {buttonId}
                    </div>
                    <button
                      onClick={() => handleStartEdit(buttonId)}
                      draggable={false}
                      className={cn(
                        'min-w-[60px] sm:min-w-[80px] h-12 sm:h-14 px-4',
                        'border-4 pixel-border font-bold text-lg sm:text-xl',
                        'transition-all duration-200',
                        editingButtonId === buttonId
                          ? 'bg-accent border-accent text-accent-foreground animate-pulse'
                          : 'bg-card border-primary text-primary hover:bg-primary hover:text-primary-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary'
                      )}
                      aria-label={`Button ${buttonId} - ${editingButtonId === buttonId ? 'Press a key to bind' : `Currently bound to ${getKeyDisplayName(currentKeybindings[buttonId])}`}`}
                    >
                      {editingButtonId === buttonId ? (
                        <span className="text-xs">PRESS KEY</span>
                      ) : (
                        getKeyDisplayName(currentKeybindings[buttonId])
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={handleReset}
            draggable={false}
            className="px-6 py-3 border-4 border-accent bg-accent/20 text-accent pixel-border font-bold hover:bg-accent hover:text-accent-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            RESET TO DEFAULTS
          </button>
          <button
            onClick={onClose}
            draggable={false}
            className="px-6 py-3 border-4 border-primary bg-primary text-primary-foreground pixel-border font-bold hover:bg-primary/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            CLOSE
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-3 bg-card/50 border-2 border-border pixel-border">
          <p className="text-xs text-foreground/60">
            <strong>Default Layout:</strong> Q W E (top row), A S D F (middle row), Z X C (bottom row)
          </p>
          <p className="text-xs text-foreground/60 mt-1">
            You can customize these to match your keyboard layout or preference.
          </p>
        </div>
      </div>
    </div>
  );
}

