import { describe, expect, it } from 'vitest';
import { applyChoice, startGame } from '../core/engine';
import type { GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { listKnownContextualActivities } from '../modules/activities';
import { loadFirstDayWorld } from '../modules/content';
import { getTrust } from '../modules/relationships';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import type { SandboxAction } from '../modules/sandbox-actions';
import { attemptSandboxAction, resolveWorldNarrativeState } from '../ui/sandbox';
import { now } from './helpers';

const world = loadFirstDayWorld();
const campaign = world.campaign;
const context = createSandboxContextFromWorld(world);
const triggers = world.worldTriggers.definitions;
const activitiesCatalog = context.activities;
const npcCatalog = context.npcs;
if (!activitiesCatalog || !npcCatalog) {
  throw new Error('O pack first-day precisa expor catálogos de atividades e NPCs para este playtest.');
}

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

function tryAct(state: GameState, action: SandboxAction) {
  return attemptSandboxAction(state, action, context, campaign, triggers, world.objectives);
}

function advanceToDayFour(state: GameState): GameState {
  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  }
  expect(state.narrativeSession?.eventId).toBe('day-four-awakening');
  state = choose(state, 'day-four-look-around');
  expect(state.flags['day4.started']).toBe(true);
  expect(state.status).toBe('playing');
  expect(state.narrativeSession).toBeNull();
  return state;
}

/** Ana ajuda Davi até a Clareira, encontra Caio na Margem Rochosa e chega ao Dia 4 pela rota de cooperação. */
function reachDayFourCooperating(): GameState {
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
  expect(state.narrativeSession?.eventId).toBe('day-three-awakening');
  state = choose(state, 'day-three-look-around');
  expect(state.narrativeSession?.eventId).toBe('day-three-cooperation');
  state = choose(state, 'day-three-cooperation-continue');
  expect(state.flags['day3.started']).toBe(true);

  state = advanceToDayFour(state);
  expect(state.flags['day2.davi.escorted']).toBe(true);
  // Davi foi escoltado até a Clareira no Dia 2 e permanece lá por relocação persistente,
  // não pela agenda comum; o jogador precisa ir até ele.
  state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
  state = act(state, { type: 'navigation.move', locationId: 'awakening-clearing' });
  return state;
}

/** Ana faz contato com Caio, recusa a responsabilidade por Davi e chega ao Dia 4 sem compromisso. */
function reachDayFourIndependent(): GameState {
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
  expect(state.flags['day2.davi.escorted']).not.toBe(true);
  expect(state.flags['day2.survivors.contact']).toBe(true);

  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  }
  expect(state.narrativeSession?.eventId).toBe('day-three-awakening');
  state = choose(state, 'day-three-look-around');
  expect(state.narrativeSession?.eventId).toBe('day-three-independent');
  state = choose(state, 'day-three-independent-continue');
  expect(state.flags['day3.started']).toBe(true);

  state = advanceToDayFour(state);
  return state;
}

/** Ana evita Caio e Davi na Margem Rochosa e chega ao Dia 4 sem contato conhecido. */
function reachDayFourAtDistance(): GameState {
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
  expect(state.narrativeSession?.eventId).toBe('day-three-awakening');
  state = choose(state, 'day-three-look-around');
  expect(state.narrativeSession?.eventId).toBe('day-three-distance');
  state = choose(state, 'day-three-distance-continue');
  expect(state.flags['day3.started']).toBe(true);
  expect(state.flags['day2.survivors.contact']).not.toBe(true);

  state = advanceToDayFour(state);
  expect(state.flags['day2.survivors.contact']).not.toBe(true);
  return state;
}

/** Ana nunca visita a Margem Rochosa nem a Nascente e chega ao Dia 4 sozinha. */
function reachDayFourSolo(): GameState {
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
  expect(state.narrativeSession?.eventId).toBe('day-three-awakening');
  state = choose(state, 'day-three-look-around');
  expect(state.narrativeSession?.eventId).toBe('day-three-solo');
  state = choose(state, 'day-three-solo-continue');
  expect(state.flags['day3.started']).toBe(true);

  state = advanceToDayFour(state);
  expect(state.flags['day2.survivors.contact']).not.toBe(true);
  expect(state.sandbox.navigation.discoveredLocationIds).not.toContain('rocky-bank');
  return state;
}

