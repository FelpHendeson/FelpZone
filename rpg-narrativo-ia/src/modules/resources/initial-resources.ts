import populations from '../../../content/first-day/world/populations.json' with { type: 'json' };
import nodes from '../../../content/first-day/world/resource-nodes.json' with { type: 'json' };
import type { PopulationDefinition, ResourceNodeDefinition } from './types';

export const INITIAL_POPULATIONS = populations as readonly PopulationDefinition[];
export const INITIAL_RESOURCE_NODES = nodes as readonly ResourceNodeDefinition[];
