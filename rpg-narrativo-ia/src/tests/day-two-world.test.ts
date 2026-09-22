import { describe, expect, it } from 'vitest';
import { applyChoice, startGame } from '../core/engine';
import type { GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { inspectLocationAccess } from '../modules/navigation';
import { loadFirstDayWorld } from '../modules/content';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { listKnownPresencesAtLocation } from '../modules/presences';
import { deriveNpcAt } from '../modules/npcs';
import { getObjectiveStatus } from '../modules/objectives';
import { listKnownContextualActivities } from '../modules/activities';
import { worldTriggerConsumedFlag } from '../modules/world-events';
import { resolveWorldNarrativeState } from '../ui/sandbox';
import { now } from './helpers';

const world = loadFirstDayWorld();
const context = createSandboxContextFromWorld(world);
const options = { context, objectives: world.objectives, campaign: world.campaign, now };

function startSandbox(): GameState {
  const state = startGame(
    { firstName: 'Ana', lastName: 'Cruz', sex: 'female' },
    world.campaign,
    now,
    context,
    world.objectives,
  );
  return { ...state, narrativeSession: null };
}

function choose(state: GameState, choiceId: string): GameState {
  return applyChoice(state, world.campaign, choiceId, now, world.objectives, context);
}

function reachRockyBank(flags: Record<string, boolean> = {}): GameState {
  let state = startSandbox();
  state = executeSandboxAction(state, { type: 'exploration.explore' }, options).current;
  state = executeSandboxAction(state, { type: 'navigation.move', locationId: 'spring-lake' }, options).current;
  state = executeSandboxAction(state, { type: 'exploration.explore' }, options).current;
  state = {
    ...state,
    world: { day: 2, period: 'alvorecer' },
    flags: {
      ...state.flags,
      'day2.started': true,
      [worldTriggerConsumedFlag('first-night')]: true,
      [worldTriggerConsumedFlag('day-two-start')]: true,
      ...flags,
    },
  };
  state = executeSandboxAction(state, { type: 'navigation.move', locationId: 'awakening-clearing' }, options).current;
  state = executeSandboxAction(state, { type: 'navigation.move', locationId: 'spring-lake' }, options).current;
  state = resolveWorldNarrativeState(state, context, world.campaign, world.worldTriggers.definitions).current;
  expect(state.narrativeSession?.eventId).toBe('day-two-human-tracks');
  state = choose(state, 'follow-rocky-bank-signs');
  return executeSandboxAction(state, { type: 'navigation.move', locationId: 'rocky-bank' }, options).current;
}

function offerHelpToDavi(flags: Record<string, boolean> = {}): GameState {
  let state = reachRockyBank({ 'camp.alone': true, ...flags });
  state = executeSandboxAction(state, {
    type: 'presence.interact', presenceId: 'caio-rocky-bank', interactionId: 'talk-caio-rocky-bank',
  }, options).current;
  state = choose(state, 'caio-answer');
  state = choose(state, flags['camp.together'] ? 'with-mira-check-davi' : 'alone-check-davi');
  return choose(state, 'offer-davi-help');
}

function advanceToDayThree(state: GameState): GameState {
  for (let attempt = 0; attempt < 8 && state.world.day < 3; attempt += 1) {
    const rested = executeSandboxAction(state, { type: 'needs.rest', mode: 'simple' }, options).current;
    state = resolveWorldNarrativeState(rested, context, world.campaign, world.worldTriggers.definitions).current;
  }
  return state;
}

function atDayTwo(flags: Record<string, boolean> = {}): GameState {
  const state = startSandbox();
  return {
    ...state,
    world: { day: 2, period: 'alvorecer' },
    flags: {
      ...state.flags,
      'day2.started': true,
      [worldTriggerConsumedFlag('first-night')]: true,
      [worldTriggerConsumedFlag('day-two-start')]: true,
      ...flags,
    },
  };
}

describe('Dia 2 — Fatia B: mundo e sobreviventes', () => {
  it('mantém as pistas, a Margem Rochosa e os sobreviventes ocultos no Dia 1; reavalia progresso antigo no Dia 2', () => {
    let state = startSandbox();
    state = executeSandboxAction(state, { type: 'exploration.explore' }, options).current;
    state = executeSandboxAction(state, { type: 'navigation.move', locationId: 'spring-lake' }, options).current;
    state = executeSandboxAction(state, { type: 'exploration.explore' }, options).current;

    const springBefore = state.sandbox.exploration.locations.find((entry) => entry.locationId === 'spring-lake');
    expect(springBefore?.progress).toBe(30);
    expect(springBefore?.revealedDiscoveryIds).not.toContain('multiple-human-tracks');
    expect(state.sandbox.navigation.discoveredLocationIds).not.toContain('rocky-bank');
    expect(inspectLocationAccess(world.map, state.sandbox.navigation, 'rocky-bank').accessible).toBe(false);
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('caio-rocky-bank');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('davi-rocky-bank');

    const dayTwo = { ...state, flags: { ...state.flags, 'day2.started': true } };
    state = executeSandboxAction(dayTwo, { type: 'navigation.move', locationId: 'awakening-clearing' }, options).current;
    state = executeSandboxAction(state, { type: 'navigation.move', locationId: 'spring-lake' }, options).current;

    const springAfter = state.sandbox.exploration.locations.find((entry) => entry.locationId === 'spring-lake');
    expect(springAfter?.progress).toBe(30);
    expect(springAfter?.revealedDiscoveryIds).toEqual(expect.arrayContaining([
      'multiple-human-tracks', 'dried-blood-trace', 'path-rocky-bank',
    ]));
    expect(state.sandbox.navigation.discoveredLocationIds).toContain('rocky-bank');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('caio-rocky-bank');

    state = executeSandboxAction(state, { type: 'navigation.move', locationId: 'rocky-bank' }, options).current;
    expect(state.sandbox.exploration.locations.find((entry) => entry.locationId === 'rocky-bank')?.revealedDiscoveryIds)
      .toContain('survivors-rocky-bank');
    expect(listKnownPresencesAtLocation(world.presences, state.sandbox.presences, 'rocky-bank')
      .map((entry) => entry.entity.id)).toEqual(['caio-nascimento', 'davi-moura']);
  });

  it('valida a agenda e as referências dos dois NPCs no pack', () => {
    expect(world.npcs.npcById.get('caio-nascimento')?.defaultScheduleId).toBe('caio-routine');
    expect(world.npcs.npcById.get('davi-moura')?.defaultScheduleId).toBe('davi-routine');
    expect(world.npcs.factById.get('davi-needs-rest')?.npcId).toBe('davi-moura');
    expect(world.npcs.scheduleById.get('caio-routine')?.entries.find((entry) => entry.period === 'meio-dia')?.locationId)
      .toBe('spring-lake');
    expect(world.npcs.scheduleById.get('davi-routine')?.entries.every((entry) => entry.locationId === 'rocky-bank'))
      .toBe(true);
    expect(deriveNpcAt(world.npcs, { entries: [] }, 'caio-nascimento', 'manha', () => true)).toBeNull();
  });

  it('faz contato com Caio, reconhece Mira presente e registra uma decisão sobre Davi', () => {
    let state = reachRockyBank({ 'camp.together': true });
    expect(getObjectiveStatus(world.objectives, state.objectives, 'day-two-others')).toBe('active');

    state = executeSandboxAction(state, {
      type: 'presence.interact',
      presenceId: 'caio-rocky-bank',
      interactionId: 'talk-caio-rocky-bank',
    }, options).current;
    expect(state.narrativeSession?.eventId).toBe('caio-first-contact');
    expect(state.relationships.find((entry) => entry.characterId === 'caio-nascimento')).toBeUndefined();

    state = choose(state, 'caio-answer');
    expect(state.narrativeSession?.eventId).toBe('caio-contact-with-mira');
    state = choose(state, 'with-mira-check-davi');
    expect(state.narrativeSession?.eventId).toBe('davi-condition');
    state = choose(state, 'offer-davi-help');

    expect(state.narrativeSession).toBeNull();
    expect(state.flags['day2.davi.help.offered']).toBe(true);
    expect(state.flags['day2.involvement.decided']).toBe(true);
    expect(state.sandbox.npcs.entries.find((entry) => entry.npcId === 'davi-moura')?.memoryFactIds)
      .toContain('davi-needs-rest');
    const journey = state.objectives.entries.find((entry) => entry.objectiveId === 'day-two-others');
    expect(journey?.completedStepIds).toEqual([
      'find-multiple-signs', 'locate-survivors', 'understand-davi', 'decide-involvement',
    ]);
    expect(journey?.completed).toBe(false);
  });

  it('reconhece Mira evitada e permite recusar responsabilidade sem criar vínculo', () => {
    let state = reachRockyBank({ 'mira.contact.avoided': true, 'camp.alone': true });
    state = executeSandboxAction(state, {
      type: 'presence.interact', presenceId: 'caio-rocky-bank', interactionId: 'talk-caio-rocky-bank',
    }, options).current;
    state = choose(state, 'caio-answer');
    expect(state.narrativeSession?.eventId).toBe('caio-contact-after-mira-avoidance');
    state = choose(state, 'wary-check-davi');
    state = choose(state, 'decline-davi-responsibility');

    expect(state.flags['day2.davi.help.declined']).toBe(true);
    expect(state.party.vitals).toEqual([]);
    expect(state.relationships.find((entry) => entry.characterId === 'caio-nascimento')).toBeUndefined();
    expect(state.relationships.find((entry) => entry.characterId === 'davi-moura')).toBeUndefined();
  });

  it('permite evitar o encontro sem Mira e deixa os sobreviventes no mundo', () => {
    let state = reachRockyBank({ 'camp.alone': true });
    state = executeSandboxAction(state, {
      type: 'presence.interact', presenceId: 'caio-rocky-bank', interactionId: 'avoid-caio-rocky-bank',
    }, options).current;

    expect(state.narrativeSession).toBeNull();
    expect(state.flags['day2.survivors.avoided']).toBe(true);
    expect(state.flags['day2.involvement.decided']).toBe(true);
    expect(state.sandbox.presences.resolvedPresenceIds).toContain('caio-rocky-bank');
    expect(state.sandbox.presences.discoveredPresenceIds).toContain('davi-rocky-bank');
    expect(state.sandbox.npcs.entries.map((entry) => entry.npcId)).toEqual(
      expect.arrayContaining(['caio-nascimento', 'davi-moura']),
    );
    expect(state.status).toBe('playing');
  });

  it('faz a rota de contato sem Mira e preserva a decisão após salvar e recarregar', () => {
    let state = reachRockyBank({ 'camp.alone': true });
    state = executeSandboxAction(state, {
      type: 'presence.interact', presenceId: 'caio-rocky-bank', interactionId: 'talk-caio-rocky-bank',
    }, options).current;
    state = choose(state, 'caio-answer');
    expect(state.narrativeSession?.eventId).toBe('caio-contact-alone');
    state = choose(state, 'alone-check-davi');
    state = choose(state, 'leave-davi-undecided');

    const loaded = parseGameState(serializeGameState(state, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.flags['day2.survivors.avoided']).toBe(true);
    expect(loaded.state.flags['day2.involvement.decided']).toBe(true);
    expect(loaded.state.status).toBe('playing');
  });

  it('acompanha Davi com Caio, cobra um período, reloca o NPC e abre a chegada antes de outros gatilhos', () => {
    const state = offerHelpToDavi();
    expect(state.world).toEqual({ day: 2, period: 'manha' });

    const result = executeSandboxAction(state, {
      type: 'activity.perform',
      activityId: 'escort-davi-to-clearing',
      optionalParticipantIds: ['caio-nascimento'],
    }, options);

    expect(result.timeCost.periods).toBe(1);
    expect(result.current.world).toEqual({ day: 2, period: 'meio-dia' });
    expect(result.detail).toMatchObject({
      type: 'activity.perform',
      plan: { participantNpcIds: ['davi-moura', 'caio-nascimento'] },
    });
    expect(result.current.narrativeSession?.eventId).toBe('davi-arrives-clearing');
    expect(result.current.activities.consumedActivityIds).toContain('escort-davi-to-clearing');
    expect(result.current.flags['day2.davi.escorted']).toBe(true);
    expect(result.current.guidance.unlockedTopicIds).toContain('contextual-activities');
    expect(deriveNpcAt(world.npcs, result.current.sandbox.npcs, 'davi-moura', 'meio-dia', () => true)?.locationId)
      .toBe('awakening-clearing');

    const settled = choose(result.current, 'help-davi-settle');
    expect(settled.relationships).toContainEqual({ characterId: 'davi-moura', trust: 2 });
    expect(getObjectiveStatus(world.objectives, settled.objectives, 'day-two-others')).toBe('completed');
    const loaded = parseGameState(serializeGameState(settled, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(deriveNpcAt(world.npcs, loaded.state.sandbox.npcs, 'davi-moura', 'tarde', () => true)?.locationId)
        .toBe('awakening-clearing');
      expect(loaded.state.activities.consumedActivityIds).toContain('escort-davi-to-clearing');
    }
  });

  it('permite acompanhar Davi sem Caio ou Mira e rejeita participante indisponível sem mutar o estado', () => {
    const state = offerHelpToDavi();
    const snapshot = structuredClone(state);
    expect(() => executeSandboxAction(state, {
      type: 'activity.perform', activityId: 'escort-davi-to-clearing', optionalParticipantIds: ['mira-vale'],
    }, options)).toThrow('participante');
    expect(state).toEqual(snapshot);

    const result = executeSandboxAction(state, {
      type: 'activity.perform', activityId: 'escort-davi-to-clearing', optionalParticipantIds: [],
    }, options);
    expect(result.current.narrativeSession?.eventId).toBe('davi-arrives-clearing');
    expect(result.current.relationships.find((entry) => entry.characterId === 'davi-moura')).toBeUndefined();
    const practical = choose(result.current, 'leave-arrival-practical');
    expect(practical.flags['day2.group.intent.known']).toBe(true);
    expect(practical.party.vitals).toEqual([]);
  });

  it('discute água com Caio apenas quando conhecido e disponível na Nascente, sem gerar recurso', () => {
    const beforeContact = startSandbox();
    const hiddenState = {
      ...beforeContact,
      world: { day: 2, period: 'alvorecer' as const },
      flags: { ...beforeContact.flags, 'day2.started': true },
      sandbox: {
        ...beforeContact.sandbox,
        navigation: { ...beforeContact.sandbox.navigation, currentLocationId: 'spring-lake' },
      },
    };
    expect(listKnownContextualActivities(world.activities, beforeContact.activities, hiddenState, world.npcs)
      .some(({ activity }) => activity.id === 'discuss-water-with-caio')).toBe(false);

    let state = reachRockyBank({ 'camp.alone': true });
    state = executeSandboxAction(state, {
      type: 'presence.interact', presenceId: 'caio-rocky-bank', interactionId: 'talk-caio-rocky-bank',
    }, options).current;
    state = choose(state, 'caio-answer');
    state = choose(state, 'alone-check-davi');
    state = choose(state, 'offer-davi-help');
    state = executeSandboxAction(state, { type: 'navigation.move', locationId: 'spring-lake' }, options).current;

    expect(() => executeSandboxAction(state, {
      type: 'activity.perform', activityId: 'discuss-water-with-caio', optionalParticipantIds: [],
    }, options)).toThrow('requisitos');
    state = executeSandboxAction(state, { type: 'resource.collect', nodeId: 'spring', units: 1 }, options).current;
    state = executeSandboxAction(state, { type: 'resource.collect', nodeId: 'spring', units: 1 }, options).current;
    expect(state.world.period).toBe('tarde');
    expect(deriveNpcAt(world.npcs, state.sandbox.npcs, 'caio-nascimento', state.world.period,
      (locationId) => state.sandbox.navigation.discoveredLocationIds.includes(locationId))?.locationId)
      .toBe('spring-lake');
    const waterBefore = state.inventory.find((entry) => entry.itemId === 'raw-water')?.quantity ?? 0;
    expect(waterBefore).toBe(2);

    const conversation = executeSandboxAction(state, {
      type: 'activity.perform', activityId: 'discuss-water-with-caio', optionalParticipantIds: [],
    }, options);
    expect(conversation.current.narrativeSession?.eventId).toBe('water-question');
    expect(conversation.current.world.period).toBe('entardecer');
    expect(conversation.current.inventory.find((entry) => entry.itemId === 'raw-water')?.quantity).toBe(waterBefore);
    expect(conversation.current.sandbox.npcs.entries.find((entry) => entry.npcId === 'caio-nascimento')?.memoryFactIds)
      .toContain('caio-water-question-raised');
    expect(getObjectiveStatus(world.objectives, conversation.current.objectives, 'more-than-one-mouth')).toBe('active');

    const decided = choose(conversation.current, 'water-use-organize');
    expect(decided.flags['day2.water.position.organized']).toBe(true);
    expect(decided.flags['day2.water.position.decided']).toBe(true);
    expect(getObjectiveStatus(world.objectives, decided.objectives, 'more-than-one-mouth')).toBe('completed');
    expect(decided.status).toBe('playing');

    const loaded = parseGameState(serializeGameState(decided, context, world.objectives), context, world.objectives);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.flags['day2.water.position.organized']).toBe(true);
      expect(loaded.state.inventory.find((entry) => entry.itemId === 'raw-water')?.quantity).toBe(waterBefore);
    }
  });

  it('encerra o Dia 2 pelo relógio com rotas cooperativa, distante e sem encontro', () => {
    const routes: { flags: Record<string, boolean>; eventId: string; choiceId: string }[] = [
      {
        flags: { 'day2.survivors.contact': true, 'day2.davi.escorted': true },
        eventId: 'day-three-cooperation',
        choiceId: 'day-three-cooperation-continue',
      },
      {
        flags: { 'day2.survivors.avoided': true },
        eventId: 'day-three-distance',
        choiceId: 'day-three-distance-continue',
      },
      {
        flags: {},
        eventId: 'day-three-solo',
        choiceId: 'day-three-solo-continue',
      },
    ];

    for (const route of routes) {
      let state = advanceToDayThree(atDayTwo(route.flags));
      expect(state.world.day).toBe(3);
      expect(state.narrativeSession?.eventId).toBe('day-three-awakening');

      state = choose(state, 'day-three-look-around');
      expect(state.narrativeSession?.eventId).toBe(route.eventId);
      state = choose(state, route.choiceId);

      expect(state.status).toBe('playing');
      expect(state.narrativeSession).toBeNull();
      expect(state.world.day).toBe(3);
      expect(state.flags['day3.started']).toBe(true);
      expect(state.party.vitals).toEqual([]);
    }
  });
});
