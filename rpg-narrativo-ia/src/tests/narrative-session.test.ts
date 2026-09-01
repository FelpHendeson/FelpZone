import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import {
  ABILITY_EMPATHY,
  ABILITY_PERCEPTION,
  ABILITY_RESILIENCE,
  FLAG_ABILITY_EMPATHY,
  FLAG_ABILITY_PERCEPTION,
  FLAG_ABILITY_RESILIENCE,
} from '../campaigns/first-day/ids';
import {
  EngineError,
  applyChoice,
  bindSavedState,
  getAvailableChoices,
  getCurrentEvent,
  resolveTransition,
  startGame,
  validateCampaign,
  walkCampaignTrajectories,
} from '../core/engine';
import {
  SCHEMA_VERSION,
  inspectGameState,
  type GameState,
} from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { DEFAULT_STARTING_LOCATION_ID } from '../modules/navigation';
import { asV1, asV2, freshState, now, playFirstDay, reopenNarrativeSession, stubCampaign } from './helpers';
import { EXPLORATION_INTRO, EXPLORATION_SANDBOX_ACTIONS } from '../ui/screens/exploration-copy';
import { hasActiveNarrativeSession, resolvePlayScreen, toAppScreen } from '../ui/routing';

function chooseAbility(choiceId: string): GameState {
  return playFirstDay(['awake-calm', 'system-touch', choiceId]);
}

describe('sessão narrativa e schema 3', () => {
  it('inicia uma nova partida no schema 3 com sessão em awakening', () => {
    const state = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
    const raw = JSON.parse(serializeGameState(state)) as Record<string, unknown>;

    expect(state.schemaVersion).toBe(3);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'awakening' });
    expect(raw).not.toHaveProperty('currentEventId');
    expect(raw).toHaveProperty('narrativeSession');
    expect(parseGameState(serializeGameState(state))).toEqual({ status: 'ok', state });
  });

  it('rejeita schema 3 sem sessão, com sessão vazia ou com contrato antigo', () => {
    const missing = serializedPlaying();
    delete missing.narrativeSession;
    expect(parseGameState(JSON.stringify(missing)).status).toBe('corrupt');

    expect(
      parseGameState(
        JSON.stringify({
          ...serializedPlaying(),
          narrativeSession: { campaignId: '', eventId: 'awakening' },
        }),
      ).status,
    ).toBe('corrupt');

    expect(
      parseGameState(
        JSON.stringify({
          ...serializedPlaying(),
          narrativeSession: { campaignId: 'first-day', eventId: '' },
        }),
      ).status,
    ).toBe('corrupt');

    const withLegacy = serializedPlaying();
    withLegacy.currentEventId = 'awakening';
    expect(parseGameState(JSON.stringify(withLegacy)).status).toBe('corrupt');

    const completedActive = serializedPlaying();
    completedActive.status = 'completed';
    expect(parseGameState(JSON.stringify(completedActive)).status).toBe('corrupt');
  });

  it('migra v1 e v2 sem gameplay, sem mutar o save antigo e sem avançar o tempo', () => {
    const current = {
      ...freshState(),
      inventory: [{ itemId: 'agua-limpa', quantity: 1 }],
      flags: { ready: true },
      world: { day: 2, period: 'tarde' as const },
      updatedAt: '2026-08-31T12:00:00.000Z',
    };
    const v1 = Object.freeze(structuredClone(asV1(current)));
    const v1Snapshot = structuredClone(v1);
    const fromV1 = parseGameState(JSON.stringify(v1));
    expect(fromV1.status).toBe('ok');
    if (fromV1.status === 'ok') {
      expect(fromV1.state.schemaVersion).toBe(3);
      expect(fromV1.state.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'awakening' });
      expect(fromV1.state.sandbox).toEqual(freshState().sandbox);
      expect(fromV1.state.inventory).toEqual([{ itemId: 'agua-limpa', quantity: 1 }]);
      expect(fromV1.state.flags).toEqual({ ready: true });
      expect(fromV1.state.world).toEqual({ day: 2, period: 'tarde' });
      expect(fromV1.state.updatedAt).toBe('2026-08-31T12:00:00.000Z');
    }
    expect(v1).toEqual(v1Snapshot);

    const v2 = Object.freeze(structuredClone(asV2(current)));
    const v2Snapshot = structuredClone(v2);
    const fromV2 = parseGameState(JSON.stringify(v2));
    expect(fromV2.status).toBe('ok');
    if (fromV2.status === 'ok') {
      expect(fromV2.state.schemaVersion).toBe(3);
      expect(fromV2.state.narrativeSession?.eventId).toBe('awakening');
      expect(fromV2.state.sandbox).toEqual(current.sandbox);
      expect(fromV2.state.updatedAt).toBe('2026-08-31T12:00:00.000Z');
    }
    expect(v2).toEqual(v2Snapshot);
    expect(parseGameState(JSON.stringify({ schemaVersion: 99 })).status).toBe('incompatible');
  });
});

