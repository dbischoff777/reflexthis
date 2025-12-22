# Video Optimization Guide

## Current Optimizations

The background video (`public/animation/menu-background-animated.mp4`) has been optimized with the following performance improvements:

### 1. **Reduced Playback Rate**
- Low-end devices (GPU tier: low, or mobile with medium GPU) now play the video at **75% speed** (0.75x playback rate)
- This reduces the effective frame rate from ~30fps to ~22.5fps, significantly reducing CPU/GPU load
- Higher-end devices continue to play at full speed (1.0x)

### 2. **Smart Preloading**
- Low-end devices use `preload="metadata"` instead of `preload="auto"`
- This reduces initial bandwidth and memory usage
- Video only loads when needed, not immediately on page load

### 3. **Page Visibility API**
- Videos automatically pause when the browser tab is not visible
- Resumes playback when the tab becomes visible again
- Saves significant resources when users switch tabs

### 4. **Device Detection**
- Uses `useDeviceProfile` hook to automatically detect device capabilities
- Applies optimizations based on:
  - GPU tier (low/medium/high)
  - Device type (mobile/tablet/desktop)
  - Available memory and CPU cores

## Creating a Lower-Quality Video Version

If you want to further reduce the video file size and quality, you can create an optimized version using FFmpeg:

### Option 1: Reduce Frame Rate (Recommended)
```bash
# Reduce from 30fps to 15fps (50% reduction)
ffmpeg -i menu-background-animated.mp4 -r 15 -c:v libx264 -crf 28 -preset slow -c:a copy menu-background-animated-15fps.mp4
```

### Option 2: Reduce Resolution
```bash
# Scale down to 720p (if original is 1080p or higher)
ffmpeg -i menu-background-animated.mp4 -vf scale=1280:720 -c:v libx264 -crf 28 -preset slow -c:a copy menu-background-animated-720p.mp4
```

### Option 3: Reduce Bitrate
```bash
# Target 2Mbps bitrate (adjust as needed)
ffmpeg -i menu-background-animated.mp4 -b:v 2M -maxrate 2M -bufsize 4M -c:v libx264 -preset slow -c:a copy menu-background-animated-2mbps.mp4
```

### Option 4: Combined Optimization (Best Results)
```bash
# Reduce frame rate to 15fps, scale to 720p, and optimize bitrate
ffmpeg -i menu-background-animated.mp4 \
  -r 15 \
  -vf scale=1280:720 \
  -c:v libx264 \
  -crf 28 \
  -preset slow \
  -b:v 1.5M \
  -maxrate 1.5M \
  -bufsize 3M \
  -c:a aac \
  -b:a 64k \
  menu-background-animated-optimized.mp4
```

### Option 5: WebM Format (Better Compression)
```bash
# Convert to WebM with VP9 codec (better compression than H.264)
ffmpeg -i menu-background-animated.mp4 \
  -r 15 \
  -vf scale=1280:720 \
  -c:v libvpx-vp9 \
  -crf 30 \
  -b:v 1M \
  -c:a libopus \
  -b:a 64k \
  menu-background-animated.webm
```

## Implementation Notes

### Current Code Behavior
- The optimizations are **automatic** based on device detection
- No user action required - the system adapts to device capabilities
- Works alongside the existing `reducedEffects` setting
- **✅ IMPLEMENTED**: All optimizations are now active in `app/game/components/BackgroundVideo.tsx` and `app/page.tsx`

### Future Enhancements
If you create a lower-quality version, you could:
1. Serve different video files based on device tier
2. Use `<source>` elements with multiple video formats (MP4 + WebM)
3. Implement progressive loading (start with low quality, upgrade if bandwidth allows)

### Example: Multiple Video Sources
```tsx
<video>
  <source src="/animation/menu-background-animated-hq.mp4" type="video/mp4" media="(min-width: 1920px)" />
  <source src="/animation/menu-background-animated-mq.mp4" type="video/mp4" media="(min-width: 1280px)" />
  <source src="/animation/menu-background-animated-lq.mp4" type="video/mp4" />
</video>
```

## Testing Performance

To verify the optimizations are working:

1. **Check Playback Rate**: Open browser DevTools → Console
   ```javascript
   document.querySelector('video').playbackRate // Should be 0.75 on low-end devices
   ```

2. **Monitor Performance**: Use Chrome DevTools Performance tab
   - Record while page loads
   - Check CPU usage and frame rate
   - Compare before/after optimizations

3. **Network Tab**: Verify preload behavior
   - Low-end devices should show `preload="metadata"`
   - Video should load progressively, not all at once

## Additional Recommendations

1. **Consider using WebP/AVIF for static backgrounds** as a fallback
2. **Implement lazy loading** for videos below the fold
3. **Use poster images** to show a frame while video loads
4. **Monitor Core Web Vitals** (LCP, FID, CLS) to ensure optimizations help
5. **Create optimized video files** using the FFmpeg commands above to reduce file size and bandwidth usage
6. **Consider WebM format** for better compression (smaller file sizes) while maintaining quality

## Performance Impact

### Expected Improvements
- **Low-end devices**: 25% reduction in video processing load (75% playback rate)
- **Memory usage**: Reduced initial memory footprint with `preload="metadata"` on low-end devices
- **Battery life**: Improved on mobile devices when tab is hidden (videos pause automatically)
- **Network**: Lower bandwidth usage on low-end devices (metadata-only preload)

### Monitoring
Use browser DevTools to verify optimizations:
- **Performance tab**: Check CPU usage and frame rate
- **Network tab**: Verify preload behavior (`metadata` vs `auto`)
- **Console**: Check playback rate: `document.querySelector('video').playbackRate`
