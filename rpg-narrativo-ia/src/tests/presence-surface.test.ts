import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { FIRST_DAY_WORLD_TRIGGERS } from '../campaigns/first-day/world-triggers';
import { inspectGameState, type GameState } from '../core/state';
import { createSandboxContext, inspectSandboxContext, type SandboxContext } from '../modules/sandbox';
import { executeSandboxAction, type SandboxAction } from '../modules/sandbox-actions';
import { worldTriggerConsumedFlag } from '../modules/world-events';
import { buildExplorationView, commitSandboxAction } from '../ui/sandbox';
import { toAppScreen } from '../ui/routing';
import { playFirstDay, revealMiraForTest } from './helpers';

const context = createSandboxContext();

function enterExploration() {
  return playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
}

function viewOf(state: GameState, sandbox: SandboxContext = context) {
  return buildExplorationView(state, firstDayCampaign, sandbox);
}

function inspectOrThrow(state: GameState, sandbox: SandboxContext = context): GameState {
  const inspected = inspectGameState(state, sandbox);
  expect(inspected.ok).toBe(true);
  if (!inspected.ok) {
    throw new Error(inspected.reason);
  }

  return inspected.state;
}

function expectContext(value: unknown): SandboxContext {
  const inspected = inspectSandboxContext(value);
  expect(inspected.ok).toBe(true);
  if (!inspected.ok) {
    throw new Error(inspected.reason);
  }

  return inspected.value;
}

function discoverMira(state: GameState = enterExploration()): GameState {
  return revealMiraForTest(state);
}

