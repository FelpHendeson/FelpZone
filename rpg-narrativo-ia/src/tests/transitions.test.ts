import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice, getAvailableChoices, startGame, validateCampaign } from '../core/engine';
import { continueAfterIntro, now, playChoices, playFirstDay, reopenNarrativeSession } from './helpers';

describe('transições', () => {
  it('mantém a campanha do primeiro dia internamente consistente', () => {
    expect(validateCampaign(firstDayCampaign)).toEqual([]);
  });

  it('devolve o jogador à exploração depois da capacidade inicial', () => {
    const exploring = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);

    expect(exploring.status).toBe('playing');
    expect(exploring.narrativeSession).toBeNull();
    expect(exploring.progression.abilityIds).toEqual(['olhar-atento']);
    expect(exploring.sandbox.navigation.currentLocationId).toBe('awakening-clearing');
  });

  it('segue o caminho cooperativo quando a sessão posterior é reaberta', () => {
    const afterAbility = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
    const afterSeek = playChoices(reopenNarrativeSession(afterAbility, 'first-priority'), ['seek-water']);
    expect(afterSeek.narrativeSession?.eventId).toBe('danger-alert');
    expect(afterSeek.inventory.some((item) => item.itemId === 'agua-limpa')).toBe(true);

    const afterShare = continueAfterIntro(
      ['awake-calm', 'system-touch', 'ability-perception'],
      ['seek-water', 'alert-hide', 'meet-open', 'share-fruit'],
    );
    expect(afterShare.narrativeSession?.eventId).toBe('dusk-trusted');
    expect(afterShare.flags['moral.shared']).toBe(true);

    const ended = continueAfterIntro(
      ['awake-calm', 'system-touch', 'ability-perception'],
      ['seek-water', 'alert-hide', 'meet-open', 'share-fruit', 'accept-shelter', 'together-summary'],
    );

    expect(ended.narrativeSession).toBeNull();
    expect(ended.status).toBe('completed');
    expect(ended.flags['camp.together']).toBe(true);
    expect(ended.history.some((entry) => entry.choiceId === 'share-fruit' && entry.notable)).toBe(true);
  });

  it('muda o perigo e o entardecer conforme escolhas anteriores', () => {
    const sudden = continueAfterIntro(
      ['awake-quick', 'system-watch', 'ability-resilience'],
      ['seek-location'],
    );
    expect(sudden.narrativeSession?.eventId).toBe('danger-sudden');
    expect(getAvailableChoices(sudden, firstDayCampaign).some((choice) => choice.id === 'sudden-endure')).toBe(true);

    const wary = continueAfterIntro(
      ['awake-quick', 'system-watch', 'ability-resilience'],
      ['seek-location', 'sudden-endure', 'meet-distance', 'keep-resource'],
    );

    expect(wary.narrativeSession?.eventId).toBe('dusk-wary');
    expect(wary.flags['moral.kept']).toBe(true);

    const alone = applyChoice(wary, firstDayCampaign, 'walk-away', now);
    expect(alone.narrativeSession?.eventId).toBe('night-alone');
    expect(alone.flags['camp.alone']).toBe(true);
  });

  it('oferece a escolha de empatia somente com Voz Calma', () => {
    const withEmpathy = continueAfterIntro(
      ['awake-calm', 'system-touch', 'ability-empathy'],
      ['seek-shelter', 'sudden-dodge'],
    );
    const withoutEmpathy = continueAfterIntro(
      ['awake-calm', 'system-touch', 'ability-perception'],
      ['seek-shelter', 'alert-leave'],
    );

    expect(withEmpathy.narrativeSession?.eventId).toBe('survivor-meet');
    expect(getAvailableChoices(withEmpathy, firstDayCampaign).some((choice) => choice.id === 'meet-calm')).toBe(true);
    expect(getAvailableChoices(withoutEmpathy, firstDayCampaign).some((choice) => choice.id === 'meet-calm')).toBe(false);
  });

  it('preserva o campaignId da sessão nas transições event e firstMatch', () => {
    const started = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
    const nextEvent = applyChoice(started, firstDayCampaign, 'awake-calm', now);
    expect(nextEvent.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'system-awakens' });

    const afterAbility = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
    const firstMatch = playChoices(reopenNarrativeSession(afterAbility, 'first-priority'), ['seek-water']);
    expect(firstMatch.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'danger-alert' });
  });
});
