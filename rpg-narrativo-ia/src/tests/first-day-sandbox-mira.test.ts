import { describe, expect, it } from 'vitest';
import { applyChoice, startGame } from '../core/engine';
import { loadFirstDayWorld } from '../modules/content';
import { getObjectiveStatus, listKnownObjectives } from '../modules/objectives';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import { attemptSandboxAction, resolveWorldNarrativeState } from '../ui/sandbox';
import { now } from './helpers';

const world = loadFirstDayWorld();
const campaign = world.campaign;
const context = createSandboxContextFromWorld(world);
const triggers = world.worldTriggers.definitions;

function newGame() {
  return startGame(
    { firstName: 'Ana', lastName: 'Cruz', sex: 'female' },
    campaign,
    now,
    context,
    world.objectives,
  );
}

function finishEnergyIntro() {
  let state = newGame();
  for (const choiceId of [
    'awake-calm',
    'system-touch',
    'ability-perception',
    'eteris-pressure',
    'numen-follow-guidance',
  ]) {
    state = applyChoice(state, campaign, choiceId, now, world.objectives, context);
  }

  const trained = attemptSandboxAction(
    state,
    { type: 'training.train', methodId: 'focused-perception-drill' },
    context,
    campaign,
    triggers,
    world.objectives,
  );
  expect(trained.ok).toBe(true);
  if (!trained.ok) {
    throw new Error(trained.error);
  }

  const returned = applyChoice(
    trained.current,
    campaign,
    'first-numen-practice-continue',
    now,
    world.objectives,
    context,
  );
  return resolveWorldNarrativeState(returned, context, campaign, triggers).current;
}

function act(state: ReturnType<typeof finishEnergyIntro>, action: Parameters<typeof attemptSandboxAction>[1]) {
  const result = attemptSandboxAction(
    state,
    action,
    context,
    campaign,
    triggers,
    world.objectives,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.current;
}

function surviveFirstPriority(state: ReturnType<typeof finishEnergyIntro>) {
  const firstExplore = attemptSandboxAction(
    state,
    { type: 'exploration.explore' },
    context,
    campaign,
    triggers,
    world.objectives,
  );
  expect(firstExplore.ok).toBe(true);
  if (!firstExplore.ok) {
    throw new Error(firstExplore.error);
  }
  expect(firstExplore.current.narrativeSession?.eventId).toBe('first-priority');

  let current = applyChoice(
    firstExplore.current,
    campaign,
    'seek-water',
    now,
    world.objectives,
    context,
  );
  expect(current.narrativeSession?.eventId).toBe('danger-alert');

  current = applyChoice(
    current,
    campaign,
    'alert-hide',
    now,
    world.objectives,
    context,
  );
  expect(current.narrativeSession).toBeNull();
  return resolveWorldNarrativeState(current, context, campaign, triggers).current;
}

describe('Fatia E — sandbox inicial e primeiro contato', () => {
  it('conclui a jornada principal com treino, água e sinais sem exigir fogo, refeição ou Mira', () => {
    let state = surviveFirstPriority(finishEnergyIntro());

    state = act(state, { type: 'exploration.explore' });

    expect(getObjectiveStatus(world.objectives, state.objectives, 'first-steps')).toBe('completed');
    expect(state.inventory.some((entry) => entry.itemId === 'agua-limpa')).toBe(true);
    expect(
      state.sandbox.exploration.locations
        .find((entry) => entry.locationId === 'awakening-clearing')
        ?.revealedDiscoveryIds,
    ).toContain('human-footprints');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('mira-awakening-clearing');
    expect(state.sandbox.crafting.activeStructures).toEqual([]);
    expect(state.inventory.some((entry) => entry.itemId === 'cooked-horned-rabbit-meat')).toBe(false);
  });

  it('sinais humanos aparecem antes de Mira e conforto fica como jornada lateral', () => {
    let state = surviveFirstPriority(finishEnergyIntro());

    state = act(state, { type: 'exploration.explore' });
    expect(
      state.sandbox.exploration.locations
        .find((entry) => entry.locationId === 'awakening-clearing')
        ?.revealedDiscoveryIds,
    ).toContain('human-footprints');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('mira-awakening-clearing');

    state = act(state, { type: 'exploration.explore' });
    const known = listKnownObjectives(world.objectives, state.objectives).map((objective) => objective.id);
    expect(known).toContain('camp-comfort');
    expect(getObjectiveStatus(world.objectives, state.objectives, 'camp-comfort')).toBe('active');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('mira-awakening-clearing');

    state = act(state, { type: 'exploration.explore' });
    state = act(state, { type: 'exploration.explore' });
    expect(state.sandbox.presences.discoveredPresenceIds).toContain('mira-awakening-clearing');
  });

  it('permite evitar Mira sem abrir narrativa e conclui a jornada lateral de contato', () => {
    let state = surviveFirstPriority(finishEnergyIntro());
    for (let count = 0; count < 4; count += 1) {
      state = act(state, { type: 'exploration.explore' });
    }

    expect(state.sandbox.presences.discoveredPresenceIds).toContain('mira-awakening-clearing');

    state = act(state, {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'avoid-mira-awakening-clearing',
    });

    expect(state.narrativeSession).toBeNull();
    expect(state.flags['mira.contact.avoided']).toBe(true);
    expect(state.sandbox.presences.resolvedPresenceIds).toContain('mira-awakening-clearing');
    expect(getObjectiveStatus(world.objectives, state.objectives, 'other-survivor')).toBe('completed');
  });

  it('conversar com Mira abre somente o primeiro contato e devolve ao sandbox após a troca', () => {
    let state = surviveFirstPriority(finishEnergyIntro());
    for (let count = 0; count < 4; count += 1) {
      state = act(state, { type: 'exploration.explore' });
    }

    state = act(state, {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    });
    expect(state.narrativeSession?.eventId).toBe('survivor-meet');

    state = applyChoice(state, campaign, 'meet-distance', now, world.objectives, context);
    expect(state.narrativeSession?.eventId).toBe('moral-choice');

    state = applyChoice(state, campaign, 'share-information', now, world.objectives, context);
    expect(state.narrativeSession).toBeNull();
    expect(state.flags['mira.shared-information']).toBe(true);
    expect(state.flags['camp.together']).toBeUndefined();
    expect(state.flags['camp.alone']).toBeUndefined();
    expect(state.world.period).not.toBe('noite');
  });
});