describe('motor com sessão narrativa', () => {
  it('consulta, rejeita exploração e preserva imutabilidade', () => {
    const started = freshState();
    const snapshot = structuredClone(started);
    expect(getCurrentEvent(started, firstDayCampaign).id).toBe('awakening');

    const exploring = chooseAbility('ability-perception');
    const exploringSnapshot = structuredClone(exploring);
    expect(() => getCurrentEvent(exploring, firstDayCampaign)).toThrow(EngineError);
    expect(() => getCurrentEvent(exploring, firstDayCampaign)).toThrow(/sessão narrativa ativa/);
    expect(getAvailableChoices(exploring, firstDayCampaign)).toEqual([]);
    expect(() => applyChoice(exploring, firstDayCampaign, 'seek-water', now)).toThrow(/sessão narrativa ativa/);
    expect(exploring).toEqual(exploringSnapshot);

    const other = stubCampaign({ id: 'outra' });
    expect(() => applyChoice(started, other, 'awake-calm', now)).toThrow(/campanha da sessão/);
    expect(bindSavedState(started, other).ok).toBe(false);
    expect(bindSavedState(exploring, firstDayCampaign).ok).toBe(true);
    expect(bindSavedState(started, firstDayCampaign).ok).toBe(true);
    expect(bindSavedState(reopenNarrativeSession(started, 'missing'), firstDayCampaign).ok).toBe(false);
    expect(started).toEqual(snapshot);
  });

  it('atualiza somente o eventId em event e firstMatch, e limpa a sessão em complete', () => {
    const started = freshState();
    const nextEvent = resolveTransition(started, firstDayCampaign, { type: 'event', eventId: 'system-awakens' });
    expect(nextEvent.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'system-awakens' });
    expect(started.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'awakening' });

    const afterAbility = chooseAbility('ability-perception');
    const inPriority = reopenNarrativeSession(afterAbility, 'first-priority');
    const matched = resolveTransition(inPriority, firstDayCampaign, {
      type: 'firstMatch',
      eventIds: ['danger-alert', 'danger-sudden'],
    });
    expect(matched.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'danger-alert' });

    const completed = resolveTransition(started, firstDayCampaign, { type: 'complete' });
    expect(completed.status).toBe('completed');
    expect(completed.narrativeSession).toBeNull();
  });

  it('retorna à exploração preservando efeitos e histórico', () => {
    const before = playFirstDay(['awake-calm', 'system-touch']);
    const snapshot = structuredClone(before);
    const exploring = applyChoice(before, firstDayCampaign, 'ability-perception', now);

    expect(exploring.status).toBe('playing');
    expect(exploring.narrativeSession).toBeNull();
    expect(exploring.progression.abilityIds).toEqual([ABILITY_PERCEPTION]);
    expect(exploring.flags[FLAG_ABILITY_PERCEPTION]).toBe(true);
    expect(exploring.attributes.cautela).toBe(before.attributes.cautela + 15);
    expect(exploring.history.at(-1)?.choiceId).toBe('ability-perception');
    expect(exploring.updatedAt).toBe(now());
    expect(exploring.sandbox).toEqual(before.sandbox);
    expect(before).toEqual(snapshot);
  });
});

