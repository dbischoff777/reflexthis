# Game Sound Effects

This directory should contain the following sound files for the game:

- `highlight.mp3` - Sound played when buttons are highlighted
- `success.mp3` - Sound played when a correct button is pressed
- `error.mp3` - Sound played when a wrong button is pressed
- `life-lost.mp3` - Sound played when a life is lost
- `game-over.mp3` - Sound played when the game ends

## Fallback System

If sound files are not found, the game will automatically use Web Audio API to generate simple beep sounds as fallbacks. This ensures the game works even without sound files.

## Sound File Recommendations

- Format: MP3 (for best browser compatibility)
- Sample Rate: 44.1kHz
- Bitrate: 128kbps or higher
- Duration: Keep sounds short (0.1-0.5 seconds) for better game feel
- Volume: Normalize all sounds to similar levels

## Adding Sound Files

Simply place your sound files in this directory with the exact names listed above. The game will automatically detect and use them.

