import { describe, expect, it } from 'vitest';
import { applyChoice, startGame } from '../core/engine';
import type { GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { loadFirstDayWorld } from '../modules/content';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import type { SandboxAction } from '../modules/sandbox-actions';
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

function advanceToDayFour(state: GameState): GameState {
  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  }
  expect(state.narrativeSession?.eventId).toBe('day-four-awakening');
  state = choose(state, 'day-four-look-around');
  return state;
}

function advanceToDayFiveAwakening(state: GameState): GameState {
  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  }
  expect(state.narrativeSession?.eventId).toBe('day-five-awakening');
  return choose(state, 'day-five-look-around');
}

function closeDayFive(state: GameState, stanceChoiceId?: string): GameState {
  if (state.narrativeSession?.eventId === 'day-five-group-conversation') {
    return choose(state, stanceChoiceId ?? 'day5-stance-undecided');
  }
  expect(state.narrativeSession?.eventId).toBe('day-five-alone-continue');
  return choose(state, 'day-five-alone-continue-choice');
}

function advanceToDaySixAwakening(state: GameState): GameState {
  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  }
  expect(state.narrativeSession?.eventId).toBe('day-six-awakening');
  return choose(state, 'day-six-look-around');
}

function closeDaySix(state: GameState, choiceId?: string): GameState {
  if (state.narrativeSession?.eventId === 'day-six-davi-question') {
    return choose(state, choiceId ?? 'day6-davi-self-choice');
  }
  expect(state.narrativeSession?.eventId).toBe('day-six-alone-continue');
  return choose(state, 'day-six-alone-continue-choice');
}

function advanceToDaySevenAwakening(state: GameState): GameState {
  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  }
  expect(state.narrativeSession?.eventId).toBe('day-seven-registry');
  return state;
}

/** Ana ajuda Davi até a Clareira, encontra Caio na Margem Rochosa e chega ao Dia 7 pela rota de cooperação. */
function reachDaySevenCooperating(): GameState {
  let state = newGame();
  for (const choiceId of [
    'awake-calm', 'system-touch', 'ability-perception', 'eteris-pressure', 'numen-follow-guidance',
  ]) state = choose(state, choiceId);
  state = act(state, { type: 'training.train', methodId: 'focused-perception-drill' });
  state = choose(state, 'first-numen-practice-continue');
  state = act(state, { type: 'exploration.explore' });
  state = act(state, { type: 'exploration.explore' });
  state = act(state, {
    type: 'presence.interact', presenceId: 'mira-awakening-clearing',
    interactionId: 'avoid-mira-awakening-clearing',
  });
  for (let guard = 0; state.narrativeSession === null && guard < 12; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  state = choose(state, 'assess-first-night');
  state = choose(state, 'walk-away');
  state = choose(state, 'alone-summary');
  state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  state = choose(state, 'day-two-assess');
  state = choose(state, 'day-two-alone-continue');

  state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
  for (let count = 0; count < 4 && state.narrativeSession === null; count += 1) {
    state = act(state, { type: 'exploration.explore' });
  }
  state = choose(state, 'follow-rocky-bank-signs');
  state = act(state, { type: 'navigation.move', locationId: 'rocky-bank' });
  state = act(state, {
    type: 'presence.interact', presenceId: 'caio-rocky-bank', interactionId: 'talk-caio-rocky-bank',
  });
  state = choose(state, 'caio-answer');
  state = choose(state, 'wary-check-davi');
  state = choose(state, 'offer-davi-help');
  state = act(state, {
    type: 'activity.perform', activityId: 'escort-davi-to-clearing', optionalParticipantIds: [],
  });
  state = choose(state, 'help-davi-settle');

  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  }
  state = choose(state, 'day-three-look-around');
  state = choose(state, 'day-three-cooperation-continue');

  state = advanceToDayFour(state);
  state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
  state = act(state, { type: 'navigation.move', locationId: 'awakening-clearing' });

  state = advanceToDayFiveAwakening(state);
  state = closeDayFive(state, 'day5-stance-collective');
  state = advanceToDaySixAwakening(state);
  state = closeDaySix(state, 'day6-davi-protected');

  state = advanceToDaySevenAwakening(state);
  return state;
}

