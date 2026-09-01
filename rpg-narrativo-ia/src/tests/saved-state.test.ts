import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { bindSavedState } from '../core/engine';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { freshState, playFirstDay, reopenNarrativeSession } from './helpers';

describe('vínculo do salvamento com a campanha', () => {
  it('aceita um save cujo evento atual existe e é compatível', () => {
    const state = freshState();
    const bound = bindSavedState(state, firstDayCampaign);

    expect(bound).toEqual({ ok: true, state });
  });

  it('aceita uma partida em exploração livre sem evento ativo', () => {
    const exploring = {
      ...freshState(),
      narrativeSession: null,
    };

    expect(bindSavedState(exploring, firstDayCampaign)).toEqual({ ok: true, state: exploring });
  });

  it('rejeita de forma controlada um evento inexistente na campanha', () => {
    const state = reopenNarrativeSession(freshState(), 'evento-fantasma');
    const parsed = parseGameState(serializeGameState(state));
    const bound = bindSavedState(state, firstDayCampaign);

    expect(parsed.status).toBe('ok');
    expect(bound.ok).toBe(false);
    if (!bound.ok) {
      expect(bound.reason).toMatch(/evento-fantasma/);
    }
  });

  it('rejeita um evento existente cujas condições não combinam com o estado', () => {
    const state = reopenNarrativeSession(freshState(), 'danger-alert');
    const bound = bindSavedState(state, firstDayCampaign);

    expect(bound.ok).toBe(false);
    if (!bound.ok) {
      expect(bound.reason).toMatch(/compatível/);
    }
  });

  it('aceita uma partida concluída sem sessão narrativa', () => {
    const exploring = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
    const ended = {
      ...exploring,
      status: 'completed' as const,
      narrativeSession: null,
    };

    expect(ended.status).toBe('completed');
    expect(ended.narrativeSession).toBeNull();
    expect(bindSavedState(ended, firstDayCampaign).ok).toBe(true);
  });
});
