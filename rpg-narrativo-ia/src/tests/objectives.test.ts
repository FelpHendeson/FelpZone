import { describe, expect, it } from 'vitest';
import {
  ObjectiveError,
  activateObjective,
  completeObjectiveStep,
  createInitialObjectivesState,
  getObjective,
  getObjectiveStatus,
  indexObjectiveCatalog,
  inspectObjectiveCatalog,
  inspectObjectivesState,
  listKnownObjectives,
  type IndexedObjectives,
  type ObjectiveCatalog,
  type ObjectiveCriterion,
  type ObjectiveDefinition,
  type ObjectivesState,
} from '../modules/objectives';

function criterion(overrides: Partial<ObjectiveCriterion> = {}): ObjectiveCriterion {
  return { type: 'flag.is', flag: 'system.ready', value: true, ...overrides } as ObjectiveCriterion;
}

function objective(overrides: Partial<ObjectiveDefinition> = {}): ObjectiveDefinition {
  return {
    id: 'first-steps',
    title: 'Primeiros passos',
    description: 'Aprenda a caminhar pelo novo mundo.',
    kind: 'main',
    stepMode: 'sequential',
    activation: { type: 'automatic' },
    steps: [
      { id: 'wake', title: 'Desperte', criteria: [criterion()] },
      {
        id: 'explore',
        title: 'Explore a clareira',
        description: 'Procure sinais ao redor.',
        criteria: [{ type: 'exploration.discovery.revealed', discoveryId: 'awakening-site' }],
      },
    ],
    completionText: 'Você encontrou um rumo.',
    ...overrides,
  };
}

function catalog(): ObjectiveCatalog {
  return {
    objectives: [
      objective(),
      objective({
        id: 'optional-water',
        title: 'Água por perto',
        description: 'Encontre uma fonte de água.',
        kind: 'side',
        stepMode: 'parallel',
        activation: {
          type: 'criteria',
          criteria: [{ type: 'navigation.location.visited', locationId: 'spring-lake' }],
        },
        steps: [
          { id: 'find', title: 'Encontre a nascente', criteria: [{ type: 'flag.is', flag: 'spring.found', value: true }] },
          {
            id: 'carry',
            title: 'Leve água',
            criteria: [{ type: 'inventory.item.quantity', itemId: 'raw-water', quantity: 1 }],
          },
        ],
        completionText: undefined,
      }),
      objective({
        id: 'hidden-mira',
        title: 'Outra sobrevivente',
        description: 'Descubra quem deixou os sinais.',
        kind: 'hidden',
        activation: {
          type: 'criteria',
          criteria: [{ type: 'presence.discovered', presenceId: 'mira-awakening-clearing' }],
        },
        steps: [
          {
            id: 'meet',
            title: 'Conheça Mira',
            criteria: [{ type: 'presence.resolved', presenceId: 'mira-awakening-clearing' }],
          },
        ],
        completionText: undefined,
      }),
    ],
  };
}

function indexed(): IndexedObjectives {
  return indexObjectiveCatalog(catalog());
}

function freezeState(state: ObjectivesState): ObjectivesState {
  state.entries.forEach((entry) => Object.freeze(entry.completedStepIds));
  state.entries.forEach(Object.freeze);
  Object.freeze(state.entries);
  return Object.freeze(state);
}

