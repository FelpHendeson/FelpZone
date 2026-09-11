import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice } from '../core/engine';
import { createMemoryPersistence, parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  INITIAL_OBJECTIVES,
  getObjectiveStatus,
  indexObjectiveCatalog,
  listKnownObjectives,
} from '../modules/objectives';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction, type SandboxAction } from '../modules/sandbox-actions';
import { buildJournalView } from '../ui/journal';
import { freshState, playFirstDay } from './helpers';

const context = createSandboxContext();

function progressFor(state: ReturnType<typeof freshState>) {
  return state.objectives.entries.find((entry) => entry.objectiveId === 'first-steps');
}

describe('Fatia 10.5 — jornada Primeiros passos', () => {
  it.each(['ability-perception', 'ability-resilience', 'ability-empathy'])(
    'ativa a mesma jornada ao escolher %s',
    (abilityChoice) => {
      let state = freshState();
      state = applyChoice(state, firstDayCampaign, 'awake-calm');
      state = applyChoice(state, firstDayCampaign, 'system-touch');

      expect(state.objectives.entries).toEqual([]);

      state = applyChoice(state, firstDayCampaign, abilityChoice);

      expect(listKnownObjectives(INITIAL_OBJECTIVES, state.objectives)).toHaveLength(1);
      expect(progressFor(state)).toEqual({
        objectiveId: 'first-steps',
        completedStepIds: ['choose-ability'],
        completed: false,
      });
    },
  );

  it('percorre, persiste e conclui a jornada sem interromper o sandbox', () => {
    const persistence = createMemoryPersistence(undefined, context);
    let state = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);

    function act(action: SandboxAction): ReturnType<typeof executeSandboxAction> {
      const result = executeSandboxAction(state, action, { context, campaign: firstDayCampaign });
      persistence.save(result.current);
      const loaded = persistence.load();
      expect(loaded.status).toBe('ok');
      if (loaded.status !== 'ok') {
        throw new Error('A jornada não foi persistida corretamente.');
      }
      state = loaded.state;
      return result;
    }

    expect(progressFor(state)?.completedStepIds).toEqual(['choose-ability']);

    for (let count = 0; count < 6; count += 1) {
      act({ type: 'exploration.explore' });
    }
    expect(progressFor(state)?.completedStepIds).toEqual([
      'choose-ability',
      'explore-awakening-clearing',
    ]);

    act({ type: 'navigation.move', locationId: 'spring-lake' });
    act({ type: 'exploration.explore' });
    expect(progressFor(state)?.completedStepIds).toContain('find-spring');

    act({ type: 'navigation.move', locationId: 'awakening-clearing' });
    act({ type: 'resource.collect', nodeId: 'fallen-sticks', units: 2 });
    act({ type: 'resource.collect', nodeId: 'fallen-sticks', units: 1 });
    act({ type: 'crafting.craft', recipeId: 'build-campfire' });
    expect(progressFor(state)?.completedStepIds).toContain('build-campfire');

    act({ type: 'navigation.move', locationId: 'dense-woods' });
    for (let count = 0; count < 4; count += 1) {
      act({ type: 'exploration.explore' });
    }
    act({ type: 'resource.collect', nodeId: 'horned-rabbit-warren', units: 1 });
    act({ type: 'navigation.move', locationId: 'awakening-clearing' });
    const cooked = act({ type: 'crafting.craft', recipeId: 'cook-horned-rabbit-meat' });

    expect(cooked.objectives.completedSteps).toEqual([
      { objectiveId: 'first-steps', stepId: 'prepare-meal' },
      { objectiveId: 'first-steps', stepId: 'investigate-signs' },
    ]);
    expect(progressFor(state)?.completedStepIds).toEqual([
      'choose-ability',
      'explore-awakening-clearing',
      'find-spring',
      'build-campfire',
      'prepare-meal',
      'investigate-signs',
    ]);

    const journal = buildJournalView(state, context);
    expect(journal.journeys[0].steps.at(-1)).toMatchObject({ id: 'meet-mira', current: true });

    const met = act({
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    });
    expect(met.objectives.completedObjectiveIds).toEqual(['first-steps']);
    expect(getObjectiveStatus(INITIAL_OBJECTIVES, state.objectives, 'first-steps')).toBe('completed');
    expect(state.narrativeSession?.eventId).toBe('first-priority');

    for (const choiceId of [
      'seek-water',
      'alert-hide',
      'meet-open',
      'share-fruit',
      'accept-shelter',
      'together-summary',
    ]) {
      state = applyChoice(state, firstDayCampaign, choiceId);
    }

    expect(state.narrativeSession).toBeNull();
    expect(getObjectiveStatus(INITIAL_OBJECTIVES, state.objectives, 'first-steps')).toBe('completed');
    expect(() => executeSandboxAction(state, { type: 'exploration.explore' }, { context })).not.toThrow();
  });

  it('reconcilia um save schema 6 criado quando o catálogo inicial estava vazio', () => {
    const emptyCatalog = indexObjectiveCatalog({ objectives: [] });
    const legacyContentState = playFirstDay(['awake-calm', 'system-touch', 'ability-resilience']);
    const withoutJourney = { ...legacyContentState, objectives: { entries: [] } };
    const raw = serializeGameState(withoutJourney, context, emptyCatalog);

    const loaded = parseGameState(raw, context);

    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(progressFor(loaded.state)).toEqual({
        objectiveId: 'first-steps',
        completedStepIds: ['choose-ability'],
        completed: false,
      });
    }
  });

  it('mantém sincronizações repetidas idempotentes depois da conclusão', () => {
    const completed = {
      ...playFirstDay(['awake-calm', 'system-touch', 'ability-empathy']),
      objectives: {
        entries: [{
          objectiveId: 'first-steps',
          completedStepIds: INITIAL_OBJECTIVES.objectives[0].steps.map((step) => step.id),
          completed: true,
        }],
      },
    };

    const firstLoad = parseGameState(serializeGameState(completed, context), context);
    expect(firstLoad).toEqual({ status: 'ok', state: completed });
    if (firstLoad.status === 'ok') {
      expect(parseGameState(serializeGameState(firstLoad.state, context), context)).toEqual(firstLoad);
    }
  });
});
