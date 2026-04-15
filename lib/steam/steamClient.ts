import { getSteamAchievementApiName } from '@/lib/steam/steamAchievementMap';

type SteamStatus =
  | { available: false }
  | { available: true; name: string | null; steamId64: string | null; level: number | null; appId: number | null };

function getSteamApi() {
  return typeof window !== 'undefined' ? window.electronAPI?.steam : undefined;
}

export async function ensureSteamStatsReady(options?: { timeoutMs?: number }): Promise<boolean> {
  const steam = getSteamApi();
  if (!steam?.ensureStatsReady) return false;
  try {
    const res = await steam.ensureStatsReady(options);
    return !!res?.ok;
  } catch {
    return false;
  }
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
    // Match classic Steamworks flow: only act after user stats are available.
    await ensureSteamStatsReady({ timeoutMs: 5000 });
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

export async function getSteamStatInt(statName: string): Promise<number | null> {
  const steam = getSteamApi();
  if (!steam) return null;
  try {
    const res = await steam.getStatInt(statName);
    if (!res?.ok) return null;
    return Number.isFinite(res.value) ? res.value! : null;
  } catch {
    return null;
  }
}

/**
 * Steam stats can have constraints (e.g. "Increment Only"). To avoid StoreStats being rejected due to
 * accidental decreases (local resets, session truncation, etc.), only set if the value is >= current.
 */
export async function setSteamStatIntMonotonic(statName: string, value: number): Promise<boolean> {
  if (!Number.isFinite(value)) return false;
  const current = await getSteamStatInt(statName);
  if (current !== null && value < current) return false;
  return await setSteamStatInt(statName, value);
}

export async function storeSteamStats(options?: { force?: boolean }): Promise<{ ok: boolean; throttled?: boolean }> {
  const steam = getSteamApi();
  if (!steam) return { ok: false };
  try {
    await ensureSteamStatsReady({ timeoutMs: 5000 });
    const res = await steam.storeStats(options);
    return { ok: !!res?.ok, throttled: !!res?.throttled };
  } catch {
    return { ok: false };
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

