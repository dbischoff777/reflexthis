'use client';

import { useEffect } from 'react';
import { playUiSound } from '@/lib/soundUtils';

function isInteractiveElement(el: Element | null): boolean {
  if (!el) return false;
  const selector =
    'button, a[href], input[type="button"], input[type="submit"], input[type="reset"], [role="button"], [data-ui-click-sound="true"]';
  return !!el.closest(selector);
}

function isGameButton(el: Element | null): boolean {
  // Our in-game buttons (2D/3D) carry a data-button-id attribute.
  return !!el?.closest('[data-button-id]');
}

function isDisabledInteractive(el: Element | null): boolean {
  const interactive = el?.closest('button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]');
  if (!interactive) return false;
  // HTML disabled
  if ((interactive as HTMLButtonElement).disabled) return true;
  // aria-disabled
  const ariaDisabled = interactive.getAttribute('aria-disabled');
  return ariaDisabled === 'true';
}

export function GlobalUiClickSound() {
  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      // Only left-click (avoid context menu / auxiliary buttons)
      if (e.button !== 0) return;
      // Ignore modified clicks (open new tab, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      if (!isInteractiveElement(target)) return;
      if (isGameButton(target)) return;
      if (isDisabledInteractive(target)) return;

      // UI click sounds should respect global SFX toggle.
      playUiSound('uiClick');
    };

    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, []);

  return null;
}

