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
  expect(state.flags['day4.started']).toBe(true);
  return state;
}

function advanceToDayFiveAwakening(state: GameState): GameState {
  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  }
  expect(state.narrativeSession?.eventId).toBe('day-five-awakening');
  state = choose(state, 'day-five-look-around');
  return state;
}

/** Fecha a conversa do Dia 5 escolhendo a postura indicada quando ela aparecer, ou segue direto quando não há. */
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
  state = choose(state, 'day-six-look-around');
  return state;
}

/** Ana ajuda Davi até a Clareira, encontra Caio na Margem Rochosa e chega ao Dia 6 pela rota de cooperação. */
function reachDaySixCooperating(): GameState {
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
  expect(state.flags['day3.started']).toBe(true);

  state = advanceToDayFour(state);
  state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
  state = act(state, { type: 'navigation.move', locationId: 'awakening-clearing' });

  state = advanceToDayFiveAwakening(state);
  state = closeDayFive(state, 'day5-stance-collective');
  expect(state.flags['day5.started']).toBe(true);

  state = advanceToDaySixAwakening(state);
  expect(state.flags['day2.survivors.contact']).toBe(true);
  return state;
}

/** Ana faz contato com Caio, recusa a responsabilidade por Davi e chega ao Dia 6 sem compromisso. */
function reachDaySixIndependent(): GameState {
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
  expect(state.flags['day2.survivors.contact']).toBe(true);
  expect(state.flags['day2.davi.escorted']).not.toBe(true);

  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  }
  state = choose(state, 'day-three-look-around');
  state = choose(state, 'day-three-independent-continue');
  expect(state.flags['day3.started']).toBe(true);

  state = advanceToDayFour(state);
  state = advanceToDayFiveAwakening(state);
  state = closeDayFive(state, 'day5-stance-capable');

  state = advanceToDaySixAwakening(state);
  expect(state.flags['day2.survivors.contact']).toBe(true);
  return state;
}

/** Ana evita Caio e Davi na Margem Rochosa e chega ao Dia 6 sem contato conhecido. */
function reachDaySixAtDistance(): GameState {
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
  expect(state.flags['day2.survivors.avoided']).toBe(true);
  expect(state.flags['day2.survivors.contact']).not.toBe(true);

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
  expect(state.flags['day3.started']).toBe(true);

  state = advanceToDayFour(state);
  state = advanceToDayFiveAwakening(state);
  state = closeDayFive(state);

  state = advanceToDaySixAwakening(state);
  expect(state.flags['day2.survivors.contact']).not.toBe(true);
  return state;
}

/** Ana nunca visita a Margem Rochosa nem a Nascente e chega ao Dia 6 sozinha. */
function reachDaySixSolo(): GameState {
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
  expect(state.flags['day3.started']).toBe(true);

  state = advanceToDayFour(state);
  state = advanceToDayFiveAwakening(state);
  state = closeDayFive(state);

  state = advanceToDaySixAwakening(state);
  expect(state.flags['day2.survivors.contact']).not.toBe(true);
  expect(state.sandbox.navigation.discoveredLocationIds).not.toContain('rocky-bank');
  return state;
}

describe('Dia 6 — entrada pelo relógio real (Fatia A)', () => {
  it('o Dia 6 só nasce depois de day5.started e é consumido uma única vez', () => {
    let state = reachDaySixCooperating();
    expect(state.world.day).toBe(6);
    expect(state.narrativeSession?.eventId).toBe('day-six-davi-question');
    expect(state.flags['day6.started']).not.toBe(true);
    state = choose(state, 'day6-davi-self-choice');
    expect(state.flags['day6.started']).toBe(true);
    const after = act(state, { type: 'needs.rest', mode: 'simple' });
    expect(after.narrativeSession?.eventId).not.toBe('day-six-awakening');
  }, 30_000);

  it('preserva as quatro rotas herdadas chegando ao Dia 6 sem regressão', () => {
    const cooperating = reachDaySixCooperating();
    expect(cooperating.narrativeSession?.eventId).toBe('day-six-davi-question');
    const independent = reachDaySixIndependent();
    expect(independent.narrativeSession?.eventId).toBe('day-six-davi-question');
    const distance = reachDaySixAtDistance();
    expect(distance.narrativeSession?.eventId).toBe('day-six-alone-continue');
    const solo = reachDaySixSolo();
    expect(solo.narrativeSession?.eventId).toBe('day-six-alone-continue');
  }, 30_000);
});