/** Ana faz contato com Caio, recusa a responsabilidade por Davi e chega ao Dia 7 sem compromisso. */
function reachDaySevenIndependent(): GameState {
  let state = newGame();
  for (const choiceId of [
    'awake-calm', 'system-touch', 'ability-perception', 'eteris-pressure', 'numen-follow-guidance',
  ]) state = choose(state, choiceId);
  state = act(state, { type: 'training.train', methodId: 'focused-perception-drill' });
  state = choose(state, 'first-numen-practice-continue');
  state = act(state, { type: 'exploration.explore' });
  state = act(state, { type: 'exploration.explore' });
  state = act(state, {
    type: 'presence.interact', presenceId: 'mira-awakening-clearing',
    interactionId: 'avoid-mira-awakening-clearing',
  });
  for (let guard = 0; state.narrativeSession === null && guard < 12; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  state = choose(state, 'assess-first-night');
  state = choose(state, 'walk-away');
  state = choose(state, 'alone-summary');
  state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  state = choose(state, 'day-two-assess');
  state = choose(state, 'day-two-alone-continue');

  state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
  for (let count = 0; count < 4 && state.narrativeSession === null; count += 1) {
    state = act(state, { type: 'exploration.explore' });
  }
  state = choose(state, 'follow-rocky-bank-signs');
  state = act(state, { type: 'navigation.move', locationId: 'rocky-bank' });
  state = act(state, {
    type: 'presence.interact', presenceId: 'caio-rocky-bank', interactionId: 'talk-caio-rocky-bank',
  });
  state = choose(state, 'caio-answer');
  state = choose(state, 'wary-check-davi');
  state = choose(state, 'decline-davi-responsibility');

  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  }
  state = choose(state, 'day-three-look-around');
  state = choose(state, 'day-three-independent-continue');

  state = advanceToDayFour(state);
  state = advanceToDayFiveAwakening(state);
  state = closeDayFive(state, 'day5-stance-capable');
  state = advanceToDaySixAwakening(state);
  state = closeDaySix(state, 'day6-davi-equal-duty');

  state = advanceToDaySevenAwakening(state);
  return state;
}

/** Ana evita Caio e Davi na Margem Rochosa e chega ao Dia 7 sem contato conhecido. */
function reachDaySevenAtDistance(): GameState {
  let state = newGame();
  for (const choiceId of [
    'awake-calm', 'system-touch', 'ability-perception', 'eteris-pressure', 'numen-follow-guidance',
  ]) state = choose(state, choiceId);
  state = act(state, { type: 'training.train', methodId: 'focused-perception-drill' });
  state = choose(state, 'first-numen-practice-continue');
  state = act(state, { type: 'exploration.explore' });
  state = act(state, { type: 'exploration.explore' });
  state = act(state, {
    type: 'presence.interact', presenceId: 'mira-awakening-clearing',
    interactionId: 'avoid-mira-awakening-clearing',
  });
  for (let guard = 0; state.narrativeSession === null && guard < 12; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  state = choose(state, 'assess-first-night');
  state = choose(state, 'walk-away');
  state = choose(state, 'alone-summary');
  state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  state = choose(state, 'day-two-assess');
  state = choose(state, 'day-two-alone-continue');

  state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
  for (let count = 0; count < 4 && state.narrativeSession === null; count += 1) {
    state = act(state, { type: 'exploration.explore' });
  }
  state = choose(state, 'follow-rocky-bank-signs');
  state = act(state, { type: 'navigation.move', locationId: 'rocky-bank' });
  state = act(state, {
    type: 'presence.interact', presenceId: 'caio-rocky-bank', interactionId: 'avoid-caio-rocky-bank',
  });

  state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
  for (let count = 0; count < 3; count += 1) {
    state = act(state, { type: 'resource.collect', nodeId: 'spring', units: 1 });
  }
  state = act(state, { type: 'navigation.move', locationId: 'awakening-clearing' });
  state = act(state, { type: 'training.train', methodId: 'focused-perception-drill' });
  state = act(state, { type: 'needs.rest', mode: 'simple' });

  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  }
  state = choose(state, 'day-three-look-around');
  state = choose(state, 'day-three-distance-continue');

  state = advanceToDayFour(state);
  state = advanceToDayFiveAwakening(state);
  state = closeDayFive(state);
  state = advanceToDaySixAwakening(state);
  state = closeDaySix(state);

  state = advanceToDaySevenAwakening(state);
  return state;
}

