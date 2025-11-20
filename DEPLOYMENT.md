# Deployment Guide for ReflexThis

This guide covers deployment instructions for the ReflexThis reflex training game.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Vercel account (recommended) or another hosting platform

## Local Build Testing

Before deploying, test the production build locally:

```bash
# Install dependencies
npm install

# Run production build
npm run build

# Test production build locally
npm start
```

Visit `http://localhost:3000` to verify everything works correctly.

## Vercel Deployment

### Automatic Deployment (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Import your repository in [Vercel](https://vercel.com)
3. Vercel will automatically detect Next.js and configure the build
4. Deploy!

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# For production deployment
vercel --prod
```

### Environment Variables

No environment variables are required for basic deployment. The build script automatically generates build information.

## Build Information

The build script (`scripts/build-info.js`) automatically generates `public/build-info.json` with:
- Version number (from package.json)
- Build date
- Git commit hash (if available in CI/CD)

This information is displayed on the landing page footer.

## Performance Optimization

The application includes several performance optimizations:

- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: AVIF and WebP formats supported
- **Font Optimization**: Self-hosted fonts with subset loading
- **Component Memoization**: React.memo for expensive components
- **Lazy Loading**: Automatic for routes and components

## Browser Support

- Chrome/Edge (latest 2 versions)
- Safari (latest 2 versions)
- Firefox (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

## Mobile Optimization

The game is optimized for mobile devices:
- Touch-optimized interactions
- Landscape orientation preferred
- Responsive design for all screen sizes
- Performance optimizations for 60fps gameplay

## Troubleshooting

### Build Fails

1. Check Node.js version (requires 18+)
2. Clear `.next` directory: `rm -rf .next`
3. Clear node_modules: `rm -rf node_modules && npm install`
4. Try building again: `npm run build`

### Performance Issues

1. Check browser console for errors
2. Verify all assets are loading correctly
3. Test on actual mobile device (not just browser dev tools)
4. Check network tab for slow requests

### Sound Not Playing

- Sound files are optional - the game uses Web Audio API fallbacks
- Add sound files to `public/sounds/` directory if desired
- Check browser console for sound loading errors

## Post-Deployment Checklist

- [ ] Test landing page loads correctly
- [ ] Test game page functionality
- [ ] Verify build info displays correctly
- [ ] Test on mobile device (iOS and Android)
- [ ] Test in landscape orientation
- [ ] Verify sound toggle works
- [ ] Test game over modal appears correctly
- [ ] Verify high score persistence
- [ ] Check error boundary works (intentionally trigger an error)
- [ ] Test performance (should be smooth 60fps)

## Support

For issues or questions, check the project repository or create an issue.

