import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { startGame } from '../core/engine';
import { SCHEMA_VERSION, SCHEMA_VERSION_V25, SCHEMA_VERSION_V26 } from '../core/state';
import { chanceBand, chanceUnit, createChanceState, drawWeighted, seedFromText } from '../modules/chance';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  createInitialContextualActivitiesState,
  inspectContextualActivityCatalog,
  inspectContextualActivitiesState,
  listKnownContextualActivities,
  planContextualActivity,
} from '../modules/activities';
import { DAY_PERIODS } from '../core/state';
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

describe('Oportunidades com prazo', () => {
  function withDeadline(availableUntil: unknown) {
    const raw = activityRaw();
    (raw.activities[0] as Record<string, unknown>).availableUntil = availableUntil;
    return inspectContextualActivityCatalog(raw, activityWorldContext());
  }

  function at(day: number, period: (typeof DAY_PERIODS)[number]) {
    const state = stateWithMiraHere();
    return { ...state, world: { ...state.world, day, period } };
  }

  it('valida o prazo na borda do pack', () => {
    expect(withDeadline({ day: 3 }).ok).toBe(true);
    expect(withDeadline({ day: 3, period: DAY_PERIODS[1] }).ok).toBe(true);
    expect(withDeadline({ day: 0 }).ok).toBe(false);
    expect(withDeadline({ day: 2, period: 'madrugada-eterna' }).ok).toBe(false);
    expect(withDeadline('amanhã').ok).toBe(false);
  });

  it('mostra quantos dias restam e marca o último período', () => {
    const inspected = withDeadline({ day: 3 });
    if (!inspected.ok) throw new Error(inspected.reason);
    const list = (state: ReturnType<typeof at>) =>
      listKnownContextualActivities(inspected.value, createInitialContextualActivitiesState(), state, world.npcs);
    expect(list(at(1, DAY_PERIODS[0]!))[0]).toMatchObject({ daysLeft: 2, lastPeriod: false });
    expect(list(at(3, DAY_PERIODS[0]!))[0]).toMatchObject({ daysLeft: 0, lastPeriod: false });
    expect(list(at(3, DAY_PERIODS.at(-1)!))[0]).toMatchObject({ daysLeft: 0, lastPeriod: true });
  });

  it('some da lista e recusa o plano depois do prazo, inclusive por período', () => {
    const byDay = withDeadline({ day: 2 });
    const byPeriod = withDeadline({ day: 1, period: DAY_PERIODS[0] });
    if (!byDay.ok || !byPeriod.ok) throw new Error('catálogo inválido');
    const late = at(3, DAY_PERIODS[0]!);
    expect(listKnownContextualActivities(byDay.value, createInitialContextualActivitiesState(), late, world.npcs)).toEqual([]);
    expect(() =>
      planContextualActivity(byDay.value, createInitialContextualActivitiesState(), late, world.npcs, 'shared-check', []),
    ).toThrow('prazo');
    const laterSameDay = at(1, DAY_PERIODS[1]!);
    expect(listKnownContextualActivities(byPeriod.value, createInitialContextualActivitiesState(), laterSameDay, world.npcs)).toEqual([]);
    expect(
      planContextualActivity(byPeriod.value, createInitialContextualActivitiesState(), at(1, DAY_PERIODS[0]!), world.npcs, 'shared-check', [])
        .activityId,
    ).toBe('shared-check');
  });
});

