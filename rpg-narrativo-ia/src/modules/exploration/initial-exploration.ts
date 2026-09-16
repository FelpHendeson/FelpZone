import raw from '../../../content/first-day/world/exploration.json' with { type: 'json' };
import type { LocationExplorationDefinition } from './types';

export const INITIAL_EXPLORATION_DEFINITIONS = raw as readonly LocationExplorationDefinition[];
