/**
 * Build information generator script
 * Generates build-info.json with version and build date
 */

const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');
const buildDate = new Date().toISOString();
const version = packageJson.version || '1.0.0';
const commitHash = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'development';

const buildInfo = {
  version,
  buildDate: buildDate.split('T')[0], // Just the date part
  commitHash: commitHash.substring(0, 7), // Short hash
};

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write build info to public directory
const outputPath = path.join(publicDir, 'build-info.json');
fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));

console.log('Build info generated:', buildInfo);

