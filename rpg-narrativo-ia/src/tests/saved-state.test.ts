import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice, bindSavedState, startGame } from '../core/engine';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { freshState, now } from './helpers';

describe('vínculo do salvamento com a campanha', () => {
  it('aceita um save cujo evento atual existe e é compatível', () => {
    const state = freshState();
    const bound = bindSavedState(state, firstDayCampaign);

    expect(bound).toEqual({ ok: true, state });
  });

  it('rejeita de forma controlada um evento inexistente na campanha', () => {
    const state = { ...freshState(), currentEventId: 'evento-fantasma' };
    const parsed = parseGameState(serializeGameState(state));
    const bound = bindSavedState(state, firstDayCampaign);

    expect(parsed.status).toBe('ok');
    expect(bound.ok).toBe(false);
    if (!bound.ok) {
      expect(bound.reason).toMatch(/evento-fantasma/);
    }
  });

  it('rejeita um evento existente cujas condições não combinam com o estado', () => {
    const state = { ...freshState(), currentEventId: 'danger-alert' };
    const bound = bindSavedState(state, firstDayCampaign);

    expect(bound.ok).toBe(false);
    if (!bound.ok) {
      expect(bound.reason).toMatch(/compatível/);
    }
  });

  it('aceita uma partida concluída no evento de encerramento', () => {
    const ended = [
      'awake-calm',
      'system-touch',
      'ability-perception',
      'seek-water',
      'alert-hide',
      'meet-open',
      'share-fruit',
      'accept-shelter',
      'together-summary',
    ].reduce(
      (state, choiceId) => applyChoice(state, firstDayCampaign, choiceId, now),
      startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now),
    );

    expect(ended.status).toBe('completed');
    expect(bindSavedState(ended, firstDayCampaign).ok).toBe(true);
  });
});
