'use client';

import { useState, useEffect, useCallback } from 'react';
import { getKeybindings, saveKeybindings, resetKeybindings, getKeyDisplayName, isKeyBound, NUMPAD_KEYBINDINGS, type Keybindings } from '@/lib/keybindings';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { useGameState } from '@/lib/GameContext';

interface KeybindingsSettingsProps {
  onClose: () => void;
  embedded?: boolean;
}

/**
 * KeybindingsSettings component - Allows players to view and customize keybindings
 */
export function KeybindingsSettings({ onClose, embedded = false }: KeybindingsSettingsProps) {
  const { language } = useGameState();
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
        setError(t(language, 'keybindings.alreadyBound').replace('{key}', getKeyDisplayName(key)));
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

  // Handle ESC to close (only in overlay mode)
  useEffect(() => {
    if (embedded) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingButtonId === null) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, editingButtonId, embedded]);

  const handleStartEdit = (buttonId: number) => {
    setEditingButtonId(buttonId);
    setError(null);
  };

  const handleReset = () => {
    const defaults = resetKeybindings();
    setCurrentKeybindings(defaults);
    setError(null);
  };

  const handleApplyNumpadPreset = () => {
    setCurrentKeybindings(NUMPAD_KEYBINDINGS);
    saveKeybindings(NUMPAD_KEYBINDINGS);
    setEditingButtonId(null);
    setError(null);
  };

  const content = (
    <>
      <div className="mb-4 sm:mb-6">
        {embedded ? (
          <>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">
              {t(language, 'keybindings.title')}
            </h3>
            <p className="text-xs text-foreground/70">
              {t(language, 'keybindings.instruction.short')}
            </p>
          </>
        ) : (
          <>
            <h2 
              className="text-2xl sm:text-3xl font-bold text-foreground mb-2 pixel-border px-4 py-2 inline-block"
              style={{ borderColor: '#3E7CAC' }}
            >
              {t(language, 'keybindings.title.upper')}
            </h2>
            <p className="text-sm text-foreground/70 mt-2">
              {t(language, 'keybindings.instruction')}
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/20 border-2 border-destructive pixel-border shadow-[0_0_10px_rgba(255,0,0,0.3)]">
          <p className="text-destructive text-sm font-bold">{error}</p>
        </div>
      )}

      {/* Keybindings Grid */}
      <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
        {buttonLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-col items-center gap-3">
            <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap">
              {row.map((buttonId) => (
                <div
                  key={buttonId}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="text-xs sm:text-sm text-foreground/60 font-bold">
                    {t(language, 'keybindings.button')} {buttonId}
                  </div>
                  <button
                    onClick={() => handleStartEdit(buttonId)}
                    draggable={false}
                    className={cn(
                      'min-w-[60px] sm:min-w-[80px] h-12 sm:h-14 px-4',
                      'border-4 pixel-border font-bold text-lg sm:text-xl',
                      'transition-all duration-200',
                      editingButtonId === buttonId
                        ? 'animate-pulse'
                        : '',
                      'focus:outline-none focus:ring-2'
                    )}
                    style={editingButtonId === buttonId ? {
                      backgroundColor: 'rgba(62, 124, 172, 0.5)',
                      borderColor: '#3E7CAC',
                      color: '#ffffff',
                    } : {
                      backgroundColor: 'rgba(0, 58, 99, 0.6)',
                      borderColor: '#3E7CAC',
                      color: '#ffffff',
                    }}
                    onMouseEnter={(e) => {
                      if (editingButtonId !== buttonId) {
                        e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (editingButtonId !== buttonId) {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.6)';
                      }
                    }}
                    aria-label={`${t(language, 'keybindings.button')} ${buttonId} - ${
                      editingButtonId === buttonId
                        ? t(language, 'keybindings.aria.edit')
                        : t(language, 'keybindings.aria.current').replace('{key}', getKeyDisplayName(currentKeybindings[buttonId]))
                    }`}
                  >
                    {editingButtonId === buttonId ? (
                      <span className="text-xs">{t(language, 'keybindings.pressKey')}</span>
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
      <div className="flex flex-col sm:flex-row gap-3 justify-end mt-2">
        <button
          onClick={handleReset}
          draggable={false}
          className="px-6 py-3 border-4 pixel-border font-bold transition-all duration-200 focus:outline-none focus:ring-2"
          style={{
            borderColor: '#3E7CAC',
            backgroundColor: 'rgba(0, 58, 99, 0.6)',
            color: '#ffffff',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.6)';
          }}
        >
          {t(language, 'keybindings.reset')}
        </button>
        <button
          onClick={handleApplyNumpadPreset}
          draggable={false}
          className="px-6 py-3 border-4 pixel-border font-bold transition-all duration-200 focus:outline-none focus:ring-2"
          style={{
            borderColor: '#3E7CAC',
            backgroundColor: 'rgba(0, 58, 99, 0.6)',
            color: '#ffffff',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.6)';
          }}
        >
          {t(language, 'keybindings.numpad')}
        </button>
        {!embedded && (
          <button
            onClick={onClose}
            draggable={false}
            className="px-6 py-3 border-4 pixel-border font-bold transition-all duration-200 focus:outline-none focus:ring-2"
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: '#3E7CAC',
              color: '#ffffff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3E7CAC';
            }}
          >
            {t(language, 'keybindings.close')}
          </button>
        )}
      </div>

      {!embedded && (
        <div 
          className="mt-6 p-3 border-2 transition-colors pixel-border"
          style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.5)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.7)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3E7CAC'; }}
        >
          <p className="text-xs text-foreground/70">
            <strong className="text-foreground">{t(language, 'keybindings.defaultLayout')}</strong> Q W E (top row), A S D F (middle row), Y X C (bottom row)
          </p>
          <p className="text-xs text-foreground/70 mt-1">
            {t(language, 'keybindings.customize')}
          </p>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div 
        className="border-2 rounded p-4 sm:p-6 md:p-8 w-full max-w-2xl mx-auto max-h-[80vh] overflow-y-auto"
        style={{
          borderColor: '#3E7CAC',
          backgroundColor: '#003A63',
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pixel-border">
      <div 
        className="border-4 pixel-border shadow-[0_0_20px_rgba(62,124,172,0.4)] p-4 sm:p-6 md:p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          borderColor: '#3E7CAC',
          backgroundColor: '#003A63',
        }}
      >
        {content}
      </div>
    </div>
  );
}

