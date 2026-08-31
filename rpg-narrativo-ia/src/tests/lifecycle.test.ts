import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice, EngineError, getAvailableChoices, startGame } from '../core/engine';
import type { GameState } from '../core/state';
import { now } from './helpers';

function play(choiceIds: string[]): GameState {
  return choiceIds.reduce(
    (state, choiceId) => applyChoice(state, firstDayCampaign, choiceId, now),
    startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now),
  );
}

describe('ciclo de vida do motor', () => {
  it('rejeita escolhas depois que a partida está concluída', () => {
    const ended = play([
      'awake-calm',
      'system-touch',
      'ability-perception',
      'seek-water',
      'alert-hide',
      'meet-open',
      'share-fruit',
      'accept-shelter',
      'together-summary',
    ]);
    const snapshot = structuredClone(ended);

    expect(ended.status).toBe('completed');
    expect(getAvailableChoices(ended, firstDayCampaign)).toEqual([]);
    expect(() => applyChoice(ended, firstDayCampaign, 'together-summary', now)).toThrow(EngineError);
    expect(ended).toEqual(snapshot);
  });

  it('não apresenta nem aplica um evento condicionado quando a condição falha', () => {
    const state = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
    const forced: GameState = {
      ...state,
      currentEventId: 'danger-alert',
    };
    const snapshot = structuredClone(forced);

    expect(() => applyChoice(forced, firstDayCampaign, 'alert-hide', now)).toThrow(EngineError);
    expect(getAvailableChoices(forced, firstDayCampaign)).toEqual([]);
    expect(forced).toEqual(snapshot);
  });

  it('rejeita uma escolha que não cumpre as próprias condições', () => {
    const atMeet = play(['awake-calm', 'system-touch', 'ability-perception', 'seek-shelter', 'alert-leave']);
    const snapshot = structuredClone(atMeet);

    expect(atMeet.currentEventId).toBe('survivor-meet');
    expect(getAvailableChoices(atMeet, firstDayCampaign).some((choice) => choice.id === 'meet-calm')).toBe(false);
    expect(() => applyChoice(atMeet, firstDayCampaign, 'meet-calm', now)).toThrow(EngineError);
    expect(atMeet).toEqual(snapshot);
  });
});
