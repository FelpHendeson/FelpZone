import { describe, expect, it } from 'vitest';
import { applyChoice, startGame } from '../core/engine';
import type { GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { loadFirstDayWorld } from '../modules/content';
import { getObjectiveStatus } from '../modules/objectives';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import type { SandboxAction } from '../modules/sandbox-actions';
import { worldTriggerConsumedFlag } from '../modules/world-events';
import { toAppScreen } from '../ui/routing';
import { attemptSandboxAction, resolveWorldNarrativeState } from '../ui/sandbox';
import { now } from './helpers';

const world = loadFirstDayWorld();
const campaign = world.campaign;
const context = createSandboxContextFromWorld(world);
const triggers = world.worldTriggers.definitions;

function newGame(): GameState {
  return startGame(
    { firstName: 'Ana', lastName: 'Cruz', sex: 'female' },
    campaign,
    now,
    context,
    world.objectives,
  );
}

function choose(state: GameState, choiceId: string): GameState {
  const prepared = resolveWorldNarrativeState(state, context, campaign, triggers).current;
  const transitioned = applyChoice(
    prepared,
    campaign,
    choiceId,
    now,
    world.objectives,
    context,
  );
  return resolveWorldNarrativeState(transitioned, context, campaign, triggers).current;
}

function act(state: GameState, action: SandboxAction): GameState {
  const attempt = attemptSandboxAction(
    state,
    action,
    context,
    campaign,
    triggers,
    world.objectives,
  );
  expect(attempt.ok).toBe(true);
  if (!attempt.ok) {
    throw new Error(attempt.error);
  }
  return attempt.current;
}

function reachPostTrainingSandbox(): GameState {
  let state = newGame();
  for (const choiceId of [
    'awake-calm',
    'system-touch',
    'ability-perception',
    'eteris-pressure',
    'numen-follow-guidance',
  ]) {
    state = choose(state, choiceId);
  }

  expect(toAppScreen(state)).toBe('exploration');

  state = act(state, {
    type: 'training.train',
    methodId: 'focused-perception-drill',
  });
  expect(state.narrativeSession?.eventId).toBe('first-numen-practice');

  state = choose(state, 'first-numen-practice-continue');
  expect(state.narrativeSession).toBeNull();
  expect(state.world).toEqual({ day: 1, period: 'manha' });
  return state;
}

function finishDayTwoIntro(state: GameState): GameState {
  expect(state.narrativeSession?.eventId).toBe('day-two-awakening');
  state = choose(state, 'day-two-assess');

  if (state.narrativeSession?.eventId === 'day-two-together') {
    return choose(state, 'day-two-together-continue');
  }

  expect(state.narrativeSession?.eventId).toBe('day-two-alone');
  return choose(state, 'day-two-alone-continue');
}

describe('Fatia G — playtest integrado do primeiro dia', () => {
  it('rota principal cabe no Dia 1: treino → água → sinais → Mira → noite compartilhada → Dia 2', () => {
    let state = reachPostTrainingSandbox();

    state = act(state, { type: 'exploration.explore' });
    expect(state.world).toEqual({ day: 1, period: 'meio-dia' });
    const clearingAfterFirstLook = state.sandbox.exploration.locations.find(
      (entry) => entry.locationId === 'awakening-clearing',
    );
    expect(clearingAfterFirstLook?.progress).toBe(25);
    expect(clearingAfterFirstLook?.revealedDiscoveryIds).toContain('human-footprints');
    expect(clearingAfterFirstLook?.revealedDiscoveryIds).toContain('human-cut-branch');
    expect(state.sandbox.navigation.discoveredLocationIds).toContain('spring-lake');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('mira-awakening-clearing');

    const beforeSpringTravel = { ...state.world };
    state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
    expect(state.world).toEqual(beforeSpringTravel);

    state = act(state, { type: 'exploration.explore' });
    expect(state.world).toEqual({ day: 1, period: 'tarde' });
    expect(
      state.sandbox.exploration.locations
        .find((entry) => entry.locationId === 'spring-lake')
        ?.revealedDiscoveryIds,
    ).toContain('spring-source');
    expect(getObjectiveStatus(world.objectives, state.objectives, 'first-steps')).toBe('completed');

    const beforeReturn = { ...state.world };
    state = act(state, { type: 'navigation.move', locationId: 'awakening-clearing' });
    expect(state.world).toEqual(beforeReturn);

    state = act(state, { type: 'exploration.explore' });
    expect(state.world).toEqual({ day: 1, period: 'entardecer' });
    expect(state.sandbox.presences.discoveredPresenceIds).toContain('mira-awakening-clearing');
    expect(state.narrativeSession).toBeNull();

    state = act(state, {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    });
    expect(state.world).toEqual({ day: 1, period: 'noite' });
    expect(state.narrativeSession?.eventId).toBe('survivor-meet');
    expect(state.flags[worldTriggerConsumedFlag('first-night')]).not.toBe(true);

    state = choose(state, 'meet-open');
    expect(state.narrativeSession?.eventId).toBe('moral-choice');

    state = choose(state, 'share-information');
    expect(state.narrativeSession?.eventId).toBe('first-night');
    expect(state.flags[worldTriggerConsumedFlag('first-night')]).toBe(true);

    state = choose(state, 'assess-first-night');
    expect(state.narrativeSession?.eventId).toBe('dusk-trusted');

    state = choose(state, 'accept-shelter');
    expect(state.narrativeSession?.eventId).toBe('night-together');

    state = choose(state, 'together-summary');
    expect(state.narrativeSession).toBeNull();
    expect(state.status).toBe('playing');
    expect(state.flags['night.route.shared']).toBe(true);

    state = act(state, { type: 'needs.rest', mode: 'simple' });
    expect(state.world.day).toBe(2);
    expect(state.narrativeSession?.eventId).toBe('day-two-awakening');

    state = finishDayTwoIntro(state);
    expect(state.status).toBe('playing');
    expect(state.narrativeSession).toBeNull();
    expect(state.world.day).toBe(2);
    expect(state.flags['day2.started']).toBe(true);
    expect(state.flags['camp.together']).toBe(true);
    expect(toAppScreen(state)).toBe('exploration');

    const reloaded = parseGameState(serializeGameState(state, context), context);
    expect(reloaded).toEqual({ status: 'ok', state });
  });

  it('rota alternativa permite evitar Mira, atravessar a noite sozinho e chegar ao Dia 2 sem água obrigatória', () => {
    let state = reachPostTrainingSandbox();

    state = act(state, { type: 'exploration.explore' });
    expect(state.world.period).toBe('meio-dia');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('mira-awakening-clearing');

    state = act(state, { type: 'exploration.explore' });
    expect(state.world.period).toBe('tarde');
    expect(state.sandbox.presences.discoveredPresenceIds).toContain('mira-awakening-clearing');

    state = act(state, {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'avoid-mira-awakening-clearing',
    });
    expect(state.narrativeSession).toBeNull();
    expect(state.flags['mira.contact.avoided']).toBe(true);
    expect(state.sandbox.presences.resolvedPresenceIds).toContain('mira-awakening-clearing');
    expect(getObjectiveStatus(world.objectives, state.objectives, 'first-steps')).not.toBe('completed');

    state = act(state, { type: 'exploration.explore' });
    expect(state.world.period).toBe('entardecer');
    state = act(state, { type: 'exploration.explore' });
    expect(state.world.period).toBe('noite');
    expect(state.narrativeSession?.eventId).toBe('first-night');

    state = choose(state, 'assess-first-night');
    expect(state.narrativeSession?.eventId).toBe('dusk-wary');

    state = choose(state, 'walk-away');
    expect(state.narrativeSession?.eventId).toBe('night-alone');

    state = choose(state, 'alone-summary');
    expect(state.narrativeSession).toBeNull();
    expect(state.flags['night.route.alone']).toBe(true);

    state = act(state, { type: 'needs.rest', mode: 'simple' });
    expect(state.world.day).toBe(2);
    expect(state.narrativeSession?.eventId).toBe('day-two-awakening');

    state = finishDayTwoIntro(state);
    expect(state.status).toBe('playing');
    expect(state.narrativeSession).toBeNull();
    expect(state.world.day).toBe(2);
    expect(state.flags['day2.started']).toBe(true);
    expect(state.flags['camp.alone']).toBe(true);
    expect(state.flags['camp.together']).not.toBe(true);
    expect(state.flags['mira.contact.avoided']).toBe(true);
    expect(toAppScreen(state)).toBe('exploration');
  });
});