/** Ana nunca visita a Margem Rochosa nem a Nascente e chega ao Dia 7 sozinha. */
function reachDaySevenSolo(): GameState {
  let state = newGame();
  for (const choiceId of [
    'awake-calm', 'system-touch', 'ability-perception', 'eteris-pressure', 'numen-follow-guidance',
  ]) state = choose(state, choiceId);
  state = act(state, { type: 'training.train', methodId: 'focused-perception-drill' });
  state = choose(state, 'first-numen-practice-continue');
  state = act(state, { type: 'exploration.explore' });
  state = act(state, { type: 'exploration.explore' });
  state = act(state, {
    type: 'presence.interact', presenceId: 'mira-awakening-clearing',
    interactionId: 'avoid-mira-awakening-clearing',
  });
  for (let guard = 0; state.narrativeSession === null && guard < 12; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  state = choose(state, 'assess-first-night');
  state = choose(state, 'walk-away');
  state = choose(state, 'alone-summary');
  state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  state = choose(state, 'day-two-assess');
  state = choose(state, 'day-two-alone-continue');

  for (let count = 0; count < 2; count += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  }
  state = choose(state, 'day-three-look-around');
  state = choose(state, 'day-three-solo-continue');

  state = advanceToDayFour(state);
  state = advanceToDayFiveAwakening(state);
  state = closeDayFive(state);
  state = advanceToDaySixAwakening(state);
  state = closeDaySix(state);

  state = advanceToDaySevenAwakening(state);
  expect(state.sandbox.navigation.discoveredLocationIds).not.toContain('rocky-bank');
  return state;
}

describe('Dia 7 — Registro regional (Fatia A)', () => {
  it('o Dia 7 só nasce depois de day6.started e é consumido uma única vez', () => {
    let state = reachDaySevenCooperating();
    expect(state.world.day).toBe(7);
    expect(state.flags['day7.started']).not.toBe(true);
    state = choose(state, 'day-seven-look-around');
    expect(state.flags['day7.started']).toBe(true);
    const after = act(state, { type: 'needs.rest', mode: 'simple' });
    expect(after.narrativeSession?.eventId).not.toBe('day-seven-registry');
  }, 30_000);

  it('a revelação chega às quatro rotas herdadas, sem depender de convivência estabelecida', () => {
    const cooperating = reachDaySevenCooperating();
    expect(cooperating.narrativeSession?.eventId).toBe('day-seven-registry');
    const independent = reachDaySevenIndependent();
    expect(independent.narrativeSession?.eventId).toBe('day-seven-registry');
    const distance = reachDaySevenAtDistance();
    expect(distance.narrativeSession?.eventId).toBe('day-seven-registry');
    expect(distance.flags['day2.survivors.contact']).not.toBe(true);
    const solo = reachDaySevenSolo();
    expect(solo.narrativeSession?.eventId).toBe('day-seven-registry');
    expect(solo.flags['day2.survivors.contact']).not.toBe(true);
  }, 30_000);
});

describe('Dia 7 — a revelação e o tópico de ajuda (Fatia B)', () => {
  it('regional-registry não está desbloqueado antes da escolha e passa a estar depois', () => {
    let state = reachDaySevenSolo();
    expect(state.guidance.unlockedTopicIds).not.toContain('regional-registry');
    state = choose(state, 'day-seven-look-around');
    expect(state.guidance.unlockedTopicIds).toContain('regional-registry');
    expect(state.flags['day7.started']).toBe(true);
  }, 30_000);

  it('o Sistema 20 (rankings/patentes locais da Clareira) continua funcionando sem alteração', () => {
    reachDaySevenCooperating();
    // Os rankings e patentes locais já existem desde o Dia 1; a revelação do Dia 7 não os substitui
    // nem exige recarregar o catálogo de Registro.
    expect(world.registry).toBeDefined();
    expect(world.registry.rankingById.has('local-exploration')).toBe(true);
    expect(world.registry.rankingById.has('local-combat')).toBe(true);
    expect(world.registry.patentById.has('clearing-scout')).toBe(true);
  }, 30_000);
});

describe('Dia 7 — playtest integrado e fechamento (Fatia C)', () => {
  it('rota de afastamento e rota sem encontro também recebem a revelação igualmente', () => {
    const distance = reachDaySevenAtDistance();
    expect(distance.narrativeSession?.eventId).toBe('day-seven-registry');
    const solo = reachDaySevenSolo();
    expect(solo.narrativeSession?.eventId).toBe('day-seven-registry');
  }, 30_000);

  it('save/reload depois da revelação preserva day7.started e o tópico desbloqueado, sem duplicar', () => {
    let state = reachDaySevenIndependent();
    const dayBefore = state.world.day;
    const minuteBefore = state.world.minute;

    state = choose(state, 'day-seven-look-around');
    expect(state.status).toBe('playing');
    expect(state.narrativeSession).toBeNull();
    expect(state.world.day).toBe(dayBefore);
    expect(state.world.minute).toBe(minuteBefore);
    expect(
      state.guidance.unlockedTopicIds.filter((id) => id === 'regional-registry'),
    ).toHaveLength(1);

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.world).toEqual(state.world);
    expect(loaded.state.flags['day7.started']).toBe(true);
    expect(
      loaded.state.guidance.unlockedTopicIds.filter((id) => id === 'regional-registry'),
    ).toHaveLength(1);
  }, 30_000);
});