describe('Incerteza declarada — schema 27', () => {
  function riskyRaw(extra: Record<string, unknown> = {}) {
    const raw = activityRaw();
    const activity = raw.activities[0] as Record<string, unknown>;
    activity.repeatable = true;
    activity.risk = {
      outcomes: [
        {
          id: 'clean',
          label: 'Sucesso',
          favorable: true,
          weight: 3,
          modifiers: [{ requirements: [{ type: 'ability.has', abilityId: 'olhar-atento' }], delta: 3 }],
          effects: [{ type: 'flag.set', flag: 'risk.clean', value: true }],
          feedback: 'Nada passa despercebido.',
        },
        {
          id: 'setback',
          label: 'Revés',
          favorable: false,
          weight: 2,
          effects: [{ type: 'flag.set', flag: 'risk.setback', value: true }],
          feedback: 'Um galho estala e o momento se perde.',
        },
      ],
      ...extra,
    };
    return raw;
  }

  function riskyContext() {
    const inspected = inspectContextualActivityCatalog(riskyRaw(), activityWorldContext());
    if (!inspected.ok) throw new Error(inspected.reason);
    return { ...baseContext, activities: inspected.value };
  }

  it('valida o bloco de risco na borda do pack', () => {
    expect(inspectContextualActivityCatalog(riskyRaw(), activityWorldContext()).ok).toBe(true);
    const single = riskyRaw();
    (single.activities[0] as unknown as { risk: { outcomes: unknown[] } }).risk.outcomes.pop();
    expect(inspectContextualActivityCatalog(single, activityWorldContext()).ok).toBe(false);
    const noFavorable = riskyRaw();
    for (const outcome of (noFavorable.activities[0] as unknown as { risk: { outcomes: { favorable: boolean }[] } }).risk.outcomes) outcome.favorable = false;
    expect(inspectContextualActivityCatalog(noFavorable, activityWorldContext()).ok).toBe(false);
    const badAbility = riskyRaw();
    (badAbility.activities[0] as unknown as { risk: { outcomes: { modifiers?: unknown[] }[] } }).risk.outcomes[0]!.modifiers = [
      { requirements: [{ type: 'ability.has', abilityId: 'voo' }], delta: 1 },
    ];
    expect(inspectContextualActivityCatalog(badAbility, activityWorldContext()).ok).toBe(false);
  });

  it('mostra a faixa antes da escolha e a aptidão melhora a chance', () => {
    const context = riskyContext();
    const state = stateWithMiraHere();
    const list = (target: typeof state) =>
      listKnownContextualActivities(context.activities, createInitialContextualActivitiesState(), target, world.npcs)[0]?.chance;
    expect(list(state)).toEqual({ band: 'incerta', favorablePercent: 60 });
    const sharp = { ...state, progression: { ...state.progression, abilityIds: ['olhar-atento'] } };
    expect(list(sharp)).toEqual({ band: 'alta', favorablePercent: 75 });
  });

  it('sorteia no motor, consome uma posição do cursor e é reproduzível com a mesma semente', () => {
    const context = riskyContext();
    const state = stateWithMiraHere();
    const perform = (target: typeof state) =>
      executeSandboxAction(
        target,
        { type: 'activity.perform', activityId: 'shared-check', optionalParticipantIds: [] },
        { context, objectives: world.objectives, campaign: world.campaign, now },
      );
    const first = perform(state);
    const again = perform(state);
    expect(first.current.rng).toEqual({ seed: state.rng.seed, cursor: state.rng.cursor + 1 });
    expect(again.current.flags).toEqual(first.current.flags);
    expect(Boolean(first.current.flags['risk.clean']) !== Boolean(first.current.flags['risk.setback'])).toBe(true);
    expect(first.feedback).toMatch(/(Sucesso: Nada passa despercebido\.|Revés: Um galho estala)/);

    const outcomes = new Set<string>();
    let cursorState = state;
    for (let index = 0; index < 20; index += 1) {
      const next = perform({ ...cursorState, flags: {} }).current;
      outcomes.add(next.flags['risk.clean'] ? 'clean' : 'setback');
      cursorState = { ...state, rng: next.rng };
    }
    expect(outcomes).toEqual(new Set(['clean', 'setback']));
  });

  it('recarregar o save não permite sortear de novo', () => {
    const context = riskyContext();
    const performed = executeSandboxAction(
      stateWithMiraHere(),
      { type: 'activity.perform', activityId: 'shared-check', optionalParticipantIds: [] },
      { context, objectives: world.objectives, campaign: world.campaign, now },
    ).current;
    const reloaded = parseGameState(serializeGameState(performed, context, world.objectives), context, world.objectives);
    expect(reloaded.status).toBe('ok');
    if (reloaded.status !== 'ok') return;
    expect(reloaded.state.rng).toEqual(performed.rng);
  });

  it('migra saves do schema 26 com semente estável e rejeita sorte adulterada', () => {
    const current = stateWithMiraHere();
    const serialized = JSON.parse(serializeGameState(current, baseContext, world.objectives)) as Record<string, unknown>;

    const legacy: Record<string, unknown> = { ...serialized, schemaVersion: SCHEMA_VERSION_V26 };
    delete legacy.rng;
    const parsed = parseGameState(JSON.stringify(legacy), baseContext, world.objectives);
    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') return;
    expect(parsed.state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.state.rng).toEqual({
      seed: seedFromText(`${current.updatedAt}|${current.character.firstName} ${current.character.lastName}`),
      cursor: 0,
    });

    expect(parseGameState(JSON.stringify({ ...serialized, schemaVersion: SCHEMA_VERSION_V26 }), baseContext, world.objectives).status).toBe('corrupt');
    for (const rng of [undefined, { seed: -1, cursor: 0 }, { seed: 1, cursor: 1.5 }, { seed: 2 ** 32, cursor: 0 }]) {
      expect(parseGameState(JSON.stringify({ ...serialized, rng }), baseContext, world.objectives).status).toBe('corrupt');
    }
  });
});

describe('Sorte pura', () => {
  it('é determinística, cobre os pesos e classifica a faixa', () => {
    const base = createChanceState('semente');
    expect(createChanceState('semente')).toEqual(base);
    expect(chanceUnit(base)).toBe(chanceUnit({ ...base }));
    const counts = [0, 0];
    let state = base;
    for (let index = 0; index < 2000; index += 1) {
      const drawn = drawWeighted(state, [3, 1]);
      counts[drawn.index]! += 1;
      state = drawn.next;
    }
    expect(state.cursor).toBe(2000);
    expect(counts[0]! / 2000).toBeGreaterThan(0.68);
    expect(counts[0]! / 2000).toBeLessThan(0.82);
    expect(() => drawWeighted(base, [0, 0])).toThrow();
    expect(chanceBand(7, 10)).toBe('alta');
    expect(chanceBand(4, 10)).toBe('incerta');
    expect(chanceBand(3, 10)).toBe('arriscada');
  });
});
