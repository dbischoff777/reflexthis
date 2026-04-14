import { getSteamAchievementApiName } from '@/lib/steam/steamAchievementMap';

type SteamStatus =
  | { available: false }
  | { available: true; name: string | null; steamId64: string | null; level: number | null; appId: number | null };

function getSteamApi() {
  return typeof window !== 'undefined' ? window.electronAPI?.steam : undefined;
}

export async function getSteamStatus(): Promise<SteamStatus> {
  const steam = getSteamApi();
  if (!steam) return { available: false };
  try {
    return await steam.isAvailable();
  } catch {
    return { available: false };
  }
}

export async function unlockSteamAchievementForLocalId(localAchievementId: string): Promise<boolean> {
  const steam = getSteamApi();
  if (!steam) return false;

  const apiName = getSteamAchievementApiName(localAchievementId);
  if (!apiName) return false;

  try {
    const res = await steam.activateAchievement(apiName);
    // Do not throw on failure; keep game functional outside Steam.
    return !!res?.ok;
  } catch {
    return false;
  }
}

export async function setSteamStatInt(statName: string, value: number): Promise<boolean> {
  const steam = getSteamApi();
  if (!steam) return false;
  if (!Number.isFinite(value)) return false;
  try {
    const res = await steam.setStatInt(statName, Math.trunc(value));
    return !!res?.ok;
  } catch {
    return false;
  }
}

export async function storeSteamStats(): Promise<void> {
  const steam = getSteamApi();
  if (!steam) return;
  try {
    await steam.storeStats();
  } catch {
    // ignore
  }
}

export async function openSteamAchievementsOverlay(): Promise<void> {
  const steam = getSteamApi();
  if (!steam) return;
  try {
    await steam.openOverlayAchievements();
  } catch {
    // ignore
  }
}

