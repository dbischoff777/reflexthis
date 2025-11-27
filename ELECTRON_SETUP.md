# Electron Desktop App Setup

This guide explains how to build and distribute your Reflex This game as a desktop application with installers for Windows, macOS, and Linux.

## Prerequisites

1. Install Node.js dependencies:
```bash
npm install
```

## Development

To run the app in development mode with Electron:

```bash
npm run electron:dev
```

This will:
- Start the Next.js development server
- Wait for it to be ready
- Launch Electron with hot-reload support

## Building Installers

### Build for All Platforms

```bash
npm run electron:build
```

### Build for Specific Platforms

**Windows:**
```bash
npm run electron:build:win
```
Creates a Windows installer (NSIS) in the `dist` folder.

**macOS:**
```bash
npm run electron:build:mac
```
Creates a macOS DMG file in the `dist` folder.

**Linux:**
```bash
npm run electron:build:linux
```
Creates AppImage and DEB packages in the `dist` folder.

## Output

All installers will be created in the `dist/` directory:
- Windows: `.exe` installer
- macOS: `.dmg` file
- Linux: `.AppImage` and `.deb` files

## Configuration

The Electron and build configuration is in:
- `package.json` - Build configuration under the `build` section
- `electron/main.js` - Main Electron process
- `electron/preload.js` - Preload script for secure context bridge

## Customization

### App Icon
Replace `public/favicon.ico` with your app icon. For best results:
- Windows: `.ico` file (256x256 or larger)
- macOS: `.icns` file
- Linux: `.png` file (512x512)

### App Metadata
Edit the `build` section in `package.json`:
- `appId`: Your unique app identifier
- `productName`: Display name of your app
- `version`: App version (inherited from package.json)

### Window Settings
Edit `electron/main.js` to customize:
- Window size (`width`, `height`)
- Minimum size (`minWidth`, `minHeight`)
- Window behavior and appearance

## Distribution

### Code Signing (Recommended for Production)

For Windows:
- Set `CSC_LINK` environment variable to your certificate
- Set `CSC_KEY_PASSWORD` for certificate password

For macOS:
- Set `APPLE_ID`, `APPLE_ID_PASS`, and `APPLE_TEAM_ID` for notarization
- Requires Apple Developer account

### Publishing

1. Build the installer for your target platform
2. Test the installer on a clean machine
3. Upload to distribution platforms:
   - Windows: Microsoft Store, or direct download
   - macOS: Mac App Store, or direct download
   - Linux: Snap Store, Flathub, or direct download

## Troubleshooting

### Build Fails
- Ensure all dependencies are installed: `npm install`
- Check that Next.js build completes: `npm run build`
- Verify Node.js version compatibility

### App Won't Start
- Check console for errors: DevTools are auto-opened in dev mode
- Verify Next.js server is running on port 3000
- Check file paths in `electron/main.js`

### Installer Issues
- Ensure you have proper permissions
- Check disk space (builds can be large)
- Verify electron-builder version compatibility

## Notes

- The standalone Next.js build is used for production
- The app runs a local Next.js server internally
- All assets are bundled with the application
- No internet connection required after installation

