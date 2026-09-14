import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { FIRST_DAY_WORLD_TRIGGERS } from '../campaigns/first-day/world-triggers';
import { SCHEMA_VERSION, inspectGameState, type GameState } from '../core/state';
import {
  createMemoryPersistence,
  parseGameState,
  serializeGameState,
} from '../infrastructure/persistence';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction, SandboxActionError } from '../modules/sandbox-actions';
import { indexPresenceInteractionCatalog } from '../modules/presences';
import { worldTriggerConsumedFlag } from '../modules/world-events';
import { commitSandboxAction } from '../ui/sandbox';
import { asV1, asV2, asV3, playChoices, playFirstDay } from './helpers';

const STAMP = '2026-09-04T12:00:00.000Z';
const context = createSandboxContext();

function exploring(): GameState {
  return playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
}

function inspectOrThrow(state: GameState): GameState {
  const inspected = inspectGameState(state, context);
  expect(inspected.ok).toBe(true);
  if (!inspected.ok) {
    throw new Error(inspected.reason);
  }

  return inspected.state;
}

function revealMira(state: GameState): GameState {
  return executeSandboxAction(state, { type: 'exploration.explore' }, { context, now: () => STAMP }).current;
}

function withRabbit(state: GameState): GameState {
  return inspectOrThrow({
    ...state,
    sandbox: {
      ...state.sandbox,
      navigation: {
        currentLocationId: 'dense-woods',
        discoveredLocationIds: [...new Set([...state.sandbox.navigation.discoveredLocationIds, 'dense-woods'])],
        unlockedLocationIds: [...new Set([...state.sandbox.navigation.unlockedLocationIds, 'dense-woods'])],
        visitedLocationIds: [...new Set([...state.sandbox.navigation.visitedLocationIds, 'dense-woods'])],
      },
      exploration: {
        locations: [
          ...state.sandbox.exploration.locations.filter((entry) => entry.locationId !== 'dense-woods'),
          {
            locationId: 'dense-woods',
            progress: 40,
            revealedDiscoveryIds: ['horned-rabbit-tracks'],
            explorationCount: 4,
          },
        ],
      },
      presences: {
        discoveredPresenceIds: [...new Set([...state.sandbox.presences.discoveredPresenceIds, 'horned-rabbit-dense-woods'])],
        resolvedPresenceIds: [...state.sandbox.presences.resolvedPresenceIds],
      },
    },
  });
}

