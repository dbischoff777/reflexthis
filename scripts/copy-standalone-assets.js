const fs = require('fs');
const path = require('path');

/**
 * Copy public directory and .next/static to standalone directory
 * Next.js standalone mode doesn't automatically copy these directories
 */
function copyStandaloneAssets() {
  const standaloneDir = path.join(process.cwd(), '.next', 'standalone');
  const publicDir = path.join(process.cwd(), 'public');
  const staticDir = path.join(process.cwd(), '.next', 'static');
  const standalonePublicDir = path.join(standaloneDir, 'public');
  const standaloneNextDir = path.join(standaloneDir, '.next');
  const standaloneStaticDir = path.join(standaloneNextDir, 'static');

  console.log('Copying standalone assets...');

  // Check if standalone directory exists
  if (!fs.existsSync(standaloneDir)) {
    console.error('Error: .next/standalone directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Copy public directory to standalone/public
  if (fs.existsSync(publicDir)) {
    console.log(`Copying ${publicDir} to ${standalonePublicDir}...`);
    if (fs.existsSync(standalonePublicDir)) {
      fs.rmSync(standalonePublicDir, { recursive: true, force: true });
    }
    copyDirectory(publicDir, standalonePublicDir);
    console.log('✓ Public directory copied');
  } else {
    console.warn('Warning: public directory not found, skipping...');
  }

  // Copy .next/static to standalone/.next/static
  if (fs.existsSync(staticDir)) {
    console.log(`Copying ${staticDir} to ${standaloneStaticDir}...`);
    // Ensure .next directory exists in standalone
    if (!fs.existsSync(standaloneNextDir)) {
      fs.mkdirSync(standaloneNextDir, { recursive: true });
    }
    if (fs.existsSync(standaloneStaticDir)) {
      fs.rmSync(standaloneStaticDir, { recursive: true, force: true });
    }
    copyDirectory(staticDir, standaloneStaticDir);
    console.log('✓ Static directory copied');
  } else {
    console.error('Error: .next/static directory not found. Build may have failed.');
    process.exit(1);
  }

  console.log('✓ Standalone assets copied successfully');
}

function copyDirectory(src, dest) {
  // Create destination directory
  fs.mkdirSync(dest, { recursive: true });

  // Read all files and directories
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Run if called directly
if (require.main === module) {
  copyStandaloneAssets();
}

module.exports = { copyStandaloneAssets };

