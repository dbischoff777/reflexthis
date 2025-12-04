'use client';

import { ReactNode, useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface TransitionProps {
  show: boolean;
  children: ReactNode;
  enter?: string;
  enterFrom?: string;
  enterTo?: string;
  leave?: string;
  leaveFrom?: string;
  leaveTo?: string;
  duration?: number;
  className?: string;
  unmountOnExit?: boolean;
  onEntered?: () => void;
  onExited?: () => void;
}

/**
 * Transition component - Smooth enter/exit animations
 * Similar to HeadlessUI Transition but lighter and more customizable
 */
export function Transition({
  show,
  children,
  enter = 'transition ease-out',
  enterFrom = 'opacity-0',
  enterTo = 'opacity-100',
  leave = 'transition ease-in',
  leaveFrom = 'opacity-100',
  leaveTo = 'opacity-0',
  duration = 200,
  className,
  unmountOnExit = true,
  onEntered,
  onExited,
}: TransitionProps) {
  const [mounted, setMounted] = useState(show);
  const [phase, setPhase] = useState<'entering' | 'entered' | 'leaving' | 'exited'>(
    show ? 'entering' : 'exited'
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (show) {
      // Mount component if not already mounted
      if (!mounted) {
        setMounted(true);
        setPhase('entering');
        
        // Wait for DOM to be ready, then start enter animation
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setPhase('entered');
            
            // Call onEntered after animation completes
            timeoutRef.current = setTimeout(() => {
              onEntered?.();
            }, duration);
          });
        });
      } else {
        // Already mounted, ensure entered state
        setPhase('entered');
      }
    } else if (mounted && phase !== 'exited') {
      // Trigger leave animation
      setPhase('leaving');
      
      // Unmount after animation completes
      timeoutRef.current = setTimeout(() => {
        setPhase('exited');
        if (unmountOnExit) {
          setMounted(false);
        }
        onExited?.();
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, duration, unmountOnExit, mounted, phase, onEntered, onExited]);

  if (!mounted) return null;

  // Determine which classes to apply based on phase
  let transitionClasses = '';
  if (phase === 'entering') {
    transitionClasses = `${enter} ${enterFrom}`;
  } else if (phase === 'entered') {
    transitionClasses = `${enter} ${enterTo}`;
  } else if (phase === 'leaving') {
    transitionClasses = `${leave} ${leaveFrom} ${leaveTo}`;
  }

  return (
    <div
      className={cn(transitionClasses, className)}
      style={{
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * FadeTransition - Simple fade in/out
 */
export function FadeTransition({
  show,
  children,
  duration = 200,
  className,
  unmountOnExit = true,
  onEntered,
  onExited,
}: Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo'>) {
  return (
    <Transition
      show={show}
      enter="transition-opacity ease-out"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity ease-in"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      duration={duration}
      className={className}
      unmountOnExit={unmountOnExit}
      onEntered={onEntered}
      onExited={onExited}
    >
      {children}
    </Transition>
  );
}

/**
 * ScaleTransition - Scale and fade in/out
 */
export function ScaleTransition({
  show,
  children,
  duration = 200,
  className,
  unmountOnExit = true,
  onEntered,
  onExited,
}: Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo'>) {
  return (
    <Transition
      show={show}
      enter="transition-all ease-out"
      enterFrom="opacity-0 scale-95"
      enterTo="opacity-100 scale-100"
      leave="transition-all ease-in"
      leaveFrom="opacity-100 scale-100"
      leaveTo="opacity-0 scale-95"
      duration={duration}
      className={className}
      unmountOnExit={unmountOnExit}
      onEntered={onEntered}
      onExited={onExited}
    >
      {children}
    </Transition>
  );
}

/**
 * SlideTransition - Slide from direction
 */
export function SlideTransition({
  show,
  children,
  direction = 'up',
  duration = 300,
  className,
  unmountOnExit = true,
  onEntered,
  onExited,
}: Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo'> & {
  direction?: 'up' | 'down' | 'left' | 'right';
}) {
  const directionClasses = {
    up: {
      enterFrom: 'opacity-0 translate-y-4',
      enterTo: 'opacity-100 translate-y-0',
      leaveFrom: 'opacity-100 translate-y-0',
      leaveTo: 'opacity-0 translate-y-4',
    },
    down: {
      enterFrom: 'opacity-0 -translate-y-4',
      enterTo: 'opacity-100 translate-y-0',
      leaveFrom: 'opacity-100 translate-y-0',
      leaveTo: 'opacity-0 -translate-y-4',
    },
    left: {
      enterFrom: 'opacity-0 translate-x-4',
      enterTo: 'opacity-100 translate-x-0',
      leaveFrom: 'opacity-100 translate-x-0',
      leaveTo: 'opacity-0 translate-x-4',
    },
    right: {
      enterFrom: 'opacity-0 -translate-x-4',
      enterTo: 'opacity-100 translate-x-0',
      leaveFrom: 'opacity-100 translate-x-0',
      leaveTo: 'opacity-0 -translate-x-4',
    },
  };

  const classes = directionClasses[direction];

  return (
    <Transition
      show={show}
      enter="transition-all ease-out"
      enterFrom={classes.enterFrom}
      enterTo={classes.enterTo}
      leave="transition-all ease-in"
      leaveFrom={classes.leaveFrom}
      leaveTo={classes.leaveTo}
      duration={duration}
      className={className}
      unmountOnExit={unmountOnExit}
      onEntered={onEntered}
      onExited={onExited}
    >
      {children}
    </Transition>
  );
}

/**
 * ModalTransition - Optimized for modals with backdrop
 */
export function ModalTransition({
  show,
  children,
  duration = 250,
  className,
  unmountOnExit = true,
  onEntered,
  onExited,
}: Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo'>) {
  return (
    <Transition
      show={show}
      enter="transition-all ease-out"
      enterFrom="opacity-0 scale-95 translate-y-4"
      enterTo="opacity-100 scale-100 translate-y-0"
      leave="transition-all ease-in"
      leaveFrom="opacity-100 scale-100 translate-y-0"
      leaveTo="opacity-0 scale-95 translate-y-4"
      duration={duration}
      className={className}
      unmountOnExit={unmountOnExit}
      onEntered={onEntered}
      onExited={onExited}
    >
      {children}
    </Transition>
  );
}

/**
 * BackdropTransition - For modal backdrops
 */
export function BackdropTransition({
  show,
  children,
  duration = 200,
  className,
  unmountOnExit = true,
}: Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo' | 'onEntered' | 'onExited'>) {
  return (
    <FadeTransition
      show={show}
      duration={duration}
      className={className}
      unmountOnExit={unmountOnExit}
    >
      {children}
    </FadeTransition>
  );
}

