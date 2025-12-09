'use client';

import React, { useState, useRef, useEffect } from 'react';

/**
 * BackgroundVideo component - Smooth looping background video with crossfade
 * Optimized for performance with GPU acceleration and efficient event handling
 */
export const BackgroundVideo = React.memo(function BackgroundVideo() {
  const [activeVideo, setActiveVideo] = useState(0);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const fadeTriggeredRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;
    if (!video1 || !video2) return;

    // Use timeupdate event for more efficient checking (fires ~4 times per second)
    const handleTimeUpdate = () => {
      const currentVideo = activeVideo === 0 ? video1 : video2;
      const nextVideo = activeVideo === 0 ? video2 : video1;
      
      if (!currentVideo || !nextVideo || !currentVideo.duration) return;
      
      // Start crossfade earlier to ensure smooth transition - 1.2 seconds before end
      // This accounts for the 1200ms transition duration
      if (currentVideo.currentTime >= currentVideo.duration - 1.2 && !fadeTriggeredRef.current) {
        fadeTriggeredRef.current = true;
        
        // Prepare next video - ensure it's ready
        nextVideo.currentTime = 0;
        nextVideo.play().catch(() => {});
        
        // Wait for next video to be ready before starting fade
        const checkReady = () => {
          if (nextVideo.readyState >= 2) { // HAVE_CURRENT_DATA
            // Use requestAnimationFrame for smoother transitions
            rafIdRef.current = requestAnimationFrame(() => {
              if (currentVideo && nextVideo) {
                currentVideo.style.opacity = '0';
                nextVideo.style.opacity = '1';
                setActiveVideo(activeVideo === 0 ? 1 : 0);
                
                // Reset trigger after transition completes
                setTimeout(() => {
                  fadeTriggeredRef.current = false;
                }, 1300);
              }
            });
          } else {
            // Retry if not ready yet
            requestAnimationFrame(checkReady);
          }
        };
        checkReady();
      }
    };

    // Handle video ended event as fallback for smooth looping
    const handleEnded = (video: HTMLVideoElement, isCurrent: boolean) => {
      if (isCurrent && !fadeTriggeredRef.current) {
        // If we missed the timeupdate, force transition
        const otherVideo = video === video1 ? video2 : video1;
        if (otherVideo) {
          fadeTriggeredRef.current = true;
          otherVideo.currentTime = 0;
          otherVideo.play().catch(() => {});
          video.style.opacity = '0';
          otherVideo.style.opacity = '1';
          setActiveVideo(video === video1 ? 1 : 0);
          setTimeout(() => {
            fadeTriggeredRef.current = false;
          }, 1300);
        }
      }
    };

    // Attach event listeners to both videos
    video1.addEventListener('timeupdate', handleTimeUpdate);
    video2.addEventListener('timeupdate', handleTimeUpdate);
    video1.addEventListener('ended', () => handleEnded(video1, activeVideo === 0));
    video2.addEventListener('ended', () => handleEnded(video2, activeVideo === 1));

    return () => {
      video1.removeEventListener('timeupdate', handleTimeUpdate);
      video2.removeEventListener('timeupdate', handleTimeUpdate);
      video1.removeEventListener('ended', () => handleEnded(video1, activeVideo === 0));
      video2.removeEventListener('ended', () => handleEnded(video2, activeVideo === 1));
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [activeVideo]);

  return (
    <div className="fixed inset-0 w-full h-full z-0">
      <video
        ref={video1Ref}
        className="fixed inset-0 w-full h-full object-cover transition-opacity duration-1200 ease-in-out"
        style={{ 
          opacity: activeVideo === 0 ? 1 : 0,
          transform: 'translateZ(0)',
          willChange: 'opacity',
          backfaceVisibility: 'hidden',
        }}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/animation/menu-background-animated.mp4" type="video/mp4" />
      </video>
      <video
        ref={video2Ref}
        className="fixed inset-0 w-full h-full object-cover transition-opacity duration-1200 ease-in-out"
        style={{ 
          opacity: activeVideo === 1 ? 1 : 0,
          transform: 'translateZ(0)',
          willChange: 'opacity',
          backfaceVisibility: 'hidden',
        }}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/animation/menu-background-animated.mp4" type="video/mp4" />
      </video>
    </div>
  );
});

