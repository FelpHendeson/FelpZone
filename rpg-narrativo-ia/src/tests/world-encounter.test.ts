import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { FIRST_DAY_WORLD_TRIGGERS, FIRST_PRIORITY_WORLD_TRIGGER } from '../campaigns/first-day/world-triggers';
import { EngineError, bindSavedState, startNarrativeSession, startGame } from '../core/engine';
import { SCHEMA_VERSION, inspectGameState } from '../core/state';
import { createMemoryPersistence, parseGameState, serializeGameState } from '../infrastructure/persistence';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction } from '../modules/sandbox-actions';
import {
  consumeWorldTriggersMatchingNarrative,
  inspectWorldTriggerCatalog,
  worldTriggerConsumedFlag,
} from '../modules/world-events';
import { toAppScreen } from '../ui/routing';
import { WORLD_TRIGGER_ATTENTION, commitSandboxAction } from '../ui/sandbox';
import { asV1, asV2, now, playFirstDay } from './helpers';

const context = createSandboxContext();
const catalog = FIRST_DAY_WORLD_TRIGGERS;
const mechanismCatalog = [FIRST_PRIORITY_WORLD_TRIGGER];
const consumedFlag = worldTriggerConsumedFlag('first-priority');

function exploring() {
  return playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
}

describe('catálogo de gatilhos de mundo', () => {
  it('mantém o marco energético ativo e o first-priority como mecanismo genérico compatível', () => {
    const active = inspectWorldTriggerCatalog(catalog, {
      campaign: firstDayCampaign,
      exploration: context.exploration,
      skills: context.skills!,
    });
    const mechanism = inspectWorldTriggerCatalog(mechanismCatalog, {
      campaign: firstDayCampaign,
      exploration: context.exploration,
      skills: context.skills!,
    });

    expect(active.ok).toBe(true);
    if (active.ok) {
      expect(active.value.definitions).toHaveLength(4);
      expect(active.value.definitions[0]).toMatchObject({
        id: 'first-numen-practice',
        source: {
          type: 'system.skill.proficiency.min',
          skillId: 'sharpened-senses',
          amount: 1,
        },
      });
      expect(active.value.definitions[1]).toMatchObject({
        id: 'first-night',
        source: { type: 'world.time.reached', day: 1, period: 'noite' },
        eventId: 'first-night',
      });
      expect(active.value.definitions[2]).toMatchObject({
        id: 'day-two-start',
        source: { type: 'world.day.min', day: 2 },
        eventId: 'day-two-awakening',
      });
      expect(active.value.definitions[3]).toMatchObject({
        id: 'day-two-human-tracks',
        source: { type: 'discovery.revealed', discoveryId: 'multiple-human-tracks' },
        eventId: 'day-two-human-tracks',
      });
    }

    expect(mechanism.ok).toBe(true);
    if (mechanism.ok) {
      expect(mechanism.value.byDiscoveryId.get('first-priority-event')?.eventId).toBe('first-priority');
    }
  });

  it('rejeita referências inexistentes, ID duplicado e alvo não iniciável', () => {
    const ctx = { campaign: firstDayCampaign, exploration: context.exploration, skills: context.skills! };

    expect(
      inspectWorldTriggerCatalog(
        [{
          id: 'broken-discovery',
          source: { type: 'discovery.revealed', discoveryId: 'nope' },
          campaignId: 'first-day',
          eventId: 'first-priority',
        }],
        ctx,
      ),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/descoberta nope/) });

    expect(
      inspectWorldTriggerCatalog(
        [{
          id: 'broken-event',
          source: { type: 'discovery.revealed', discoveryId: 'first-priority-event' },
          campaignId: 'first-day',
          eventId: 'evento-fantasma',
        }],
        ctx,
      ),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/evento-fantasma/) });

    expect(inspectWorldTriggerCatalog([...mechanismCatalog, ...mechanismCatalog], ctx)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/duplicado/),
    });

    expect(
      inspectWorldTriggerCatalog(
        [{
          id: 'awakening-trigger',
          source: { type: 'discovery.revealed', discoveryId: 'first-priority-event' },
          campaignId: 'first-day',
          eventId: 'awakening',
        }],
        ctx,
      ),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/não pode iniciar uma sessão pelo mundo/) });
  });
});

