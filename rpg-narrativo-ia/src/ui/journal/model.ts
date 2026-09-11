import type { HistoryEntry, GameState } from '../../core/state';
import { inspectGameState } from '../../core/state';
import {
  INITIAL_OBJECTIVES,
  listKnownObjectives,
  type IndexedObjectives,
  type ObjectiveKind,
} from '../../modules/objectives';
import type { DiscoveryKind } from '../../modules/exploration';
import type { SandboxContext } from '../../modules/sandbox';
import type { WorldEntityKind } from '../../modules/presences';
import { sandboxDiscoveryName } from '../sandbox/labels';

export class JournalViewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JournalViewError';
  }
}

export interface JournalStepView {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  current: boolean;
}

export interface JournalJourneyView {
  id: string;
  title: string;
  description: string;
  kind: ObjectiveKind;
  status: 'active' | 'completed';
  completedSteps: number;
  totalSteps: number;
  steps: JournalStepView[];
  completionText?: string;
}

export interface JournalDiscoveryView {
  id: string;
  name: string;
  kind: DiscoveryKind;
}

export interface JournalLocationView {
  id: string;
  name: string;
  description: string;
  progress: number;
  discoveries: JournalDiscoveryView[];
}

export interface JournalPresenceView {
  presenceId: string;
  entityId: string;
  locationId: string;
  kind: WorldEntityKind;
  name: string;
  description: string;
  status: 'known' | 'resolved';
}

export interface JournalView {
  journeys: JournalJourneyView[];
  locations: JournalLocationView[];
  presences: JournalPresenceView[];
  history: HistoryEntry[];
}

export function buildJournalView(
  state: GameState,
  context: SandboxContext,
  objectiveCatalog: IndexedObjectives = INITIAL_OBJECTIVES,
): JournalView {
  const inspected = inspectGameState(state, context, objectiveCatalog);
  if (!inspected.ok) {
    throw new JournalViewError(inspected.reason);
  }

  const current = inspected.state;
  return {
    journeys: buildJourneys(current, objectiveCatalog),
    locations: buildLocations(current, context),
    presences: buildPresences(current, context),
    history: current.history.map((entry) => ({ ...entry })),
  };
}

function buildJourneys(state: GameState, catalog: IndexedObjectives): JournalJourneyView[] {
  return listKnownObjectives(catalog, state.objectives).map(({ objective, progress, status, nextStepIds }) => {
    const visibleStepIds = new Set([...progress.completedStepIds, ...nextStepIds]);
    return {
      id: objective.id,
      title: objective.title,
      description: objective.description,
      kind: objective.kind,
      status,
      completedSteps: progress.completedStepIds.length,
      totalSteps: objective.steps.length,
      steps: objective.steps
        .filter((step) => visibleStepIds.has(step.id))
        .map((step) => ({
          id: step.id,
          title: step.title,
          ...(step.description === undefined ? {} : { description: step.description }),
          completed: progress.completedStepIds.includes(step.id),
          current: nextStepIds.includes(step.id),
        })),
      ...(status === 'completed' && objective.completionText !== undefined
        ? { completionText: objective.completionText }
        : {}),
    };
  });
}

function buildLocations(state: GameState, context: SandboxContext): JournalLocationView[] {
  return state.sandbox.navigation.visitedLocationIds.map((locationId) => {
    const location = context.map.locations.get(locationId);
    if (!location) {
      throw new JournalViewError('O diário referencia uma localização inexistente.');
    }

    const exploration = state.sandbox.exploration.locations.find((entry) => entry.locationId === locationId);
    return {
      id: location.id,
      name: location.name,
      description: location.description ?? '',
      progress: exploration?.progress ?? 0,
      discoveries: (exploration?.revealedDiscoveryIds ?? []).map((discoveryId) => {
        const discovery = context.exploration.byDiscovery.get(discoveryId);
        if (!discovery) {
          throw new JournalViewError('O diário referencia uma descoberta inexistente.');
        }
        return {
          id: discovery.id,
          name: sandboxDiscoveryName(discovery.id),
          kind: discovery.kind,
        };
      }),
    };
  });
}

function buildPresences(state: GameState, context: SandboxContext): JournalPresenceView[] {
  return state.sandbox.presences.discoveredPresenceIds.map((presenceId) => {
    const presence = context.presences.byPresence.get(presenceId);
    const entity = presence ? context.presences.byEntity.get(presence.entityId) : undefined;
    if (!presence || !entity) {
      throw new JournalViewError('O diário referencia uma presença inexistente.');
    }

    return {
      presenceId: presence.id,
      entityId: entity.id,
      locationId: presence.locationId,
      kind: entity.kind,
      name: entity.name,
      description: entity.description,
      status: state.sandbox.presences.resolvedPresenceIds.includes(presence.id) ? 'resolved' : 'known',
    };
  });
}
