export const OBJECTIVE_KINDS = ['main', 'side', 'hidden'] as const;
export const OBJECTIVE_STEP_MODES = ['sequential', 'parallel'] as const;
export const OBJECTIVE_STATUSES = ['locked', 'active', 'completed'] as const;

export type ObjectiveKind = (typeof OBJECTIVE_KINDS)[number];
export type ObjectiveStepMode = (typeof OBJECTIVE_STEP_MODES)[number];
export type ObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];

export type ObjectiveCriterion =
  | { type: 'progression.ability.has'; abilityId: string }
  | { type: 'navigation.location.visited'; locationId: string }
  | { type: 'exploration.discovery.revealed'; discoveryId: string }
  | { type: 'inventory.item.quantity'; itemId: string; quantity: number }
  | { type: 'crafting.structure.active'; structureId: string; locationId?: string }
  | { type: 'presence.discovered'; presenceId: string }
  | { type: 'presence.resolved'; presenceId: string }
  | { type: 'flag.is'; flag: string; value: boolean }
  | { type: 'world.day.min'; day: number };

export type ObjectiveActivation =
  | { type: 'automatic' }
  | { type: 'criteria'; criteria: ObjectiveCriterion[] };

export interface ObjectiveStepDefinition {
  id: string;
  title: string;
  description?: string;
  criteria: ObjectiveCriterion[];
}

export interface ObjectiveDefinition {
  id: string;
  title: string;
  description: string;
  kind: ObjectiveKind;
  stepMode: ObjectiveStepMode;
  activation: ObjectiveActivation;
  steps: ObjectiveStepDefinition[];
  completionText?: string;
}

export interface ObjectiveCatalog {
  objectives: readonly ObjectiveDefinition[];
}

export interface IndexedObjectives {
  readonly objectives: readonly ObjectiveDefinition[];
  readonly byId: ReadonlyMap<string, ObjectiveDefinition>;
}

export interface ObjectiveProgress {
  objectiveId: string;
  completedStepIds: string[];
  completed: boolean;
}

export interface ObjectivesState {
  entries: ObjectiveProgress[];
}

export interface KnownObjective {
  objective: ObjectiveDefinition;
  progress: ObjectiveProgress;
  status: Exclude<ObjectiveStatus, 'locked'>;
  nextStepIds: string[];
}

export interface ObjectiveStepCompletionResult {
  previous: ObjectivesState;
  current: ObjectivesState;
  objectiveId: string;
  stepId: string;
  stepNewlyCompleted: boolean;
  objectiveNewlyCompleted: boolean;
}

export interface ObjectiveStepReference {
  objectiveId: string;
  stepId: string;
}

export interface ObjectivesSynchronizationResult {
  previous: ObjectivesState;
  current: ObjectivesState;
  activatedObjectiveIds: string[];
  completedSteps: ObjectiveStepReference[];
  completedObjectiveIds: string[];
}

export type ObjectiveInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