describe('Fatia 10.1 — catálogo de objetivos', () => {
  it('indexa definições válidas e preserva a ordem declarada', () => {
    const value = indexed();

    expect(value.objectives.map((entry) => entry.id)).toEqual(['first-steps', 'optional-water', 'hidden-mira']);
    expect([...value.byId.keys()]).toEqual(['first-steps', 'optional-water', 'hidden-mira']);
    expect(getObjective(value, 'first-steps').steps.map((step) => step.id)).toEqual(['wake', 'explore']);
  });

  it.each([
    null,
    {},
    { objectives: 'invalid' },
    { objectives: [objective({ id: '' })] },
    { objectives: [objective({ title: ' ' })] },
    { objectives: [objective({ description: '' })] },
    { objectives: [objective({ kind: 'urgent' as ObjectiveDefinition['kind'] })] },
    { objectives: [objective({ stepMode: 'mixed' as ObjectiveDefinition['stepMode'] })] },
    { objectives: [objective({ steps: [] })] },
  ])('rejeita forma de catálogo ou definição inválida %#', (value) => {
    expect(inspectObjectiveCatalog(value).ok).toBe(false);
  });

  it('rejeita IDs duplicados de objetivo e de etapa', () => {
    expect(inspectObjectiveCatalog({ objectives: [objective(), objective()] }).ok).toBe(false);
    expect(
      inspectObjectiveCatalog({
        objectives: [objective({ steps: [objective().steps[0], objective().steps[0]] })],
      }).ok,
    ).toBe(false);
  });

  it.each([
    { type: 'unknown' },
    { type: 'flag.is', flag: '', value: true },
    { type: 'flag.is', flag: 'known', value: 'yes' },
    { type: 'inventory.item.quantity', itemId: 'raw-water', quantity: 0 },
    { type: 'inventory.item.quantity', itemId: 'raw-water', quantity: 1.5 },
    { type: 'world.day.min', day: Number.MAX_SAFE_INTEGER + 1 },
    { type: 'crafting.structure.active', structureId: '', locationId: 'clearing' },
    { type: 'crafting.structure.active', structureId: 'campfire', locationId: '' },
  ])('rejeita critério malformado %#', (invalidCriterion) => {
    expect(
      inspectObjectiveCatalog({
        objectives: [
          objective({
            steps: [{ id: 'step', title: 'Etapa', criteria: [invalidCriterion as ObjectiveCriterion] }],
          }),
        ],
      }).ok,
    ).toBe(false);
  });

  it('rejeita ativação por critérios vazia e etapa sem critérios', () => {
    expect(
      inspectObjectiveCatalog({
        objectives: [objective({ activation: { type: 'criteria', criteria: [] } })],
      }).ok,
    ).toBe(false);
    expect(
      inspectObjectiveCatalog({
        objectives: [objective({ steps: [{ id: 'empty', title: 'Vazia', criteria: [] }] })],
      }).ok,
    ).toBe(false);
  });

  it('copia e congela definições e critérios em profundidade', () => {
    const source = catalog();
    const snapshot = structuredClone(source);
    const value = indexObjectiveCatalog(source);

    source.objectives[0].title = 'Alterado fora';
    source.objectives[0].steps[0].title = 'Etapa alterada';
    (source.objectives[0].steps[0].criteria[0] as { flag: string }).flag = 'hacked';

    expect(value.objectives).toEqual(snapshot.objectives);
    expect(() => (value.objectives as ObjectiveDefinition[]).push(objective())).toThrow();
    expect(() => value.objectives[0].steps.push(objective().steps[0])).toThrow();
    expect(() => ((value.objectives[0].steps[0].criteria[0] as { flag: string }).flag = 'hacked')).toThrow();
  });

  it('protege o índice contra set, delete e clear', () => {
    const value = indexed();
    const mutable = value.byId as Map<string, ObjectiveDefinition>;

    expect(() => mutable.set('forged', objective({ id: 'forged' }))).toThrow(ObjectiveError);
    expect(() => mutable.delete('first-steps')).toThrow(ObjectiveError);
    expect(() => mutable.clear()).toThrow(ObjectiveError);
    expect(getObjective(value, 'first-steps').title).toBe('Primeiros passos');
  });

  it('rejeita divergência entre a lista e o índice', () => {
    const value = indexed();
    const missing = new Map(value.byId);
    missing.delete('hidden-mira');
    const changed = new Map(value.byId);
    changed.set('first-steps', objective({ title: 'Título adulterado' }));
    const reordered = new Map([...value.byId].reverse());

    for (const forged of [missing, changed, reordered]) {
      const catalogValue = { objectives: value.objectives, byId: forged } as IndexedObjectives;
      expect(() => createInitialObjectivesState(catalogValue)).toThrow(/inconsistente/);
      expect(inspectObjectivesState({ entries: [] }, catalogValue).ok).toBe(false);
    }
  });
});