describe('saída da introdução', () => {
  it.each([
    ['ability-perception', ABILITY_PERCEPTION, FLAG_ABILITY_PERCEPTION, { cautela: 15 }],
    ['ability-resilience', ABILITY_RESILIENCE, FLAG_ABILITY_RESILIENCE, { saude: 15, energia: 10 }],
    ['ability-empathy', ABILITY_EMPATHY, FLAG_ABILITY_EMPATHY, { humanidade: 15 }],
  ] as const)('escolhe %s e entra na exploração livre', (choiceId, abilityId, flag, deltas) => {
    const before = playFirstDay(['awake-calm', 'system-touch']);
    const exploring = applyChoice(before, firstDayCampaign, choiceId, now);

    expect(exploring.status).toBe('playing');
    expect(exploring.narrativeSession).toBeNull();
    expect(exploring.progression.abilityIds).toEqual([abilityId]);
    expect(exploring.flags[flag]).toBe(true);
    expect(exploring.sandbox.navigation.currentLocationId).toBe(DEFAULT_STARTING_LOCATION_ID);
    for (const [attribute, amount] of Object.entries(deltas)) {
      expect(exploring.attributes[attribute as keyof typeof exploring.attributes]).toBe(
        before.attributes[attribute as keyof typeof before.attributes] + amount,
      );
    }

    const inspected = inspectGameState(exploring);
    expect(inspected.ok).toBe(true);
    const result = executeSandboxAction(exploring, { type: 'exploration.explore' }, { now });
    expect(result.current.sandbox.exploration.locations[0]?.progress).toBeGreaterThan(0);
    expect(result.current.sandbox.exploration.locations[0]?.explorationCount).toBe(1);
    expect(result.timeCost).toEqual({ periods: 1 });
    expect(result.current.world.period).not.toBe(exploring.world.period);
    expect(result.current.progression.abilityIds).toEqual([abilityId]);
    expect(result.current.flags[flag]).toBe(true);
    expect(result.current.narrativeSession).toBeNull();
    expect(result.current.status).toBe('playing');
  });
});

describe('campanha e walker depois da introdução', () => {
  it('não trata o retorno à exploração como dead end e preserva eventos posteriores', () => {
    const walk = walkCampaignTrajectories(firstDayCampaign);
    expect(walk.returnedToExplorationPaths).toBeGreaterThan(0);
    expect(walk.deadEnds).toEqual([]);
    expect(walk.reachedEventIds).not.toContain('first-priority');
    expect(validateCampaign(firstDayCampaign)).toEqual([]);
    expect(firstDayCampaign.events.some((event) => event.id === 'first-priority' && event.canStartSession)).toBe(true);
    expect(firstDayCampaign.events.map((event) => event.id)).toEqual(
      expect.arrayContaining([
        'first-priority',
        'danger-alert',
        'survivor-meet',
        'moral-choice',
        'night-together',
        'night-alone',
      ]),
    );
  });
});

describe('roteamento e tela mínima', () => {
  it('deriva a tela do estado e não chama o orquestrador na superfície mínima', () => {
    const narrative = freshState();
    const exploring = chooseAbility('ability-perception');
    const completed = {
      ...exploring,
      status: 'completed' as const,
      narrativeSession: null,
    };

    expect(resolvePlayScreen(narrative)).toBe('narrative');
    expect(toAppScreen(narrative)).toBe('game');
    expect(resolvePlayScreen(exploring)).toBe('exploration');
    expect(toAppScreen(exploring)).toBe('exploration');
    expect(resolvePlayScreen(completed)).toBe('summary');
    expect(toAppScreen(completed)).toBe('summary');
    expect(EXPLORATION_INTRO).toMatch(/Clareira do Despertar/);
    expect(EXPLORATION_SANDBOX_ACTIONS).toEqual([]);
    expect(hasActiveNarrativeSession(narrative)).toBe(true);
    expect(hasActiveNarrativeSession(exploring)).toBe(false);
    expect(hasActiveNarrativeSession(completed)).toBe(false);
  });
});

function serializedPlaying(): Record<string, unknown> {
  return JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
}
