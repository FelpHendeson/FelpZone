import type { RecipeDefinition, StructureDefinition } from './types';

/**
 * Receitas de cozinha exigem a tag `cooking`. A fogueira declara `heat` e
 * `cooking`, então atende. Combustível existe no estado, mas nesta etapa a
 * fogueira permanece ativa após a construção: não há consumo, extinção nem
 * reabastecimento.
 */
export const INITIAL_STRUCTURES: readonly StructureDefinition[] = [
  {
    id: 'campfire',
    name: 'Fogueira',
    tags: ['heat', 'cooking'],
    uniquePerLocation: true,
    activeByDefault: true,
  },
];

export const INITIAL_RECIPES: readonly RecipeDefinition[] = [
  {
    id: 'build-campfire',
    name: 'Construir fogueira',
    kind: 'structure',
    inputs: [{ itemId: 'fallen-branch', quantity: 3 }],
    createsStructureId: 'campfire',
    timeCost: { periods: 1 },
    discovery: { type: 'known' },
  },
  {
    id: 'cook-horned-rabbit-meat',
    name: 'Cozinhar carne de coelho chifrudo',
    kind: 'cooking',
    inputs: [{ itemId: 'raw-horned-rabbit-meat', quantity: 1 }],
    outputs: [{ itemId: 'cooked-horned-rabbit-meat', quantity: 1 }],
    requiredStationTags: ['cooking'],
    timeCost: { periods: 1 },
    discovery: { type: 'known' },
  },
];