describe('Fatia 10.1 — estado e progresso isolado', () => {
  it('ativa inicialmente apenas objetivos automáticos', () => {
    const value = indexed();
    const state = createInitialObjectivesState(value);

    expect(state).toEqual({
      entries: [{ objectiveId: 'first-steps', completedStepIds: [], completed: false }],
    });
    expect(getObjectiveStatus(value, state, 'first-steps')).toBe('active');
    expect(getObjectiveStatus(value, state, 'optional-water')).toBe('locked');
    expect(getObjectiveStatus(value, state, 'hidden-mira')).toBe('locked');
    expect(listKnownObjectives(value, state).map((entry) => entry.objective.id)).toEqual(['first-steps']);
  });

  it('ativa objetivo uma vez e mantém a ordem do catálogo', () => {
    const value = indexed();
    const initial = freezeState(createInitialObjectivesState(value));
    const hidden = activateObjective(value, initial, 'hidden-mira');
    const optional = activateObjective(value, freezeState(hidden), 'optional-water');
    const repeated = activateObjective(value, freezeState(optional), 'optional-water');

    expect(optional.entries.map((entry) => entry.objectiveId)).toEqual([
      'first-steps',
      'optional-water',
      'hidden-mira',
    ]);
    expect(repeated).toEqual(optional);
    expect(repeated).not.toBe(optional);
    expect(initial.entries).toHaveLength(1);
  });

  it('exige ativação e respeita a ordem de objetivo sequencial', () => {
    const value = indexed();
    const initial = freezeState(createInitialObjectivesState(value));

    expect(() => completeObjectiveStep(value, initial, 'optional-water', 'find')).toThrow(/não está ativo/);
    expect(() => completeObjectiveStep(value, initial, 'first-steps', 'explore')).toThrow(/etapa anterior/);

    const first = completeObjectiveStep(value, initial, 'first-steps', 'wake');
    expect(first.stepNewlyCompleted).toBe(true);
    expect(first.objectiveNewlyCompleted).toBe(false);
    expect(first.current.entries[0].completedStepIds).toEqual(['wake']);

    const last = completeObjectiveStep(value, freezeState(first.current), 'first-steps', 'explore');
    expect(last.objectiveNewlyCompleted).toBe(true);
    expect(last.current.entries[0]).toEqual({
      objectiveId: 'first-steps',
      completedStepIds: ['wake', 'explore'],
      completed: true,
    });
    expect(getObjectiveStatus(value, last.current, 'first-steps')).toBe('completed');
  });

  it('mantém conclusão de etapa idempotente', () => {
    const value = indexed();
    const first = completeObjectiveStep(value, createInitialObjectivesState(value), 'first-steps', 'wake');
    const repeated = completeObjectiveStep(value, freezeState(first.current), 'first-steps', 'wake');

    expect(repeated.stepNewlyCompleted).toBe(false);
    expect(repeated.objectiveNewlyCompleted).toBe(false);
    expect(repeated.current).toEqual(first.current);
    expect(repeated.current).not.toBe(first.current);
  });

  it('permite etapas paralelas fora de ordem e normaliza a ordem persistida', () => {
    const value = indexed();
    const active = activateObjective(value, createInitialObjectivesState(value), 'optional-water');
    const carry = completeObjectiveStep(value, active, 'optional-water', 'carry');
    const find = completeObjectiveStep(value, carry.current, 'optional-water', 'find');

    expect(carry.current.entries[1].completedStepIds).toEqual(['carry']);
    expect(find.current.entries[1].completedStepIds).toEqual(['find', 'carry']);
    expect(find.objectiveNewlyCompleted).toBe(true);
  });

  it('deriva próximas etapas sem expor objetivo oculto bloqueado', () => {
    const value = indexed();
    const initial = createInitialObjectivesState(value);
    expect(listKnownObjectives(value, initial)).toMatchObject([
      { objective: { id: 'first-steps' }, status: 'active', nextStepIds: ['wake'] },
    ]);

    const optional = activateObjective(value, initial, 'optional-water');
    expect(listKnownObjectives(value, optional)[1]).toMatchObject({
      objective: { id: 'optional-water' },
      status: 'active',
      nextStepIds: ['find', 'carry'],
    });
    expect(listKnownObjectives(value, optional).map((entry) => entry.objective.id)).not.toContain('hidden-mira');
  });

  it.each([
    { entries: [] },
    { entries: [{ objectiveId: 'missing', completedStepIds: [], completed: false }] },
    {
      entries: [
        { objectiveId: 'first-steps', completedStepIds: [], completed: false },
        { objectiveId: 'first-steps', completedStepIds: [], completed: false },
      ],
    },
    { entries: [{ objectiveId: 'first-steps', completedStepIds: ['explore'], completed: false }] },
    { entries: [{ objectiveId: 'first-steps', completedStepIds: ['wake', 'wake'], completed: false }] },
    { entries: [{ objectiveId: 'first-steps', completedStepIds: ['wake', 'missing'], completed: true }] },
    { entries: [{ objectiveId: 'first-steps', completedStepIds: ['wake'], completed: true }] },
    { entries: [{ objectiveId: 'first-steps', completedStepIds: ['wake', 'explore'], completed: false }] },
  ])('rejeita estado inconsistente %#', (state) => {
    expect(inspectObjectivesState(state, indexed()).ok).toBe(false);
  });

  it('rejeita entradas fora da ordem canônica', () => {
    const state = {
      entries: [
        { objectiveId: 'optional-water', completedStepIds: [], completed: false },
        { objectiveId: 'first-steps', completedStepIds: [], completed: false },
      ],
    };
    expect(inspectObjectivesState(state, indexed()).ok).toBe(false);
  });

  it('não muta o estado e devolve cópias defensivas nas consultas', () => {
    const value = indexed();
    const initial = freezeState(createInitialObjectivesState(value));
    const result = completeObjectiveStep(value, initial, 'first-steps', 'wake');
    const listed = listKnownObjectives(value, result.current);
    const copied = getObjective(value, 'first-steps');

    listed[0].progress.completedStepIds.push('hacked');
    listed[0].objective.steps[0].title = 'Alterada';
    copied.steps[0].criteria[0] = { type: 'world.day.min', day: 99 };

    expect(result.current.entries[0].completedStepIds).toEqual(['wake']);
    expect(getObjective(value, 'first-steps').steps[0].title).toBe('Desperte');
    expect(getObjective(value, 'first-steps').steps[0].criteria).toEqual([
      { type: 'flag.is', flag: 'system.ready', value: true },
    ]);
    expect(initial.entries[0].completedStepIds).toEqual([]);
  });

  it('falha de forma controlada para IDs inexistentes', () => {
    const value = indexed();
    const state = createInitialObjectivesState(value);

    expect(() => getObjective(value, 'missing')).toThrow(ObjectiveError);
    expect(() => getObjectiveStatus(value, state, 'missing')).toThrow(ObjectiveError);
    expect(() => activateObjective(value, state, 'missing')).toThrow(ObjectiveError);
    expect(() => completeObjectiveStep(value, state, 'first-steps', 'missing')).toThrow(ObjectiveError);
  });
});
