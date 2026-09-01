import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { FIRST_DAY_WORLD_TRIGGERS } from '../campaigns/first-day/world-triggers';
import {
  EngineError,
  applyChoice,
  bindSavedState,
  getAvailableChoices,
  startNarrativeSession,
  startGame,
} from '../core/engine';
import { SCHEMA_VERSION, inspectGameState } from '../core/state';
import { createMemoryPersistence, parseGameState, serializeGameState } from '../infrastructure/persistence';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction } from '../modules/sandbox-actions';
import {
  inspectWorldTriggerCatalog,
  worldTriggerConsumedFlag,
} from '../modules/world-events';
import { toAppScreen } from '../ui/routing';
import { WORLD_TRIGGER_ATTENTION, commitSandboxAction } from '../ui/sandbox';
import { asV1, asV2, now, playChoices, playFirstDay } from './helpers';

const context = createSandboxContext();
const catalog = FIRST_DAY_WORLD_TRIGGERS;
const consumedFlag = worldTriggerConsumedFlag('first-priority');

function exploringWith(choiceId: string) {
  return playFirstDay(['awake-calm', 'system-touch', choiceId]);
}

function commit(
  state: ReturnType<typeof playFirstDay>,
  action: Parameters<typeof commitSandboxAction>[1],
  persist?: (next: ReturnType<typeof playFirstDay>) => void,
) {
  return commitSandboxAction(state, action, context, {
    campaign: firstDayCampaign,
    catalog,
    persist: persist ?? (() => undefined),
  });
}

function openEncounter(state: ReturnType<typeof playFirstDay>) {
  return startNarrativeSession(state, firstDayCampaign, 'first-priority');
}

describe('catálogo de gatilhos de mundo', () => {
  it('aceita o catálogo válido da campanha', () => {
    const inspected = inspectWorldTriggerCatalog(catalog, {
      campaign: firstDayCampaign,
      exploration: context.exploration,
    });

    expect(inspected.ok).toBe(true);
    if (inspected.ok) {
      expect(inspected.value.definitions).toHaveLength(1);
      expect(inspected.value.byDiscoveryId.get('first-priority-event')?.eventId).toBe('first-priority');
    }
  });

  it('rejeita gatilho com descoberta ou evento inexistente', () => {
    const missingDiscovery = inspectWorldTriggerCatalog(
      [
        {
          id: 'broken-discovery',
          source: { type: 'discovery.revealed', discoveryId: 'nope' },
          campaignId: 'first-day',
          eventId: 'first-priority',
        },
      ],
      { campaign: firstDayCampaign, exploration: context.exploration },
    );
    const missingEvent = inspectWorldTriggerCatalog(
      [
        {
          id: 'broken-event',
          source: { type: 'discovery.revealed', discoveryId: 'first-priority-event' },
          campaignId: 'first-day',
          eventId: 'evento-fantasma',
        },
      ],
      { campaign: firstDayCampaign, exploration: context.exploration },
    );

    expect(missingDiscovery).toMatchObject({ ok: false, reason: expect.stringMatching(/descoberta nope/) });
    expect(missingEvent).toMatchObject({ ok: false, reason: expect.stringMatching(/evento-fantasma/) });
  });

  it('rejeita catálogo malformado, IDs duplicados e gatilhos ambíguos', () => {
    const contextValue = { campaign: firstDayCampaign, exploration: context.exploration };
    expect(inspectWorldTriggerCatalog(null, contextValue).ok).toBe(false);
    expect(
      inspectWorldTriggerCatalog(
        [{ id: '', source: { type: 'discovery.revealed', discoveryId: 'first-priority-event' }, campaignId: 'first-day', eventId: 'first-priority' }],
        contextValue,
      ).ok,
    ).toBe(false);
    expect(
      inspectWorldTriggerCatalog([...catalog, ...catalog], contextValue),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/duplicado/) });
    expect(
      inspectWorldTriggerCatalog(
        [
          catalog[0],
          {
            id: 'other',
            source: { type: 'discovery.revealed', discoveryId: 'first-priority-event' },
            campaignId: 'first-day',
            eventId: 'first-priority',
          },
        ],
        contextValue,
      ),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/ambíguos/) });
  });

  it('rejeita evento sem canStartSession como alvo', () => {
    const inspected = inspectWorldTriggerCatalog(
      [
        {
          id: 'awakening-trigger',
          source: { type: 'discovery.revealed', discoveryId: 'first-priority-event' },
          campaignId: 'first-day',
          eventId: 'awakening',
        },
      ],
      { campaign: firstDayCampaign, exploration: context.exploration },
    );

    expect(inspected.ok).toBe(false);
    if (!inspected.ok) {
      expect(inspected.reason).toMatch(/não pode iniciar uma sessão pelo mundo/);
    }
  });
});

