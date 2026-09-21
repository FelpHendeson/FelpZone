import { describe, expect, it } from 'vitest';
import { resolveNarrativeSessionPatch } from '../modules/sandbox-actions';

const session = { campaignId: 'first-day', eventId: 'awakening' };
const other = { campaignId: 'first-day', eventId: 'first-priority' };

describe('semântica de narrativeSession no patch de estado', () => {
  it('undefined preserva a sessão existente', () => {
    expect(resolveNarrativeSessionPatch(undefined, session)).toEqual(session);
  });

  it('null remove a sessão existente', () => {
    expect(resolveNarrativeSessionPatch(null, session)).toBeNull();
  });

  it('um objeto substitui a sessão existente', () => {
    expect(resolveNarrativeSessionPatch(other, session)).toEqual(other);
  });

  it('um objeto cria a sessão quando a base não tem sessão', () => {
    expect(resolveNarrativeSessionPatch(other, null)).toEqual(other);
  });
});
