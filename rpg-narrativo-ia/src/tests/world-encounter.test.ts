import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { FIRST_DAY_WORLD_TRIGGERS, FIRST_PRIORITY_WORLD_TRIGGER } from '../campaigns/first-day/world-triggers';
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
  consumeWorldTriggersMatchingNarrative,
  inspectWorldTriggerCatalog,
  worldTriggerConsumedFlag,
} from '../modules/world-events';
import { toAppScreen } from '../ui/routing';
import { WORLD_TRIGGER_ATTENTION, commitSandboxAction } from '../ui/sandbox';
import { asV1, asV2, now, playChoices, playFirstDay } from './helpers';

const context = createSandboxContext();
const catalog = FIRST_DAY_WORLD_TRIGGERS;
const mechanismCatalog = [FIRST_PRIORITY_WORLD_TRIGGER];
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
  it('aceita o catálogo vazio da campanha e preserva o mecanismo genérico', () => {
    const empty = inspectWorldTriggerCatalog(catalog, {
      campaign: firstDayCampaign,
      exploration: context.exploration,
      skills: context.skills!,
    });
    const mechanism = inspectWorldTriggerCatalog(mechanismCatalog, {
      campaign: firstDayCampaign,
      exploration: context.exploration,
      skills: context.skills!,
    });

    expect(empty.ok).toBe(true);
    if (empty.ok) {
      expect(empty.value.definitions).toHaveLength(0);
    }

    expect(mechanism.ok).toBe(true);
    if (mechanism.ok) {
      expect(mechanism.value.definitions).toHaveLength(1);
      expect(mechanism.value.byDiscoveryId.get('first-priority-event')?.eventId).toBe('first-priority');
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
      { campaign: firstDayCampaign, exploration: context.exploration, skills: context.skills! },
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
      { campaign: firstDayCampaign, exploration: context.exploration, skills: context.skills! },
    );

    expect(missingDiscovery).toMatchObject({ ok: false, reason: expect.stringMatching(/descoberta nope/) });
    expect(missingEvent).toMatchObject({ ok: false, reason: expect.stringMatching(/evento-fantasma/) });
  });

  it('rejeita catálogo malformado, IDs duplicados e gatilhos ambíguos', () => {
    const contextValue = { campaign: firstDayCampaign, exploration: context.exploration, skills: context.skills! };
    expect(inspectWorldTriggerCatalog(null, contextValue).ok).toBe(false);
    expect(
      inspectWorldTriggerCatalog(
        [{ id: '', source: { type: 'discovery.revealed', discoveryId: 'first-priority-event' }, campaignId: 'first-day', eventId: 'first-priority' }],
        contextValue,
      ).ok,
    ).toBe(false);
    expect(
      inspectWorldTriggerCatalog([...mechanismCatalog, ...mechanismCatalog], contextValue),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/duplicado/) });
    const sharedSource = inspectWorldTriggerCatalog(
      [
        FIRST_PRIORITY_WORLD_TRIGGER,
        {
          id: 'other',
          source: { type: 'discovery.revealed', discoveryId: 'first-priority-event' },
          campaignId: 'first-day',
          eventId: 'first-priority',
        },
      ],
      contextValue,
    );
    expect(sharedSource.ok).toBe(true);
    if (sharedSource.ok) {
      expect(sharedSource.value.definitions.map((entry) => entry.id)).toEqual(['first-priority', 'other']);
      expect(sharedSource.value.byDiscoveryId.get('first-priority-event')?.id).toBe('first-priority');
    }
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
      { campaign: firstDayCampaign, exploration: context.exploration, skills: context.skills! },
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

  it('avança o tempo exatamente uma vez ao explorar sem abrir o encontro', () => {
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
    expect(attempt.openedTrigger).toBeUndefined();
    expect(attempt.current.narrativeSession).toBeNull();
    expect(attempt.current.sandbox.presences.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(attempt.current.sandbox.presences.resolvedPresenceIds).toEqual([]);
    expect(attempt.feedback).not.toContain(WORLD_TRIGGER_ATTENTION);
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

  it('persiste uma única vez o sandbox atualizado sem abrir narrativa automaticamente', () => {
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

    expect(loaded.state.sandbox.navigation).toEqual(attempt.result.current.sandbox.navigation);
    expect(loaded.state.sandbox.exploration).toEqual(attempt.result.current.sandbox.exploration);
    expect(loaded.state.sandbox.resources).toEqual(attempt.result.current.sandbox.resources);
    expect(loaded.state.sandbox.crafting).toEqual(attempt.result.current.sandbox.crafting);
    expect(loaded.state.sandbox.presences).toEqual({
      discoveredPresenceIds: ['mira-awakening-clearing'],
      resolvedPresenceIds: [],
    });
    expect(loaded.state.flags[consumedFlag]).toBeUndefined();
    expect(loaded.state.narrativeSession).toBeNull();
    expect(attempt.current).toBe(attempt.result.current);
    expect(toAppScreen(loaded.state)).toBe('exploration');
  });

  it('salvar e carregar durante first-priority preserva o evento atual', () => {
    const exploring = exploringWith('ability-perception');
    const revealed = commit(exploring, { type: 'exploration.explore' });
    expect(revealed.ok).toBe(true);
    if (!revealed.ok) {
      throw new Error(revealed.error);
    }

    const opened = commit(revealed.current, {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    });
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
    const revealed = commit(exploring, { type: 'exploration.explore' });
    expect(revealed.ok).toBe(true);
    if (!revealed.ok) {
      throw new Error(revealed.error);
    }

    const before = commit(revealed.current, {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    });
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
    expect(returned.flags[consumedFlag]).toBeUndefined();
    expect(returned.sandbox.presences.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
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

  it('o encontro não abre de novo depois de resolvido', () => {
    const exploring = exploringWith('ability-perception');
    const first = commit(exploring, { type: 'exploration.explore' });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      throw new Error(first.error);
    }

    const talked = commit(first.current, {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    });
    expect(talked.ok).toBe(true);
    if (!talked.ok) {
      throw new Error(talked.error);
    }

    const returned = playChoices(
      talked.current,
      ['seek-water', 'alert-hide', 'meet-open', 'share-fruit', 'accept-shelter', 'together-summary'],
    );
    const second = commit(returned, { type: 'exploration.explore' });

    expect(second.ok).toBe(true);
    if (!second.ok) {
      throw new Error(second.error);
    }

    expect(second.openedTrigger).toBeUndefined();
    expect(second.current.narrativeSession).toBeNull();
    expect(second.current.sandbox.presences.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(toAppScreen(second.current)).toBe('exploration');
  });

  it('sessão já aberta pelo mesmo evento consome o gatilho sem mutar o estado recebido', () => {
    const exploring = exploringWith('ability-perception');
    const revealed = executeSandboxAction(exploring, { type: 'exploration.explore' }, { context, now }).current;
    const opened = startNarrativeSession(revealed, firstDayCampaign, 'first-priority');
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
    expect(consumeWorldTriggersMatchingNarrative(inspected.value, revealed)).toBe(revealed);
  });

  it('um save da Fatia 7.4 com descoberta revelada e sem flag não dispara narrativa na próxima ação', () => {
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

    expect(attempt.openedTrigger).toBeUndefined();
    expect(attempt.current.narrativeSession).toBeNull();
    expect(attempt.current.sandbox.presences.discoveredPresenceIds).toContain('mira-awakening-clearing');
    expect(attempt.current.sandbox.presences.resolvedPresenceIds).toEqual([]);
    expect(toAppScreen(attempt.current)).toBe('exploration');
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

  it('migrações v1/v2 e schema atual continuam válidas', () => {
    const playing = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
    const v1 = parseGameState(JSON.stringify(asV1(playing)));
    const v2 = parseGameState(JSON.stringify(asV2(playing)));
    const v3 = parseGameState(serializeGameState(playing));

    expect(playing.schemaVersion).toBe(SCHEMA_VERSION);
    expect(v1.status).toBe('ok');
    expect(v2.status).toBe('ok');
    expect(v3).toEqual({ status: 'ok', state: playing });
    if (v1.status === 'ok') {
      expect(v1.state.schemaVersion).toBe(SCHEMA_VERSION);
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
