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
const sliceETriggers = triggers.filter((trigger) => !['first-night', 'day-two-start'].includes(trigger.id));

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
    sliceETriggers,
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
  return resolveWorldNarrativeState(returned, context, campaign, sliceETriggers).current;
}

function act(state: ReturnType<typeof finishEnergyIntro>, action: Parameters<typeof attemptSandboxAction>[1]) {
  const result = attemptSandboxAction(
    state,
    action,
    context,
    campaign,
    sliceETriggers,
    world.objectives,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.current;
}

function secureWaterAndFindSigns(state: ReturnType<typeof finishEnergyIntro>) {
  let current = act(state, { type: 'exploration.explore' });
  current = act(current, { type: 'exploration.explore' });

  expect(
    current.sandbox.exploration.locations
      .find((entry) => entry.locationId === 'awakening-clearing')
      ?.revealedDiscoveryIds,
  ).toContain('human-footprints');
  expect(current.sandbox.presences.discoveredPresenceIds).not.toContain('mira-awakening-clearing');

  current = act(current, { type: 'navigation.move', locationId: 'spring-lake' });
  current = act(current, { type: 'exploration.explore' });
  return current;
}

describe('Fatia E — sandbox inicial e primeiro contato', () => {
  it('conclui a jornada principal com treino, água e sinais sem exigir fogo, refeição ou Mira', () => {
    const state = secureWaterAndFindSigns(finishEnergyIntro());

    expect(getObjectiveStatus(world.objectives, state.objectives, 'first-steps')).toBe('completed');
    expect(
      state.sandbox.exploration.locations
        .find((entry) => entry.locationId === 'spring-lake')
        ?.revealedDiscoveryIds,
    ).toContain('spring-source');
    expect(
      state.sandbox.exploration.locations
        .find((entry) => entry.locationId === 'awakening-clearing')
        ?.revealedDiscoveryIds,
    ).toContain('human-footprints');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('mira-awakening-clearing');
    expect(state.sandbox.crafting.structures).toEqual([]);
    expect(state.inventory.some((entry) => entry.itemId === 'cooked-horned-rabbit-meat')).toBe(false);
  });

  it('sinais humanos aparecem antes de Mira e conforto fica como jornada lateral', () => {
    let state = secureWaterAndFindSigns(finishEnergyIntro());

    state = act(state, { type: 'navigation.move', locationId: 'awakening-clearing' });
    state = act(state, { type: 'exploration.explore' });
    const known = listKnownObjectives(world.objectives, state.objectives).map((entry) => entry.objective.id);
    expect(known).toContain('camp-comfort');
    expect(getObjectiveStatus(world.objectives, state.objectives, 'camp-comfort')).toBe('active');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('mira-awakening-clearing');

    state = act(state, { type: 'exploration.explore' });
    state = act(state, { type: 'exploration.explore' });
    expect(state.sandbox.presences.discoveredPresenceIds).toContain('mira-awakening-clearing');
  });

  it('permite evitar Mira sem abrir narrativa e conclui a jornada lateral de contato', () => {
    let state = secureWaterAndFindSigns(finishEnergyIntro());
    state = act(state, { type: 'navigation.move', locationId: 'awakening-clearing' });
    for (let count = 0; count < 3; count += 1) {
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
    let state = secureWaterAndFindSigns(finishEnergyIntro());
    state = act(state, { type: 'navigation.move', locationId: 'awakening-clearing' });
    for (let count = 0; count < 3; count += 1) {
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
