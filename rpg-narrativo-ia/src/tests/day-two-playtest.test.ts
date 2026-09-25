import { describe, expect, it } from 'vitest';
import { applyChoice, startGame } from '../core/engine';
import type { GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { loadFirstDayWorld } from '../modules/content';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import type { SandboxAction } from '../modules/sandbox-actions';
import { getObjectiveStatus } from '../modules/objectives';
import { attemptSandboxAction, resolveWorldNarrativeState } from '../ui/sandbox';
import { now } from './helpers';

const world = loadFirstDayWorld();
const campaign = world.campaign;
const context = createSandboxContextFromWorld(world);
const triggers = world.worldTriggers.definitions;

function newGame(): GameState {
  return startGame({ firstName: 'Ana', lastName: 'Cruz', sex: 'female' }, campaign, now, context, world.objectives);
}

function choose(state: GameState, choiceId: string): GameState {
  const prepared = resolveWorldNarrativeState(state, context, campaign, triggers).current;
  const transitioned = applyChoice(prepared, campaign, choiceId, now, world.objectives, context);
  return resolveWorldNarrativeState(transitioned, context, campaign, triggers).current;
}

function act(state: GameState, action: SandboxAction): GameState {
  const attempt = attemptSandboxAction(state, action, context, campaign, triggers, world.objectives);
  expect(attempt.ok, attempt.ok ? '' : attempt.error).toBe(true);
  if (!attempt.ok) throw new Error(attempt.error);
  return attempt.current;
}

function beginDayTwoAlone(): GameState {
  let state = newGame();
  for (const choiceId of [
    'awake-calm', 'system-touch', 'ability-perception', 'eteris-pressure', 'numen-follow-guidance',
  ]) state = choose(state, choiceId);
  state = act(state, { type: 'training.train', methodId: 'focused-perception-drill' });
  expect(state.narrativeSession?.eventId).toBe('first-numen-practice');
  state = choose(state, 'first-numen-practice-continue');

  state = act(state, { type: 'exploration.explore' });
  state = act(state, { type: 'exploration.explore' });
  expect(state.sandbox.presences.discoveredPresenceIds).toContain('mira-awakening-clearing');
  state = act(state, {
    type: 'presence.interact', presenceId: 'mira-awakening-clearing',
    interactionId: 'avoid-mira-awakening-clearing',
  });
  state = act(state, { type: 'exploration.explore' });
  expect(state.narrativeSession?.eventId).toBe('first-night');
  state = choose(state, 'assess-first-night');
  state = choose(state, 'walk-away');
  state = choose(state, 'alone-summary');
  state = act(state, { type: 'needs.rest', mode: 'simple' });
  expect(state.narrativeSession?.eventId).toBe('day-two-awakening');
  state = choose(state, 'day-two-assess');
  expect(state.narrativeSession?.eventId).toBe('day-two-alone');
  state = choose(state, 'day-two-alone-continue');
  expect(state.world).toEqual({ day: 2, period: 'manha' });
  expect(state.flags['day2.started']).toBe(true);
  expect(state.flags['camp.alone']).toBe(true);
  expect(state.flags['mira.contact.avoided']).toBe(true);
  return state;
}

function followDayTwoTracksToBank(state: GameState): GameState {
  state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
  for (let count = 0; count < 4 && state.narrativeSession === null; count += 1) {
    state = act(state, { type: 'exploration.explore' });
  }
  expect(state.narrativeSession?.eventId).toBe('day-two-human-tracks');
  state = choose(state, 'follow-rocky-bank-signs');
  expect(state.sandbox.navigation.discoveredLocationIds).toContain('rocky-bank');
  state = act(state, { type: 'navigation.move', locationId: 'rocky-bank' });
  expect(state.sandbox.presences.discoveredPresenceIds).toEqual(
    expect.arrayContaining(['caio-rocky-bank', 'davi-rocky-bank']),
  );
  return state;
}

function continueIntoDayThree(state: GameState, expectedEventId: string, choiceId: string): GameState {
  while (state.world.day < 3 && state.narrativeSession === null) {
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  expect(state.world.day).toBe(3);
  expect(state.narrativeSession?.eventId).toBe('day-three-awakening');
  state = choose(state, 'day-three-look-around');
  expect(state.narrativeSession?.eventId).toBe(expectedEventId);
  state = choose(state, choiceId);
  expect(state.world.day).toBe(3);
  expect(state.flags['day3.started']).toBe(true);
  expect(state.status).toBe('playing');
  expect(state.narrativeSession).toBeNull();
  return state;
}

describe('Fatia G — playtest integrado do Dia 2', () => {
  it('coopera com Caio e Davi, lida com água real, atravessa a noite e começa o Dia 3', () => {
    let state = followDayTwoTracksToBank(beginDayTwoAlone());
    state = act(state, {
      type: 'presence.interact', presenceId: 'caio-rocky-bank', interactionId: 'talk-caio-rocky-bank',
    });
    expect(state.narrativeSession?.eventId).toBe('caio-first-contact');
    state = choose(state, 'caio-answer');
    expect(state.narrativeSession?.eventId).toBe('caio-contact-after-mira-avoidance');
    state = choose(state, 'wary-check-davi');
    state = choose(state, 'offer-davi-help');
    expect(state.flags['day2.involvement.decided']).toBe(true);

    state = act(state, {
      type: 'activity.perform', activityId: 'escort-davi-to-clearing', optionalParticipantIds: [],
    });
    expect(state.narrativeSession?.eventId).toBe('davi-arrives-clearing');
    state = choose(state, 'help-davi-settle');
    expect(getObjectiveStatus(world.objectives, state.objectives, 'day-two-others')).toBe('completed');

    state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
    state = act(state, {
      type: 'activity.perform', activityId: 'discuss-water-with-caio', optionalParticipantIds: [],
    });
    expect(state.narrativeSession?.eventId).toBe('water-question');
    state = choose(state, 'water-use-share');
    expect(getObjectiveStatus(world.objectives, state.objectives, 'more-than-one-mouth')).toBe('active');
    state = act(state, { type: 'resource.collect', nodeId: 'spring', units: 1 });
    expect(state.inventory.find((entry) => entry.itemId === 'raw-water')?.quantity).toBe(1);
    expect(getObjectiveStatus(world.objectives, state.objectives, 'more-than-one-mouth')).toBe('completed');
    expect(state.world.period).toBe('noite');
    state = act(state, { type: 'needs.rest', mode: 'simple' });
    state = continueIntoDayThree(state, 'day-three-cooperation', 'day-three-cooperation-continue');
    expect(state.flags['day2.davi.escorted']).toBe(true);
    expect(state.flags['day2.water.position.shared']).toBe(true);
    expect(state.party.vitals).toEqual([]);

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.flags['day3.started']).toBe(true);
      expect(loaded.state.flags['day2.water.position.shared']).toBe(true);
      expect(loaded.state.world.day).toBe(3);
    }
  }, 30_000);

  it('evita os sobreviventes, segue a rotina de sobrevivência e vê que eles continuaram sem o jogador', () => {
    let state = followDayTwoTracksToBank(beginDayTwoAlone());
    state = act(state, {
      type: 'presence.interact', presenceId: 'caio-rocky-bank', interactionId: 'avoid-caio-rocky-bank',
    });
    expect(state.flags['day2.survivors.avoided']).toBe(true);
    expect(state.flags['day2.survivors.contact']).not.toBe(true);
    state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
    for (let count = 0; count < 3; count += 1) {
      state = act(state, { type: 'resource.collect', nodeId: 'spring', units: 1 });
    }
    state = act(state, { type: 'navigation.move', locationId: 'awakening-clearing' });
    state = act(state, { type: 'training.train', methodId: 'focused-perception-drill' });
    expect(state.world.period).toBe('noite');
    state = act(state, { type: 'needs.rest', mode: 'simple' });
    state = continueIntoDayThree(state, 'day-three-distance', 'day-three-distance-continue');
    expect(state.flags['day2.survivors.contact']).not.toBe(true);
    expect(state.flags['day2.survivors.avoided']).toBe(true);
    expect(state.sandbox.presences.resolvedPresenceIds).toContain('caio-rocky-bank');
    expect(state.party.vitals).toEqual([]);
  }, 30_000);

  it('não visita a Nascente nem encontra Caio e Davi, mas avança ao Dia 3 pelo relógio', () => {
    let state = beginDayTwoAlone();
    for (let count = 0; count < 2; count += 1) {
      state = act(state, { type: 'needs.rest', mode: 'simple' });
    }
    expect(state.world).toEqual({ day: 2, period: 'noite' });
    state = act(state, { type: 'needs.rest', mode: 'simple' });
    state = continueIntoDayThree(state, 'day-three-solo', 'day-three-solo-continue');
    expect(state.sandbox.navigation.discoveredLocationIds).not.toContain('rocky-bank');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('caio-rocky-bank');
    expect(state.flags['day2.survivors.contact']).not.toBe(true);
    expect(state.flags['day2.unmet-survivors-noted']).toBe(true);
    expect(state.party.vitals).toEqual([]);
  }, 30_000);
});