describe('gatilhos de mundo no sandbox', () => {
  it('a primeira exploração registra a leitura da clareira sem revelar Mira ou abrir narrativa', () => {
    const result = executeSandboxAction(exploring(), { type: 'exploration.explore' }, { context, now });
    const location = result.current.sandbox.exploration.locations[0];

    expect(location?.progress).toBe(10);
    expect(location?.revealedDiscoveryIds).toEqual([
      'awakening-site',
      'first-priority-event',
      'human-footprints',
      'human-cut-branch',
      'path-spring-lake',
    ]);
    expect(result.current.sandbox.presences.discoveredPresenceIds).toEqual([]);
    expect(result.current.narrativeSession).toBeNull();
  });

  it('o catálogo ativo não interrompe a exploração e persiste somente o estado final', () => {
    const state = exploring();
    const persistence = createMemoryPersistence(undefined, context);
    let writes = 0;

    const attempt = commitSandboxAction(state, { type: 'exploration.explore' }, context, {
      campaign: firstDayCampaign,
      catalog,
      persist: (next) => {
        writes += 1;
        persistence.save(next);
      },
    });

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) {
      throw new Error(attempt.error);
    }

    expect(writes).toBe(1);
    expect(attempt.openedTrigger).toBeUndefined();
    expect(attempt.current.narrativeSession).toBeNull();
    expect(attempt.current.sandbox.presences.discoveredPresenceIds).toEqual([]);
    expect(attempt.feedback).not.toContain(WORLD_TRIGGER_ATTENTION);
    expect(persistence.load()).toEqual({ status: 'ok', state: attempt.current });
  });

  it('o mecanismo legado pode abrir first-priority explicitamente sem custo temporal extra', () => {
    const state = exploring();
    const attempt = commitSandboxAction(state, { type: 'exploration.explore' }, context, {
      campaign: firstDayCampaign,
      catalog: mechanismCatalog,
      persist: () => undefined,
    });

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) {
      throw new Error(attempt.error);
    }

    expect(attempt.result.timeCost).toEqual({ periods: 1 });
    expect(attempt.openedTrigger?.id).toBe('first-priority');
    expect(attempt.current.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'first-priority' });
    expect(attempt.current.flags[consumedFlag]).toBe(true);
    expect(attempt.current.world).toEqual(attempt.result.current.world);
    expect(attempt.current.sandbox.presences.discoveredPresenceIds).toEqual([]);
  });

  it('uma sessão já aberta pelo mesmo evento consome o gatilho de forma idempotente', () => {
    const explored = executeSandboxAction(exploring(), { type: 'exploration.explore' }, { context, now }).current;
    const opened = startNarrativeSession(explored, firstDayCampaign, 'first-priority');
    const inspected = inspectWorldTriggerCatalog(mechanismCatalog, {
      campaign: firstDayCampaign,
      exploration: context.exploration,
      skills: context.skills!,
    });
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      throw new Error(inspected.reason);
    }

    const consumed = consumeWorldTriggersMatchingNarrative(inspected.value, opened);

    expect(opened.flags[consumedFlag]).toBeUndefined();
    expect(consumed.flags[consumedFlag]).toBe(true);
    expect(consumed.narrativeSession).toEqual(opened.narrativeSession);
    expect(consumeWorldTriggersMatchingNarrative(inspected.value, consumed)).toBe(consumed);
  });

  it('ação inválida não consome gatilho nem persiste estado parcial', () => {
    const state = exploring();
    const persistence = createMemoryPersistence(serializeGameState(state, context), context);
    const before = persistence.load();

    const attempt = commitSandboxAction(
      state,
      { type: 'navigation.move', locationId: 'hidden-cave' },
      context,
      {
        campaign: firstDayCampaign,
        catalog,
        persist: (next) => persistence.save(next),
      },
    );

    expect(attempt.ok).toBe(false);
    expect(persistence.load()).toEqual(before);
    expect(state.flags[consumedFlag]).toBeUndefined();
    expect(state.narrativeSession).toBeNull();
  });
});

describe('compatibilidade de sessão e save', () => {
  it('saves completed antigos continuam abrindo o resumo', () => {
    const state = exploring();
    const completed = {
      ...state,
      status: 'completed' as const,
      narrativeSession: null,
    };

    expect(inspectGameState(completed).ok).toBe(true);
    expect(bindSavedState(completed, firstDayCampaign).ok).toBe(true);
    expect(toAppScreen(completed)).toBe('summary');
    expect(parseGameState(serializeGameState(completed))).toEqual({ status: 'ok', state: completed });
  });

  it('migrações v1/v2 e schema atual continuam válidas', () => {
    const playing = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
    const v1 = parseGameState(JSON.stringify(asV1(playing)));
    const v2 = parseGameState(JSON.stringify(asV2(playing)));
    const current = parseGameState(serializeGameState(playing));

    expect(playing.schemaVersion).toBe(SCHEMA_VERSION);
    expect(v1.status).toBe('ok');
    expect(v2.status).toBe('ok');
    expect(current).toEqual({ status: 'ok', state: playing });
  });

  it('startNarrativeSession rejeita partida concluída, sessão ativa e evento não iniciável', () => {
    const state = exploring();
    const completed = { ...state, status: 'completed' as const };
    const intro = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);

    expect(() => startNarrativeSession(completed, firstDayCampaign, 'first-priority')).toThrow(EngineError);
    expect(() => startNarrativeSession(intro, firstDayCampaign, 'first-priority')).toThrow(/sessão narrativa ativa/);
    expect(() => startNarrativeSession(state, firstDayCampaign, 'awakening')).toThrow(
      /não pode iniciar uma sessão pelo mundo/,
    );
  });
});
