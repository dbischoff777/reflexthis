'use client';

import { useEffect, useState } from 'react';
import { getBuildInfo, type BuildInfo as BuildInfoType } from '@/lib/build-info';

/**
 * BuildInfo component displays version and build date information
 */
export function BuildInfo({ className }: { className?: string }) {
  const [buildInfo, setBuildInfo] = useState<BuildInfoType | null>(null);
  
  useEffect(() => {
    // Load build info from public/build-info.json for client-side rendering
    fetch('/build-info.json')
      .then((res) => res.json())
      .then((data) => setBuildInfo(data))
      .catch(() => {
        // Fallback to getBuildInfo if fetch fails
        setBuildInfo(getBuildInfo());
      });
  }, []);
  
  if (!buildInfo) {
    return null;
  }
  
  return (
    <div className={className}>
      <p className="text-xs sm:text-sm text-muted-foreground">
        v{buildInfo.version} | Built: {buildInfo.buildDate}
        {buildInfo.commitHash && buildInfo.commitHash !== 'develop' && ` | ${buildInfo.commitHash}`}
      </p>
    </div>
  );
}