describe('Dia 6 — o caso concreto de Davi (Fatia B)', () => {
  it('só aparece com convivência real estabelecida (day2.survivors.contact = true)', () => {
    const state = reachDaySixCooperating();
    expect(state.narrativeSession?.eventId).toBe('day-six-davi-question');
  }, 30_000);

  it('defender que Davi seja poupado registra a saída correspondente e nenhuma outra', () => {
    let state = reachDaySixCooperating();
    state = choose(state, 'day6-davi-protected');
    expect(state.flags['day6.started']).toBe(true);
    expect(state.flags['day6.davi.priority.protected']).toBe(true);
    expect(state.flags['day6.davi.priority.equal-duty']).not.toBe(true);
    expect(state.flags['day6.davi.priority.self-choice']).not.toBe(true);
    expect(state.narrativeSession).toBeNull();
    expect(state.status).toBe('playing');
  }, 30_000);

  it('dizer que Davi deveria contribuir igual registra a saída correspondente e nenhuma outra', () => {
    let state = reachDaySixIndependent();
    state = choose(state, 'day6-davi-equal-duty');
    expect(state.flags['day6.davi.priority.equal-duty']).toBe(true);
    expect(state.flags['day6.davi.priority.protected']).not.toBe(true);
    expect(state.flags['day6.davi.priority.self-choice']).not.toBe(true);
  }, 30_000);

  it('devolver a decisão a Davi registra a saída correspondente e não trava o resto do dia', () => {
    let state = reachDaySixCooperating();
    state = choose(state, 'day6-davi-self-choice');
    expect(state.flags['day6.davi.priority.self-choice']).toBe(true);
    expect(state.status).toBe('playing');
    expect(state.narrativeSession).toBeNull();
  }, 30_000);

  it('a postura declarada no Dia 5 não trava as saídas do Dia 6: postura coletiva seguida de saída de tratamento igual', () => {
    // reachDaySixCooperating fecha o Dia 5 com 'day5-stance-collective'; escolher 'equal-duty' aqui
    // (uma leitura mais individualista do caso concreto) precisa ser aceito normalmente.
    let state = reachDaySixCooperating();
    expect(state.flags['day5.organization.stance.collective']).toBe(true);
    state = choose(state, 'day6-davi-equal-duty');
    expect(state.flags['day6.davi.priority.equal-duty']).toBe(true);
    expect(state.status).toBe('playing');
  }, 30_000);

  it('rotas sem contato seguem para day-six-alone-continue e definem só day6.started', () => {
    let state = reachDaySixAtDistance();
    expect(state.narrativeSession?.eventId).toBe('day-six-alone-continue');
    state = choose(state, 'day-six-alone-continue-choice');
    expect(state.flags['day6.started']).toBe(true);
    expect(state.flags['day6.davi.priority.protected']).not.toBe(true);
    expect(state.flags['day6.davi.priority.equal-duty']).not.toBe(true);
    expect(state.flags['day6.davi.priority.self-choice']).not.toBe(true);
  }, 30_000);
});

describe('Dia 6 — robustez e falhas de disponibilidade (Fatia C)', () => {
  it('a rota sem encontro jamais chega a day-six-davi-question', () => {
    const state = reachDaySixSolo();
    expect(state.narrativeSession?.eventId).toBe('day-six-alone-continue');
    expect(state.narrativeSession?.eventId).not.toBe('day-six-davi-question');
  }, 30_000);

  it('o trigger day-six-start não nasce antes de day5.started e nasce uma única vez', () => {
    let state = newGame();
    for (const choiceId of [
      'awake-calm', 'system-touch', 'ability-perception', 'eteris-pressure', 'numen-follow-guidance',
    ]) state = choose(state, choiceId);
    state = act(state, { type: 'training.train', methodId: 'focused-perception-drill' });
    state = choose(state, 'first-numen-practice-continue');
    for (let count = 0; count < 2; count += 1) {
      state = act(state, { type: 'needs.rest', mode: 'simple' });
    }
    for (let guard = 0; guard < 50 && state.world.day < 7; guard += 1) {
      state = act(state, { type: 'needs.rest', mode: 'simple' });
      if (state.narrativeSession?.eventId === 'day-six-awakening') break;
    }
    expect(state.narrativeSession?.eventId).not.toBe('day-six-awakening');
  }, 30_000);

  it('save/reload preserva exatamente a saída escolhida, sem duplicar ou reverter', () => {
    let state = reachDaySixIndependent();
    state = choose(state, 'day6-davi-protected');

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.flags['day6.davi.priority.protected']).toBe(true);
    expect(loaded.state.flags['day6.davi.priority.equal-duty']).not.toBe(true);
    expect(loaded.state.flags['day6.davi.priority.self-choice']).not.toBe(true);
    expect(loaded.state.status).toBe('playing');
    expect(loaded.state.narrativeSession).toBeNull();
  }, 30_000);
});

describe('Dia 6 — playtest integrado e fechamento (Fatia D)', () => {
  it('rota cooperativa: recebe o caso concreto de Davi', () => {
    const state = reachDaySixCooperating();
    expect(state.narrativeSession?.eventId).toBe('day-six-davi-question');
  }, 30_000);

  it('rota de contato sem compromisso: recebe o caso concreto mesmo sem Davi escoltado', () => {
    const state = reachDaySixIndependent();
    expect(state.narrativeSession?.eventId).toBe('day-six-davi-question');
  }, 30_000);

  it('rota de afastamento: segue direto sem o caso concreto', () => {
    const state = reachDaySixAtDistance();
    expect(state.narrativeSession?.eventId).toBe('day-six-alone-continue');
  }, 30_000);

  it('rota sem encontro: segue direto sem o caso concreto', () => {
    const state = reachDaySixSolo();
    expect(state.narrativeSession?.eventId).toBe('day-six-alone-continue');
  }, 30_000);

  it('save/reload após a escolha retoma o sandbox sem duplicar relógio, dia, período ou saída', () => {
    let state = reachDaySixCooperating();
    const dayBefore = state.world.day;
    const minuteBefore = state.world.minute;

    state = choose(state, 'day6-davi-equal-duty');
    expect(state.status).toBe('playing');
    expect(state.narrativeSession).toBeNull();
    expect(state.world.day).toBe(dayBefore);
    expect(state.world.minute).toBe(minuteBefore);

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.world).toEqual(state.world);
    expect(loaded.state.status).toBe('playing');
    expect(loaded.state.narrativeSession).toBeNull();
    expect(loaded.state.flags['day6.davi.priority.equal-duty']).toBe(true);
  }, 30_000);
});
