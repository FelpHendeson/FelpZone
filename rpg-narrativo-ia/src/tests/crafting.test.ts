import { describe, expect, it } from 'vitest';
import type { GameCondition } from '../core/events';
import { itemQuantity } from '../modules/inventory';
import {
  DEFAULT_CRAFTING_BLOCKED_REASON,
  DUPLICATE_STRUCTURE_REASON,
  INITIAL_RECIPES,
  INITIAL_STRUCTURES,
  INVENTORY_OVERFLOW_REASON,
  MISSING_MATERIALS_REASON,
  MISSING_STATION_REASON,
  UNKNOWN_RECIPE_REASON,
  canCraftRecipe,
  craftRecipe,
  createCraftingEvaluator,
  createInitialCrafting,
  getRecipe,
  getStructureDefinition,
  indexCraftingDefinitions,
  inspectCraftingDefinitions,
  inspectCraftingState,
  inspectRecipeAccess,
  restoreCraftingState,
  serializeCraftingState,
  synchronizeKnownRecipes,
  type CraftingConditionEvaluator,
  type CraftingState,
  type IndexedCrafting,
  type RecipeDefinition,
  type StructureDefinition,
  type WorldStructureState,
} from '../modules/crafting';
import {
  DEFAULT_STARTING_LOCATION_ID,
  INITIAL_WORLD_MAP,
  createInitialNavigation,
  discoverLocation,
  indexNavigationMap,
  moveToLocation,
  unlockLocation,
  type IndexedMap,
  type NavigationState,
} from '../modules/navigation';
import { MAX_ADVANCE_PERIODS, advanceTime, createInitialTime } from '../modules/time';
import { freshState } from './helpers';

const START = DEFAULT_STARTING_LOCATION_ID;

function worldMap(): IndexedMap {
  return indexNavigationMap(INITIAL_WORLD_MAP, START);
}

function worldCrafting(
  recipes: readonly RecipeDefinition[] = INITIAL_RECIPES,
  structures: readonly StructureDefinition[] = INITIAL_STRUCTURES,
): IndexedCrafting {
  return indexCraftingDefinitions(recipes, structures);
}

function reveal(map: IndexedMap, state: NavigationState, locationIds: readonly string[]): NavigationState {
  let next = state;
  for (const locationId of locationIds) {
    next = discoverLocation(map, next, locationId);
    next = unlockLocation(map, next, locationId);
  }
  return next;
}

function moveTo(map: IndexedMap, locationId: string, navigation = createInitialNavigation()): NavigationState {
  if (locationId === START) {
    return navigation;
  }

  const prepared = reveal(map, navigation, ['horned-rabbit-forest', locationId]);
  const inForest = moveToLocation(map, prepared, 'horned-rabbit-forest').current;
  return moveToLocation(map, inForest, locationId).current;
}

function itemRecipe(overrides: Partial<RecipeDefinition> & Pick<RecipeDefinition, 'id'>): RecipeDefinition {
  return {
    name: 'Receita de teste',
    kind: 'item',
    inputs: [{ itemId: 'fallen-branch', quantity: 1 }],
    outputs: [{ itemId: 'test-item', quantity: 1 }],
    timeCost: { periods: 1 },
    discovery: { type: 'known' },
    ...overrides,
  };
}

function freezeState(state: CraftingState): CraftingState {
  return Object.freeze({
    knownRecipeIds: Object.freeze([...state.knownRecipeIds]) as string[],
    structures: Object.freeze(state.structures.map((entry) => Object.freeze({ ...entry }))) as WorldStructureState[],
  });
}

function freezeInventory(items: { itemId: string; quantity: number }[]) {
  return Object.freeze(items.map((item) => Object.freeze({ ...item })));
}

function freezeRecipe(recipe: RecipeDefinition): RecipeDefinition {
  const frozen: RecipeDefinition = {
    ...recipe,
    inputs: Object.freeze(recipe.inputs.map((entry) => Object.freeze({ ...entry }))) as RecipeDefinition['inputs'],
    timeCost: Object.freeze({ ...recipe.timeCost }),
    discovery: Object.freeze({ ...recipe.discovery }) as RecipeDefinition['discovery'],
  };

  if (recipe.outputs) {
    frozen.outputs = Object.freeze(recipe.outputs.map((entry) => Object.freeze({ ...entry }))) as RecipeDefinition['outputs'];
  }

  if (recipe.requiredStationTags) {
    frozen.requiredStationTags = Object.freeze([...recipe.requiredStationTags]) as string[];
  }

  if (recipe.conditions) {
    frozen.conditions = Object.freeze(recipe.conditions.map((entry) => Object.freeze({ ...entry }))) as GameCondition[];
  }

  return Object.freeze(frozen);
}

function freezeStructure(structure: StructureDefinition): StructureDefinition {
  return Object.freeze({
    ...structure,
    tags: Object.freeze([...structure.tags]) as string[],
  });
}

function withCampfire(state: CraftingState, locationId = START, active = true): CraftingState {
  return {
    ...state,
    structures: [
      ...state.structures,
      {
        structureId: 'campfire',
        locationId,
        active,
      },
    ],
  };
}

