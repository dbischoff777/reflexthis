type SteamWebApiConfig = Readonly<{
  publisherKey: string;
  appId: number;
}>;

export class SteamWebApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function getConfig(): SteamWebApiConfig {
  const publisherKey = process.env.STEAM_PUBLISHER_WEB_API_KEY ?? '';
  const appIdRaw = process.env.STEAM_APP_ID ?? '';
  const appId = Number(appIdRaw);
  if (!publisherKey) {
    throw new SteamWebApiError('missing_env', 'Missing STEAM_PUBLISHER_WEB_API_KEY', 500);
  }
  if (!Number.isFinite(appId) || appId <= 0) {
    throw new SteamWebApiError('missing_env', 'Missing/invalid STEAM_APP_ID', 500);
  }
  return { publisherKey, appId: Math.trunc(appId) };
}

const STEAM_PARTNER_API_BASE = 'https://partner.steam-api.com';

async function steamPostForm<T>(path: string, form: Record<string, string>): Promise<T> {
  const res = await fetch(`${STEAM_PARTNER_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams(form).toString(),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new SteamWebApiError(`steam_http_${res.status}`, `Steam Web API HTTP ${res.status}`, 502);
  }
  return (await res.json()) as T;
}

async function steamGet<T>(path: string, query: Record<string, string>): Promise<T> {
  const url = new URL(`${STEAM_PARTNER_API_BASE}${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    throw new SteamWebApiError(`steam_http_${res.status}`, `Steam Web API HTTP ${res.status}`, 502);
  }
  return (await res.json()) as T;
}

type FindOrCreateLeaderboardResponse =
  | { response?: { leaderboardid?: number | string; leaderboard_id?: number | string } }
  | {
      result?: {
        result?: number;
        leaderboard?: {
          leaderBoardID?: number | string;
          leaderBoardId?: number | string;
          leaderboardid?: number | string;
          leaderboardName?: string;
        };
      };
    };

type GetLeaderboardEntriesResponse =
  | {
      response?: {
        leaderboardid?: number;
        entries?: Array<{
          steamid?: string;
          score?: number;
          rank?: number;
        }>;
      };
    }
  | {
      leaderboardEntryInformation?: {
        appID?: number;
        leaderboardID?: number;
        totalLeaderBoardEntryCount?: number;
        leaderboardEntries?: Array<{
          steamID?: string | number;
          score?: number;
          rank?: number;
        }>;
      };
    };

type SetLeaderboardScoreResponse =
  | {
      response?: {
        result?: number;
        rank?: number;
        score?: number;
      };
    }
  | {
      result?: {
        result?: number;
        global_rank_previous?: number;
        global_rank_new?: number;
        score_changed?: boolean;
      };
    };

const leaderboardIdCache = new Map<string, number>();

export async function resolveLeaderboardId(leaderboardName: string): Promise<number> {
  const key = leaderboardName.trim();
  if (!key) throw new Error('Invalid leaderboard name');
  const cached = leaderboardIdCache.get(key);
  if (cached) return cached;

  const cfg = getConfig();
  const data = await steamPostForm<FindOrCreateLeaderboardResponse>('/ISteamLeaderboards/FindOrCreateLeaderboard/v2/', {
    key: cfg.publisherKey,
    appid: String(cfg.appId),
    name: key,
    sortmethod: 'Descending',
    displaytype: 'Numeric',
    // Avoid hard failures when the leaderboard isn't present yet or the configured name differs.
    // If it already exists, Steam will return the existing leaderboard ID.
    createifnotfound: 'true',
  });

  const rawId =
    (data as any)?.response?.leaderboardid ??
    (data as any)?.response?.leaderboard_id ??
    (data as any)?.result?.leaderboard?.leaderBoardID ??
    (data as any)?.result?.leaderboard?.leaderBoardId ??
    (data as any)?.result?.leaderboard?.leaderboardid;
  const leaderboardId = typeof rawId === 'string' ? Number(rawId) : rawId;
  if (!Number.isFinite(leaderboardId) || (leaderboardId as number) <= 0) {
    throw new SteamWebApiError('leaderboard_not_found', 'Leaderboard not found', 404);
  }
  leaderboardIdCache.set(key, Math.trunc(leaderboardId as number));
  return Math.trunc(leaderboardId as number);
}

export async function setLeaderboardScore(params: {
  leaderboardId: number;
  steamId64: string;
  score: number;
  scoreMethod: 'KeepBest' | 'ForceUpdate';
}): Promise<{ ok: boolean; rank?: number | null }> {
  const cfg = getConfig();
  const data = await steamPostForm<SetLeaderboardScoreResponse>('/ISteamLeaderboards/SetLeaderboardScore/v1/', {
    key: cfg.publisherKey,
    appid: String(cfg.appId),
    leaderboardid: String(Math.trunc(params.leaderboardId)),
    steamid: params.steamId64,
    score: String(Math.trunc(params.score)),
    scoremethod: params.scoreMethod,
  });

  const result = (data as any)?.response?.result ?? (data as any)?.result?.result;
  // Steam uses integer result codes; treat missing/0 as failure conservatively.
  const ok = typeof result === 'number' ? result === 1 : false;
  const rank =
    typeof (data as any)?.response?.rank === 'number'
      ? (data as any).response.rank
      : typeof (data as any)?.result?.global_rank_new === 'number'
        ? (data as any).result.global_rank_new
        : null;
  return { ok, rank };
}

export async function getLeaderboardTop(params: {
  leaderboardId: number;
  rangeStart: number;
  rangeEnd: number;
}): Promise<Array<{ rank: number; steamId64: string; score: number }>> {
  const cfg = getConfig();
  const data = await steamGet<GetLeaderboardEntriesResponse>('/ISteamLeaderboards/GetLeaderboardEntries/v1/', {
    key: cfg.publisherKey,
    appid: String(cfg.appId),
    leaderboardid: String(Math.trunc(params.leaderboardId)),
    rangestart: String(Math.trunc(params.rangeStart)),
    rangeend: String(Math.trunc(params.rangeEnd)),
    datarequest: 'RequestGlobal',
  });

  const entries =
    Array.isArray((data as any)?.response?.entries)
      ? (data as any).response.entries
      : Array.isArray((data as any)?.leaderboardEntryInformation?.leaderboardEntries)
        ? (data as any).leaderboardEntryInformation.leaderboardEntries
        : [];
  return entries
    .map((e: any) => ({
      rank: typeof e?.rank === 'number' ? e.rank : NaN,
      steamId64:
        typeof e?.steamid === 'string'
          ? e.steamid
          : typeof e?.steamID === 'string'
            ? e.steamID
            : typeof e?.steamID === 'number'
              ? String(e.steamID)
              : '',
      score: typeof e?.score === 'number' ? e.score : NaN,
    }))
    .filter((e: { rank: number; steamId64: string; score: number }) => Number.isFinite(e.rank) && e.steamId64 && Number.isFinite(e.score));
}

