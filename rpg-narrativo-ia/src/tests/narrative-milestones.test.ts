import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { serializeGameState, parseGameState } from '../infrastructure/persistence';
import { assembleFirstDayRaw, composeWorld, ContentError } from '../modules/content';
import {
  evaluateObjectiveCriterion,
  inspectObjectiveCatalog,
} from '../modules/objectives';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction } from '../modules/sandbox-actions';
import {
  applyWorldNarrativeTrigger,
  inspectWorldTriggerCatalog,
  listEligibleWorldTriggers,
  resolveEligibleWorldTrigger,
  worldTriggerConsumedFlag,
  type WorldNarrativeTriggerDefinition,
} from '../modules/world-events';
import { attemptSandboxAction, resolveWorldNarrativeState } from '../ui/sandbox';
import { freshState, now } from './helpers';

const context = createSandboxContext();
const skills = context.skills!;

const skillTrigger: WorldNarrativeTriggerDefinition = {
  id: 'first-real-practice',
  source: {
    type: 'system.skill.proficiency.min',
    skillId: 'sharpened-senses',
    amount: 1,
  },
  campaignId: 'first-day',
  eventId: 'first-priority',
};

const dayTrigger: WorldNarrativeTriggerDefinition = {
  id: 'regional-registry-day-seven',
  source: {
    type: 'world.day.min',
    day: 7,
  },
  campaignId: 'first-day',
  eventId: 'first-priority',
};

const nightTrigger: WorldNarrativeTriggerDefinition = {
  id: 'first-night',
  source: {
    type: 'world.time.reached',
    day: 1,
    period: 'noite',
  },
  campaignId: 'first-day',
  eventId: 'first-priority',
};

function exploring() {
  return { ...freshState(), narrativeSession: null };
}

function triggerContext() {
  return {
    campaign: firstDayCampaign,
    exploration: context.exploration,
    skills,
  };
}

