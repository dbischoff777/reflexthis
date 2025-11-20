/**
 * Build information utility
 * Provides version and build date information for display in the app
 */

export interface BuildInfo {
  version: string;
  buildDate: string;
  commitHash?: string;
}

/**
 * Get build information from environment variables or package.json
 */
export function getBuildInfo(): BuildInfo {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
  const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString().split('T')[0];
  const commitHash = process.env.NEXT_PUBLIC_COMMIT_HASH || process.env.VERCEL_GIT_COMMIT_SHA;

  return {
    version,
    buildDate,
    commitHash: commitHash?.substring(0, 7), // Short hash
  };
}

/**
 * Format build info as a display string
 */
export function formatBuildInfo(): string {
  const info = getBuildInfo();
  const parts = [`v${info.version}`, `Built: ${info.buildDate}`];
  
  if (info.commitHash) {
    parts.push(`(${info.commitHash})`);
  }
  
  return parts.join(' | ');
}

