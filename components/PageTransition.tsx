'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition - Smooth page transitions for Next.js App Router
 * Wraps page content with fade transitions on route changes
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Start fade out
    setIsTransitioning(true);
    
    // After fade out, update content and fade in
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsTransitioning(false);
    }, 150); // Half of transition duration (300ms total)

    return () => clearTimeout(timer);
  }, [pathname, children]);

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-in-out',
        isTransitioning && 'opacity-0 translate-y-2',
        !isTransitioning && 'opacity-100 translate-y-0',
        className
      )}
      style={{
        willChange: isTransitioning ? 'opacity, transform' : 'auto',
      }}
    >
      {displayChildren}
    </div>
  );
}