function exploreTimes(state: GameState, times: number): GameState {
  let current = state;
  for (let index = 0; index < times; index += 1) {
    current = executeSandboxAction(current, { type: 'exploration.explore' }, { context }).current;
  }
  return current;
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

function commit(state: GameState, action: SandboxAction) {
  return commitSandboxAction(state, action, context, {
    campaign: firstDayCampaign,
    catalog: FIRST_DAY_WORLD_TRIGGERS,
    persist: () => undefined,
  });
}

function mustCommit(state: GameState, action: SandboxAction) {
  const attempt = commit(state, action);
  expect(attempt.ok).toBe(true);
  if (!attempt.ok) {
    throw new Error(attempt.error);
  }

  return attempt;
}

describe('Fatia 8.5 — view-model de presenças', () => {
  it('omite a seção quando nenhuma presença do local foi descoberta', () => {
    const view = viewOf(enterExploration());

    expect(view.presences).toEqual([]);
    expect(view.location.id).toBe('awakening-clearing');
  });

  it('exploração mantém Mira oculta até os sinais avançados e não abre narrativa', () => {
    const early = exploreTimes(enterExploration(), 1);
    expect(early.sandbox.presences.discoveredPresenceIds).not.toContain('mira-awakening-clearing');

    const revealed = exploreTimes(early, 1);
    expect(revealed.sandbox.presences.discoveredPresenceIds).toContain('mira-awakening-clearing');
    expect(revealed.narrativeSession).toBeNull();
    expect(toAppScreen(revealed)).toBe('exploration');
  });

  it('não revela presença de outro local mesmo depois de descoberta', () => {
    const woods = withRabbit(enterExploration());
    const atClearing = inspectOrThrow({
      ...woods,
      sandbox: {
        ...woods.sandbox,
        navigation: {
          ...woods.sandbox.navigation,
          currentLocationId: 'awakening-clearing',
        },
      },
    });

    expect(viewOf(woods).presences.map((presence) => presence.presenceId)).toEqual(['horned-rabbit-dense-woods']);
    expect(viewOf(atClearing).presences.map((presence) => presence.presenceId)).toEqual([]);
  });

  it('mostra presença disponível com interações conhecidas e custo visível', () => {
    const view = viewOf(discoverMira());
    const mira = view.presences[0];

    expect(view.presences).toHaveLength(1);
    expect(mira).toMatchObject({
      presenceId: 'mira-awakening-clearing',
      entityId: 'mira-vale',
      kind: 'npc',
      kindLabel: 'NPC',
      kindSymbol: '♙',
      name: 'Mira Vale',
      imageKind: 'portrait',
      imageLabel: 'Mira Vale',
      status: 'available',
      statusLabel: 'Disponível',
    });
    expect(mira?.trust).toBeUndefined();
    expect(mira?.description).toMatch(/sobrevivente/i);
    expect(mira?.interactions).toEqual([
      expect.objectContaining({
        interactionId: 'observe-mira-awakening-clearing',
        kind: 'observe',
        label: 'Observar',
        costPeriods: 1,
        available: true,
      }),
      expect.objectContaining({
        interactionId: 'talk-mira-awakening-clearing',
        kind: 'talk',
        costPeriods: 1,
        available: true,
      }),
      expect.objectContaining({
        interactionId: 'avoid-mira-awakening-clearing',
        kind: 'avoid',
        costPeriods: 0,
        available: true,
      }),
    ]);
    expect(mira?.interactions[0]?.blockedReason).toBeUndefined();
  });

  it('mostra animal descoberto com ícone e interação sem diálogo', () => {
    const view = viewOf(withRabbit(enterExploration()));
    const rabbit = view.presences[0];

    expect(rabbit).toMatchObject({
      presenceId: 'horned-rabbit-dense-woods',
      kind: 'animal',
      kindLabel: 'Animal',
      kindSymbol: '♧',
      name: 'Coelho chifrudo',
      imageKind: 'icon',
      status: 'available',
    });
    expect(rabbit?.interactions).toEqual([
      expect.objectContaining({
        interactionId: 'observe-horned-rabbit-dense-woods',
        label: 'Observar',
        costPeriods: 1,
        available: true,
      }),
      expect.objectContaining({
        interactionId: 'avoid-horned-rabbit-dense-woods',
        label: 'Evitar',
        costPeriods: 0,
        available: true,
      }),
    ]);
  });

  it('mostra interação conhecida bloqueada com motivo seguro', () => {
    const discovered = discoverMira();
    const sandbox = expectContext({
      ...context,
      presenceInteractions: {
        interactions: context.presenceInteractions.interactions.map((interaction) =>
          interaction.id === 'talk-mira-awakening-clearing'
            ? {
                id: interaction.id,
                presenceId: interaction.presenceId,
                kind: interaction.kind,
                label: interaction.label,
                hint: interaction.hint,
                timeCost: { periods: interaction.timeCost.periods },
                conditions: [{ type: 'flag.is', flag: 'can.talk.mira', value: true }],
                narrative: interaction.narrative
                  ? { campaignId: interaction.narrative.campaignId, eventId: interaction.narrative.eventId }
                  : undefined,
                resolvesPresence: interaction.resolvesPresence,
              }
            : interaction,
        ),
      },
    });
    const mira = viewOf(discovered, sandbox).presences[0];

    expect(mira?.status).toBe('available');
    expect(mira?.interactions).toEqual([
      expect.objectContaining({
        interactionId: 'observe-mira-awakening-clearing',
        available: true,
        costPeriods: 1,
      }),
      expect.objectContaining({
        interactionId: 'talk-mira-awakening-clearing',
        available: false,
        blockedReason: 'As condições da interação não foram satisfeitas.',
        costPeriods: 1,
      }),
      expect.objectContaining({
        interactionId: 'avoid-mira-awakening-clearing',
        available: true,
        costPeriods: 0,
      }),
    ]);
  });

  it('mostra presença conhecida indisponível sem expor conteúdo oculto', () => {
    const discovered = discoverMira();
    const sandbox = expectContext({
      ...context,
      presences: {
        entities: context.presences.entities,
        presences: context.presences.presences.map((presence) =>
          presence.id === 'mira-awakening-clearing'
            ? {
                id: presence.id,
                entityId: presence.entityId,
                locationId: presence.locationId,
                discoveryId: presence.discoveryId,
                resolvable: presence.resolvable,
                availabilityConditions: [{ type: 'flag.is', flag: 'mira.visible', value: true }],
              }
            : presence,
        ),
      },
      presenceInteractions: {
        interactions: [...context.presenceInteractions.interactions],
      },
    });
    const mira = viewOf(discovered, sandbox).presences[0];

    expect(mira?.status).toBe('unavailable');
    expect(mira?.statusLabel).toBe('Indisponível');
    expect(mira?.name).toBe('Mira Vale');
    expect(mira?.interactions[0]).toMatchObject({
      available: false,
      blockedReason: 'A presença não está disponível.',
    });
    expect(viewOf(enterExploration(), sandbox).presences).toEqual([]);
  });

  it('mostra presença resolvida com confiança existente e sem ação disponível', () => {
    const discovered = discoverMira();
    const resolved = inspectOrThrow({
      ...discovered,
      relationships: [{ characterId: 'mira-vale', trust: 2 }],
      sandbox: {
        ...discovered.sandbox,
        presences: {
          discoveredPresenceIds: ['mira-awakening-clearing'],
          resolvedPresenceIds: ['mira-awakening-clearing'],
        },
      },
    });
    const mira = viewOf(resolved).presences[0];

    expect(mira).toMatchObject({
      status: 'resolved',
      statusLabel: 'Resolvida',
      trust: 2,
    });
    expect(mira?.interactions.every((interaction) => interaction.available === false)).toBe(true);
    expect(mira?.interactions[0]?.blockedReason).toBe('A presença já foi resolvida.');
  });

  it('dispara somente presence.interact e devolve feedback sem narrativa', () => {
    const attempt = mustCommit(withRabbit(enterExploration()), {
      type: 'presence.interact',
      presenceId: 'horned-rabbit-dense-woods',
      interactionId: 'observe-horned-rabbit-dense-woods',
    });

    expect(attempt.result.detail.type).toBe('presence.interact');
    expect(attempt.current.narrativeSession).toBeNull();
    expect(toAppScreen(attempt.current)).toBe('exploration');
    expect(attempt.current.sandbox.navigation.currentLocationId).toBe('dense-woods');
    expect(attempt.feedback).toMatch(/coelho chifrudo/);
    expect(viewOf(attempt.current).presences[0]?.status).toBe('available');
  });

  it('abre a narrativa existente e preserva o local ao conversar', () => {
    const discovered = discoverMira();
    const location = discovered.sandbox.navigation.currentLocationId;
    const attempt = mustCommit(discovered, {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    });

    expect(toAppScreen(attempt.current)).toBe('game');
    expect(attempt.current.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'survivor-meet' });
    expect(attempt.current.sandbox.navigation.currentLocationId).toBe(location);
    expect(attempt.current.flags[worldTriggerConsumedFlag('first-priority')]).toBeUndefined();
    expect(viewOf(attempt.current).presences[0]?.status).toBe('resolved');
  });

  it('mantém o banner de erro sem alterar o estado quando a ação falha', () => {
    const exploring = enterExploration();
    const attempt = commit(exploring, {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    });

    expect(attempt.ok).toBe(false);
    if (attempt.ok) {
      throw new Error('esperava falha');
    }

    expect(attempt.previous).toBe(exploring);
    expect(attempt.error.length).toBeGreaterThan(0);
    expect(exploring.sandbox.presences.discoveredPresenceIds).toEqual([]);
    expect(exploring.narrativeSession).toBeNull();
  });
});
