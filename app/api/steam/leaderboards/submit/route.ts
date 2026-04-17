import { NextResponse } from 'next/server';
import { SteamWebApiError, resolveLeaderboardId, setLeaderboardScore } from '../_internal/steamWebApi';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, reason: 'invalid_body' }, { status: 400 });
    }

    const leaderboardName = typeof (body as any).leaderboardName === 'string' ? (body as any).leaderboardName : '';
    const steamId64 = typeof (body as any).steamId64 === 'string' ? (body as any).steamId64 : '';
    const score = (body as any).score;

    if (!leaderboardName.trim() || !steamId64.trim() || typeof score !== 'number' || !Number.isFinite(score)) {
      return NextResponse.json({ ok: false, reason: 'invalid_args' }, { status: 400 });
    }

    const leaderboardId = await resolveLeaderboardId(leaderboardName);
    const res = await setLeaderboardScore({
      leaderboardId,
      steamId64,
      score,
      scoreMethod: 'KeepBest',
    });

    if (!res.ok) return NextResponse.json({ ok: false, reason: 'steam_set_failed' }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Never include secrets in responses/logs.
    if (e instanceof SteamWebApiError) {
      return NextResponse.json({ ok: false, reason: e.code }, { status: e.status });
    }
    return NextResponse.json({ ok: false, reason: 'exception' }, { status: 500 });
  }
}