describe('Dia 4 — entrada pelo relógio real (Fatia A)', () => {
  it('o Dia 4 só nasce depois de day3.started e é consumido uma única vez', () => {
    const state = reachDayFourCooperating();
    expect(state.world.day).toBe(4);
    expect(state.flags['day4.started']).toBe(true);
    // O trigger já foi consumido: continuar descansando não reabre o evento.
    const after = act(state, { type: 'needs.rest', mode: 'simple' });
    expect(after.narrativeSession?.eventId).not.toBe('day-four-awakening');
  }, 30_000);

  it('preserva as quatro rotas do Dia 3 chegando ao Dia 4 sem regressão', () => {
    const cooperating = reachDayFourCooperating();
    expect(cooperating.flags['day2.davi.escorted']).toBe(true);
    const independent = reachDayFourIndependent();
    expect(independent.flags['day2.survivors.contact']).toBe(true);
    expect(independent.flags['day2.davi.escorted']).not.toBe(true);
    const distance = reachDayFourAtDistance();
    expect(distance.flags['day2.survivors.avoided']).toBe(true);
    const solo = reachDayFourSolo();
    expect(solo.flags['day2.unmet-survivors-noted']).toBe(true);
  }, 30_000);
});

describe('Dia 4 — cuidar do ferimento de Davi (Fatia B)', () => {
  it('fica indisponível antes do Dia 4, mesmo com Davi conhecido e presente', () => {
    // Reaproveita o estado do Dia 3 (day3.started, mas ainda sem day4.started).
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
    expect(state.flags['day4.started']).not.toBe(true);
    expect(state.flags['day2.davi.escorted']).toBe(true);
    state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
    state = act(state, { type: 'navigation.move', locationId: 'awakening-clearing' });

    const attempt = tryAct(state, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio', optionalParticipantIds: [],
    });
    expect(attempt.ok).toBe(false);
  }, 30_000);

  it('cuida com paciência, ganha mais confiança de Davi e bloqueia uma segunda execução', () => {
    let state = reachDayFourCooperating();
    const trustBefore = getTrust(state.relationships, 'davi-moura');

    state = act(state, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio', optionalParticipantIds: [],
    });
    expect(state.narrativeSession?.eventId).toBe('davi-wound-care');
    state = choose(state, 'care-with-patience');
    expect(state.narrativeSession).toBeNull();
    expect(state.flags['day4.davi.care.covered']).toBe(true);
    expect(state.flags['day4.davi.care.attentive']).toBe(true);
    expect(getTrust(state.relationships, 'davi-moura')).toBeGreaterThan(trustBefore);
    expect(state.activities.consumedActivityIds).toContain('tend-davi-wound-with-caio');

    const second = tryAct(state, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio', optionalParticipantIds: [],
    });
    expect(second.ok).toBe(false);

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.activities.consumedActivityIds).toContain('tend-davi-wound-with-caio');
      expect(getTrust(loaded.state.relationships, 'davi-moura')).toBe(
        getTrust(state.relationships, 'davi-moura'),
      );
    }
  }, 30_000);

  it('cuida rápido, com um ganho de confiança menor do que a atenção plena', () => {
    let state = reachDayFourCooperating();
    state = act(state, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio', optionalParticipantIds: [],
    });
    state = choose(state, 'care-quickly');
    expect(state.flags['day4.davi.care.quick']).toBe(true);
    expect(state.flags['day4.davi.care.attentive']).not.toBe(true);
    expect(getTrust(state.relationships, 'davi-moura')).toBeGreaterThan(0);
  }, 30_000);

  it('adiar o cuidado não altera a relação nem impede o resto do Dia 4', () => {
    let state = reachDayFourCooperating();
    const trustBefore = getTrust(state.relationships, 'davi-moura');
    state = act(state, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio', optionalParticipantIds: [],
    });
    state = choose(state, 'postpone-davi-care');
    expect(state.flags['day4.davi.care.declined']).toBe(true);
    expect(state.flags['day4.davi.care.covered']).not.toBe(true);
    expect(getTrust(state.relationships, 'davi-moura')).toBe(trustBefore);
    expect(state.status).toBe('playing');
  }, 30_000);

  it('o contato conhecido sem compromisso não dá acesso ao cuidado: Davi nunca foi escoltado até a Clareira', () => {
    // Sem escort-davi-to-clearing, Davi permanece na própria agenda (Margem Rochosa) em vez de ir
    // para a Clareira, e o requisito day2.davi.escorted nunca foi definido nessa rota. Navegar até
    // a Clareira mesmo assim isola o motivo real: o requisito, não apenas a localização do jogador.
    let state = reachDayFourIndependent();
    expect(state.flags['day2.davi.escorted']).not.toBe(true);
    state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
    state = act(state, { type: 'navigation.move', locationId: 'awakening-clearing' });
    const known = listKnownContextualActivities(activitiesCatalog, state.activities, state, npcCatalog);
    const wound = known.find((entry) => entry.activity.id === 'tend-davi-wound-with-caio');
    // Falar com Caio também deixou Davi "conhecido" (npc.rememberFact em talk-caio-rocky-bank),
    // então a atividade permanece na listagem — mas bloqueada, porque ele nunca foi escoltado.
    expect(wound?.available).toBe(false);
  }, 30_000);
});

