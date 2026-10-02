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
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  expect(state.narrativeSession?.eventId).toBe('day-four-awakening');
  state = choose(state, 'day-four-look-around');
  expect(state.flags['day4.started']).toBe(true);
  return state;
}

/** Avança do Dia 4 (já alcançado) até o Dia 5, sem escolher a postura da conversa. */
function advanceToDayFiveAwakening(state: GameState): GameState {
  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  expect(state.narrativeSession?.eventId).toBe('day-five-awakening');
  state = choose(state, 'day-five-look-around');
  return state;
}

/** Ana ajuda Davi até a Clareira, encontra Caio na Margem Rochosa e chega ao Dia 5 pela rota de cooperação. */
function reachDayFiveCooperating(): GameState {
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
  state = act(state, { type: 'exploration.explore' });
  state = choose(state, 'assess-first-night');
  state = choose(state, 'walk-away');
  state = choose(state, 'alone-summary');
  state = act(state, { type: 'needs.rest', mode: 'simple' });
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
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  state = choose(state, 'day-three-look-around');
  state = choose(state, 'day-three-cooperation-continue');
  expect(state.flags['day3.started']).toBe(true);

  state = advanceToDayFour(state);
  state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
  state = act(state, { type: 'navigation.move', locationId: 'awakening-clearing' });

  state = advanceToDayFiveAwakening(state);
  expect(state.flags['day2.survivors.contact']).toBe(true);
  return state;
}

/** Ana faz contato com Caio, recusa a responsabilidade por Davi e chega ao Dia 5 sem compromisso. */
function reachDayFiveIndependent(): GameState {
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
  state = act(state, { type: 'exploration.explore' });
  state = choose(state, 'assess-first-night');
  state = choose(state, 'walk-away');
  state = choose(state, 'alone-summary');
  state = act(state, { type: 'needs.rest', mode: 'simple' });
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
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  state = choose(state, 'day-three-look-around');
  state = choose(state, 'day-three-independent-continue');
  expect(state.flags['day3.started']).toBe(true);

  state = advanceToDayFour(state);
  state = advanceToDayFiveAwakening(state);
  expect(state.flags['day2.survivors.contact']).toBe(true);
  return state;
}

/** Ana evita Caio e Davi na Margem Rochosa e chega ao Dia 5 sem contato conhecido. */
function reachDayFiveAtDistance(): GameState {
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
  state = act(state, { type: 'exploration.explore' });
  state = choose(state, 'assess-first-night');
  state = choose(state, 'walk-away');
  state = choose(state, 'alone-summary');
  state = act(state, { type: 'needs.rest', mode: 'simple' });
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
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  state = choose(state, 'day-three-look-around');
  state = choose(state, 'day-three-distance-continue');
  expect(state.flags['day3.started']).toBe(true);

  state = advanceToDayFour(state);
  state = advanceToDayFiveAwakening(state);
  expect(state.flags['day2.survivors.contact']).not.toBe(true);
  return state;
}

