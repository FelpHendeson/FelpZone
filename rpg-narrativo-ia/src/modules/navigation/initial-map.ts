import pack from '../../../content/first-day/pack.json' with { type: 'json' };
import map from '../../../content/first-day/world/map.json' with { type: 'json' };
import type { LocationNode } from './types';

export const DEFAULT_STARTING_LOCATION_ID = pack.startingLocationId;
export const INITIAL_WORLD_MAP = map as LocationNode;
