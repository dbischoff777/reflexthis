import { describe, expect, it } from 'vitest';
import { parseActiveChallengeSession, serializeActiveChallengeSession } from '@/lib/challengeSession';

describe('challengeSession', () => {
  it('serializes and parses a valid session', () => {
    const raw = serializeActiveChallengeSession({ id: 'abc', type: 'daily' });
    expect(parseActiveChallengeSession(raw)).toEqual({ id: 'abc', type: 'daily' });
  });

  it('rejects invalid json', () => {
    expect(parseActiveChallengeSession('{')).toBeNull();
  });

  it('rejects missing id/type', () => {
    expect(parseActiveChallengeSession(JSON.stringify({ type: 'daily' }))).toBeNull();
    expect(parseActiveChallengeSession(JSON.stringify({ id: 'x' }))).toBeNull();
  });

  it('rejects empty id and invalid type', () => {
    expect(parseActiveChallengeSession(JSON.stringify({ id: '', type: 'daily' }))).toBeNull();
    expect(parseActiveChallengeSession(JSON.stringify({ id: 'x', type: 'monthly' }))).toBeNull();
  });
});

