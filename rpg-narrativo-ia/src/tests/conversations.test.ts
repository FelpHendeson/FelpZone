import { describe, expect, it } from 'vitest';
import { applyChoice, startGame } from '../core/engine';
import type { GameState } from '../core/state';
import { inspectContextualActivityCatalog, listKnownContextualActivities } from '../modules/activities';
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
  return state;
}

function listedHere(state: GameState): string[] {
  return listKnownContextualActivities(activitiesCatalog!, state.activities ?? { consumedActivityIds: [] }, state, npcCatalog!).map(
    (view) => view.activity.id,
  );
}

/** A Margem Rochosa só se liga à Clareira passando pela Nascente. */
function moveTo(state: GameState, locationId: string): GameState {
  let current = state;
  if (current.sandbox.navigation.currentLocationId === locationId) return current;
  if (current.sandbox.navigation.currentLocationId !== 'spring-lake' && locationId !== 'spring-lake') {
    current = act(current, { type: 'navigation.move', locationId: 'spring-lake' });
  }
  return current.sandbox.navigation.currentLocationId === locationId ? current : act(current, { type: 'navigation.move', locationId });
}

describe('Narrativa — cenas com falas e conversas com personagens', () => {
  it('todo evento da campanha tem cena com falas, e as conversas novas falam com a voz de cada personagem', () => {
    for (const event of campaign.events) expect(event.script?.length ?? 0, event.id).toBeGreaterThan(0);
    const speakers = (id: string) => new Set(campaign.events.find((event) => event.id === id)!.script!.flatMap((line) => (line.kind === 'speech' ? [line.speakerId] : [])));
    expect(speakers('mira-talk-before')).toEqual(new Set(['mira-vale']));
    expect(speakers('caio-talk-nights')).toEqual(new Set(['caio-nascimento']));
    expect(speakers('davi-talk-system')).toEqual(new Set(['davi-moura']));
    expect(speakers('caio-first-contact')).toEqual(new Set(['caio-nascimento', 'davi-moura']));
  });

  it('cada conversa nova é aberta por uma atividade que só aparece quando está pronta', () => {
    const conversations = ['mira-talk-before', 'mira-talk-fear', 'mira-talk-roots', 'caio-talk-nights', 'caio-talk-strength', 'davi-talk-system', 'davi-talk-home'];
    for (const eventId of conversations) {
      const openers = activitiesCatalog!.activities.filter((activity) => activity.narrative?.eventId === eventId);
      expect(openers.length, eventId).toBeGreaterThan(0);
      for (const opener of openers) expect(opener.hideUntilReady).toBe(true);
    }
  });

  it('o pack só aceita visibilidade booleana', () => {
    const worldContext = { map: world.map, npcs: world.npcs, guidance: world.guidance, campaign: world.campaign };
    const raw = (hideUntilReady: unknown) => ({
      activities: [
        {
          id: 'talk-test',
          label: 'Conversar',
          description: 'Teste.',
          locationId: 'awakening-clearing',
          timeCost: { minutes: 10 },
          repeatable: false,
          hideUntilReady,
          requirements: [],
          effects: [],
        },
      ],
    });
    expect(inspectContextualActivityCatalog(raw(true), worldContext).ok).toBe(true);
    expect(inspectContextualActivityCatalog(raw('sim'), worldContext).ok).toBe(false);
  });

  it('a conversa com Davi aparece no Dia 3, acontece uma vez só e destrava a seguinte no dia certo', () => {
    let state = moveTo(reachDayThreeCooperating(), 'awakening-clearing');
    let listed = listedHere(state);
    expect(listed).toContain('talk-davi-system-clearing');
    expect(listed).not.toContain('talk-davi-home-clearing');
    // Mira foi evitada: as conversas dela nem aparecem.
    expect(listed.some((id) => id.startsWith('talk-mira'))).toBe(false);

    const trustBefore = getTrust(state.relationships, 'davi-moura');
    state = act(state, { type: 'activity.perform', activityId: 'talk-davi-system-clearing', optionalParticipantIds: [] });
    expect(state.narrativeSession?.eventId).toBe('davi-talk-system');
    state = choose(state, 'davi-system-compare');
    expect(state.flags['davi.talk.system']).toBe(true);
    expect(getTrust(state.relationships, 'davi-moura')).toBeGreaterThan(trustBefore);

    listed = listedHere(state);
    expect(listed).not.toContain('talk-davi-system-clearing');
    // A conversa seguinte espera o Dia 4.
    expect(listed).not.toContain('talk-davi-home-clearing');
    // O par da Margem Rochosa também não volta: a flag da escolha fecha as duas portas.
    state = moveTo(state, 'rocky-bank');
    expect(listedHere(state)).not.toContain('talk-davi-system-rocky-bank');
  });
});