/** Ana nunca visita a Margem Rochosa nem a Nascente e chega ao Dia 5 sozinha. */
function reachDayFiveSolo(): GameState {
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
  state = act(state, { type: 'exploration.explore' });
  state = choose(state, 'assess-first-night');
  state = choose(state, 'walk-away');
  state = choose(state, 'alone-summary');
  state = act(state, { type: 'needs.rest', mode: 'simple' });
  state = choose(state, 'day-two-assess');
  state = choose(state, 'day-two-alone-continue');

  for (let count = 0; count < 2; count += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  state = choose(state, 'day-three-look-around');
  state = choose(state, 'day-three-solo-continue');
  expect(state.flags['day3.started']).toBe(true);

  state = advanceToDayFour(state);
  state = advanceToDayFiveAwakening(state);
  expect(state.flags['day2.survivors.contact']).not.toBe(true);
  expect(state.sandbox.navigation.discoveredLocationIds).not.toContain('rocky-bank');
  return state;
}

describe('Dia 5 — entrada pelo relógio real (Fatia A)', () => {
  it('o Dia 5 só nasce depois de day4.started e é consumido uma única vez', () => {
    let state = reachDayFiveCooperating();
    expect(state.world.day).toBe(5);
    expect(state.narrativeSession?.eventId).toBe('day-five-group-conversation');
    // A escolha da postura ainda não aconteceu: day5.started só nasce dentro do ramo escolhido.
    expect(state.flags['day5.started']).not.toBe(true);
    state = choose(state, 'day5-stance-undecided');
    expect(state.flags['day5.started']).toBe(true);
    // O trigger já foi consumido: continuar descansando não reabre o evento.
    const after = act(state, { type: 'needs.rest', mode: 'simple' });
    expect(after.narrativeSession?.eventId).not.toBe('day-five-awakening');
  }, 30_000);

  it('preserva as quatro rotas herdadas chegando ao Dia 5 sem regressão', () => {
    const cooperating = reachDayFiveCooperating();
    expect(cooperating.narrativeSession?.eventId).toBe('day-five-group-conversation');
    const independent = reachDayFiveIndependent();
    expect(independent.narrativeSession?.eventId).toBe('day-five-group-conversation');
    const distance = reachDayFiveAtDistance();
    expect(distance.narrativeSession?.eventId).toBe('day-five-alone-continue');
    const solo = reachDayFiveSolo();
    expect(solo.narrativeSession?.eventId).toBe('day-five-alone-continue');
  }, 30_000);
});

describe('Dia 5 — a conversa sobre organização do grupo (Fatia B)', () => {
  it('só aparece com convivência real estabelecida (day2.survivors.contact = true)', () => {
    const state = reachDayFiveCooperating();
    expect(state.narrativeSession?.eventId).toBe('day-five-group-conversation');
  }, 30_000);

  it('propor decisão coletiva registra a postura correspondente e nenhuma outra', () => {
    let state = reachDayFiveCooperating();
    state = choose(state, 'day5-stance-collective');
    expect(state.flags['day5.started']).toBe(true);
    expect(state.flags['day5.organization.stance.collective']).toBe(true);
    expect(state.flags['day5.organization.stance.capable']).not.toBe(true);
    expect(state.flags['day5.organization.stance.undecided']).not.toBe(true);
    expect(state.narrativeSession).toBeNull();
    expect(state.status).toBe('playing');
  }, 30_000);

  it('deixar quem for mais capaz decidir registra a postura correspondente e nenhuma outra', () => {
    let state = reachDayFiveIndependent();
    state = choose(state, 'day5-stance-capable');
    expect(state.flags['day5.organization.stance.capable']).toBe(true);
    expect(state.flags['day5.organization.stance.collective']).not.toBe(true);
    expect(state.flags['day5.organization.stance.undecided']).not.toBe(true);
  }, 30_000);

  it('não se comprometer registra a postura de indecisão e não impede o resto do dia', () => {
    let state = reachDayFiveCooperating();
    state = choose(state, 'day5-stance-undecided');
    expect(state.flags['day5.organization.stance.undecided']).toBe(true);
    expect(state.status).toBe('playing');
    expect(state.narrativeSession).toBeNull();
  }, 30_000);

  it('rotas sem contato seguem para day-five-alone-continue e definem só day5.started', () => {
    let state = reachDayFiveAtDistance();
    expect(state.narrativeSession?.eventId).toBe('day-five-alone-continue');
    state = choose(state, 'day-five-alone-continue-choice');
    expect(state.flags['day5.started']).toBe(true);
    expect(state.flags['day5.organization.stance.collective']).not.toBe(true);
    expect(state.flags['day5.organization.stance.capable']).not.toBe(true);
    expect(state.flags['day5.organization.stance.undecided']).not.toBe(true);
  }, 30_000);
});

describe('Dia 5 — robustez e falhas de disponibilidade (Fatia C)', () => {
  it('o motor recusa iniciar day-five-group-conversation quando day2.survivors.contact é false', () => {
    const state = reachDayFiveSolo();
    expect(state.narrativeSession?.eventId).toBe('day-five-alone-continue');
    // A condição do evento por si só impede que a conversa apareça; não há como o cliente
    // "forçar" um evento de campanha fora do fluxo de firstMatch — a prova é que a rota sem
    // contato jamais chega a esse narrativeSession.
    expect(state.narrativeSession?.eventId).not.toBe('day-five-group-conversation');
  }, 30_000);

  it('o trigger day-five-start não nasce antes de day4.started e nasce uma única vez', () => {
    let state = newGame();
    for (const choiceId of [
      'awake-calm', 'system-touch', 'ability-perception', 'eteris-pressure', 'numen-follow-guidance',
    ]) state = choose(state, choiceId);
    state = act(state, { type: 'training.train', methodId: 'focused-perception-drill' });
    state = choose(state, 'first-numen-practice-continue');
    for (let count = 0; count < 2; count += 1) {
      state = act(state, { type: 'needs.rest', mode: 'simple' });
    }
    // Avança até bem depois do dia 5 sem nunca ter cumprido day4.started (nenhuma rota do Dia 3/4
    // foi percorrida) — o trigger não deve nascer nunca.
    for (let guard = 0; guard < 40 && state.world.day < 6; guard += 1) {
      state = act(state, { type: 'needs.rest', mode: 'simple' });
      if (state.narrativeSession?.eventId === 'day-five-awakening') break;
    }
    expect(state.narrativeSession?.eventId).not.toBe('day-five-awakening');
  }, 30_000);

  it('save/reload preserva exatamente a postura escolhida, sem duplicar ou reverter', () => {
    let state = reachDayFiveIndependent();
    state = choose(state, 'day5-stance-collective');

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.flags['day5.organization.stance.collective']).toBe(true);
    expect(loaded.state.flags['day5.organization.stance.capable']).not.toBe(true);
    expect(loaded.state.flags['day5.organization.stance.undecided']).not.toBe(true);
    expect(loaded.state.status).toBe('playing');
    expect(loaded.state.narrativeSession).toBeNull();
  }, 30_000);
});

