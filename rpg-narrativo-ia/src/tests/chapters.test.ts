import { describe, expect, it } from 'vitest';
import { applyChoice, startGame } from '../core/engine';
import type { GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { loadFirstDayWorld } from '../modules/content';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import type { SandboxAction } from '../modules/sandbox-actions';
import { attemptSandboxAction, resolveWorldNarrativeState } from '../ui/sandbox';
import { now } from './helpers';
import { SCHEMA_VERSION, SCHEMA_VERSION_V27 } from '../core/state';
import { findPendingChapterTrigger, inspectWorldTriggerCatalog } from '../modules/world-events';
import { minutesUntilNextDawn } from '../modules/sandbox-actions';

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
  // Cada ação consome minutos: o jogador descansa até a noite chegar.
  for (let guard = 0; state.narrativeSession === null && guard < 12; guard += 1) {
    state = act(state, { type: 'needs.rest', mode: 'simple' });
  }
  expect(state.narrativeSession?.eventId).toBe('first-night');
  state = choose(state, 'assess-first-night');
  state = choose(state, 'walk-away');
  state = choose(state, 'alone-summary');
  state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
  expect(state.narrativeSession?.eventId).toBe('day-two-awakening');
  state = choose(state, 'day-two-assess');
  expect(state.narrativeSession?.eventId).toBe('day-two-alone');
  state = choose(state, 'day-two-alone-continue');
  expect(state.world).toEqual({ day: 2, period: 'alvorecer', minute: 300 });
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


function meetCaioAndDecide(): GameState {
  let state = followDayTwoTracksToBank(beginDayTwoAlone());
  state = act(state, { type: 'presence.interact', presenceId: 'caio-rocky-bank', interactionId: 'talk-caio-rocky-bank' });
  state = choose(state, 'caio-answer');
  state = choose(state, 'wary-check-davi');
  state = choose(state, 'decline-davi-responsibility');
  return state;
}

describe('Capítulos por ação', () => {
  it('registra o dia em que cada capítulo abriu', () => {
    const state = beginDayTwoAlone();
    expect(state.story.chapterDays['day-two-start']).toBe(2);
  });

  it('resolvida a cena-chave, o capítulo seguinte fica pendente e abre ao dormir até o amanhecer', () => {
    let state = meetCaioAndDecide();
    expect(state.world.day).toBe(2);
    expect(state.narrativeSession).toBeNull();
    expect(findPendingChapterTrigger(world.worldTriggers, state)?.id).toBe('day-three-start');
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
    expect(state.world).toMatchObject({ day: 3, period: 'alvorecer' });
    expect(state.narrativeSession?.eventId).toBe('day-three-awakening');
    expect(findPendingChapterTrigger(world.worldTriggers, state)).toBeUndefined();
  }, 30_000);

  it('sem a cena-chave, o novo dia chega mas o capítulo não vira', () => {
    let state = beginDayTwoAlone();
    expect(findPendingChapterTrigger(world.worldTriggers, state)).toBeUndefined();
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
    expect(state.world.day).toBe(3);
    expect(state.narrativeSession).toBeNull();
  }, 30_000);

  it('capítulo atrasado não encavala o seguinte: o capítulo 4 espera um dia depois do 3', () => {
    let state = beginDayTwoAlone();
    for (let guard = 0; state.narrativeSession === null && guard < 30; guard += 1) {
      state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
    }
    expect(state.world.day).toBe(5);
    state = choose(state, 'day-three-look-around');
    state = choose(state, 'day-three-solo-continue');
    expect(state.story.chapterDays['day-three-start']).toBe(5);
    expect(state.narrativeSession).toBeNull();
    expect(findPendingChapterTrigger(world.worldTriggers, state)?.id).toBe('day-four-start');
    state = act(state, { type: 'needs.rest', mode: 'simple', untilDawn: true });
    expect(state.world.day).toBe(6);
    expect(state.narrativeSession?.eventId).toBe('day-four-awakening');
  }, 30_000);

  it('dormir até o amanhecer custa exatamente os minutos que faltam até as 05:00', () => {
    expect(minutesUntilNextDawn({ day: 1, period: 'alvorecer', minute: 300 })).toBe(24 * 60);
    expect(minutesUntilNextDawn({ day: 1, period: 'noite', minute: 21 * 60 + 30 })).toBe(7 * 60 + 30);
    expect(minutesUntilNextDawn({ day: 2, period: 'madrugada', minute: 60 })).toBe(4 * 60);
    expect(minutesUntilNextDawn({ day: 1, period: 'manha' })).toBe(22 * 60);
  });

  it('a virada da meia-noite não abre capítulo: ele espera o amanhecer', () => {
    let state = meetCaioAndDecide();
    const minutesToMidnight = 24 * 60 - (state.world.minute ?? 0);
    state = { ...state, world: { day: 3, period: 'madrugada', minute: 30 } };
    expect(minutesToMidnight).toBeGreaterThan(0);
    expect(findPendingChapterTrigger(world.worldTriggers, state)?.id).toBe('day-three-start');
    const rested = act(state, { type: 'needs.rest', mode: 'simple' });
    expect(rested.world).toMatchObject({ day: 3, period: 'madrugada' });
    expect(rested.narrativeSession).toBeNull();
    const dawn = act(rested, { type: 'needs.rest', mode: 'simple', untilDawn: true });
    expect(dawn.world).toMatchObject({ day: 3, period: 'alvorecer', minute: 300 });
    expect(dawn.narrativeSession?.eventId).toBe('day-three-awakening');
  }, 30_000);

  it('valida o formato do capítulo na borda do pack', () => {
    const base = { id: 'x', campaignId: campaign.id, eventId: 'day-three-awakening' };
    const ctx = { campaign, exploration: context.exploration, skills: context.skills! };
    const ok = (source: unknown) => inspectWorldTriggerCatalog([{ ...base, source }], ctx).ok;
    const flag = { type: 'flag.is', flag: 'a', value: true };
    expect(ok({ type: 'story.chapter', minDay: 3, anyOf: [[flag]] })).toBe(true);
    expect(ok({ type: 'story.chapter', minDay: 3, anyOf: [] })).toBe(false);
    expect(ok({ type: 'story.chapter', minDay: 3, anyOf: [[{ ...flag, value: 'sim' }]] })).toBe(false);
    expect(ok({ type: 'story.chapter', minDay: 3, anyOf: [[flag]], fallbackDaysAfter: 2 })).toBe(false);
    expect(ok({ type: 'story.chapter', minDay: 3, anyOf: [[flag]], after: 'y', fallbackDaysAfter: 2 })).toBe(true);
  });

  it('migra saves do schema 27 sem atrasar capítulos já abertos', () => {
    const current = meetCaioAndDecide();
    const legacy = JSON.parse(serializeGameState(current, context, world.objectives)) as Record<string, unknown>;
    legacy.schemaVersion = SCHEMA_VERSION_V27;
    delete legacy.story;
    const parsed = parseGameState(JSON.stringify(legacy), context, world.objectives);
    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') return;
    expect(parsed.state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.state.story).toEqual({ chapterDays: {} });
    // O capítulo 2 foi consumido sem dia registrado: conta como cumprido e o 3 continua pendente.
    expect(findPendingChapterTrigger(world.worldTriggers, parsed.state)?.id).toBe('day-three-start');
    const tampered = { ...JSON.parse(serializeGameState(current, context, world.objectives)), story: { chapterDays: { x: -1 } } };
    expect(parseGameState(JSON.stringify(tampered), context, world.objectives).status).toBe('corrupt');
  }, 30_000);
});
