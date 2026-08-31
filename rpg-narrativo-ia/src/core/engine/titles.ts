import { evaluateConditions } from '../events';
import type { Campaign, TitleDefinition } from '../events/types';
import type { GameState } from '../state/types';

export function resolveTitle(state: GameState, campaign: Campaign): TitleDefinition | undefined {
  return campaign.titles.find((title) => evaluateConditions(title.conditions, state));
}