describe('primeiro encontro acionado pelo mundo', () => {
  it('revela first-priority-event na primeira exploração', () => {
    const exploring = exploringWith('ability-perception');
    const result = executeSandboxAction(exploring, { type: 'exploration.explore' }, { context, now });
    const location = result.current.sandbox.exploration.locations[0];

    expect(location?.progress).toBe(10);
    expect(location?.revealedDiscoveryIds).toEqual(['awakening-site', 'first-priority-event']);
    expect(result.current.narrativeSession).toBeNull();
  });

  it('avança o tempo exatamente uma vez ao explorar e abrir o encontro', () => {
    const exploring = exploringWith('ability-perception');
    const worldBefore = { ...exploring.world };
    const attempt = commit(exploring, { type: 'exploration.explore' });

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) {
      throw new Error(attempt.error);
    }

    expect(attempt.result.timeCost).toEqual({ periods: 1 });
    expect(attempt.result.dayCycle.time.crossedPeriods).toHaveLength(1);
    expect(attempt.current.world).not.toEqual(worldBefore);
    expect(attempt.current.world).toEqual(attempt.result.current.world);
    expect(attempt.openedTrigger?.id).toBe('first-priority');
    expect(attempt.feedback).toContain(WORLD_TRIGGER_ATTENTION);
  });

  it('não avança tempo adicional ao abrir a sessão', () => {
    const exploring = exploringWith('ability-perception');
    const sandboxed = executeSandboxAction(exploring, { type: 'exploration.explore' }, { context, now }).current;
    const stamp = sandboxed.updatedAt;
    const opened = startNarrativeSession(sandboxed, firstDayCampaign, 'first-priority');

    expect(opened.world).toEqual(sandboxed.world);
    expect(opened.updatedAt).toBe(stamp);
    expect(opened.sandbox).toEqual(sandboxed.sandbox);
    expect(opened.inventory).toEqual(sandboxed.inventory);
    expect(opened.attributes).toEqual(sandboxed.attributes);
    expect(opened.history).toEqual(sandboxed.history);
  });

  it('persiste uma única vez o sandbox atualizado, a flag e a sessão', () => {
    const exploring = exploringWith('ability-perception');
    const persistence = createMemoryPersistence(undefined, context);
    let writes = 0;
    const attempt = commit(exploring, { type: 'exploration.explore' }, (next) => {
      writes += 1;
      persistence.save(next);
    });

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) {
      throw new Error(attempt.error);
    }

    const loaded = persistence.load();
    expect(writes).toBe(1);
    expect(loaded).toEqual({ status: 'ok', state: attempt.current });
    if (loaded.status !== 'ok') {
      throw new Error('save inválido');
    }

    expect(loaded.state.sandbox).toEqual(attempt.result.current.sandbox);
    expect(loaded.state.flags[consumedFlag]).toBe(true);
    expect(loaded.state.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'first-priority' });
    expect(attempt.current).not.toBe(attempt.result.current);
    expect(toAppScreen(loaded.state)).toBe('game');
  });

  it('salvar e carregar durante first-priority preserva o evento atual', () => {
    const exploring = exploringWith('ability-perception');
    const opened = commit(exploring, { type: 'exploration.explore' });
    expect(opened.ok).toBe(true);
    if (!opened.ok) {
      throw new Error(opened.error);
    }

    const roundtrip = parseGameState(serializeGameState(opened.current, context), context);
    expect(roundtrip).toEqual({ status: 'ok', state: opened.current });
    if (roundtrip.status !== 'ok') {
      throw new Error('save inválido');
    }

    const bound = bindSavedState(roundtrip.state, firstDayCampaign);
    expect(bound.ok).toBe(true);
    if (!bound.ok) {
      throw new Error(bound.reason);
    }

    expect(bound.state.narrativeSession?.eventId).toBe('first-priority');
    expect(toAppScreen(bound.state)).toBe('game');
  });

  it.each([
    [
      'ability-perception',
      ['seek-water', 'alert-hide', 'meet-open', 'share-fruit', 'accept-shelter', 'together-summary'],
    ],
    [
      'ability-resilience',
      ['seek-location', 'sudden-endure', 'meet-open', 'share-fruit', 'accept-shelter', 'together-summary'],
    ],
    [
      'ability-empathy',
      ['seek-shelter', 'sudden-dodge', 'meet-calm', 'share-fruit', 'accept-shelter', 'together-summary'],
    ],
  ] as const)('a capacidade %s percorre o encontro sem ficar sem escolhas', (ability, choices) => {
    let current = openEncounter(exploringWith(ability));
    const visited = ['first-priority'];

    for (const choiceId of choices.slice(0, -1)) {
      const available = getAvailableChoices(current, firstDayCampaign);
      expect(available.length).toBeGreaterThan(0);
      expect(available.some((choice) => choice.id === choiceId)).toBe(true);
      current = applyChoice(current, firstDayCampaign, choiceId, now);
      if (current.narrativeSession) {
        visited.push(current.narrativeSession.eventId);
      }
    }

    const last = choices[choices.length - 1];
    expect(getAvailableChoices(current, firstDayCampaign).some((choice) => choice.id === last)).toBe(true);
    const returned = applyChoice(current, firstDayCampaign, last, now);

    expect(visited).toEqual(expect.arrayContaining(['first-priority', 'survivor-meet']));
    expect(returned.status).toBe('playing');
    expect(returned.narrativeSession).toBeNull();
  });

  it('night-together retorna à exploração preservando o sandbox', () => {
    const exploring = exploringWith('ability-perception');
    const before = commit(exploring, { type: 'exploration.explore' });
    expect(before.ok).toBe(true);
    if (!before.ok) {
      throw new Error(before.error);
    }

    const returned = playChoices(
      before.current,
      ['seek-water', 'alert-hide', 'meet-open', 'share-fruit', 'accept-shelter', 'together-summary'],
    );

    expect(returned.status).toBe('playing');
    expect(returned.narrativeSession).toBeNull();
    expect(returned.sandbox.navigation.currentLocationId).toBe(
      before.current.sandbox.navigation.currentLocationId,
    );
    expect(returned.sandbox.exploration).toEqual(before.current.sandbox.exploration);
    expect(returned.sandbox.resources).toEqual(before.current.sandbox.resources);
    expect(returned.sandbox.crafting).toEqual(before.current.sandbox.crafting);
    expect(returned.flags[consumedFlag]).toBe(true);
    expect(returned.flags['camp.together']).toBe(true);
    expect(returned.world.period).toBe('noite');
    expect(toAppScreen(returned)).toBe('exploration');
  });

  it('night-alone retorna à exploração', () => {
    const exploring = exploringWith('ability-resilience');
    const opened = openEncounter(exploring);
    const returned = playChoices(opened, [
      'seek-location',
      'sudden-endure',
      'meet-distance',
      'keep-resource',
      'walk-away',
      'alone-summary',
    ]);

    expect(returned.status).toBe('playing');
    expect(returned.narrativeSession).toBeNull();
    expect(returned.flags['camp.alone']).toBe(true);
    expect(returned.sandbox.navigation.currentLocationId).toBe('awakening-clearing');
  });

  it('o gatilho não dispara novamente depois de consumido', () => {
    const exploring = exploringWith('ability-perception');
    const first = commit(exploring, { type: 'exploration.explore' });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      throw new Error(first.error);
    }

    const returned = playChoices(
      first.current,
      ['seek-water', 'alert-hide', 'meet-open', 'share-fruit', 'accept-shelter', 'together-summary'],
    );
    const second = commit(returned, { type: 'exploration.explore' });

    expect(second.ok).toBe(true);
    if (!second.ok) {
      throw new Error(second.error);
    }

    expect(second.openedTrigger).toBeUndefined();
    expect(second.current.narrativeSession).toBeNull();
    expect(second.current.flags[consumedFlag]).toBe(true);
    expect(toAppScreen(second.current)).toBe('exploration');
  });

  it('um save da Fatia 7.4 com descoberta revelada e sem flag dispara na próxima ação válida', () => {
    const exploring = exploringWith('ability-perception');
    const revealed = executeSandboxAction(exploring, { type: 'exploration.explore' }, { context, now }).current;
    expect(revealed.flags[consumedFlag]).toBeUndefined();
    expect(revealed.narrativeSession).toBeNull();

    const persistence = createMemoryPersistence(undefined, context);
    persistence.save(revealed);
    const loaded = persistence.load();
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') {
      throw new Error('save inválido');
    }

    expect(loaded.state.narrativeSession).toBeNull();
    const attempt = commit(loaded.state, { type: 'exploration.explore' }, (next) => persistence.save(next));
    expect(attempt.ok).toBe(true);
    if (!attempt.ok) {
      throw new Error(attempt.error);
    }

    expect(attempt.openedTrigger?.eventId).toBe('first-priority');
    expect(attempt.current.flags[consumedFlag]).toBe(true);
    expect(toAppScreen(attempt.current)).toBe('game');
  });

  it('ação inválida não consome gatilho nem persiste estado parcial', () => {
    const exploring = exploringWith('ability-perception');
    const persistence = createMemoryPersistence(undefined, context);
    persistence.save(exploring);
    const before = persistence.load();
    const attempt = commit(
      exploring,
      { type: 'navigation.move', locationId: 'hidden-cave' },
      (next) => persistence.save(next),
    );

    expect(attempt.ok).toBe(false);
    expect(persistence.load()).toEqual(before);
    expect(exploring.flags[consumedFlag]).toBeUndefined();
    expect(exploring.narrativeSession).toBeNull();
  });

  it('saves completed antigos continuam abrindo o resumo', () => {
    const exploring = exploringWith('ability-perception');
    const completed = {
      ...exploring,
      status: 'completed' as const,
      narrativeSession: null,
    };

    expect(inspectGameState(completed).ok).toBe(true);
    expect(bindSavedState(completed, firstDayCampaign).ok).toBe(true);
    expect(toAppScreen(completed)).toBe('summary');
    expect(parseGameState(serializeGameState(completed))).toEqual({ status: 'ok', state: completed });
  });

  it('migrações v1/v2 e schema 3 continuam válidas', () => {
    const playing = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
    const v1 = parseGameState(JSON.stringify(asV1(playing)));
    const v2 = parseGameState(JSON.stringify(asV2(playing)));
    const v3 = parseGameState(serializeGameState(playing));

    expect(playing.schemaVersion).toBe(SCHEMA_VERSION);
    expect(v1.status).toBe('ok');
    expect(v2.status).toBe('ok');
    expect(v3).toEqual({ status: 'ok', state: playing });
    if (v1.status === 'ok') {
      expect(v1.state.schemaVersion).toBe(3);
      expect(v1.state.narrativeSession?.eventId).toBe('awakening');
    }
  });
});

describe('startNarrativeSession', () => {
  it('rejeita partida concluída, sessão ativa e evento sem canStartSession', () => {
    const exploring = exploringWith('ability-perception');
    const completed = { ...exploring, status: 'completed' as const };
    const intro = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);

    expect(() => startNarrativeSession(completed, firstDayCampaign, 'first-priority')).toThrow(EngineError);
    expect(() => startNarrativeSession(intro, firstDayCampaign, 'first-priority')).toThrow(/sessão narrativa ativa/);
    expect(() => startNarrativeSession(exploring, firstDayCampaign, 'awakening')).toThrow(
      /não pode iniciar uma sessão pelo mundo/,
    );
    expect(exploring.narrativeSession).toBeNull();
  });
});