describe('Dia 4 — robustez e falhas de disponibilidade (Fatia C)', () => {
  it('bloqueia a execução sem mutar estado quando o jogador não está na Clareira, mesmo com Davi escoltado', () => {
    let state = reachDayFourCooperating();
    expect(state.sandbox.navigation.currentLocationId).toBe('awakening-clearing');
    state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });

    const before = state;
    const attempt = tryAct(before, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio', optionalParticipantIds: [],
    });
    expect(attempt.ok).toBe(false);
    expect(before.flags['day4.davi.care.covered']).not.toBe(true);
    expect(before.activities.consumedActivityIds).not.toContain('tend-davi-wound-with-caio');
  }, 30_000);

  it('Caio só é elegível como testemunha opcional quando a própria agenda o traz à Clareira (entardecer)', () => {
    let state = reachDayFourCooperating();
    const early = listKnownContextualActivities(activitiesCatalog, state.activities, state, npcCatalog);
    const woundEarly = early.find((entry) => entry.activity.id === 'tend-davi-wound-with-caio');
    expect(woundEarly?.available).toBe(true);
    expect(woundEarly?.eligibleOptionalNpcIds).not.toContain('caio-nascimento');

    // O jogador descansa (2 h por vez) até o entardecer, quando a agenda traz Caio à Clareira.
    while (state.world.period !== 'entardecer') {
      state = act(state, { type: 'needs.rest', mode: 'simple' });
    }
    expect(state.world.period).toBe('entardecer');
    const atEntardecer = listKnownContextualActivities(activitiesCatalog, state.activities, state, npcCatalog);
    const woundLater = atEntardecer.find((entry) => entry.activity.id === 'tend-davi-wound-with-caio');
    expect(woundLater?.eligibleOptionalNpcIds).toContain('caio-nascimento');

    state = act(state, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio',
      optionalParticipantIds: ['caio-nascimento'],
    });
    expect(state.narrativeSession?.eventId).toBe('davi-wound-care');
  }, 30_000);

  it('recusa a atividade sem contato conhecido, mesmo que o cliente force a ação', () => {
    const state = reachDayFourAtDistance();

    const attempt = tryAct(state, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio', optionalParticipantIds: ['caio-nascimento'],
    });
    expect(attempt.ok).toBe(false);
    expect(state.flags['day2.davi.escorted']).not.toBe(true);
    expect(state.flags['day4.davi.care.covered']).not.toBe(true);
  }, 30_000);

  it('preserva a rota sem encontro: tentar a atividade não cria presença nem contato', () => {
    const state = reachDayFourSolo();

    const attempt = tryAct(state, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio', optionalParticipantIds: [],
    });
    expect(attempt.ok).toBe(false);
    expect(state.sandbox.navigation.discoveredLocationIds).not.toContain('rocky-bank');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('davi-rocky-bank');
    expect(state.flags['day2.survivors.contact']).not.toBe(true);
  }, 30_000);

  it('save/reload preserva a ramificação de cuidado rápido sem duplicar consumo nem confiança', () => {
    let state = reachDayFourCooperating();
    state = act(state, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio', optionalParticipantIds: [],
    });
    state = choose(state, 'care-quickly');
    const trustAfterQuick = getTrust(state.relationships, 'davi-moura');

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.flags['day4.davi.care.quick']).toBe(true);
    expect(loaded.state.activities.consumedActivityIds).toContain('tend-davi-wound-with-caio');
    expect(getTrust(loaded.state.relationships, 'davi-moura')).toBe(trustAfterQuick);

    const second = tryAct(loaded.state, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio', optionalParticipantIds: [],
    });
    expect(second.ok).toBe(false);
    expect(getTrust(loaded.state.relationships, 'davi-moura')).toBe(trustAfterQuick);
  }, 30_000);
});

