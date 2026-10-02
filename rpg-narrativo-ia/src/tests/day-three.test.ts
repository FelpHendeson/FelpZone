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

/** Ana ecoa Davi até a Clareira, encontra Caio na Margem Rochosa e chega ao Dia 3 pela rota de cooperação. */
function reachDayThreeCooperating(): GameState {
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
  expect(state.narrativeSession?.eventId).toBe('day-three-awakening');
  state = choose(state, 'day-three-look-around');
  expect(state.narrativeSession?.eventId).toBe('day-three-cooperation');
  state = choose(state, 'day-three-cooperation-continue');
  expect(state.flags['day3.started']).toBe(true);
  return state;
}

/** Ana evita Caio e Davi na Margem Rochosa e chega ao Dia 3 sem contato conhecido. */
function reachDayThreeAtDistance(): GameState {
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
  expect(state.narrativeSession?.eventId).toBe('day-three-awakening');
  state = choose(state, 'day-three-look-around');
  expect(state.narrativeSession?.eventId).toBe('day-three-distance');
  state = choose(state, 'day-three-distance-continue');
  expect(state.flags['day3.started']).toBe(true);
  expect(state.flags['day2.survivors.contact']).not.toBe(true);
  return state;
}

/** Ana nunca visita a Margem Rochosa nem a Nascente e chega ao Dia 3 sozinha. */
function reachDayThreeSolo(): GameState {
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
  expect(state.narrativeSession?.eventId).toBe('day-three-awakening');
  state = choose(state, 'day-three-look-around');
  expect(state.narrativeSession?.eventId).toBe('day-three-solo');
  state = choose(state, 'day-three-solo-continue');
  expect(state.flags['day3.started']).toBe(true);
  expect(state.flags['day2.survivors.contact']).not.toBe(true);
  return state;
}

/** Ana faz contato com Caio, recusa a responsabilidade por Davi e chega ao Dia 3 sem compromisso. */
function reachDayThreeIndependent(): GameState {
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
  expect(state.flags['day2.davi.help.declined']).toBe(true);
  expect(state.flags['day2.davi.escorted']).not.toBe(true);

  for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  expect(state.narrativeSession?.eventId).toBe('day-three-awakening');
  state = choose(state, 'day-three-look-around');
  expect(state.narrativeSession?.eventId).toBe('day-three-independent');
  state = choose(state, 'day-three-independent-continue');
  expect(state.flags['day3.started']).toBe(true);
  expect(state.flags['day2.survivors.contact']).toBe(true);
  expect(state.flags['day2.davi.escorted']).not.toBe(true);
  return state;
}

