/**
 * Fullscreen utility functions for mobile browsers
 */

/**
 * Request fullscreen mode
 */
export function requestFullscreen(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  const element = document.documentElement;

  if (element.requestFullscreen) {
    return element.requestFullscreen();
  } else if ((element as any).webkitRequestFullscreen) {
    // Safari
    return (element as any).webkitRequestFullscreen();
  } else if ((element as any).mozRequestFullScreen) {
    // Firefox
    return (element as any).mozRequestFullScreen();
  } else if ((element as any).msRequestFullscreen) {
    // IE/Edge
    return (element as any).msRequestFullscreen();
  }

  return Promise.resolve();
}

/**
 * Exit fullscreen mode
 */
export function exitFullscreen(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (document.exitFullscreen) {
    return document.exitFullscreen();
  } else if ((document as any).webkitExitFullscreen) {
    return (document as any).webkitExitFullscreen();
  } else if ((document as any).mozCancelFullScreen) {
    return (document as any).mozCancelFullScreen();
  } else if ((document as any).msExitFullscreen) {
    return (document as any).msExitFullscreen();
  }

  return Promise.resolve();
}

/**
 * Check if currently in fullscreen mode
 */
export function isFullscreen(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}

/**
 * Toggle fullscreen mode
 */
export function toggleFullscreen(): Promise<void> {
  return isFullscreen() ? exitFullscreen() : requestFullscreen();
}