describe('Dia 4 — playtest integrado e fechamento (Fatia D)', () => {
  it('rota cooperativa: cuida do ferimento no primeiro período em que Davi está presente', () => {
    const state = reachDayFourCooperating();
    const known = listKnownContextualActivities(activitiesCatalog, state.activities, state, npcCatalog);
    const wound = known.find((entry) => entry.activity.id === 'tend-davi-wound-with-caio');
    expect(wound?.available).toBe(true);
  }, 30_000);

  it('rota de afastamento: Ana reconhece Davi de longe, mas o cuidado continua bloqueado, sem contato forçado', () => {
    // avoid-caio-rocky-bank já registra reconhecimento de Davi (npc.rememberFact), então a
    // atividade permanece visível na listagem natural — mas bloqueada, porque ele nunca foi
    // escoltado até a Clareira.
    const state = reachDayFourAtDistance();
    expect(state.sandbox.navigation.currentLocationId).toBe('awakening-clearing');
    const known = listKnownContextualActivities(activitiesCatalog, state.activities, state, npcCatalog);
    const wound = known.find((entry) => entry.activity.id === 'tend-davi-wound-with-caio');
    expect(wound?.available).toBe(false);
    expect(state.flags['day2.davi.escorted']).not.toBe(true);
  }, 30_000);

  it('rota sem encontro: o cuidado não aparece na listagem natural, pois Davi nunca foi conhecido', () => {
    const state = reachDayFourSolo();
    expect(state.sandbox.navigation.currentLocationId).toBe('awakening-clearing');
    const known = listKnownContextualActivities(activitiesCatalog, state.activities, state, npcCatalog);
    expect(known.some((entry) => entry.activity.id === 'tend-davi-wound-with-caio')).toBe(false);
  }, 30_000);

  it('save/reload após o cuidado retoma o sandbox sem duplicar relógio, consumo ou escolha', () => {
    let state = reachDayFourCooperating();
    const dayBefore = state.world.day;
    const minuteBefore = state.world.minute;

    state = act(state, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio', optionalParticipantIds: [],
    });
    state = choose(state, 'care-with-patience');
    expect(state.status).toBe('playing');
    expect(state.narrativeSession).toBeNull();
    expect(state.world.day).toBe(dayBefore);
    expect(state.world.minute).not.toBe(minuteBefore);
    expect(
      state.activities.consumedActivityIds.filter((id) => id === 'tend-davi-wound-with-caio'),
    ).toHaveLength(1);

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.world).toEqual(state.world);
    expect(loaded.state.status).toBe('playing');
    expect(loaded.state.narrativeSession).toBeNull();
    expect(loaded.state.flags['day4.davi.care.attentive']).toBe(true);
    expect(
      loaded.state.activities.consumedActivityIds.filter((id) => id === 'tend-davi-wound-with-caio'),
    ).toHaveLength(1);

    const second = tryAct(loaded.state, {
      type: 'activity.perform', activityId: 'tend-davi-wound-with-caio', optionalParticipantIds: [],
    });
    expect(second.ok).toBe(false);
  }, 30_000);
});
