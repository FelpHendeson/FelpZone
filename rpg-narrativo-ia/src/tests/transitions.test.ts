import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice, getAvailableChoices, startGame, validateCampaign } from '../core/engine';
import type { GameState } from '../core/state';

const now = () => '2026-08-31T12:00:00.000Z';

function play(choiceIds: string[]): GameState {
  return choiceIds.reduce(
    (state, choiceId) => applyChoice(state, firstDayCampaign, choiceId, now),
    startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now),
  );
}

describe('transições', () => {
  it('mantém a campanha do primeiro dia internamente consistente', () => {
    expect(validateCampaign(firstDayCampaign)).toEqual([]);
  });

  it('segue o caminho cooperativo até o encerramento compartilhado', () => {
    const afterAbility = play(['awake-calm', 'system-touch', 'ability-perception', 'seek-water']);
    expect(afterAbility.currentEventId).toBe('danger-alert');
    expect(afterAbility.inventory.some((item) => item.itemId === 'agua-limpa')).toBe(true);

    const afterShare = play([
      'awake-calm',
      'system-touch',
      'ability-perception',
      'seek-water',
      'alert-hide',
      'meet-open',
      'share-fruit',
    ]);
    expect(afterShare.currentEventId).toBe('dusk-trusted');
    expect(afterShare.flags['moral.shared']).toBe(true);

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

    expect(ended.currentEventId).toBe('night-together');
    expect(ended.status).toBe('completed');
    expect(ended.flags['camp.together']).toBe(true);
    expect(ended.history.some((entry) => entry.choiceId === 'share-fruit' && entry.notable)).toBe(true);
  });

  it('muda o perigo e o entardecer conforme escolhas anteriores', () => {
    const sudden = play(['awake-quick', 'system-watch', 'ability-resilience', 'seek-location']);
    expect(sudden.currentEventId).toBe('danger-sudden');
    expect(getAvailableChoices(sudden, firstDayCampaign).some((choice) => choice.id === 'sudden-endure')).toBe(true);

    const wary = play([
      'awake-quick',
      'system-watch',
      'ability-resilience',
      'seek-location',
      'sudden-endure',
      'meet-distance',
      'keep-resource',
    ]);

    expect(wary.currentEventId).toBe('dusk-wary');
    expect(wary.flags['moral.kept']).toBe(true);

    const alone = applyChoice(wary, firstDayCampaign, 'walk-away', now);
    expect(alone.currentEventId).toBe('night-alone');
    expect(alone.flags['camp.alone']).toBe(true);
  });

  it('oferece a escolha de empatia somente com Voz Calma', () => {
    const withEmpathy = play(['awake-calm', 'system-touch', 'ability-empathy', 'seek-shelter', 'sudden-dodge']);
    const withoutEmpathy = play(['awake-calm', 'system-touch', 'ability-perception', 'seek-shelter', 'alert-leave']);

    expect(withEmpathy.currentEventId).toBe('survivor-meet');
    expect(getAvailableChoices(withEmpathy, firstDayCampaign).some((choice) => choice.id === 'meet-calm')).toBe(true);
    expect(getAvailableChoices(withoutEmpathy, firstDayCampaign).some((choice) => choice.id === 'meet-calm')).toBe(false);
  });
});