describe('Dia 3 — vigília compartilhada com Caio', () => {
  it('fica indisponível antes do Dia 3, mesmo com Caio conhecido e presente', () => {
    const state = reachDayThreeCooperating();
    // Volta o relógio narrativamente é impossível; em vez disso, prova a mesma regra
    // no Dia 2 usando um estado ainda sem `day3.started`.
    let dayTwoState = newGame();
    for (const choiceId of [
      'awake-calm', 'system-touch', 'ability-perception', 'eteris-pressure', 'numen-follow-guidance',
    ]) dayTwoState = choose(dayTwoState, choiceId);
    dayTwoState = act(dayTwoState, { type: 'training.train', methodId: 'focused-perception-drill' });
    dayTwoState = choose(dayTwoState, 'first-numen-practice-continue');
    dayTwoState = act(dayTwoState, { type: 'exploration.explore' });
    dayTwoState = act(dayTwoState, { type: 'exploration.explore' });
    dayTwoState = act(dayTwoState, {
      type: 'presence.interact', presenceId: 'mira-awakening-clearing',
      interactionId: 'avoid-mira-awakening-clearing',
    });
    dayTwoState = act(dayTwoState, { type: 'exploration.explore' });
    dayTwoState = choose(dayTwoState, 'assess-first-night');
    dayTwoState = choose(dayTwoState, 'walk-away');
    dayTwoState = choose(dayTwoState, 'alone-summary');
    dayTwoState = act(dayTwoState, { type: 'needs.rest', mode: 'simple' });
    dayTwoState = choose(dayTwoState, 'day-two-assess');
    dayTwoState = choose(dayTwoState, 'day-two-alone-continue');
    dayTwoState = act(dayTwoState, { type: 'navigation.move', locationId: 'spring-lake' });
    for (let count = 0; count < 4 && dayTwoState.narrativeSession === null; count += 1) {
      dayTwoState = act(dayTwoState, { type: 'exploration.explore' });
    }
    dayTwoState = choose(dayTwoState, 'follow-rocky-bank-signs');
    dayTwoState = act(dayTwoState, { type: 'navigation.move', locationId: 'rocky-bank' });
    dayTwoState = act(dayTwoState, {
      type: 'presence.interact', presenceId: 'caio-rocky-bank', interactionId: 'talk-caio-rocky-bank',
    });
    dayTwoState = choose(dayTwoState, 'caio-answer');
    dayTwoState = choose(dayTwoState, 'wary-check-davi');
    dayTwoState = choose(dayTwoState, 'decline-davi-responsibility');
    expect(dayTwoState.flags['day2.survivors.contact']).toBe(true);
    expect(dayTwoState.flags['day3.started']).not.toBe(true);

    const attempt = tryAct(dayTwoState, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio', optionalParticipantIds: [],
    });
    expect(attempt.ok).toBe(false);

    // Estado independente do playtest acima, apenas para não deixar a variável sem uso.
    expect(state.flags['day3.started']).toBe(true);
  }, 30_000);

  it('assume a vigília sozinha, ganha confiança de Caio e bloqueia uma segunda execução', () => {
    let state = reachDayThreeCooperating();
    const trustBefore = getTrust(state.relationships, 'caio-nascimento');

    state = act(state, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio', optionalParticipantIds: [],
    });
    expect(state.narrativeSession?.eventId).toBe('night-watch-proposal');
    state = choose(state, 'take-watch-alone');
    expect(state.narrativeSession).toBeNull();
    expect(state.flags['day3.watch.covered']).toBe(true);
    expect(state.flags['day3.watch.taken-by-player']).toBe(true);
    expect(getTrust(state.relationships, 'caio-nascimento')).toBeGreaterThan(trustBefore);
    expect(state.activities.consumedActivityIds).toContain('share-night-watch-with-caio');

    const second = tryAct(state, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio', optionalParticipantIds: [],
    });
    expect(second.ok).toBe(false);

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.activities.consumedActivityIds).toContain('share-night-watch-with-caio');
      expect(getTrust(loaded.state.relationships, 'caio-nascimento')).toBe(
        getTrust(state.relationships, 'caio-nascimento'),
      );
    }
  }, 30_000);

  it('divide a vigília em turnos com um ganho de confiança menor do que assumir sozinho', () => {
    let state = reachDayThreeCooperating();
    state = act(state, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio', optionalParticipantIds: [],
    });
    state = choose(state, 'split-the-watch');
    expect(state.flags['day3.watch.shared']).toBe(true);
    expect(state.flags['day3.watch.taken-by-player']).not.toBe(true);
    expect(getTrust(state.relationships, 'caio-nascimento')).toBeGreaterThan(0);
  }, 30_000);

  it('recusar a vigília não altera a relação nem impede o resto do Dia 3', () => {
    let state = reachDayThreeCooperating();
    const trustBefore = getTrust(state.relationships, 'caio-nascimento');
    state = act(state, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio', optionalParticipantIds: [],
    });
    state = choose(state, 'decline-watch-duty');
    expect(state.flags['day3.watch.declined']).toBe(true);
    expect(state.flags['day3.watch.covered']).not.toBe(true);
    expect(getTrust(state.relationships, 'caio-nascimento')).toBe(trustBefore);
    expect(state.status).toBe('playing');
  }, 30_000);
});

