import type { IndexedObjectives, ObjectivesSynchronizationResult } from '../../modules/objectives';
import type { FeedbackEntry } from '../sandbox/feedback';

export function describeObjectiveFeedback(
  synchronization: ObjectivesSynchronizationResult,
  catalog: IndexedObjectives,
): FeedbackEntry | null {
  if (synchronization.completedObjectiveIds.length > 0) {
    const names = synchronization.completedObjectiveIds
      .map((objectiveId) => catalog.byId.get(objectiveId)?.title)
      .filter((title): title is string => title !== undefined);
    return names.length > 0 ? { kind: 'journey', message: `Jornada concluída: ${names.join(' · ')}.` } : null;
  }

  if (synchronization.completedSteps.length > 0) {
    const updates = synchronization.completedSteps.flatMap(({ objectiveId, stepId }) => {
      const objective = catalog.byId.get(objectiveId);
      const step = objective?.steps.find((entry) => entry.id === stepId);
      return objective && step ? [`${objective.title} — ${step.title}`] : [];
    });
    return updates.length > 0 ? { kind: 'journey', message: `Jornada atualizada: ${updates.join(' · ')}.` } : null;
  }

  const activated = synchronization.activatedObjectiveIds
    .map((objectiveId) => catalog.byId.get(objectiveId)?.title)
    .filter((title): title is string => title !== undefined);
  return activated.length > 0 ? { kind: 'journey', message: `Nova jornada: ${activated.join(' · ')}.` } : null;
}
