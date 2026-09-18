import type { GameCondition, GameEffect, ImageReference } from '../../core/events';
import type { DayPeriod } from '../../core/state/types';
import type { TimeCost } from '../time';

export interface InteractableStageDefinition {
  id: string;
  name: string;
  description: string;
}

export interface InteractableFactDefinition {
  id: string;
  text: string;
}

export interface InteractableDefinition {
  id: string;
  locationId: string;
  discoveryId: string;
  name: string;
  description: string;
  initialStageId: string;
  stages: readonly InteractableStageDefinition[];
  facts: readonly InteractableFactDefinition[];
  image?: ImageReference;
}

export type InteractableRequirement =
  | GameCondition
  | { type: 'skill.known'; skillId: string }
  | { type: 'period.is'; period: DayPeriod };

export type InteractableDomainEffect =
  | { type: 'interactable.setStage'; stageId: string }
  | { type: 'interactable.revealFact'; factId: string }
  | { type: 'navigation.unlock'; locationId: string }
  | { type: 'navigation.discover'; locationId: string };

export type InteractableEffect = InteractableDomainEffect | GameEffect;

export interface InteractableActionDefinition {
  id: string;
  interactableId: string;
  stageId: string;
  label: string;
  hint?: string;
  timeCost: TimeCost;
  once?: boolean;
  requirements?: readonly InteractableRequirement[];
  effects: readonly InteractableEffect[];
  feedback?: string;
}

export interface InteractableCatalog {
  interactables: readonly InteractableDefinition[];
  actions: readonly InteractableActionDefinition[];
}

export interface InteractableObjectState {
  interactableId: string;
  stageId: string;
  consumedActionIds: string[];
  revealedFactIds: string[];
}

export interface InteractablesState {
  objects: InteractableObjectState[];
}

export interface IndexedInteractables {
  readonly interactables: readonly InteractableDefinition[];
  readonly actions: readonly InteractableActionDefinition[];
  readonly byId: ReadonlyMap<string, InteractableDefinition>;
  readonly actionById: ReadonlyMap<string, InteractableActionDefinition>;
  readonly idsByLocation: ReadonlyMap<string, readonly string[]>;
}

export interface InteractableInspection<T> {
  ok: true;
  value: T;
}

export type InteractableInspectionResult<T> = InteractableInspection<T> | { ok: false; reason: string };

export interface KnownInteractableAction {
  action: InteractableActionDefinition;
  available: boolean;
  blockedReason?: string;
}

export interface KnownInteractable {
  definition: InteractableDefinition;
  stage: InteractableStageDefinition;
  revealedFacts: InteractableFactDefinition[];
  actions: KnownInteractableAction[];
}

export interface InteractableActionPlan {
  actionId: string;
  interactableId: string;
  timeCost: TimeCost;
  effects: InteractableEffect[];
  feedback?: string;
}

export interface InteractableSynchronizationResult {
  previous: InteractablesState;
  current: InteractablesState;
  newlyDiscoveredIds: string[];
}