describe('Fatia C — critérios e marcos narrativos', () => {
  it('objetivo reconhece proficiência real e exige habilidade conhecida', () => {
    const criterion = {
      type: 'system.skill.proficiency.min' as const,
      skillId: 'sharpened-senses',
      amount: 1,
    };
    const before = exploring();
    expect(evaluateObjectiveCriterion(criterion, before)).toBe(false);

    const trained = executeSandboxAction(
      before,
      { type: 'training.train', methodId: 'focused-perception-drill' },
      { context, now },
    ).current;
    expect(trained.system.entries.find((entry) => entry.skillId === 'sharpened-senses')?.proficiency).toBe(1);
    expect(evaluateObjectiveCriterion(criterion, trained)).toBe(true);

    const unknown = {
      ...trained,
      system: {
        ...trained.system,
        entries: trained.system.entries.filter((entry) => entry.skillId !== 'sharpened-senses'),
      },
    };
    expect(evaluateObjectiveCriterion(criterion, unknown)).toBe(false);
  });

  it('valida a forma do critério de proficiência', () => {
    const valid = inspectObjectiveCatalog({
      objectives: [
        {
          id: 'practice',
          title: 'Prática',
          description: 'Teste',
          kind: 'main',
          stepMode: 'sequential',
          activation: { type: 'automatic' },
          steps: [
            {
              id: 'train',
              title: 'Treine',
              criteria: [
                {
                  type: 'system.skill.proficiency.min',
                  skillId: 'sharpened-senses',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    });
    expect(valid.ok).toBe(true);

    const invalid = inspectObjectiveCatalog({
      objectives: [
        {
          id: 'practice',
          title: 'Prática',
          description: 'Teste',
          kind: 'main',
          stepMode: 'sequential',
          activation: { type: 'automatic' },
          steps: [
            {
              id: 'train',
              title: 'Treine',
              criteria: [
                {
                  type: 'system.skill.proficiency.min',
                  skillId: 'sharpened-senses',
                  amount: -1,
                },
              ],
            },
          ],
        },
      ],
    });
    expect(invalid.ok).toBe(false);
  });

  it('composeWorld rejeita objetivo que referencia habilidade inexistente', () => {
    const raw = structuredClone(assembleFirstDayRaw()) as {
      objectives: { objectives: unknown[] };
    };
    raw.objectives.objectives.push({
      id: 'broken-skill-objective',
      title: 'Quebrado',
      description: 'Referência inválida',
      kind: 'side',
      stepMode: 'sequential',
      activation: { type: 'automatic' },
      steps: [
        {
          id: 'broken-step',
          title: 'Treine',
          criteria: [
            {
              type: 'system.skill.proficiency.min',
              skillId: 'missing-skill',
              amount: 1,
            },
          ],
        },
      ],
    });

    expect(() => composeWorld(raw)).toThrow(ContentError);
    expect(() => composeWorld(raw)).toThrow(/missing-skill/);
  });

  it('valida gatilhos por proficiência e dia contra o pack ativo', () => {
    const valid = inspectWorldTriggerCatalog([skillTrigger, dayTrigger, nightTrigger], triggerContext());
    expect(valid.ok).toBe(true);

    const missingSkill = inspectWorldTriggerCatalog(
      [
        {
          ...skillTrigger,
          id: 'missing-skill-trigger',
          source: {
            type: 'system.skill.proficiency.min',
            skillId: 'missing-skill',
            amount: 1,
          },
        },
      ],
      triggerContext(),
    );
    expect(missingSkill).toMatchObject({ ok: false, reason: expect.stringMatching(/missing-skill/) });

    const invalidAmount = inspectWorldTriggerCatalog(
      [
        {
          ...skillTrigger,
          id: 'invalid-amount',
          source: {
            type: 'system.skill.proficiency.min',
            skillId: 'sharpened-senses',
            amount: -1,
          },
        },
      ],
      triggerContext(),
    );
    expect(invalidAmount.ok).toBe(false);

    const invalidDay = inspectWorldTriggerCatalog(
      [
        {
          ...dayTrigger,
          id: 'invalid-day',
          source: { type: 'world.day.min', day: 0 },
        },
      ],
      triggerContext(),
    );
    expect(invalidDay.ok).toBe(false);

    const invalidTime = inspectWorldTriggerCatalog(
      [
        {
          ...nightTrigger,
          id: 'invalid-time',
          source: { type: 'world.time.reached', day: 1, period: 'madrugada' },
        },
      ],
      triggerContext(),
    );
    expect(invalidTime.ok).toBe(false);
  });

  it('treino real atinge proficiência e abre o marco uma única vez sem custo temporal extra', () => {
    const before = exploring();
    const attempt = attemptSandboxAction(
      before,
      { type: 'training.train', methodId: 'focused-perception-drill' },
      context,
      firstDayCampaign,
      [skillTrigger],
    );
    expect(attempt.ok).toBe(true);
    if (!attempt.ok) {
      throw new Error(attempt.error);
    }

    expect(attempt.result.timeCost).toEqual({ periods: 1 });
    expect(attempt.current.world).toEqual(attempt.result.current.world);
    expect(attempt.current.narrativeSession?.eventId).toBe('first-priority');
    expect(attempt.openedTrigger?.id).toBe(skillTrigger.id);
    expect(attempt.current.flags[worldTriggerConsumedFlag(skillTrigger.id)]).toBe(true);

    const returned = { ...attempt.current, narrativeSession: null };
    const resolvedAgain = resolveWorldNarrativeState(
      returned,
      context,
      firstDayCampaign,
      [skillTrigger],
    );
    expect(resolvedAgain.openedTrigger).toBeUndefined();
    expect(resolvedAgain.current.narrativeSession).toBeNull();
  });

  it('reload preserva consumo e impede repetição do marco', () => {
    const attempt = attemptSandboxAction(
      exploring(),
      { type: 'training.train', methodId: 'focused-perception-drill' },
      context,
      firstDayCampaign,
      [skillTrigger],
    );
    expect(attempt.ok).toBe(true);
    if (!attempt.ok) {
      throw new Error(attempt.error);
    }

    const returned = { ...attempt.current, narrativeSession: null };
    const loaded = parseGameState(serializeGameState(returned, context), context);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') {
      throw new Error('save inválido');
    }

    const resolved = resolveWorldNarrativeState(
      loaded.state,
      context,
      firstDayCampaign,
      [skillTrigger],
    );
    expect(resolved.openedTrigger).toBeUndefined();
    expect(resolved.current.flags[worldTriggerConsumedFlag(skillTrigger.id)]).toBe(true);
  });

  it('world.day.min só fica elegível ao atingir o dia mínimo', () => {
    const inspected = inspectWorldTriggerCatalog([dayTrigger], triggerContext());
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      throw new Error(inspected.reason);
    }

    const daySix = { ...exploring(), world: { day: 6, period: 'manha' as const } };
    const daySeven = { ...daySix, world: { day: 7, period: 'manha' as const } };
    expect(listEligibleWorldTriggers(inspected.value, daySix)).toEqual([]);
    expect(resolveEligibleWorldTrigger(inspected.value, daySeven)?.id).toBe(dayTrigger.id);
  });

  it('world.time.reached respeita dia e ordem dos períodos e continua válido depois do marco', () => {
    const inspected = inspectWorldTriggerCatalog([nightTrigger], triggerContext());
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      throw new Error(inspected.reason);
    }

    const afternoon = { ...exploring(), world: { day: 1, period: 'tarde' as const } };
    const sunset = { ...afternoon, world: { day: 1, period: 'entardecer' as const } };
    const night = { ...afternoon, world: { day: 1, period: 'noite' as const } };
    const nextDay = { ...afternoon, world: { day: 2, period: 'alvorecer' as const } };

    expect(listEligibleWorldTriggers(inspected.value, afternoon)).toEqual([]);
    expect(listEligibleWorldTriggers(inspected.value, sunset)).toEqual([]);
    expect(resolveEligibleWorldTrigger(inspected.value, night)?.id).toBe(nightTrigger.id);
    expect(resolveEligibleWorldTrigger(inspected.value, nextDay)?.id).toBe(nightTrigger.id);
  });

  it('sessão aberta impede outro marco e ordem declarada decide entre elegíveis', () => {
    const second: WorldNarrativeTriggerDefinition = {
      ...dayTrigger,
      id: 'second-day-seven',
    };
    const inspected = inspectWorldTriggerCatalog([dayTrigger, second], triggerContext());
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      throw new Error(inspected.reason);
    }

    const eligibleState = {
      ...exploring(),
      world: { day: 7, period: 'manha' as const },
    };
    expect(listEligibleWorldTriggers(inspected.value, eligibleState).map((entry) => entry.id)).toEqual([
      dayTrigger.id,
      second.id,
    ]);
    expect(resolveEligibleWorldTrigger(inspected.value, eligibleState)?.id).toBe(dayTrigger.id);

    const firstOpened = applyWorldNarrativeTrigger(eligibleState, firstDayCampaign, dayTrigger);
    expect(listEligibleWorldTriggers(inspected.value, firstOpened)).toEqual([]);

    const afterFirst = { ...firstOpened, narrativeSession: null };
    expect(resolveEligibleWorldTrigger(inspected.value, afterFirst)?.id).toBe(second.id);

    const chained = resolveWorldNarrativeState(
      afterFirst,
      context,
      firstDayCampaign,
      [dayTrigger, second],
    );
    expect(chained.openedTrigger?.id).toBe(second.id);
    expect(chained.current.flags[worldTriggerConsumedFlag(second.id)]).toBe(true);
  });
});
