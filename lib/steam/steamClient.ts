import { getSteamAchievementApiName } from '@/lib/steam/steamAchievementMap';

type SteamStatus =
  | { available: false }
  | { available: true; name: string | null; steamId64: string | null; level: number | null; appId: number | null };

export type SteamLeaderboardEntry = Readonly<{
  rank: number;
  score: number | null;
  steamId64: string | null;
  name: string | null;
}>;

function getSteamApi() {
  return typeof window !== 'undefined' ? window.electronAPI?.steam : undefined;
}

export async function ensureSteamStatsReady(options?: { timeoutMs?: number; probeStatName?: string }): Promise<boolean> {
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

export async function getSteamDebug(options?: {
  statNames?: string[];
  achievementApiNames?: string[];
}): Promise<{
  ok: boolean;
  available?: boolean;
  appId?: number | null;
  achievementNames?: string[];
  achievements?: Record<string, boolean | null>;
  stats?: Record<string, number | null>;
  reason?: string;
  message?: string;
}> {
  const steam = getSteamApi();
  if (!steam?.debug) return { ok: false, reason: 'unsupported' };
  try {
    return await steam.debug(options);
  } catch {
    return { ok: false, reason: 'exception' };
  }
}

export async function submitSteamLeaderboardScore(options: {
  leaderboardName: string;
  score: number;
  details?: number[];
}): Promise<{ ok: boolean; reason?: string; message?: string }> {
  if (typeof options?.leaderboardName !== 'string' || options.leaderboardName.trim().length === 0) {
    return { ok: false, reason: 'invalid_args' };
  }
  if (!Number.isFinite(options.score)) return { ok: false, reason: 'invalid_args' };
  if (options.details && !options.details.every((n) => Number.isFinite(n))) return { ok: false, reason: 'invalid_args' };

  try {
    const status = await getSteamStatus();
    if (!status.available || !status.steamId64) return { ok: false, reason: 'steam_unavailable' };

    const res = await fetch('/api/steam/leaderboards/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        leaderboardName: options.leaderboardName,
        steamId64: status.steamId64,
      score: Math.trunc(options.score),
      details: options.details?.map((n) => Math.trunc(n)),
      }),
    });

    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok) return { ok: false, reason: json?.reason ?? 'failed' };
    return { ok: !!json?.ok, reason: json?.reason, message: json?.message };
  } catch {
    return { ok: false, reason: 'exception' };
  }
}

export async function getSteamLeaderboardTop(options: {
  leaderboardName: string;
  limit?: number;
}): Promise<{ ok: boolean; entries?: SteamLeaderboardEntry[]; reason?: string; message?: string }> {
  if (typeof options?.leaderboardName !== 'string' || options.leaderboardName.trim().length === 0) {
    return { ok: false, reason: 'invalid_args' };
  }
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(100, Math.trunc(options.limit!))) : undefined;

  try {
    const url = new URL('/api/steam/leaderboards/top', typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    url.searchParams.set('leaderboardName', options.leaderboardName);
    if (limit) url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), { method: 'GET' });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok || !json?.ok) return { ok: false, reason: json?.reason ?? 'failed', message: json?.message };
    const entries = Array.isArray(json.entries) ? (json.entries as SteamLeaderboardEntry[]) : [];
    return { ok: true, entries };
  } catch {
    return { ok: false, reason: 'exception' };
  }
}