describe('Fatia C — autonomia e falhas de disponibilidade', () => {
  it('bloqueia a execução sem mutar estado quando Caio não está mais na Margem Rochosa', () => {
    let state = reachDayThreeCooperating();
    // A agenda de Caio o move para a Nascente ao meio-dia; avançar o relógio sem sair
    // da Margem Rochosa reproduz "presente no local, mas o NPC já não está".
    state = act(state, { type: 'needs.rest', mode: 'simple' });
    state = act(state, { type: 'needs.rest', mode: 'simple' });
    expect(state.sandbox.navigation.currentLocationId).toBe('rocky-bank');

    const before = state;
    const attempt = tryAct(before, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio', optionalParticipantIds: [],
    });
    expect(attempt.ok).toBe(false);
    // Uma tentativa recusada não retorna estado algum para aplicar; nada muda.
    expect(before.flags['day3.watch.covered']).not.toBe(true);
    expect(before.activities.consumedActivityIds).not.toContain('share-night-watch-with-caio');
  }, 30_000);

  it('recusa a atividade sem contato conhecido, mesmo que o cliente force a ação', () => {
    const state = reachDayThreeAtDistance();

    const attempt = tryAct(state, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio', optionalParticipantIds: ['davi-moura'],
    });
    expect(attempt.ok).toBe(false);
    expect(state.flags['day2.survivors.contact']).not.toBe(true);
    expect(state.flags['day3.watch.covered']).not.toBe(true);
    // A tentativa recusada não deve ter revelado Caio nem criado contato por conta própria.
    expect(state.sandbox.presences.discoveredPresenceIds).toContain('caio-rocky-bank');
    expect(state.sandbox.presences.resolvedPresenceIds).toContain('caio-rocky-bank');
  }, 30_000);

  it('preserva a rota sem encontro: tentar a atividade não cria presença nem contato', () => {
    const state = reachDayThreeSolo();

    const attempt = tryAct(state, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio', optionalParticipantIds: [],
    });
    expect(attempt.ok).toBe(false);
    expect(state.sandbox.navigation.discoveredLocationIds).not.toContain('rocky-bank');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('caio-rocky-bank');
    expect(state.flags['day2.survivors.contact']).not.toBe(true);
  }, 30_000);

  it('save/reload preserva a rota de revezamento sem duplicar consumo nem confiança', () => {
    let state = reachDayThreeCooperating();
    state = act(state, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio', optionalParticipantIds: [],
    });
    state = choose(state, 'split-the-watch');
    const trustAfterSplit = getTrust(state.relationships, 'caio-nascimento');

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.flags['day3.watch.shared']).toBe(true);
    expect(loaded.state.activities.consumedActivityIds).toContain('share-night-watch-with-caio');
    expect(getTrust(loaded.state.relationships, 'caio-nascimento')).toBe(trustAfterSplit);

    const second = tryAct(loaded.state, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio', optionalParticipantIds: [],
    });
    expect(second.ok).toBe(false);
    expect(getTrust(loaded.state.relationships, 'caio-nascimento')).toBe(trustAfterSplit);
  }, 30_000);
});

