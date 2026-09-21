import { describe, expect, it } from 'vitest';
import { applyChoice, getAvailableChoices } from '../core/engine';
import type { GameState } from '../core/state';
import { loadFirstDayWorld } from '../modules/content';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import { attemptSandboxAction, resolveWorldNarrativeState } from '../ui/sandbox';
import { now, playFirstDay } from './helpers';

const world = loadFirstDayWorld();
const campaign = world.campaign;
const context = createSandboxContextFromWorld(world);
const triggers = world.worldTriggers.definitions;

function atEntardecer(options: {
  trust?: number;
  campfire?: boolean;
  energy?: number;
} = {}): GameState {
  const base = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
  return {
    ...base,
    world: { day: 1, period: 'entardecer' },
    attributes: {
      ...base.attributes,
      energia: options.energy ?? base.attributes.energia,
    },
    relationships:
      options.trust === undefined
        ? base.relationships
        : [{ characterId: 'mira-vale', trust: options.trust }],
    sandbox: {
      ...base.sandbox,
      crafting: {
        ...base.sandbox.crafting,
        structures: options.campfire
          ? [
              {
                structureId: 'campfire',
                locationId: base.sandbox.navigation.currentLocationId,
                active: true,
              },
            ]
          : [],
      },
    },
  };
}

function act(state: GameState, action: Parameters<typeof attemptSandboxAction>[1]) {
  const result = attemptSandboxAction(
    state,
    action,
    context,
    campaign,
    triggers,
    world.objectives,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result;
}

function choose(state: GameState, choiceId: string): GameState {
  return applyChoice(state, campaign, choiceId, now, world.objectives, context);
}

describe('Fatia F — primeira noite adaptativa', () => {
  it('abre a primeira noite pelo relógio e permite uma vigília compartilhada sem encerrar a partida', () => {
    const night = act(atEntardecer({ trust: 12 }), { type: 'exploration.explore' });

    expect(night.current.world).toEqual({ day: 1, period: 'noite' });
    expect(night.openedTrigger?.id).toBe('first-night');
    expect(night.current.narrativeSession?.eventId).toBe('first-night');

    let state = choose(night.current, 'assess-first-night');
    expect(state.narrativeSession?.eventId).toBe('dusk-trusted');
    expect(getAvailableChoices(state, campaign).map((choice) => choice.id)).toContain('accept-shelter');

    state = choose(state, 'accept-shelter');
    expect(state.narrativeSession?.eventId).toBe('night-together');

    state = choose(state, 'together-summary');
    expect(state.narrativeSession).toBeNull();
    expect(state.status).toBe('playing');
    expect(state.flags['camp.together']).toBe(true);
    expect(state.flags['night.resolved']).toBe(true);
    expect(state.world).toEqual({ day: 1, period: 'noite' });

    const rested = act(state, { type: 'needs.rest', mode: 'simple' });
    expect(rested.current.world.day).toBe(2);
    expect(rested.openedTrigger?.id).toBe('day-two-start');
    expect(rested.current.narrativeSession?.eventId).toBe('day-two-awakening');

    state = choose(rested.current, 'day-two-assess');
    expect(state.narrativeSession?.eventId).toBe('day-two-together');
    state = choose(state, 'day-two-together-continue');

    expect(state.status).toBe('playing');
    expect(state.narrativeSession).toBeNull();
    expect(state.world.day).toBe(2);
    expect(state.flags['day2.started']).toBe(true);
  });

  it('reconhece uma fogueira real e mantém a rota solo como escolha válida', () => {
    const night = act(atEntardecer({ campfire: true }), { type: 'exploration.explore' });
    let state = choose(night.current, 'assess-first-night');

    expect(state.narrativeSession?.eventId).toBe('dusk-wary');
    const choices = getAvailableChoices(state, campaign).map((choice) => choice.id);
    expect(choices).toContain('stay-apart');
    expect(choices).toContain('walk-away');

    state = choose(state, 'stay-apart');
    expect(state.narrativeSession?.eventId).toBe('night-alone');
    state = choose(state, 'alone-summary');

    expect(state.flags['camp.alone']).toBe(true);
    expect(state.flags['night.campfire']).toBe(true);
    expect(state.flags['night.route.alone']).toBe(true);

    const rested = act(state, { type: 'needs.rest', mode: 'campfire' });
    expect(rested.current.world.day).toBe(2);
    expect(rested.current.narrativeSession?.eventId).toBe('day-two-awakening');

    state = choose(rested.current, 'day-two-assess');
    expect(state.narrativeSession?.eventId).toBe('day-two-alone');
    state = choose(state, 'day-two-alone-continue');

    expect(state.status).toBe('playing');
    expect(state.world.day).toBe(2);
    expect(state.flags['day2.started']).toBe(true);
  });

  it('expõe uma saída contextual quando o personagem chega exausto à noite', () => {
    const night = act(atEntardecer({ energy: 24 }), { type: 'exploration.explore' });
    const state = choose(night.current, 'assess-first-night');

    expect(state.narrativeSession?.eventId).toBe('dusk-wary');
    expect(getAvailableChoices(state, campaign).map((choice) => choice.id)).toContain('rest-exhausted');
  });

  it('não perde a primeira noite se um descanso no entardecer atravessar direto para o Dia 2', () => {
    const skippedVisualNight = act(atEntardecer(), { type: 'needs.rest', mode: 'simple' });

    expect(skippedVisualNight.current.world.day).toBe(2);
    expect(skippedVisualNight.openedTrigger?.id).toBe('first-night');
    expect(skippedVisualNight.current.narrativeSession?.eventId).toBe('first-night');

    let state = choose(skippedVisualNight.current, 'assess-first-night');
    state = choose(state, 'walk-away');
    state = choose(state, 'alone-summary');

    const nextResolution = resolveWorldNarrativeState(state, context, campaign, triggers);
    expect(nextResolution.openedTrigger?.id).toBe('day-two-start');
    expect(nextResolution.current.narrativeSession?.eventId).toBe('day-two-awakening');
  });
});
