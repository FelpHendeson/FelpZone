import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice, EngineError, getAvailableChoices, startGame } from '../core/engine';
import type { GameState } from '../core/state';
import { continueAfterIntro, now, playFirstDay, reopenNarrativeSession } from './helpers';

describe('ciclo de vida do motor', () => {
  it('rejeita escolhas depois que a partida está concluída', () => {
    const exploring = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
    const ended: GameState = {
      ...exploring,
      status: 'completed',
      narrativeSession: null,
    };
    const snapshot = structuredClone(ended);

    expect(ended.status).toBe('completed');
    expect(ended.narrativeSession).toBeNull();
    expect(getAvailableChoices(ended, firstDayCampaign)).toEqual([]);
    expect(() => applyChoice(ended, firstDayCampaign, 'together-summary', now)).toThrow(EngineError);
    expect(ended).toEqual(snapshot);
  });

  it('devolve o jogador à exploração depois da primeira noite', () => {
    const returned = continueAfterIntro(
      ['awake-calm', 'system-touch', 'ability-perception'],
      ['seek-water', 'alert-hide', 'meet-open', 'share-fruit', 'accept-shelter', 'together-summary'],
    );

    expect(returned.status).toBe('playing');
    expect(returned.narrativeSession).toBeNull();
    expect(getAvailableChoices(returned, firstDayCampaign)).toEqual([]);
    expect(() => applyChoice(returned, firstDayCampaign, 'together-summary', now)).toThrow(/sessão narrativa ativa/);
  });

  it('não apresenta nem aplica um evento condicionado quando a condição falha', () => {
    const state = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
    const forced: GameState = reopenNarrativeSession(state, 'danger-alert');
    const snapshot = structuredClone(forced);

    expect(() => applyChoice(forced, firstDayCampaign, 'alert-hide', now)).toThrow(EngineError);
    expect(getAvailableChoices(forced, firstDayCampaign)).toEqual([]);
    expect(forced).toEqual(snapshot);
  });

  it('rejeita uma escolha que não cumpre as próprias condições', () => {
    const atMeet = continueAfterIntro(
      ['awake-calm', 'system-touch', 'ability-perception'],
      ['seek-shelter', 'alert-leave'],
    );
    const snapshot = structuredClone(atMeet);

    expect(atMeet.narrativeSession?.eventId).toBe('survivor-meet');
    expect(getAvailableChoices(atMeet, firstDayCampaign).some((choice) => choice.id === 'meet-calm')).toBe(false);
    expect(() => applyChoice(atMeet, firstDayCampaign, 'meet-calm', now)).toThrow(EngineError);
    expect(atMeet).toEqual(snapshot);
  });

  it('rejeita escolhas depois que a introdução devolve o jogador à exploração', () => {
    const exploring = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
    const snapshot = structuredClone(exploring);

    expect(exploring.status).toBe('playing');
    expect(exploring.narrativeSession).toBeNull();
    expect(getAvailableChoices(exploring, firstDayCampaign)).toEqual([]);
    expect(() => applyChoice(exploring, firstDayCampaign, 'seek-water', now)).toThrow(/sessão narrativa ativa/);
    expect(exploring).toEqual(snapshot);
  });
});
