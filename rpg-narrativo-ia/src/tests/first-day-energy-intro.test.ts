import { describe, expect, it } from 'vitest';
import { applyChoice, startGame } from '../core/engine';
import { loadFirstDayWorld } from '../modules/content';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import { getSkillProficiency } from '../modules/skills';
import { worldTriggerConsumedFlag } from '../modules/world-events';
import { attemptSandboxAction, resolveWorldNarrativeState } from '../ui/sandbox';
import { now } from './helpers';

const world = loadFirstDayWorld();
const campaign = world.campaign;
const context = createSandboxContextFromWorld(world);
const triggers = world.worldTriggers.definitions;

function newGame() {
  return startGame(
    { firstName: 'Ana', lastName: 'Cruz', sex: 'female' },
    campaign,
    now,
    context,
    world.objectives,
  );
}

function reachAbilityChoice(choiceId = 'ability-perception') {
  let state = newGame();
  state = applyChoice(state, campaign, 'awake-calm', now, world.objectives, context);
  state = applyChoice(state, campaign, 'system-touch', now, world.objectives, context);
  state = applyChoice(state, campaign, choiceId, now, world.objectives, context);
  return state;
}

describe('Fatia D — introdução energética do primeiro dia', () => {
  it.each([
    ['eteris-pressure', 'energetics.sensation.pressure'],
    ['eteris-warmth', 'energetics.sensation.warmth'],
    ['eteris-vibration', 'energetics.sensation.vibration'],
  ])('permite perceber Etéris por %s sem transformar a sensação em bônus', (choiceId, flag) => {
    let state = reachAbilityChoice();

    expect(state.narrativeSession?.eventId).toBe('eteris-introduction');
    const beforeAttributes = state.attributes;

    state = applyChoice(state, campaign, choiceId, now, world.objectives, context);

    expect(state.narrativeSession?.eventId).toBe('numen-introduction');
    expect(state.flags[flag]).toBe(true);
    expect(state.attributes).toEqual(beforeAttributes);
    expect(state.guidance.unlockedTopicIds).toContain('eteris');
  });

  it('apresenta Númen e devolve o jogador ao sandbox com o treino orientado', () => {
    let state = reachAbilityChoice('ability-resilience');
    state = applyChoice(state, campaign, 'eteris-pressure', now, world.objectives, context);
    state = applyChoice(state, campaign, 'numen-follow-guidance', now, world.objectives, context);

    expect(state.narrativeSession).toBeNull();
    expect(state.guidance.unlockedTopicIds).toContain('eteris');
    expect(state.guidance.unlockedTopicIds).toContain('numen');
    expect(state.guidance.unlockedTopicIds).toContain('training');
    expect(getSkillProficiency(state.system, 'sharpened-senses')).toBe(0);
    expect(context.training?.byId.has('focused-perception-drill')).toBe(true);
  });

  it('a primeira prática real custa um período, progride a habilidade e abre a cena pós-treino', () => {
    let state = reachAbilityChoice('ability-empathy');
    state = applyChoice(state, campaign, 'eteris-vibration', now, world.objectives, context);
    state = applyChoice(state, campaign, 'numen-follow-guidance', now, world.objectives, context);

    const beforeWorld = state.world;
    const beforeEnergy = state.attributes.energia;

    const attempt = attemptSandboxAction(
      state,
      { type: 'training.train', methodId: 'focused-perception-drill' },
      context,
      campaign,
      triggers,
      world.objectives,
    );

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) {
      throw new Error(attempt.error);
    }

    expect(attempt.result.timeCost.periods).toBe(1);
    expect(attempt.result.needsWear.periodsApplied).toBe(1);
    expect(getSkillProficiency(attempt.current.system, 'sharpened-senses')).toBe(1);
    expect(attempt.current.narrativeSession?.eventId).toBe('first-numen-practice');
    expect(attempt.openedTrigger?.id).toBe('first-numen-practice');
    expect(attempt.current.flags[worldTriggerConsumedFlag('first-numen-practice')]).toBe(true);
    expect(attempt.current.world).toEqual(attempt.result.current.world);
    expect(attempt.current.world).not.toEqual(beforeWorld);
    expect(attempt.current.attributes.energia).toBeLessThan(beforeEnergy);

    const returned = applyChoice(
      attempt.current,
      campaign,
      'first-numen-practice-continue',
      now,
      world.objectives,
      context,
    );
    const resolved = resolveWorldNarrativeState(returned, context, campaign, triggers);

    expect(resolved.current.narrativeSession).toBeNull();
    expect(resolved.openedTrigger).toBeUndefined();
  });

  it('o pack registra o marco de primeira prática sobre a proficiência canônica', () => {
    const trigger = triggers.find((entry) => entry.id === 'first-numen-practice');

    expect(trigger).toEqual({
      id: 'first-numen-practice',
      source: {
        type: 'system.skill.proficiency.min',
        skillId: 'sharpened-senses',
        amount: 1,
      },
      campaignId: 'first-day',
      eventId: 'first-numen-practice',
    });
  });
});
