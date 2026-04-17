import { NextResponse } from 'next/server';
import { SteamWebApiError, getLeaderboardTop, resolveLeaderboardId } from '../_internal/steamWebApi';

async function fetchPersonaNames(steamIds: string[]): Promise<Record<string, string>> {
  const ids = Array.from(new Set(steamIds.filter(Boolean))).slice(0, 100);
  if (ids.length === 0) return {};

  // Prefer a dedicated Web API key if provided, otherwise reuse the publisher key.
  // We never return/log the key value.
  const key = process.env.STEAM_WEB_API_KEY ?? process.env.STEAM_PUBLISHER_WEB_API_KEY ?? '';
  if (!key) return {};

  const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
  url.searchParams.set('key', key);
  url.searchParams.set('steamids', ids.join(','));

  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) return {};
  const json = (await res.json().catch(() => null)) as any;
  const players = json?.response?.players;
  if (!Array.isArray(players)) return {};

  const out: Record<string, string> = {};
  for (const p of players) {
    const sid = typeof p?.steamid === 'string' ? p.steamid : null;
    const name = typeof p?.personaname === 'string' ? p.personaname : null;
    if (sid && name) out[sid] = name;
  }
  return out;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leaderboardName = searchParams.get('leaderboardName') ?? '';
    const limitRaw = searchParams.get('limit');
    const limit = limitRaw ? Math.max(1, Math.min(100, Math.trunc(Number(limitRaw)))) : 10;

    if (!leaderboardName.trim()) {
      return NextResponse.json({ ok: false, reason: 'invalid_args' }, { status: 400 });
    }

    const leaderboardId = await resolveLeaderboardId(leaderboardName);
    // Steam Web API range params are 0-based indices.
    const entries = await getLeaderboardTop({ leaderboardId, rangeStart: 0, rangeEnd: Math.max(0, limit - 1) });

    const nameBySteamId = await fetchPersonaNames(entries.map((e) => e.steamId64));

    return NextResponse.json({
      ok: true,
      entries: entries.map((e) => ({
        rank: e.rank,
        score: e.score,
        steamId64: e.steamId64,
        name: nameBySteamId[e.steamId64] ?? null,
      })),
    });
  } catch (e) {
    if (e instanceof SteamWebApiError) {
      return NextResponse.json({ ok: false, reason: e.code }, { status: e.status });
    }
    return NextResponse.json({ ok: false, reason: 'exception' }, { status: 500 });
  }
}

