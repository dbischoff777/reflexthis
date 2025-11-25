'use client';

import { useEffect } from 'react';

/**
 * InteractionPrevention component - Prevents drag, text selection, and context menu globally
 * This should be added to the root layout or game page to prevent unwanted interactions
 */
export function InteractionPrevention() {
  useEffect(() => {
    // Prevent context menu
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Prevent drag events
    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Prevent text selection
    const preventSelect = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Prevent mouse down from starting drag
    const preventMouseDownDrag = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Always prevent drag on mouse down (except for inputs)
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        // Prevent text selection on double/triple click
        if (e.detail > 1) {
          e.preventDefault();
        }
        
        // Prevent drag by stopping the event if it's a potential drag start
        // Check if user is holding mouse down (potential drag)
        if (e.button === 0) { // Left mouse button
          // Allow the click to go through, but prevent drag
          const preventDrag = (dragEvent: DragEvent) => {
            dragEvent.preventDefault();
            dragEvent.stopPropagation();
            return false;
          };
          
          // Add temporary drag prevention
          const cleanup = () => {
            document.removeEventListener('dragstart', preventDrag, true);
            document.removeEventListener('drag', preventDrag, true);
            document.removeEventListener('mouseup', cleanup);
          };
          
          document.addEventListener('dragstart', preventDrag, true);
          document.addEventListener('drag', preventDrag, true);
          document.addEventListener('mouseup', cleanup, { once: true });
        }
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('dragstart', preventDrag, true);
    document.addEventListener('drag', preventDrag, true);
    document.addEventListener('selectstart', preventSelect, true);
    document.addEventListener('mousedown', preventMouseDownDrag, { passive: false });

    // Also prevent on window level
    window.addEventListener('contextmenu', preventContextMenu);
    window.addEventListener('dragstart', preventDrag, true);
    window.addEventListener('drag', preventDrag, true);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('dragstart', preventDrag, true);
      document.removeEventListener('drag', preventDrag, true);
      document.removeEventListener('selectstart', preventSelect, true);
      document.removeEventListener('mousedown', preventMouseDownDrag);
      window.removeEventListener('contextmenu', preventContextMenu);
      window.removeEventListener('dragstart', preventDrag, true);
      window.removeEventListener('drag', preventDrag, true);
    };
  }, []);

  return null;
}

