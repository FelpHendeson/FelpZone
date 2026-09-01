import { applyChoice, getAvailableChoices, startGame } from './applyChoice';
import type { Campaign } from '../events/types';
import type { GameState } from '../state/types';

export interface TrajectoryWalk {
  reachedEventIds: string[];
  completedPaths: number;
  returnedToExplorationPaths: number;
  deadEnds: Array<{ eventId: string; path: string[] }>;
  errors: string[];
}

export function walkCampaignTrajectories(
  campaign: Campaign,
  now = () => 'walk',
): TrajectoryWalk {
  const reached = new Set<string>();
  const seen = new Set<string>();
  const deadEnds: TrajectoryWalk['deadEnds'] = [];
  const errors: string[] = [];
  let completedPaths = 0;
  let returnedToExplorationPaths = 0;

  function visit(state: GameState, path: string[]): void {
    if (state.status === 'completed') {
      completedPaths += 1;
      return;
    }

    if (state.narrativeSession === null) {
      returnedToExplorationPaths += 1;
      return;
    }

    reached.add(state.narrativeSession.eventId);
    const signature = stateSignature(state);
    if (seen.has(signature)) {
      return;
    }
    seen.add(signature);

    const choices = getAvailableChoices(state, campaign);
    if (choices.length === 0) {
      deadEnds.push({ eventId: state.narrativeSession.eventId, path });
      return;
    }

    for (const choice of choices) {
      try {
        const next = applyChoice(state, campaign, choice.id, now);
        visit(next, [...path, choice.id]);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'erro desconhecido';
        errors.push(`Falha em ${[...path, choice.id].join(' > ')}: ${message}`);
      }
    }
  }

  visit(startGame({ firstName: 'Ana', lastName: 'Cruz' }, campaign, now), []);

  return {
    reachedEventIds: [...reached],
    completedPaths,
    returnedToExplorationPaths,
    deadEnds,
    errors,
  };
}

function stateSignature(state: GameState): string {
  return JSON.stringify({
    status: state.status,
    narrativeSession: state.narrativeSession,
    flags: state.flags,
    attributes: state.attributes,
    inventory: state.inventory,
    relationships: state.relationships,
    world: state.world,
    abilities: state.progression.abilityIds,
    titles: state.progression.titleIds,
  });
}