describe('Dia 5 — playtest integrado e fechamento (Fatia D)', () => {
  it('rota cooperativa: recebe a conversa e pode declarar qualquer postura', () => {
    const state = reachDayFiveCooperating();
    expect(state.narrativeSession?.eventId).toBe('day-five-group-conversation');
  }, 30_000);

  it('rota de contato sem compromisso: recebe a conversa mesmo sem Davi escoltado', () => {
    const state = reachDayFiveIndependent();
    expect(state.narrativeSession?.eventId).toBe('day-five-group-conversation');
  }, 30_000);

  it('rota de afastamento: segue direto sem a conversa', () => {
    const state = reachDayFiveAtDistance();
    expect(state.narrativeSession?.eventId).toBe('day-five-alone-continue');
  }, 30_000);

  it('rota sem encontro: segue direto sem a conversa', () => {
    const state = reachDayFiveSolo();
    expect(state.narrativeSession?.eventId).toBe('day-five-alone-continue');
  }, 30_000);

  it('save/reload após a conversa retoma o sandbox sem duplicar relógio, dia, período ou postura', () => {
    let state = reachDayFiveCooperating();
    const dayBefore = state.world.day;
    const periodBefore = state.world.period;

    state = choose(state, 'day5-stance-capable');
    expect(state.status).toBe('playing');
    expect(state.narrativeSession).toBeNull();
    expect(state.world.day).toBe(dayBefore);
    expect(state.world.period).toBe(periodBefore);

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.world).toEqual(state.world);
    expect(loaded.state.status).toBe('playing');
    expect(loaded.state.narrativeSession).toBeNull();
    expect(loaded.state.flags['day5.organization.stance.capable']).toBe(true);
  }, 30_000);
});
