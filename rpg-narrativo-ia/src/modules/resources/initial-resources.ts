import type { PopulationDefinition, ResourceNodeDefinition } from './types';

/**
 * Valores iniciais provisórios. O balanceamento de capacidade, recuperação
 * e limiares ainda será ajustado depois desta etapa.
 */
export const INITIAL_POPULATIONS: readonly PopulationDefinition[] = [
  {
    id: 'horned-rabbits',
    speciesId: 'horned-rabbit',
    carryingCapacity: 8,
    recoveryPerDay: 2,
    warningThreshold: 4,
    criticalThreshold: 2,
  },
];

export const INITIAL_RESOURCE_NODES: readonly ResourceNodeDefinition[] = [
  {
    id: 'fallen-sticks',
    discoveryId: 'fallen-sticks',
    locationId: 'awakening-clearing',
    name: 'Gravetos caídos',
    capacity: 4,
    maxCollectionPerAction: 2,
    collectionCost: { periods: 1 },
    renewal: { type: 'short', periods: 2 },
    yields: [{ itemId: 'fallen-branch', quantityPerUnit: 1 }],
  },
  {
    id: 'spring',
    discoveryId: 'spring-water',
    locationId: 'spring-lake',
    name: 'Nascente',
    capacity: 3,
    maxCollectionPerAction: 1,
    collectionCost: { periods: 1 },
    renewal: { type: 'short', periods: 1 },
    yields: [{ itemId: 'raw-water', quantityPerUnit: 1 }],
  },
  {
    id: 'horned-rabbit-warren',
    discoveryId: 'horned-rabbit-tracks',
    locationId: 'dense-woods',
    name: 'Toca de coelhos chifrudos',
    capacity: 8,
    maxCollectionPerAction: 2,
    collectionCost: { periods: 1 },
    renewal: { type: 'population', populationId: 'horned-rabbits' },
    yields: [
      { itemId: 'raw-horned-rabbit-meat', quantityPerUnit: 1 },
      { itemId: 'horned-rabbit-hide', quantityPerUnit: 1 },
      { itemId: 'horned-rabbit-horn', quantityPerUnit: 1 },
      { itemId: 'horned-rabbit-bones', quantityPerUnit: 1 },
    ],
  },
];