describe('crafting, estruturas e cozinha', () => {
  it('o estado inicial conhece receitas declaradas como known', () => {
    const definitions = worldCrafting();
    const state = createInitialCrafting(definitions);

    expect(state.knownRecipeIds).toEqual(['build-campfire', 'cook-horned-rabbit-meat']);
    expect(state.structures).toEqual([]);
    expect(getRecipe(definitions, 'build-campfire').discovery).toEqual({ type: 'known' });
    expect(getStructureDefinition(definitions, 'campfire')).toEqual({
      id: 'campfire',
      name: 'Fogueira',
      tags: ['heat', 'cooking'],
      uniquePerLocation: true,
      activeByDefault: true,
    });
  });

  it('receita por flag não começa conhecida', () => {
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({ id: 'secret-cord', discovery: { type: 'flag', flag: 'knows-cord' } }),
    ]);
    const state = createInitialCrafting(definitions);

    expect(state.knownRecipeIds).toEqual(['build-campfire', 'cook-horned-rabbit-meat']);
    expect(state.knownRecipeIds).not.toContain('secret-cord');
  });

  it('receita por flag pode ser descoberta quando a flag é ativada', () => {
    const map = worldMap();
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({ id: 'secret-cord', discovery: { type: 'flag', flag: 'knows-cord' } }),
    ]);
    const state = createInitialCrafting(definitions);
    const next = synchronizeKnownRecipes(
      definitions,
      state,
      map,
      createCraftingEvaluator({ ...freshState(), flags: { 'knows-cord': true } }),
    );

    expect(next.knownRecipeIds).toContain('secret-cord');
    expect(state.knownRecipeIds).not.toContain('secret-cord');
  });

  it('a sincronização de receitas é idempotente e não avança o tempo', () => {
    const map = worldMap();
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({ id: 'secret-cord', discovery: { type: 'flag', flag: 'knows-cord' } }),
    ]);
    const time = Object.freeze(createInitialTime());
    const snapshot = structuredClone(time);
    const evaluator = createCraftingEvaluator({ ...freshState(), flags: { 'knows-cord': true } });
    const first = synchronizeKnownRecipes(definitions, createInitialCrafting(definitions), map, evaluator);
    const second = synchronizeKnownRecipes(definitions, freezeState(first), map, evaluator);

    expect(second).toEqual(first);
    expect(second.knownRecipeIds.filter((id) => id === 'secret-cord')).toHaveLength(1);
    expect(time).toEqual(snapshot);
    expect(time).toEqual(createInitialTime());
  });

  it('receita desconhecida é bloqueada', () => {
    const map = worldMap();
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({ id: 'secret-cord', discovery: { type: 'flag', flag: 'knows-cord' } }),
    ]);
    const state = freezeState(createInitialCrafting(definitions));
    const inventory = freezeInventory([{ itemId: 'fallen-branch', quantity: 3 }]);

    const access = inspectRecipeAccess(map, createInitialNavigation(), definitions, state, inventory, 'secret-cord');
    expect(access.craftable).toBe(false);
    expect(access.blockedReason).toBe(UNKNOWN_RECIPE_REASON);
    expect(access.missingInputs).toEqual([]);
    expect(canCraftRecipe(map, createInitialNavigation(), definitions, state, inventory, 'secret-cord')).toBe(false);
    expect(() =>
      craftRecipe(map, createInitialNavigation(), definitions, state, inventory, 'secret-cord'),
    ).toThrow(UNKNOWN_RECIPE_REASON);
    expect(state.knownRecipeIds).not.toContain('secret-cord');
    expect(inventory).toEqual([{ itemId: 'fallen-branch', quantity: 3 }]);
  });

  it('executa uma receita simples de item', () => {
    const map = worldMap();
    const definitions = worldCrafting([...INITIAL_RECIPES, itemRecipe({ id: 'bundle-sticks' })]);
    const result = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [{ itemId: 'fallen-branch', quantity: 2 }],
      'bundle-sticks',
    );

    expect(result.recipe.id).toBe('bundle-sticks');
    expect(result.recipe.kind).toBe('item');
    expect(result.locationId).toBe(START);
    expect(result.structure).toBeUndefined();
    expect(result.inventory.current).toEqual([
      { itemId: 'fallen-branch', quantity: 1 },
      { itemId: 'test-item', quantity: 1 },
    ]);
  });

  it('consome exatamente os materiais declarados', () => {
    const map = worldMap();
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({
        id: 'bundle-sticks',
        inputs: [{ itemId: 'fallen-branch', quantity: 2 }],
      }),
    ]);
    const result = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [
        { itemId: 'fallen-branch', quantity: 5 },
        { itemId: 'raw-water', quantity: 1 },
      ],
      'bundle-sticks',
    );

    expect(result.consumed).toEqual([{ itemId: 'fallen-branch', quantity: 2 }]);
    expect(itemQuantity(result.inventory.current, 'fallen-branch')).toBe(3);
    expect(itemQuantity(result.inventory.current, 'raw-water')).toBe(1);
  });

  it('produz exatamente os outputs declarados', () => {
    const map = worldMap();
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({
        id: 'bundle-sticks',
        outputs: [{ itemId: 'stick-bundle', quantity: 2 }],
      }),
    ]);
    const result = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [{ itemId: 'fallen-branch', quantity: 1 }],
      'bundle-sticks',
    );

    expect(result.produced).toEqual([{ itemId: 'stick-bundle', quantity: 2 }]);
    expect(itemQuantity(result.inventory.current, 'stick-bundle')).toBe(2);
  });

  it('remove do inventário o item que chega a zero', () => {
    const map = worldMap();
    const definitions = worldCrafting([...INITIAL_RECIPES, itemRecipe({ id: 'bundle-sticks' })]);
    const result = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [{ itemId: 'fallen-branch', quantity: 1 }],
      'bundle-sticks',
    );

    expect(result.inventory.current.some((item) => item.itemId === 'fallen-branch')).toBe(false);
    expect(itemQuantity(result.inventory.current, 'fallen-branch')).toBe(0);
  });

  it('material insuficiente não altera inventário nem estado', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const state = freezeState(createInitialCrafting(definitions));
    const inventory = freezeInventory([{ itemId: 'fallen-branch', quantity: 2 }]);

    expect(() =>
      craftRecipe(map, createInitialNavigation(), definitions, state, inventory, 'build-campfire'),
    ).toThrow(MISSING_MATERIALS_REASON);
    expect(state).toEqual(createInitialCrafting(definitions));
    expect(inventory).toEqual([{ itemId: 'fallen-branch', quantity: 2 }]);
    expect(
      inspectRecipeAccess(map, createInitialNavigation(), definitions, state, inventory, 'build-campfire'),
    ).toMatchObject({
      craftable: false,
      blockedReason: MISSING_MATERIALS_REASON,
      missingInputs: [{ itemId: 'fallen-branch', quantity: 1 }],
    });
  });

  it('verifica vários inputs antes de qualquer consumo', () => {
    const map = worldMap();
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({
        id: 'mixed-pack',
        inputs: [
          { itemId: 'fallen-branch', quantity: 2 },
          { itemId: 'raw-water', quantity: 1 },
        ],
      }),
    ]);
    const state = freezeState(createInitialCrafting(definitions));
    const inventory = freezeInventory([{ itemId: 'fallen-branch', quantity: 5 }]);

    expect(() =>
      craftRecipe(map, createInitialNavigation(), definitions, state, inventory, 'mixed-pack'),
    ).toThrow(MISSING_MATERIALS_REASON);
    expect(inventory).toEqual([{ itemId: 'fallen-branch', quantity: 5 }]);
    expect(state.structures).toEqual([]);
    expect(
      inspectRecipeAccess(map, createInitialNavigation(), definitions, state, inventory, 'mixed-pack').missingInputs,
    ).toEqual([{ itemId: 'raw-water', quantity: 1 }]);
  });

  it('produz vários outputs atomicamente', () => {
    const map = worldMap();
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({
        id: 'mixed-pack',
        inputs: [
          { itemId: 'fallen-branch', quantity: 2 },
          { itemId: 'raw-water', quantity: 1 },
        ],
        outputs: [
          { itemId: 'damp-bundle', quantity: 1 },
          { itemId: 'ash', quantity: 2 },
        ],
      }),
    ]);
    const result = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [
        { itemId: 'fallen-branch', quantity: 2 },
        { itemId: 'raw-water', quantity: 1 },
      ],
      'mixed-pack',
    );

    expect(result.produced).toEqual([
      { itemId: 'damp-bundle', quantity: 1 },
      { itemId: 'ash', quantity: 2 },
    ]);
    expect(result.inventory.current).toEqual([
      { itemId: 'damp-bundle', quantity: 1 },
      { itemId: 'ash', quantity: 2 },
    ]);
  });

  it('rejeita overflow em output e a operação inteira', () => {
    const map = worldMap();
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({
        id: 'overflow-pack',
        outputs: [
          { itemId: 'safe-item', quantity: 1 },
          { itemId: 'capped-item', quantity: 1 },
        ],
      }),
    ]);
    const state = freezeState(createInitialCrafting(definitions));
    const inventory = freezeInventory([
      { itemId: 'fallen-branch', quantity: 1 },
      { itemId: 'capped-item', quantity: Number.MAX_SAFE_INTEGER },
    ]);

    expect(() =>
      craftRecipe(map, createInitialNavigation(), definitions, state, inventory, 'overflow-pack'),
    ).toThrow(INVENTORY_OVERFLOW_REASON);
    expect(inventory).toEqual([
      { itemId: 'fallen-branch', quantity: 1 },
      { itemId: 'capped-item', quantity: Number.MAX_SAFE_INTEGER },
    ]);
    expect(state.structures).toEqual([]);
    expect(itemQuantity([...inventory], 'safe-item')).toBe(0);
  });

  it('a fogueira consome três gravetos', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const result = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [
        { itemId: 'fallen-branch', quantity: 3 },
        { itemId: 'raw-water', quantity: 1 },
      ],
      'build-campfire',
    );

    expect(result.consumed).toEqual([{ itemId: 'fallen-branch', quantity: 3 }]);
    expect(itemQuantity(result.inventory.current, 'fallen-branch')).toBe(0);
    expect(itemQuantity(result.inventory.current, 'raw-water')).toBe(1);
    expect(result.produced).toEqual([]);
  });

  it('a fogueira é criada no local atual', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const result = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [{ itemId: 'fallen-branch', quantity: 3 }],
      'build-campfire',
    );

    expect(result.locationId).toBe(START);
    expect(result.structure).toEqual({
      structureId: 'campfire',
      locationId: START,
      active: true,
    });
    expect(result.current.structures).toEqual([result.structure]);
    expect(result.structure?.fuel).toBeUndefined();
  });

  it('fogueira em outro local não atende à receita', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const navigation = moveTo(map, 'dense-woods');
    const state = freezeState(withCampfire(createInitialCrafting(definitions), START, true));
    const inventory = freezeInventory([{ itemId: 'raw-horned-rabbit-meat', quantity: 1 }]);

    expect(() =>
      craftRecipe(map, navigation, definitions, state, inventory, 'cook-horned-rabbit-meat'),
    ).toThrow(MISSING_STATION_REASON);
    expect(inventory).toEqual([{ itemId: 'raw-horned-rabbit-meat', quantity: 1 }]);
    expect(
      inspectRecipeAccess(map, navigation, definitions, state, inventory, 'cook-horned-rabbit-meat').missingStationTags,
    ).toEqual(['cooking']);
  });

  it('segunda fogueira no mesmo local é bloqueada antes do consumo', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const state = freezeState(withCampfire(createInitialCrafting(definitions)));
    const inventory = freezeInventory([{ itemId: 'fallen-branch', quantity: 6 }]);

    expect(() =>
      craftRecipe(map, createInitialNavigation(), definitions, state, inventory, 'build-campfire'),
    ).toThrow(DUPLICATE_STRUCTURE_REASON);
    expect(inventory).toEqual([{ itemId: 'fallen-branch', quantity: 6 }]);
    expect(state.structures).toHaveLength(1);
    expect(itemQuantity([...inventory], 'fallen-branch')).toBe(6);
  });

  it('a fogueira pode ser construída em outro local', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const first = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [{ itemId: 'fallen-branch', quantity: 6 }],
      'build-campfire',
    );
    const second = craftRecipe(
      map,
      moveTo(map, 'dense-woods'),
      definitions,
      first.current,
      first.inventory.current,
      'build-campfire',
    );

    expect(second.structure).toEqual({
      structureId: 'campfire',
      locationId: 'dense-woods',
      active: true,
    });
    expect(second.current.structures).toEqual([
      { structureId: 'campfire', locationId: START, active: true },
      { structureId: 'campfire', locationId: 'dense-woods', active: true },
    ]);
  });

  it('estrutura inativa não fornece tags', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const state = freezeState(withCampfire(createInitialCrafting(definitions), START, false));
    const inventory = freezeInventory([{ itemId: 'raw-horned-rabbit-meat', quantity: 1 }]);

    const access = inspectRecipeAccess(
      map,
      createInitialNavigation(),
      definitions,
      state,
      inventory,
      'cook-horned-rabbit-meat',
    );
    expect(access.craftable).toBe(false);
    expect(access.blockedReason).toBe(MISSING_STATION_REASON);
    expect(access.missingStationTags).toEqual(['cooking']);
    expect(() =>
      craftRecipe(map, createInitialNavigation(), definitions, state, inventory, 'cook-horned-rabbit-meat'),
    ).toThrow(MISSING_STATION_REASON);
  });

  it('cozinha é bloqueada sem estação', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const state = freezeState(createInitialCrafting(definitions));
    const inventory = freezeInventory([{ itemId: 'raw-horned-rabbit-meat', quantity: 1 }]);

    expect(
      inspectRecipeAccess(map, createInitialNavigation(), definitions, state, inventory, 'cook-horned-rabbit-meat'),
    ).toMatchObject({
      craftable: false,
      blockedReason: MISSING_STATION_REASON,
      missingStationTags: ['cooking'],
    });
  });

  it('cozinha funciona com a fogueira ativa no local atual', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const built = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [
        { itemId: 'fallen-branch', quantity: 3 },
        { itemId: 'raw-horned-rabbit-meat', quantity: 1 },
      ],
      'build-campfire',
    );

    expect(canCraftRecipe(map, createInitialNavigation(), definitions, built.current, built.inventory.current, 'cook-horned-rabbit-meat')).toBe(
      true,
    );

    const cooked = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      built.current,
      built.inventory.current,
      'cook-horned-rabbit-meat',
    );
    expect(cooked.recipe.kind).toBe('cooking');
    expect(cooked.current.structures).toEqual(built.current.structures);
  });

  it('cozinha transforma carne crua em carne cozida', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const result = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      withCampfire(createInitialCrafting(definitions)),
      [{ itemId: 'raw-horned-rabbit-meat', quantity: 1 }],
      'cook-horned-rabbit-meat',
    );

    expect(result.consumed).toEqual([{ itemId: 'raw-horned-rabbit-meat', quantity: 1 }]);
    expect(result.produced).toEqual([{ itemId: 'cooked-horned-rabbit-meat', quantity: 1 }]);
    expect(result.inventory.current).toEqual([{ itemId: 'cooked-horned-rabbit-meat', quantity: 1 }]);
  });

  it('a operação devolve o custo temporal', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const result = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [{ itemId: 'fallen-branch', quantity: 3 }],
      'build-campfire',
    );

    expect(result.timeCost).toEqual({ periods: 1 });
    expect(result.timeCost).toEqual(getRecipe(definitions, 'build-campfire').timeCost);
    expect(
      inspectRecipeAccess(
        map,
        createInitialNavigation(),
        definitions,
        createInitialCrafting(definitions),
        [{ itemId: 'fallen-branch', quantity: 3 }],
        'build-campfire',
      ).timeCost,
    ).toEqual({ periods: 1 });
  });

  it('o relógio não é alterado pelo crafting', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const time = Object.freeze(createInitialTime());
    const snapshot = structuredClone(time);

    craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [{ itemId: 'fallen-branch', quantity: 3 }],
      'build-campfire',
    );

    expect(time).toEqual(snapshot);
    expect(time).toEqual(createInitialTime());
  });

  it('o custo temporal não é aplicado duas vezes', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const time = createInitialTime();
    const result = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [{ itemId: 'fallen-branch', quantity: 3 }],
      'build-campfire',
    );

    expect(result.timeCost).toEqual({ periods: 1 });
    const once = advanceTime(time, result.timeCost);
    expect(once.current).toEqual({ day: 1, periodId: 'manha' });
    expect(advanceTime(time, result.timeCost).current).toEqual(once.current);
    expect(time).toEqual(createInitialTime());
  });

  it('condição não atendida bloqueia a receita', () => {
    const map = worldMap();
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({
        id: 'gated-bundle',
        conditions: [{ type: 'flag.is', flag: 'ready', value: true }],
      }),
    ]);
    const state = freezeState(createInitialCrafting(definitions));
    const inventory = freezeInventory([{ itemId: 'fallen-branch', quantity: 1 }]);

    expect(
      inspectRecipeAccess(map, createInitialNavigation(), definitions, state, inventory, 'gated-bundle', freshState()),
    ).toMatchObject({
      craftable: false,
      blockedReason: DEFAULT_CRAFTING_BLOCKED_REASON,
    });
    expect(() =>
      craftRecipe(map, createInitialNavigation(), definitions, state, inventory, 'gated-bundle', freshState()),
    ).toThrow(DEFAULT_CRAFTING_BLOCKED_REASON);
    expect(inventory).toEqual([{ itemId: 'fallen-branch', quantity: 1 }]);
  });

  it('callback de condição não consegue alterar o estado real', () => {
    const map = worldMap();
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({
        id: 'gated-bundle',
        conditions: [
          { type: 'flag.is', flag: 'ready', value: true },
          { type: 'attribute.min', attribute: 'cautela', amount: 1 },
          { type: 'inventory.has', itemId: 'chave', quantity: 1 },
          { type: 'relationship.min', characterId: 'mira-vale', amount: 0 },
        ],
      }),
    ]);
    const indexedConditions = definitions.byRecipe.get('gated-bundle')?.conditions;
    const snapshot = structuredClone(indexedConditions);
    const state = freezeState(createInitialCrafting(definitions));
    const inventory = freezeInventory([{ itemId: 'fallen-branch', quantity: 1 }]);
    const adversarial: CraftingConditionEvaluator = (conditions) => {
      if (!conditions) {
        return false;
      }

      const mutable = conditions as GameCondition[];
      mutable.push({ type: 'flag.is', flag: 'hacked', value: true });
      const first = mutable[0];
      if (first?.type === 'flag.is') {
        first.flag = 'mutated';
        first.value = false;
      }

      return false;
    };

    expect(() =>
      craftRecipe(map, createInitialNavigation(), definitions, state, inventory, 'gated-bundle', adversarial),
    ).toThrow(DEFAULT_CRAFTING_BLOCKED_REASON);
    expect(indexedConditions).toEqual(snapshot);
    expect(state).toEqual(createInitialCrafting(definitions));
    expect(inventory).toEqual([{ itemId: 'fallen-branch', quantity: 1 }]);

    const open = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      state,
      inventory,
      'gated-bundle',
      createCraftingEvaluator({
        ...freshState(),
        flags: { ready: true },
        inventory: [{ itemId: 'chave', quantity: 1 }],
      }),
    );
    expect(open.produced).toEqual([{ itemId: 'test-item', quantity: 1 }]);
  });

  it('consulta de disponibilidade não causa mutação', () => {
    const map = worldMap();
    const recipes = Object.freeze(INITIAL_RECIPES.map(freezeRecipe)) as RecipeDefinition[];
    const structures = Object.freeze(INITIAL_STRUCTURES.map(freezeStructure)) as StructureDefinition[];
    const definitions = indexCraftingDefinitions(recipes, structures);
    const state = freezeState(createInitialCrafting(definitions));
    const inventory = freezeInventory([{ itemId: 'fallen-branch', quantity: 2 }]);
    const navigation = Object.freeze(createInitialNavigation());

    const access = inspectRecipeAccess(map, navigation, definitions, state, inventory, 'build-campfire');
    expect(access.craftable).toBe(false);
    expect(access.missingInputs).toEqual([{ itemId: 'fallen-branch', quantity: 1 }]);
    expect(state.knownRecipeIds).toEqual(['build-campfire', 'cook-horned-rabbit-meat']);
    expect(state.structures).toEqual([]);
    expect(inventory).toEqual([{ itemId: 'fallen-branch', quantity: 2 }]);
    expect(navigation.currentLocationId).toBe(START);
  });

  it('falha não cria estrutura parcial', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const state = freezeState(createInitialCrafting(definitions));
    const inventory = freezeInventory([{ itemId: 'fallen-branch', quantity: 1 }]);

    expect(() =>
      craftRecipe(map, createInitialNavigation(), definitions, state, inventory, 'build-campfire'),
    ).toThrow(MISSING_MATERIALS_REASON);
    expect(state.structures).toEqual([]);
  });

  it('falha não produz output parcial', () => {
    const map = worldMap();
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({
        id: 'overflow-pack',
        outputs: [
          { itemId: 'safe-item', quantity: 1 },
          { itemId: 'capped-item', quantity: 1 },
        ],
      }),
    ]);
    const state = freezeState(createInitialCrafting(definitions));
    const inventory = freezeInventory([
      { itemId: 'fallen-branch', quantity: 1 },
      { itemId: 'capped-item', quantity: Number.MAX_SAFE_INTEGER },
    ]);

    expect(() =>
      craftRecipe(map, createInitialNavigation(), definitions, state, inventory, 'overflow-pack'),
    ).toThrow(INVENTORY_OVERFLOW_REASON);
    expect(itemQuantity([...inventory], 'safe-item')).toBe(0);
    expect(itemQuantity([...inventory], 'capped-item')).toBe(Number.MAX_SAFE_INTEGER);
    expect(itemQuantity([...inventory], 'fallen-branch')).toBe(1);
  });

  it('persistência preserva receitas conhecidas', () => {
    const map = worldMap();
    const definitions = worldCrafting([
      ...INITIAL_RECIPES,
      itemRecipe({ id: 'secret-cord', discovery: { type: 'flag', flag: 'knows-cord' } }),
    ]);
    const learned = synchronizeKnownRecipes(
      definitions,
      createInitialCrafting(definitions),
      map,
      createCraftingEvaluator({ ...freshState(), flags: { 'knows-cord': true } }),
    );
    const restored = restoreCraftingState(serializeCraftingState(learned), definitions, map);

    expect(restored.knownRecipeIds).toEqual(learned.knownRecipeIds);
    expect(restored.knownRecipeIds).toContain('secret-cord');
  });

  it('persistência preserva estruturas e localizações', () => {
    const map = worldMap();
    const definitions = worldCrafting();
    const first = craftRecipe(
      map,
      createInitialNavigation(),
      definitions,
      createInitialCrafting(definitions),
      [{ itemId: 'fallen-branch', quantity: 6 }],
      'build-campfire',
    );
    const second = craftRecipe(
      map,
      moveTo(map, 'dense-woods'),
      definitions,
      first.current,
      first.inventory.current,
      'build-campfire',
    );
    const restored = restoreCraftingState(serializeCraftingState(second.current), definitions, map);

    expect(restored.structures).toEqual([
      { structureId: 'campfire', locationId: START, active: true },
      { structureId: 'campfire', locationId: 'dense-woods', active: true },
    ]);
    expect(JSON.parse(serializeCraftingState(restored))).toEqual(JSON.parse(serializeCraftingState(second.current)));
  });

  it('restore rejeita estrutura desconhecida', () => {
    const map = worldMap();
    const definitions = worldCrafting();

    expect(() =>
      restoreCraftingState(
        JSON.stringify({
          knownRecipeIds: ['build-campfire'],
          structures: [{ structureId: 'missing-oven', locationId: START, active: true }],
        }),
        definitions,
        map,
      ),
    ).toThrow('O estado de crafting possui estrutura desconhecida.');
  });

  it('restore rejeita receita desconhecida', () => {
    const map = worldMap();
    const definitions = worldCrafting();

    expect(() =>
      restoreCraftingState(
        JSON.stringify({
          knownRecipeIds: ['missing-recipe'],
          structures: [],
        }),
        definitions,
        map,
      ),
    ).toThrow('O estado de crafting possui receita desconhecida.');
  });

  it('restore rejeita duplicação de estrutura única', () => {
    const map = worldMap();
    const definitions = worldCrafting();

    expect(() =>
      restoreCraftingState(
        JSON.stringify({
          knownRecipeIds: ['build-campfire'],
          structures: [
            { structureId: 'campfire', locationId: START, active: true },
            { structureId: 'campfire', locationId: START, active: true },
          ],
        }),
        definitions,
        map,
      ),
    ).toThrow('O estado de crafting possui estrutura duplicada no local.');
  });

  it('IDs duplicados nas definições são rejeitados', () => {
    expect(
      inspectCraftingDefinitions(
        [itemRecipe({ id: 'same' }), itemRecipe({ id: 'same', name: 'Outra' })],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'As definições possuem identificadores duplicados.' });
    expect(
      inspectCraftingDefinitions(INITIAL_RECIPES, [
        { id: 'campfire', name: 'Fogueira', tags: ['heat'], uniquePerLocation: true, activeByDefault: true },
        { id: 'campfire', name: 'Outra', tags: ['heat'], uniquePerLocation: true, activeByDefault: true },
      ]),
    ).toMatchObject({ ok: false, reason: 'As definições possuem identificadores duplicados.' });
  });

  it('inputs duplicados são rejeitados', () => {
    expect(
      inspectCraftingDefinitions(
        [
          itemRecipe({
            id: 'dup-in',
            inputs: [
              { itemId: 'fallen-branch', quantity: 1 },
              { itemId: 'fallen-branch', quantity: 2 },
            ],
          }),
        ],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'A receita possui materiais de entrada duplicados.' });
  });

  it('outputs duplicados são rejeitados', () => {
    expect(
      inspectCraftingDefinitions(
        [
          itemRecipe({
            id: 'dup-out',
            outputs: [
              { itemId: 'test-item', quantity: 1 },
              { itemId: 'test-item', quantity: 2 },
            ],
          }),
        ],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'A receita possui materiais de saída duplicados.' });
  });

  it('quantidades negativas são rejeitadas', () => {
    expect(
      inspectCraftingDefinitions(
        [itemRecipe({ id: 'neg', inputs: [{ itemId: 'fallen-branch', quantity: -1 }] })],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'A quantidade da receita precisa ser um inteiro positivo.' });
  });

  it('quantidades fracionárias são rejeitadas', () => {
    expect(
      inspectCraftingDefinitions(
        [itemRecipe({ id: 'frac', outputs: [{ itemId: 'test-item', quantity: 1.5 }] })],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'A quantidade da receita precisa ser um inteiro positivo.' });
  });

  it('quantidades inseguras são rejeitadas', () => {
    expect(
      inspectCraftingDefinitions(
        [itemRecipe({ id: 'unsafe', inputs: [{ itemId: 'fallen-branch', quantity: Number.MAX_SAFE_INTEGER + 1 }] })],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'A quantidade da receita precisa ser um inteiro positivo.' });
    expect(
      inspectCraftingDefinitions(
        [itemRecipe({ id: 'inf', inputs: [{ itemId: 'fallen-branch', quantity: Number.POSITIVE_INFINITY }] })],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'A quantidade da receita precisa ser um inteiro positivo.' });
  });

  it('custos temporais inválidos são rejeitados', () => {
    expect(
      inspectCraftingDefinitions([itemRecipe({ id: 'zero-cost', timeCost: { periods: 0 } })], INITIAL_STRUCTURES),
    ).toMatchObject({ ok: false, reason: 'O custo de tempo da receita precisa ser um inteiro positivo.' });
    expect(
      inspectCraftingDefinitions([itemRecipe({ id: 'neg-cost', timeCost: { periods: -1 } })], INITIAL_STRUCTURES),
    ).toMatchObject({ ok: false, reason: 'O custo de tempo precisa ser um inteiro não negativo.' });
    expect(
      inspectCraftingDefinitions([itemRecipe({ id: 'frac-cost', timeCost: { periods: 1.5 } })], INITIAL_STRUCTURES),
    ).toMatchObject({ ok: false, reason: 'O custo de tempo precisa ser um inteiro não negativo.' });
    expect(
      inspectCraftingDefinitions(
        [itemRecipe({ id: 'huge-cost', timeCost: { periods: MAX_ADVANCE_PERIODS + 1 } })],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({
      ok: false,
      reason: `O custo de tempo excede o limite operacional de ${MAX_ADVANCE_PERIODS} períodos.`,
    });
  });

  it('tags inválidas são rejeitadas', () => {
    expect(
      inspectCraftingDefinitions(INITIAL_RECIPES, [
        { id: 'bad-tags', name: 'Forno', tags: ['heat', 'heat'], uniquePerLocation: true, activeByDefault: true },
      ]),
    ).toMatchObject({ ok: false, reason: 'As tags da estrutura são inválidas.' });
    expect(
      inspectCraftingDefinitions(INITIAL_RECIPES, [
        { id: 'empty-tag', name: 'Forno', tags: [''], uniquePerLocation: true, activeByDefault: true },
      ]),
    ).toMatchObject({ ok: false, reason: 'As tags da estrutura são inválidas.' });
    expect(
      inspectCraftingDefinitions(
        [itemRecipe({ id: 'dup-station', requiredStationTags: ['cooking', 'cooking'] })],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'As tags da estação são inválidas.' });
  });

  it('receita contraditória é rejeitada', () => {
    expect(
      inspectCraftingDefinitions(
        [
          {
            id: 'structure-with-output',
            name: 'Fogueira inválida',
            kind: 'structure',
            inputs: [{ itemId: 'fallen-branch', quantity: 1 }],
            outputs: [{ itemId: 'campfire-kit', quantity: 1 }],
            createsStructureId: 'campfire',
            timeCost: { periods: 1 },
            discovery: { type: 'known' },
          },
        ],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'A receita é contraditória.' });
    expect(
      inspectCraftingDefinitions(
        [
          itemRecipe({
            id: 'item-builds',
            createsStructureId: 'campfire',
          }),
        ],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'A receita é contraditória.' });
    expect(
      inspectCraftingDefinitions(
        [
          {
            id: 'cook-no-station',
            name: 'Cozinhar no chão',
            kind: 'cooking',
            inputs: [{ itemId: 'raw-horned-rabbit-meat', quantity: 1 }],
            outputs: [{ itemId: 'cooked-horned-rabbit-meat', quantity: 1 }],
            timeCost: { periods: 1 },
            discovery: { type: 'known' },
          },
        ],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'A receita de cozinha precisa de uma estação.' });
    expect(
      inspectCraftingDefinitions(
        [
          {
            id: 'missing-structure',
            name: 'Construir forno',
            kind: 'structure',
            inputs: [{ itemId: 'fallen-branch', quantity: 1 }],
            createsStructureId: 'missing-oven',
            timeCost: { periods: 1 },
            discovery: { type: 'known' },
          },
        ],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'A receita referencia uma estrutura inexistente.' });
    expect(
      inspectCraftingDefinitions(
        [itemRecipe({ id: 'known-flag', discovery: { type: 'known', flag: 'oops' } as never })],
        INITIAL_STRUCTURES,
      ),
    ).toMatchObject({ ok: false, reason: 'A descoberta da receita é incompatível.' });
  });

  it('estado, inventário e definições originais permanecem imutáveis', () => {
    const map = worldMap();
    const recipes = Object.freeze(INITIAL_RECIPES.map(freezeRecipe)) as RecipeDefinition[];
    const structures = Object.freeze(INITIAL_STRUCTURES.map(freezeStructure)) as StructureDefinition[];
    const definitions = indexCraftingDefinitions(recipes, structures);
    const state = freezeState(createInitialCrafting(definitions));
    const inventory = freezeInventory([
      { itemId: 'fallen-branch', quantity: 3 },
      { itemId: 'raw-horned-rabbit-meat', quantity: 1 },
    ]);
    const navigation = Object.freeze(createInitialNavigation());
    const game = Object.freeze({ ...freshState(), flags: Object.freeze({ ...freshState().flags }) });

    const built = craftRecipe(map, navigation, definitions, state, inventory, 'build-campfire', game);
    inspectRecipeAccess(map, navigation, definitions, built.current, built.inventory.current, 'cook-horned-rabbit-meat');
    const cooked = craftRecipe(map, navigation, definitions, freezeState(built.current), freezeInventory(built.inventory.current), 'cook-horned-rabbit-meat');

    expect(state.structures).toEqual([]);
    expect(inventory).toEqual([
      { itemId: 'fallen-branch', quantity: 3 },
      { itemId: 'raw-horned-rabbit-meat', quantity: 1 },
    ]);
    expect(navigation.currentLocationId).toBe(START);
    expect(getRecipe(definitions, 'build-campfire').inputs).toEqual([{ itemId: 'fallen-branch', quantity: 3 }]);
    expect(built.previous).toEqual(createInitialCrafting(definitions));
    expect(cooked.inventory.previous).toEqual(built.inventory.current);
    expect(DEFAULT_CRAFTING_BLOCKED_REASON).toBe('Esta receita está bloqueada.');
    expect(UNKNOWN_RECIPE_REASON).toBe('Esta receita ainda não é conhecida.');
  });

  it('rejeita estado restaurado inválido', () => {
    const map = worldMap();
    const definitions = worldCrafting();

    expect(inspectCraftingState(null, definitions, map).ok).toBe(false);
    expect(
      inspectCraftingState({ knownRecipeIds: ['build-campfire', 'build-campfire'], structures: [] }, definitions, map),
    ).toMatchObject({ ok: false, reason: 'O estado de crafting possui identificadores duplicados.' });
    expect(
      inspectCraftingState(
        { knownRecipeIds: [], structures: [{ structureId: 'campfire', locationId: 'nope', active: true }] },
        definitions,
        map,
      ),
    ).toMatchObject({ ok: false, reason: 'O estado de crafting possui localização inexistente.' });
    expect(
      inspectCraftingState(
        { knownRecipeIds: [], structures: [{ structureId: 'campfire', locationId: START, active: 'yes' }] },
        definitions,
        map,
      ),
    ).toMatchObject({ ok: false, reason: 'O estado de crafting é inválido.' });
    expect(
      inspectCraftingState(
        { knownRecipeIds: [], structures: [{ structureId: 'campfire', locationId: START, active: true, fuel: -1 }] },
        definitions,
        map,
      ),
    ).toMatchObject({ ok: false, reason: 'O combustível da estrutura é inválido.' });
    expect(
      inspectCraftingState(
        { knownRecipeIds: [], structures: [{ structureId: 'campfire', locationId: START, active: true, fuel: 1.5 }] },
        definitions,
        map,
      ),
    ).toMatchObject({ ok: false, reason: 'O combustível da estrutura é inválido.' });
    expect(() => restoreCraftingState('não é json', definitions, map)).toThrow('O estado de crafting é inválido.');
  });
});
