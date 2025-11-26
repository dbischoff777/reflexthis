/**
 * Sound utility functions for game audio effects
 * Supports both file-based sounds and programmatic sound generation
 */

const audioCache: Record<string, HTMLAudioElement> = {};
const audioContextCache: AudioContext | null = null;
let backgroundMusic: HTMLAudioElement | null = null;

// Global volume controls (0-1), can be updated from UI
let soundEffectsVolume = 0.7;
let musicVolume = 0.3;

const SOUNDS = {
  highlight: '/sounds/highlight.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  lifeLost: '/sounds/life-lost.mp3',
  gameOver: '/sounds/game-over.mp3',
} as const;

export type SoundType = keyof typeof SOUNDS;

/**
 * Generate a simple beep sound using Web Audio API
 * Fallback when sound files are not available
 */
function generateBeepSound(
  frequency: number,
  duration: number,
  type: 'sine' | 'square' | 'triangle' = 'sine'
): void {
  if (typeof window === 'undefined') return;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.warn('Web Audio API not available:', error);
  }
}

/**
 * Preload sound files for better performance
 */
export function preloadSounds(): void {
  if (typeof window === 'undefined') return;

  Object.entries(SOUNDS).forEach(([key, path]) => {
    try {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = soundEffectsVolume; // Set default volume
      
      // Handle loading errors gracefully (silently - fallback will be used)
      audio.addEventListener('error', () => {
        // Sound files are optional - fallback sounds will be used automatically
        // Only log in development mode for debugging
        if (process.env.NODE_ENV === 'development') {
          console.debug(`Sound file not found: ${key} (will use fallback)`);
        }
      });

      audioCache[key] = audio;
    } catch (error) {
      // Sound files are optional - silently continue
      // Fallback sounds will be used automatically when needed
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Could not preload sound ${key} (will use fallback):`, error);
      }
    }
  });
}

// Track if we're on the game page to prevent sounds on landing page
let isGamePageActive = false;

export function setGamePageActive(active: boolean) {
  isGamePageActive = active;
}

/**
 * Play a sound effect
 * @param sound - The sound type to play
 * @param enabled - Whether sound is enabled
 */
export function playSound(sound: SoundType, enabled: boolean = true): void {
  if (!enabled || typeof window === 'undefined' || !isGamePageActive) return;

  try {
    // Try to play from cache first
    const cachedAudio = audioCache[sound];
    
    if (cachedAudio) {
      // Clone and play to allow overlapping sounds
      const audio = cachedAudio.cloneNode() as HTMLAudioElement;
      audio.volume = soundEffectsVolume;
      audio.currentTime = 0;
      audio.play().catch(() => {
        // If file doesn't exist, silently fall back to generated sound
        // This is expected behavior when sound files are not provided
        playFallbackSound(sound);
      });
    } else {
      // Try to load and play
      const audio = new Audio(SOUNDS[sound]);
      audio.volume = soundEffectsVolume;
      audio.preload = 'auto';
      
      audio.play().catch(() => {
        // If file doesn't exist, silently fall back to generated sound
        // This is expected behavior when sound files are not provided
        playFallbackSound(sound);
      });

      // Cache for future use
      audioCache[sound] = audio;
    }
  } catch (error) {
    // Silently fall back to generated sound
    // This is expected when sound files are not available
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Error playing sound ${sound}, using fallback:`, error);
    }
    playFallbackSound(sound);
  }
}

/**
 * Play fallback sounds using Web Audio API
 */
function playFallbackSound(sound: SoundType): void {
  switch (sound) {
    case 'highlight':
      generateBeepSound(800, 0.1, 'sine');
      break;
    case 'success':
      generateBeepSound(1000, 0.15, 'sine');
      break;
    case 'error':
      generateBeepSound(400, 0.2, 'square');
      break;
    case 'lifeLost':
      generateBeepSound(300, 0.3, 'square');
      break;
    case 'gameOver':
      // Play a descending tone
      generateBeepSound(600, 0.2, 'sine');
      setTimeout(() => generateBeepSound(400, 0.3, 'sine'), 200);
      setTimeout(() => generateBeepSound(200, 0.4, 'sine'), 500);
      break;
  }
}

/**
 * Background music management
 */
const MUSIC_PATH = '/sounds/music/game-music.mp3';

/**
 * Initialize background music
 */
function initBackgroundMusic(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  if (!backgroundMusic) {
    try {
      backgroundMusic = new Audio(MUSIC_PATH);
      backgroundMusic.loop = true;
      backgroundMusic.volume = musicVolume;
      backgroundMusic.preload = 'auto';
      
      // Handle loading errors gracefully
      backgroundMusic.addEventListener('error', () => {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Background music file not found (will be silent)');
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Could not initialize background music:', error);
      }
      return null;
    }
  }

  return backgroundMusic;
}

/**
 * Play background music
 * @param enabled - Whether music is enabled
 */
export function playBackgroundMusic(enabled: boolean = true): void {
  if (!enabled || typeof window === 'undefined') {
    stopBackgroundMusic();
    return;
  }

  const music = initBackgroundMusic();
  if (!music) return;

  // Only play if not already playing
  if (music.paused) {
    music.volume = musicVolume;
    music.play().catch((error) => {
      // Silently handle autoplay restrictions
      if (process.env.NODE_ENV === 'development') {
        console.debug('Could not play background music (may require user interaction):', error);
      }
    });
  }
}

/**
 * Stop background music
 */
export function stopBackgroundMusic(): void {
  if (typeof window === 'undefined') return;
  
  if (backgroundMusic) {
    try {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    } catch (error) {
      // Silently handle any errors
      if (process.env.NODE_ENV === 'development') {
        console.debug('Error stopping background music:', error);
      }
    }
  }
}

/**
 * Set background music volume
 * @param volume - Volume between 0 and 1
 */
export function setBackgroundMusicVolume(volume: number): void {
  musicVolume = Math.max(0, Math.min(1, volume));
  const music = initBackgroundMusic();
  if (music) {
    music.volume = musicVolume;
  }
}

/**
 * Set sound effects volume
 * @param volume - Volume between 0 and 1
 */
export function setSoundEffectsVolume(volume: number): void {
  soundEffectsVolume = Math.max(0, Math.min(1, volume));
}