describe('Fatia 8.4 — estado, save e orquestração de presenças', () => {
  it('estado inicial atual contém presenças válidas', () => {
    const state = exploring();
    expect(state.schemaVersion).toBe(7);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.sandbox.presences).toEqual({ discoveredPresenceIds: [], resolvedPresenceIds: [] });
    expect(inspectGameState(state, context).ok).toBe(true);
  });

  it('faz roundtrip de save v4', () => {
    const state = revealMira(exploring());
    const persistence = createMemoryPersistence(undefined, context);
    persistence.save(state);
    expect(persistence.load()).toEqual({ status: 'ok', state });
  });

  it('migra v1, v2 e v3 para o schema atual', () => {
    const state = exploring();
    const fromV1 = parseGameState(JSON.stringify(asV1(state)), context);
    const fromV2 = parseGameState(JSON.stringify(asV2(state)), context);
    const fromV3 = parseGameState(JSON.stringify(asV3(state)), context);

    expect(fromV1).toMatchObject({ status: 'ok', state: { schemaVersion: SCHEMA_VERSION } });
    expect(fromV2).toMatchObject({ status: 'ok', state: { schemaVersion: SCHEMA_VERSION } });
    expect(fromV3).toMatchObject({ status: 'ok', state: { schemaVersion: SCHEMA_VERSION } });
    if (fromV1.status === 'ok') {
      expect(fromV1.state.sandbox.presences).toEqual({ discoveredPresenceIds: [], resolvedPresenceIds: [] });
    }
  });

  it('exploração revela a presença sem abrir narrativa no orquestrador', () => {
    const revealed = revealMira(exploring());
    expect(revealed.narrativeSession).toBeNull();
    expect(revealed.sandbox.presences.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(revealed.sandbox.presences.resolvedPresenceIds).toEqual([]);
  });

  it('flag de gatilho consumido resolve Mira na migração sem duplicar o encontro', () => {
    const revealed = revealMira(exploring());
    const flagged = inspectOrThrow({
      ...revealed,
      flags: { ...revealed.flags, [worldTriggerConsumedFlag('first-priority')]: true },
    });
    const migrated = parseGameState(JSON.stringify(asV3(flagged)), context);
    expect(migrated.status).toBe('ok');
    if (migrated.status !== 'ok') {
      return;
    }

    expect(migrated.state.sandbox.presences.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(migrated.state.sandbox.presences.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(migrated.state.flags[worldTriggerConsumedFlag('first-priority')]).toBe(true);

    const reloaded = parseGameState(
      JSON.stringify({
        ...JSON.parse(serializeGameState(revealed, context)),
        flags: { ...revealed.flags, [worldTriggerConsumedFlag('first-priority')]: true },
      }),
      context,
    );
    expect(reloaded.status).toBe('ok');
    if (reloaded.status === 'ok') {
      expect(reloaded.state.sandbox.presences.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
    }
  });

  it('sincroniza descobertas antigas na migração v3', () => {
    const revealed = revealMira(exploring());
    expect(revealed.sandbox.presences.discoveredPresenceIds).toContain('mira-awakening-clearing');

    const v3 = asV3(revealed);
    expect((v3.sandbox as { presences?: unknown }).presences).toBeUndefined();
    const migrated = parseGameState(JSON.stringify(v3), context);
    expect(migrated.status).toBe('ok');
    if (migrated.status !== 'ok') {
      return;
    }

    expect(migrated.state.sandbox.presences.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(migrated.state.sandbox.presences.resolvedPresenceIds).toEqual([]);
  });

  it('migra rastros do coelho já revelados', () => {
    const rabbit = withRabbit(exploring());
    const migrated = parseGameState(JSON.stringify(asV3(rabbit)), context);
    expect(migrated.status).toBe('ok');
    if (migrated.status !== 'ok') {
      return;
    }

    expect(migrated.state.sandbox.presences.discoveredPresenceIds).toContain('horned-rabbit-dense-woods');
    expect(migrated.state.sandbox.presences.resolvedPresenceIds).toEqual([]);
  });

  it('rejeita presença inválida dentro do save', () => {
    const state = exploring();
    const raw = JSON.parse(serializeGameState(state, context)) as Record<string, unknown>;
    raw.sandbox = {
      ...(raw.sandbox as Record<string, unknown>),
      presences: { discoveredPresenceIds: ['presenca-fantasma'], resolvedPresenceIds: [] },
    };

    const parsed = parseGameState(JSON.stringify(raw), context);
    expect(parsed.status).toBe('corrupt');
  });

  it('ação bloqueada não altera nem persiste estado', () => {
    const state = exploring();
    const persistence = createMemoryPersistence(serializeGameState(state, context), context);
    const before = persistence.load();

    expect(() =>
      executeSandboxAction(
        state,
        { type: 'presence.interact', presenceId: 'mira-awakening-clearing', interactionId: 'talk-mira-awakening-clearing' },
        { context, campaign: firstDayCampaign, now: () => STAMP },
      ),
    ).toThrow(SandboxActionError);

    expect(persistence.load()).toEqual(before);
    expect(state.sandbox.presences.discoveredPresenceIds).toEqual([]);
    expect(state.narrativeSession).toBeNull();
  });

  it('interação sem narrativa aplica efeitos e custo uma vez', () => {
    const state = withRabbit(exploring());
    const previousDay = state.world.day;
    const previousPeriod = state.world.period;
    const result = executeSandboxAction(
      state,
      {
        type: 'presence.interact',
        presenceId: 'horned-rabbit-dense-woods',
        interactionId: 'observe-horned-rabbit-dense-woods',
      },
      { context, now: () => STAMP },
    );

    expect(result.timeCost).toEqual({ periods: 1 });
    expect(result.current.flags['saw.horned.rabbit']).toBe(true);
    expect(result.current.narrativeSession).toBeNull();
    expect(result.current.sandbox.presences.resolvedPresenceIds).toEqual([]);
    expect(result.current.sandbox.navigation.currentLocationId).toBe('dense-woods');
    expect(result.current.updatedAt).toBe(STAMP);
    expect(result.feedback).toMatch(/coelho chifrudo/);
    expect(result.current.world.day !== previousDay || result.current.world.period !== previousPeriod).toBe(true);
  });

  it('preserva o efeito de período da interação antes de aplicar seu custo temporal', () => {
    const rabbit = withRabbit(exploring());
    const customInteractions = context.presenceInteractions.interactions.map((interaction) =>
      interaction.id === 'observe-horned-rabbit-dense-woods'
        ? {
            ...interaction,
            timeCost: { periods: 1 },
            effects: [{ type: 'world.period' as const, period: 'entardecer' as const }],
          }
        : interaction,
    );
    const customContext = {
      ...context,
      presenceInteractions: indexPresenceInteractionCatalog(
        { interactions: customInteractions },
        context.presences,
        firstDayCampaign,
      ),
    };

    const result = executeSandboxAction(
      rabbit,
      {
        type: 'presence.interact',
        presenceId: 'horned-rabbit-dense-woods',
        interactionId: 'observe-horned-rabbit-dense-woods',
      },
      { context: customContext, now: () => STAMP },
    );

    expect(result.dayCycle.time.previous).toEqual({ day: rabbit.world.day, periodId: 'entardecer' });
    expect(result.current.world).toEqual({ day: rabbit.world.day, period: 'noite' });
  });

  it('interação narrativa abre sessão válida sem custo duplicado e resolve quando declarado', () => {
    const state = revealMira(exploring());
    const location = state.sandbox.navigation.currentLocationId;
    const result = executeSandboxAction(
      state,
      {
        type: 'presence.interact',
        presenceId: 'mira-awakening-clearing',
        interactionId: 'talk-mira-awakening-clearing',
      },
      { context, campaign: firstDayCampaign, now: () => STAMP },
    );

    expect(result.timeCost).toEqual({ periods: 1 });
    expect(result.current.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'first-priority' });
    expect(result.current.sandbox.presences.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(result.current.sandbox.navigation.currentLocationId).toBe(location);
    expect(result.detail.type).toBe('presence.interact');
  });

  it('presença indisponível, oculta ou resolvida falha de forma controlada', () => {
    const hidden = exploring();
    expect(() =>
      executeSandboxAction(
        hidden,
        { type: 'presence.interact', presenceId: 'mira-awakening-clearing', interactionId: 'talk-mira-awakening-clearing' },
        { context, campaign: firstDayCampaign },
      ),
    ).toThrow(/oculta/);

    const discovered = revealMira(hidden);
    expect(() =>
      executeSandboxAction(
        discovered,
        { type: 'presence.interact', presenceId: 'mira-awakening-clearing', interactionId: 'talk-mira-awakening-clearing' },
        { context, campaign: firstDayCampaign },
      ),
    ).not.toThrow();

    expect(() =>
      executeSandboxAction(
        withRabbit(discovered),
        { type: 'presence.interact', presenceId: 'mira-awakening-clearing', interactionId: 'talk-mira-awakening-clearing' },
        { context, campaign: firstDayCampaign },
      ),
    ).toThrow(/não está disponível/);

    const resolved = executeSandboxAction(
      discovered,
      { type: 'presence.interact', presenceId: 'mira-awakening-clearing', interactionId: 'talk-mira-awakening-clearing' },
      { context, campaign: firstDayCampaign, now: () => STAMP },
    ).current;

    expect(() =>
      executeSandboxAction(
        { ...resolved, narrativeSession: null },
        { type: 'presence.interact', presenceId: 'mira-awakening-clearing', interactionId: 'talk-mira-awakening-clearing' },
        { context, campaign: firstDayCampaign },
      ),
    ).toThrow(/já foi resolvida/);
  });

  it('renovação e recuperação só acontecem quando o tempo avança', () => {
    const rabbit = withRabbit(exploring());
    const zeroCost = inspectOrThrow({
      ...rabbit,
      sandbox: rabbit.sandbox,
    });
    const observed = executeSandboxAction(
      zeroCost,
      {
        type: 'presence.interact',
        presenceId: 'horned-rabbit-dense-woods',
        interactionId: 'observe-horned-rabbit-dense-woods',
      },
      { context, now: () => STAMP },
    );

    expect(observed.timeCost.periods).toBeGreaterThan(0);
    expect(observed.synchronization.renewedNodeIds).toEqual([]);
    expect(observed.synchronization.recoveredPopulationIds).toEqual([]);
  });

  it('persistência recebe exatamente o estado final', () => {
    const state = withRabbit(exploring());
    const persistence = createMemoryPersistence(undefined, context);
    const result = executeSandboxAction(
      state,
      {
        type: 'presence.interact',
        presenceId: 'horned-rabbit-dense-woods',
        interactionId: 'observe-horned-rabbit-dense-woods',
      },
      { context, now: () => STAMP },
    );
    persistence.save(result.current);
    expect(persistence.load()).toEqual({ status: 'ok', state: result.current });
  });

  it('adaptador de UI persiste somente o estado final da interação', () => {
    const state = withRabbit(exploring());
    const persistence = createMemoryPersistence(undefined, context);
    const attempt = commitSandboxAction(
      state,
      {
        type: 'presence.interact',
        presenceId: 'horned-rabbit-dense-woods',
        interactionId: 'observe-horned-rabbit-dense-woods',
      },
      context,
      {
        campaign: firstDayCampaign,
        catalog: FIRST_DAY_WORLD_TRIGGERS,
        persist: (next) => persistence.save(next),
      },
    );

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) {
      return;
    }

    expect(attempt.current.narrativeSession).toBeNull();
    expect(persistence.load()).toEqual({ status: 'ok', state: attempt.current });
  });

  it('conversar com Mira pelo adaptador consome o gatilho e não reabre o encontro', () => {
    const revealed = revealMira(exploring());
    const persistence = createMemoryPersistence(undefined, context);
    const talk = commitSandboxAction(
      revealed,
      {
        type: 'presence.interact',
        presenceId: 'mira-awakening-clearing',
        interactionId: 'talk-mira-awakening-clearing',
      },
      context,
      {
        campaign: firstDayCampaign,
        catalog: FIRST_DAY_WORLD_TRIGGERS,
        persist: (next) => persistence.save(next),
      },
    );

    expect(talk.ok).toBe(true);
    if (!talk.ok) {
      return;
    }

    expect(talk.openedTrigger).toBeUndefined();
    expect(talk.current.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'first-priority' });
    expect(talk.current.flags[worldTriggerConsumedFlag('first-priority')]).toBeUndefined();
    expect(talk.current.sandbox.presences.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);

    const returned = playChoices(talk.current, [
      'seek-water',
      'alert-hide',
      'meet-open',
      'share-fruit',
      'accept-shelter',
      'together-summary',
    ]);
    const next = commitSandboxAction(
      returned,
      { type: 'exploration.explore' },
      context,
      {
        campaign: firstDayCampaign,
        catalog: FIRST_DAY_WORLD_TRIGGERS,
        persist: (nextState) => persistence.save(nextState),
      },
    );

    expect(next.ok).toBe(true);
    if (!next.ok) {
      return;
    }

    expect(next.openedTrigger).toBeUndefined();
    expect(next.current.narrativeSession).toBeNull();
  });

  it('explorar não resolve Mira; conversar resolve e impede repetir depois do retorno', () => {
    const opened = commitSandboxAction(
      exploring(),
      { type: 'exploration.explore' },
      context,
      {
        campaign: firstDayCampaign,
        catalog: FIRST_DAY_WORLD_TRIGGERS,
        persist: () => undefined,
      },
    );

    expect(opened.ok).toBe(true);
    if (!opened.ok) {
      return;
    }

    expect(opened.openedTrigger).toBeUndefined();
    expect(opened.current.narrativeSession).toBeNull();
    expect(opened.current.sandbox.presences.discoveredPresenceIds).toContain('mira-awakening-clearing');
    expect(opened.current.sandbox.presences.resolvedPresenceIds).toEqual([]);

    const talked = commitSandboxAction(
      opened.current,
      {
        type: 'presence.interact',
        presenceId: 'mira-awakening-clearing',
        interactionId: 'talk-mira-awakening-clearing',
      },
      context,
      {
        campaign: firstDayCampaign,
        catalog: FIRST_DAY_WORLD_TRIGGERS,
        persist: () => undefined,
      },
    );

    expect(talked.ok).toBe(true);
    if (!talked.ok) {
      return;
    }

    const returned = playChoices(talked.current, [
      'seek-water',
      'alert-hide',
      'meet-open',
      'share-fruit',
      'accept-shelter',
      'together-summary',
    ]);
    const talk = commitSandboxAction(
      returned,
      {
        type: 'presence.interact',
        presenceId: 'mira-awakening-clearing',
        interactionId: 'talk-mira-awakening-clearing',
      },
      context,
      {
        campaign: firstDayCampaign,
        catalog: FIRST_DAY_WORLD_TRIGGERS,
        persist: () => {
          throw new Error('não deveria persistir uma interação bloqueada');
        },
      },
    );

    expect(returned.narrativeSession).toBeNull();
    expect(talk.ok).toBe(false);
    if (!talk.ok) {
      expect(talk.error).toMatch(/já foi resolvida/);
    }
  });

  it('partida completed legada continua abrindo o resumo após a cadeia de migração', () => {
    const completed = inspectOrThrow({ ...exploring(), status: 'completed', narrativeSession: null });
    const migrated = parseGameState(JSON.stringify(asV1(completed)), context);
    expect(migrated.status).toBe('ok');
    if (migrated.status !== 'ok') {
      return;
    }

    expect(migrated.state.status).toBe('completed');
    expect(migrated.state.narrativeSession).toBeNull();
    expect(migrated.state.schemaVersion).toBe(SCHEMA_VERSION);
  });
});
