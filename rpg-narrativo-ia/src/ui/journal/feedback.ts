import type { IndexedObjectives, ObjectivesSynchronizationResult } from '../../modules/objectives';

export function describeObjectiveFeedback(
  synchronization: ObjectivesSynchronizationResult,
  catalog: IndexedObjectives,
): string {
  if (synchronization.completedObjectiveIds.length > 0) {
    const names = synchronization.completedObjectiveIds
      .map((objectiveId) => catalog.byId.get(objectiveId)?.title)
      .filter((title): title is string => title !== undefined);
    return names.length > 0 ? `Jornada concluída: ${names.join(' · ')}.` : '';
  }

  if (synchronization.completedSteps.length > 0) {
    const updates = synchronization.completedSteps.flatMap(({ objectiveId, stepId }) => {
      const objective = catalog.byId.get(objectiveId);
      const step = objective?.steps.find((entry) => entry.id === stepId);
      return objective && step ? [`${objective.title} — ${step.title}`] : [];
    });
    return updates.length > 0 ? `Jornada atualizada: ${updates.join(' · ')}.` : '';
  }

  const activated = synchronization.activatedObjectiveIds
    .map((objectiveId) => catalog.byId.get(objectiveId)?.title)
    .filter((title): title is string => title !== undefined);
  return activated.length > 0 ? `Nova jornada: ${activated.join(' · ')}.` : '';
}
