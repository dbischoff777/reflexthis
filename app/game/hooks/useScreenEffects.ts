'use client';

import { useState, useEffect } from 'react';

interface UseScreenEffectsOptions {
  screenShakeEnabled: boolean;
  reducedEffects: boolean;
}

export function useScreenEffects({ screenShakeEnabled, reducedEffects }: UseScreenEffectsOptions) {
  const [screenShake, setScreenShake] = useState(false);

  // Prevent scrollbars during screen shake
  useEffect(() => {
    if (screenShake) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [screenShake]);

  return {
    screenShake,
    setScreenShake,
  };
}

