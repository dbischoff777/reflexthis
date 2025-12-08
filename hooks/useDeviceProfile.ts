'use client';

import { useEffect, useMemo, useState } from 'react';

export type DeviceTier = 'low' | 'medium' | 'high';

export interface DeviceProfile {
  isMobile: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  touchEnabled: boolean;
  gpuTier: DeviceTier;
}

export interface DeviceQuality {
  maxDpr: number;
  renderScale: number;
  gridScale: number;
  disablePostprocessing: boolean;
  powerPreference: WebGLPowerPreference;
}

const MOBILE_MAX_WIDTH = 900;
const TABLET_MAX_WIDTH = 1280;

const detectDevice = (): DeviceProfile => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isLandscape: true,
      screenWidth: 1920,
      screenHeight: 1080,
      pixelRatio: 1,
      touchEnabled: false,
      gpuTier: 'medium',
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const touchEnabled = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
  const isLandscape = screenWidth >= screenHeight;

  const isMobileUA = /iphone|android|mobile|ipod/.test(ua);
  const isTabletUA = /ipad|tablet/.test(ua);

  const isMobile = (touchEnabled && screenWidth <= MOBILE_MAX_WIDTH) || isMobileUA;
  const isTablet = (!isMobile && touchEnabled && screenWidth <= TABLET_MAX_WIDTH) || isTabletUA;

  const deviceMemory = (navigator as any).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;

  let gpuTier: DeviceTier = 'medium';
  if (deviceMemory <= 4 || cores <= 4) {
    gpuTier = 'low';
  } else if (deviceMemory >= 8 && cores >= 8 && !isMobile) {
    gpuTier = 'high';
  }

  return {
    isMobile,
    isTablet,
    isLandscape,
    screenWidth,
    screenHeight,
    pixelRatio,
    touchEnabled,
    gpuTier,
  };
};

export function useDeviceProfile() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceProfile>(() => detectDevice());

  useEffect(() => {
    const handleResize = () => setDeviceInfo(detectDevice());

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const quality = useMemo<DeviceQuality>(() => {
    const maxDpr = deviceInfo.isMobile
      ? deviceInfo.gpuTier === 'low'
        ? 1.2
        : 1.5
      : 2;

    const renderScale = deviceInfo.isMobile
      ? deviceInfo.gpuTier === 'low'
        ? 0.8
        : 0.9
      : deviceInfo.isTablet
        ? 0.95
        : 1;

    const gridScale = deviceInfo.isMobile
      ? 1.12
      : deviceInfo.isTablet
        ? 1.06
        : 1;

    const disablePostprocessing = deviceInfo.isMobile && deviceInfo.gpuTier === 'low';
    const powerPreference: WebGLPowerPreference = disablePostprocessing ? 'low-power' : 'high-performance';

    return {
      maxDpr,
      renderScale,
      gridScale,
      disablePostprocessing,
      powerPreference,
    };
  }, [deviceInfo]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.device = deviceInfo.isMobile ? 'mobile' : deviceInfo.isTablet ? 'tablet' : 'desktop';
    root.dataset.orientation = deviceInfo.isLandscape ? 'landscape' : 'portrait';

    const hudFontMultiplier = deviceInfo.isMobile ? 1.28 : deviceInfo.isTablet ? 1.25 : 1.2;
    const gameAreaScale = deviceInfo.isMobile ? 1.06 : deviceInfo.isTablet ? 1.03 : 1;

    root.style.setProperty('--hud-font-multiplier', hudFontMultiplier.toString());
    root.style.setProperty('--game-area-scale', gameAreaScale.toString());
  }, [deviceInfo]);

  return { deviceInfo, quality };
}