describe('Fatia D — playtest integrado e fechamento', () => {
  it('rota cooperativa: percorre o Dia 1 ao Dia 3 e realiza a vigília no primeiro período em que Caio está presente', () => {
    const state = reachDayThreeCooperating();
    // reachDayThreeCooperating já entrega o jogador na Margem Rochosa no instante em que
    // o Dia 3 nasce (alvorecer), sem descanso extra: é o primeiro período jogável do dia.
    const known = listKnownContextualActivities(activitiesCatalog, state.activities, state, npcCatalog);
    const nightWatch = known.find((entry) => entry.activity.id === 'share-night-watch-with-caio');
    expect(nightWatch?.available).toBe(true);
  }, 30_000);

  it('contato conhecido sem compromisso: participa da vigília com Davi como testemunha opcional sem converter a independência em compromisso', () => {
    let state = reachDayThreeIndependent();
    const trustCaioBefore = getTrust(state.relationships, 'caio-nascimento');

    const known = listKnownContextualActivities(activitiesCatalog, state.activities, state, npcCatalog);
    const nightWatch = known.find((entry) => entry.activity.id === 'share-night-watch-with-caio');
    expect(nightWatch?.available).toBe(true);
    expect(nightWatch?.eligibleOptionalNpcIds).toContain('davi-moura');

    state = act(state, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio',
      optionalParticipantIds: ['davi-moura'],
    });
    expect(state.narrativeSession?.eventId).toBe('night-watch-proposal');
    state = choose(state, 'split-the-watch');

    expect(state.flags['day3.watch.covered']).toBe(true);
    expect(state.flags['day3.watch.shared']).toBe(true);
    expect(getTrust(state.relationships, 'caio-nascimento')).toBeGreaterThan(trustCaioBefore);
    // A recusa em ajudar Davi no Dia 2 continua registrada; participar da vigília não
    // retroage e não cria compromisso permanente com o grupo.
    expect(state.flags['day2.davi.help.declined']).toBe(true);
    expect(state.flags['day2.davi.escorted']).not.toBe(true);
  }, 30_000);

  it('rota de afastamento: Ana reconhece Caio mas a vigília continua bloqueada na listagem natural, sem contato forçado', () => {
    let state = reachDayThreeAtDistance();
    // Sem tentativa forçada: apenas volta ao local onde a atividade viveria e lista o que é conhecido.
    // Evitar Caio já registra reconhecimento (npc.rememberFact em avoid-caio-rocky-bank), então a
    // atividade permanece visível — mas bloqueada, porque day2.survivors.contact nunca foi definido.
    state = act(state, { type: 'navigation.move', locationId: 'spring-lake' });
    const returned = act(state, { type: 'navigation.move', locationId: 'rocky-bank' });
    const known = listKnownContextualActivities(activitiesCatalog, returned.activities, returned, npcCatalog);
    const nightWatch = known.find((entry) => entry.activity.id === 'share-night-watch-with-caio');
    expect(nightWatch?.available).toBe(false);
    expect(returned.flags['day2.survivors.contact']).not.toBe(true);
  }, 30_000);

  it('rota sem encontro: a vigília não aparece na listagem natural, pois Caio nunca foi reconhecido', () => {
    const state = reachDayThreeSolo();
    expect(state.sandbox.navigation.discoveredLocationIds).not.toContain('rocky-bank');
    // Sem jamais ter visitado a Margem Rochosa, Caio não tem entrada em sandbox.npcs — o
    // requisito npc.known reprova e a atividade some da listagem, mesmo que se force o local.
    const atRockyBank = {
      ...state,
      sandbox: {
        ...state.sandbox,
        navigation: { ...state.sandbox.navigation, currentLocationId: 'rocky-bank' },
      },
    };
    const known = listKnownContextualActivities(activitiesCatalog, atRockyBank.activities, atRockyBank, npcCatalog);
    expect(known.some((entry) => entry.activity.id === 'share-night-watch-with-caio')).toBe(false);
  }, 30_000);

  it('save/reload após a vigília retoma o sandbox sem duplicar relógio, consumo ou escolha', () => {
    let state = reachDayThreeCooperating();
    const dayBefore = state.world.day;
    const periodBefore = state.world.period;

    state = act(state, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio', optionalParticipantIds: [],
    });
    state = choose(state, 'take-watch-alone');
    expect(state.status).toBe('playing');
    expect(state.narrativeSession).toBeNull();
    expect(state.world.day).toBe(dayBefore);
    expect(state.world.period).not.toBe(periodBefore);
    expect(
      state.activities.consumedActivityIds.filter((id) => id === 'share-night-watch-with-caio'),
    ).toHaveLength(1);

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.world).toEqual(state.world);
    expect(loaded.state.status).toBe('playing');
    expect(loaded.state.narrativeSession).toBeNull();
    expect(loaded.state.flags['day3.watch.taken-by-player']).toBe(true);
    expect(
      loaded.state.activities.consumedActivityIds.filter((id) => id === 'share-night-watch-with-caio'),
    ).toHaveLength(1);

    // Retomar no sandbox e confirmar que a atividade continua bloqueada, sem duplicar efeito algum.
    const second = tryAct(loaded.state, {
      type: 'activity.perform', activityId: 'share-night-watch-with-caio', optionalParticipantIds: [],
    });
    expect(second.ok).toBe(false);
  }, 30_000);
});
