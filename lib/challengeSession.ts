import type { ChallengeType } from '@/lib/challenges';

export const ACTIVE_CHALLENGE_SESSION_KEY = 'reflexthis_activeChallenge' as const;

export type ActiveChallengeSession = {
  id: string;
  type: ChallengeType;
};

function isChallengeType(value: unknown): value is ChallengeType {
  return value === 'daily' || value === 'weekly';
}

export function serializeActiveChallengeSession(session: ActiveChallengeSession): string {
  return JSON.stringify({ id: session.id, type: session.type });
}

export function parseActiveChallengeSession(raw: string): ActiveChallengeSession | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;

  if (typeof record.id !== 'string' || record.id.length === 0) return null;
  if (!isChallengeType(record.type)) return null;

  return { id: record.id, type: record.type };
}

