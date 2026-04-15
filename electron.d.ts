// Type definitions for Electron API exposed via preload script
export interface ElectronAPI {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  quit: () => Promise<void>;
  steam?: {
    isAvailable: () => Promise<
      | { available: false }
      | {
          available: true;
          name: string | null;
          steamId64: string | null;
          level: number | null;
          appId: number | null;
          statsReady: boolean;
        }
    >;
    ensureStatsReady: (options?: { timeoutMs?: number; probeStatName?: string }) => Promise<{ ok: boolean; reason?: string }>;
    activateAchievement: (achievementApiName: string) => Promise<{ ok: boolean; reason?: string; message?: string }>;
    getStatInt: (statName: string) => Promise<{ ok: boolean; value?: number; reason?: string; message?: string }>;
    setStatInt: (statName: string, value: number) => Promise<{ ok: boolean; reason?: string; message?: string }>;
    storeStats: (options?: { force?: boolean }) => Promise<{ ok: boolean; throttled?: boolean; reason?: string; message?: string }>;
    debug: (options?: { statNames?: string[]; achievementApiNames?: string[] }) => Promise<{
      ok: boolean;
      available?: boolean;
      appId?: number | null;
      achievementNames?: string[];
      achievements?: Record<string, boolean | null>;
      stats?: Record<string, number | null>;
      reason?: string;
      message?: string;
    }>;
    openOverlayAchievements: () => Promise<{ ok: boolean; reason?: string; message?: string }>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

