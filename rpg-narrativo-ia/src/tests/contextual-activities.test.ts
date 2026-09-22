import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { startGame } from '../core/engine';
import { SCHEMA_VERSION, SCHEMA_VERSION_V25 } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  createInitialContextualActivitiesState,
  inspectContextualActivityCatalog,
  inspectContextualActivitiesState,
  planContextualActivity,
} from '../modules/activities';
import { loadFirstDayWorld } from '../modules/content';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { now } from './helpers';

const world = loadFirstDayWorld();
const baseContext = createSandboxContextFromWorld(world);

function activityRaw() {
  return {
    activities: [
      {
        id: 'shared-check',
        label: 'Verificar o entorno juntos',
        description: 'Uma ação curta com Mira para provar o contrato de atividades.',
        locationId: 'awakening-clearing',
        timeCost: { periods: 1 },
        repeatable: false,
        requirements: [{ type: 'world.day.min', day: 1 }],
        participants: {
          requiredNpcIds: ['mira-vale'],
          optionalNpcIds: [],
          minOptional: 0,
          maxOptional: 0,
        },
        effects: [
          { type: 'flag.set', flag: 'activity.shared-check.done', value: true },
          { type: 'relationship.change', characterId: 'mira-vale', amount: 2 },
          { type: 'npc.rememberFact', npcId: 'mira-vale', factId: 'mira-first-talk' },
          { type: 'guidance.unlock', topicId: 'contextual-activities' },
        ],
        feedback: 'Vocês verificam o entorno sem formar um grupo.',
      },
    ],
  };
}

function activityWorldContext() {
  return {
    map: world.map,
    npcs: world.npcs,
    guidance: world.guidance,
    campaign: world.campaign,
  };
}

function stateWithMiraHere() {
  const state = startGame(
    { firstName: 'Ana', lastName: 'Cruz', sex: 'female' },
    firstDayCampaign,
    now,
    baseContext,
    world.objectives,
  );
  return {
    ...state,
    narrativeSession: null,
    sandbox: {
      ...state.sandbox,
      npcs: {
        entries: [
          {
            npcId: 'mira-vale',
            known: true,
            status: 'active' as const,
            locationOverrideId: 'awakening-clearing',
            memoryFactIds: [],
            scheduleOverrideId: null,
          },
        ],
      },
    },
  };
}

describe('Fatia A do Dia 2 — Atividades Contextuais', () => {
  it('valida referências do catálogo e rejeita local ou NPC inexistente', () => {
    const valid = inspectContextualActivityCatalog(activityRaw(), activityWorldContext());
    expect(valid.ok).toBe(true);

    const badLocation = activityRaw();
    badLocation.activities[0]!.locationId = 'lugar-inexistente';
    expect(inspectContextualActivityCatalog(badLocation, activityWorldContext()).ok).toBe(false);

    const badNpc = activityRaw();
    badNpc.activities[0]!.participants.requiredNpcIds = ['npc-inexistente'];
    expect(inspectContextualActivityCatalog(badNpc, activityWorldContext()).ok).toBe(false);
  });

  it('planeja apenas quando o participante obrigatório está presente e disponível', () => {
    const inspected = inspectContextualActivityCatalog(activityRaw(), activityWorldContext());
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) throw new Error(inspected.reason);

    const state = stateWithMiraHere();
    const plan = planContextualActivity(
      inspected.value,
      createInitialContextualActivitiesState(),
      state,
      world.npcs,
      'shared-check',
      [],
    );
    expect(plan.activityId).toBe('shared-check');
    expect(plan.participantNpcIds).toEqual(['mira-vale']);

    const absent = {
      ...state,
      sandbox: {
        ...state.sandbox,
        npcs: {
          entries: state.sandbox.npcs.entries.map((entry) => ({
            ...entry,
            locationOverrideId: 'spring-lake',
          })),
        },
      },
    };
    expect(() =>
      planContextualActivity(
        inspected.value,
        createInitialContextualActivitiesState(),
        absent,
        world.npcs,
        'shared-check',
        [],
      ),
    ).toThrow('participante');
  });

  it('executa uma atividade uma vez, cobra um período e aplica efeitos atomicamente', () => {
    const inspected = inspectContextualActivityCatalog(activityRaw(), activityWorldContext());
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) throw new Error(inspected.reason);

    const context = { ...baseContext, activities: inspected.value };
    const state = stateWithMiraHere();
    const result = executeSandboxAction(
      state,
      { type: 'activity.perform', activityId: 'shared-check', optionalParticipantIds: [] },
      { context, objectives: world.objectives, campaign: world.campaign, now },
    );

    expect(result.timeCost.periods).toBe(1);
    expect(result.current.world.period).not.toBe(state.world.period);
    expect(result.current.activities.consumedActivityIds).toEqual(['shared-check']);
    expect(result.current.flags['activity.shared-check.done']).toBe(true);
    expect(result.current.relationships).toContainEqual({ characterId: 'mira-vale', trust: 2 });
    expect(result.current.sandbox.npcs.entries[0]?.memoryFactIds).toContain('mira-first-talk');
    expect(result.current.guidance.unlockedTopicIds).toContain('contextual-activities');
    expect(result.feedback).toBe('Vocês verificam o entorno sem formar um grupo.');

    expect(() =>
      executeSandboxAction(
        result.current,
        { type: 'activity.perform', activityId: 'shared-check', optionalParticipantIds: [] },
        { context, objectives: world.objectives, campaign: world.campaign, now },
      ),
    ).toThrow('já foi concluída');
  });

  it('valida estado persistido e migra schema 25 para 26 sem executar gameplay', () => {
    const current = stateWithMiraHere();
    const legacy = JSON.parse(
      serializeGameState(current, baseContext, world.objectives),
    ) as Record<string, unknown>;
    legacy.schemaVersion = SCHEMA_VERSION_V25;
    delete legacy.activities;

    const parsed = parseGameState(JSON.stringify(legacy), baseContext, world.objectives);
    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') return;

    expect(parsed.state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.state.activities).toEqual({ consumedActivityIds: [] });
    expect(parsed.state.world).toEqual(current.world);
    expect(parsed.state.sandbox.npcs).toEqual(current.sandbox.npcs);

    const catalog = inspectContextualActivityCatalog(activityRaw(), activityWorldContext());
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;
    expect(
      inspectContextualActivitiesState(
        { consumedActivityIds: ['shared-check', 'shared-check'] },
        catalog.value,
      ).ok,
    ).toBe(false);
  });
});
