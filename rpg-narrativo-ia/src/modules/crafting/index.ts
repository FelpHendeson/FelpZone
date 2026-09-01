import { evaluateConditions, type GameCondition } from '../../core/events';
import { isAttributeId, type GameState, type InventoryItem } from '../../core/state';
import {
  inspectNavigationState,
  type IndexedMap,
  type NavigationState,
} from '../navigation';
import { inspectTimeCost } from '../time';
import { INITIAL_RECIPES, INITIAL_STRUCTURES } from './initial-recipes';
import {
  CraftingError,
  RECIPE_KINDS,
  type CraftingAccess,
  type CraftingConditionEvaluator,
  type CraftingConditionSource,
  type CraftingInspection,
  type CraftingResult,
  type CraftingState,
  type IndexedCrafting,
  type RecipeDefinition,
  type RecipeDiscovery,
  type RecipeIngredient,
  type RecipeKind,
  type StructureDefinition,
  type WorldStructureState,
} from './types';

export { CraftingError };

export const UNKNOWN_RECIPE_REASON = 'Esta receita ainda não é conhecida.';
export const DEFAULT_CRAFTING_BLOCKED_REASON = 'Esta receita está bloqueada.';
export const MISSING_MATERIALS_REASON = 'Faltam materiais para esta receita.';
export const MISSING_STATION_REASON = 'Não há uma estação adequada no local atual.';
export const DUPLICATE_STRUCTURE_REASON = 'Esta estrutura já existe neste local.';
export const INVENTORY_OVERFLOW_REASON = 'A soma ultrapassa o inteiro seguro.';

const CRAFTING_ERROR = CraftingError;

export function inspectCraftingDefinitions(
  recipes: unknown,
  structures: unknown,
): CraftingInspection<IndexedCrafting> {
  const inspectedStructures = inspectStructureDefinitions(structures);
  if (!inspectedStructures.ok) {
    return inspectedStructures;
  }

  if (!Array.isArray(recipes)) {
    return fail('As definições de crafting são inválidas.');
  }

  const definitions: RecipeDefinition[] = [];
  const byRecipe = new Map<string, RecipeDefinition>();

  for (const entry of recipes) {
    const inspected = inspectRecipeDefinition(entry, inspectedStructures.value.byStructure, byRecipe);
    if (!inspected.ok) {
      return inspected;
    }

    byRecipe.set(inspected.value.id, inspected.value);
    definitions.push(inspected.value);
  }

  return {
    ok: true,
    value: {
      recipes: definitions,
      structures: inspectedStructures.value.structures,
      byRecipe,
      byStructure: inspectedStructures.value.byStructure,
    },
  };
}

export function indexCraftingDefinitions(recipes: unknown, structures: unknown): IndexedCrafting {
  const inspected = inspectCraftingDefinitions(recipes, structures);
  if (!inspected.ok) {
    throw new CRAFTING_ERROR(inspected.reason);
  }

  return inspected.value;
}

export function createInitialCrafting(definitions: IndexedCrafting): CraftingState {
  const indexed = requireIndexedDefinitions(definitions);
  return {
    knownRecipeIds: indexed.recipes
      .filter((recipe) => recipe.discovery.type === 'known')
      .map((recipe) => recipe.id),
    structures: [],
  };
}

export function inspectCraftingState(
  state: unknown,
  definitions: IndexedCrafting,
  map: IndexedMap,
): CraftingInspection<CraftingState> {
  const indexed = inspectIndexedDefinitions(definitions);
  if (!indexed.ok) {
    return indexed;
  }

  const indexedMap = inspectIndexedMap(map);
  if (!indexedMap.ok) {
    return indexedMap;
  }

  if (!isRecord(state) || !Array.isArray(state.knownRecipeIds) || !Array.isArray(state.structures)) {
    return fail('O estado de crafting é inválido.');
  }

  const knownRecipeIds: string[] = [];
  const seenRecipes = new Set<string>();
  for (const entry of state.knownRecipeIds) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      return fail('O estado de crafting possui receitas conhecidas inválidas.');
    }

    if (seenRecipes.has(entry)) {
      return fail('O estado de crafting possui identificadores duplicados.');
    }

    if (!indexed.value.byRecipe.has(entry)) {
      return fail('O estado de crafting possui receita desconhecida.');
    }

    seenRecipes.add(entry);
    knownRecipeIds.push(entry);
  }

  const structures: WorldStructureState[] = [];
  const uniqueKeys = new Map<string, number>();

  for (const entry of state.structures) {
    const inspected = inspectWorldStructure(entry, indexed.value, indexedMap.value);
    if (!inspected.ok) {
      return inspected;
    }

    const definition = indexed.value.byStructure.get(inspected.value.structureId);
    const key = `${inspected.value.structureId}@${inspected.value.locationId}`;
    const count = uniqueKeys.get(key) ?? 0;
    if (definition?.uniquePerLocation && count > 0) {
      return fail('O estado de crafting possui estrutura duplicada no local.');
    }

    uniqueKeys.set(key, count + 1);
    structures.push(inspected.value);
  }

  return {
    ok: true,
    value: {
      knownRecipeIds,
      structures,
    },
  };
}

export function serializeCraftingState(state: CraftingState): string {
  return JSON.stringify(copyState(state));
}

export function restoreCraftingState(
  serialized: string,
  definitions: IndexedCrafting,
  map: IndexedMap,
): CraftingState {
  if (typeof serialized !== 'string' || serialized.trim() === '') {
    throw new CRAFTING_ERROR('O estado de crafting é inválido.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    throw new CRAFTING_ERROR('O estado de crafting é inválido.', { cause: error });
  }

  const inspected = inspectCraftingState(parsed, definitions, map);
  if (!inspected.ok) {
    throw new CRAFTING_ERROR(inspected.reason);
  }

  return inspected.value;
}

export function inspectRecipeAccess(
  map: IndexedMap,
  navigation: NavigationState,
  definitions: IndexedCrafting,
  state: CraftingState,
  inventory: readonly InventoryItem[],
  recipeId: string,
  conditions?: CraftingConditionSource,
): CraftingAccess {
  const context = requireCraftContext(map, navigation, definitions, state, inventory);
  const recipe = requireRecipe(context.definitions, recipeId);
  const timeCost = { periods: recipe.timeCost.periods };
  const access: CraftingAccess = {
    craftable: false,
    missingInputs: missingInputs(recipe.inputs, context.inventory),
    missingStationTags: missingStationTags(context, recipe),
    timeCost,
  };

  const blockedReason = craftBlockReason(context, recipe, resolveEvaluator(conditions));
  if (blockedReason) {
    access.blockedReason = blockedReason;
    if (blockedReason === UNKNOWN_RECIPE_REASON) {
      access.missingInputs = [];
      access.missingStationTags = [];
    }

    return access;
  }

  return {
    craftable: true,
    missingInputs: [],
    missingStationTags: [],
    timeCost,
  };
}

export function canCraftRecipe(
  map: IndexedMap,
  navigation: NavigationState,
  definitions: IndexedCrafting,
  state: CraftingState,
  inventory: readonly InventoryItem[],
  recipeId: string,
  conditions?: CraftingConditionSource,
): boolean {
  return inspectRecipeAccess(map, navigation, definitions, state, inventory, recipeId, conditions).craftable;
}

export function craftRecipe(
  map: IndexedMap,
  navigation: NavigationState,
  definitions: IndexedCrafting,
  state: CraftingState,
  inventory: readonly InventoryItem[],
  recipeId: string,
  conditions?: CraftingConditionSource,
): CraftingResult {
  const context = requireCraftContext(map, navigation, definitions, state, inventory);
  const recipe = requireRecipe(context.definitions, recipeId);
  const blockedReason = craftBlockReason(context, recipe, resolveEvaluator(conditions));
  if (blockedReason) {
    throw new CRAFTING_ERROR(blockedReason);
  }

  const produced = recipe.kind === 'structure' ? [] : (recipe.outputs ?? []).map(copyIngredient);
  const nextInventory = applyInventory(context.inventory, recipe.inputs, produced);
  const created = recipe.kind === 'structure' ? createStructure(context, recipe) : undefined;
  const current: CraftingState = {
    knownRecipeIds: [...context.state.knownRecipeIds],
    structures: created ? [...context.state.structures.map(copyStructure), created] : context.state.structures.map(copyStructure),
  };

  const result: CraftingResult = {
    previous: copyState(context.state),
    current,
    inventory: {
      previous: copyInventory(context.inventory),
      current: nextInventory,
    },
    recipe: copyRecipe(recipe),
    consumed: recipe.inputs.map(copyIngredient),
    produced,
    locationId: context.navigation.currentLocationId,
    timeCost: { periods: recipe.timeCost.periods },
  };

  if (created) {
    result.structure = copyStructure(created);
  }

  return result;
}

export function synchronizeKnownRecipes(
  definitions: IndexedCrafting,
  state: CraftingState,
  map: IndexedMap,
  conditions?: CraftingConditionSource,
): CraftingState {
  const indexed = requireIndexedDefinitions(definitions);
  const indexedMap = requireIndexedMap(map);
  const previous = requireState(state, indexed, indexedMap);
  const evaluate = resolveEvaluator(conditions);
  const known = new Set(previous.knownRecipeIds);
  const knownRecipeIds = [...previous.knownRecipeIds];

  for (const recipe of indexed.recipes) {
    if (known.has(recipe.id) || recipe.discovery.type !== 'flag') {
      continue;
    }

    if (!isFlagActive(recipe.discovery.flag, evaluate)) {
      continue;
    }

    known.add(recipe.id);
    knownRecipeIds.push(recipe.id);
  }

  return {
    knownRecipeIds,
    structures: previous.structures.map(copyStructure),
  };
}

export function createCraftingEvaluator(state: GameState): CraftingConditionEvaluator {
  return (conditions) => evaluateConditions(conditions ? copyConditions(conditions) : undefined, state);
}

export function getRecipe(definitions: IndexedCrafting, recipeId: string): RecipeDefinition {
  return copyRecipe(requireRecipe(requireIndexedDefinitions(definitions), recipeId));
}

export function getStructureDefinition(definitions: IndexedCrafting, structureId: string): StructureDefinition {
  return copyStructureDefinition(requireStructure(requireIndexedDefinitions(definitions), structureId));
}

export { INITIAL_RECIPES, INITIAL_STRUCTURES };
export type {
  CraftingAccess,
  CraftingConditionEvaluator,
  CraftingConditionSource,
  CraftingInspection,
  CraftingResult,
  CraftingState,
  IndexedCrafting,
  RecipeDefinition,
  RecipeDiscovery,
  RecipeIngredient,
  RecipeKind,
  StructureDefinition,
  WorldStructureState,
} from './types';

function inspectStructureDefinitions(value: unknown): CraftingInspection<{
  structures: StructureDefinition[];
  byStructure: Map<string, StructureDefinition>;
}> {
  if (!Array.isArray(value)) {
    return fail('As definições de crafting são inválidas.');
  }

  const structures: StructureDefinition[] = [];
  const byStructure = new Map<string, StructureDefinition>();

  for (const entry of value) {
    const inspected = inspectStructureDefinition(entry, byStructure);
    if (!inspected.ok) {
      return inspected;
    }

    byStructure.set(inspected.value.id, inspected.value);
    structures.push(inspected.value);
  }

  return { ok: true, value: { structures, byStructure } };
}

function inspectStructureDefinition(
  value: unknown,
  seen: ReadonlyMap<string, StructureDefinition>,
): CraftingInspection<StructureDefinition> {
  if (!isRecord(value)) {
    return fail('As definições de crafting são inválidas.');
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return fail('A estrutura possui identificador vazio.');
  }

  if (seen.has(value.id)) {
    return fail('As definições possuem identificadores duplicados.');
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    return fail('A estrutura possui nome vazio.');
  }

  if (typeof value.uniquePerLocation !== 'boolean' || typeof value.activeByDefault !== 'boolean') {
    return fail('A estrutura é malformada.');
  }

  const tags = inspectTags(value.tags, 'As tags da estrutura são inválidas.');
  if (!tags.ok) {
    return tags;
  }

  if (tags.value.length === 0) {
    return fail('As tags da estrutura são inválidas.');
  }

  if (value.initialFuel !== undefined && !isNonNegativeSafeInteger(value.initialFuel)) {
    return fail('O combustível inicial é inválido.');
  }

  const definition: StructureDefinition = {
    id: value.id,
    name: value.name,
    tags: tags.value,
    uniquePerLocation: value.uniquePerLocation,
    activeByDefault: value.activeByDefault,
  };

  if (value.initialFuel !== undefined) {
    definition.initialFuel = value.initialFuel;
  }

  return { ok: true, value: definition };
}

function inspectRecipeDefinition(
  value: unknown,
  structures: ReadonlyMap<string, StructureDefinition>,
  seen: ReadonlyMap<string, RecipeDefinition>,
): CraftingInspection<RecipeDefinition> {
  if (!isRecord(value)) {
    return fail('As definições de crafting são inválidas.');
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return fail('A receita possui identificador vazio.');
  }

  if (seen.has(value.id)) {
    return fail('As definições possuem identificadores duplicados.');
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    return fail('A receita possui nome vazio.');
  }

  if (!isRecipeKind(value.kind)) {
    return fail('A receita é contraditória.');
  }

  const inputs = inspectIngredients(value.inputs, 'Os materiais de entrada da receita são inválidos.');
  if (!inputs.ok) {
    return inputs;
  }

  if (inputs.value.length === 0) {
    return fail('A receita precisa de pelo menos um material de entrada.');
  }

  const timeCost = inspectTimeCost(value.timeCost);
  if (!timeCost.ok) {
    return fail(timeCost.reason);
  }

  if (timeCost.value.periods < 1) {
    return fail('O custo de tempo da receita precisa ser um inteiro positivo.');
  }

  const discovery = inspectDiscovery(value.discovery);
  if (!discovery.ok) {
    return discovery;
  }

  let conditions: GameCondition[] | undefined;
  if (value.conditions !== undefined) {
    const inspectedConditions = inspectConditions(value.conditions);
    if (!inspectedConditions.ok) {
      return inspectedConditions;
    }

    conditions = inspectedConditions.value;
  }

  let requiredStationTags: string[] | undefined;
  if (value.requiredStationTags !== undefined) {
    const tags = inspectTags(value.requiredStationTags, 'As tags da estação são inválidas.');
    if (!tags.ok) {
      return tags;
    }

    requiredStationTags = tags.value;
  }

  if (value.kind === 'cooking' && (!requiredStationTags || requiredStationTags.length === 0)) {
    return fail('A receita de cozinha precisa de uma estação.');
  }

  if (value.kind === 'structure') {
    if (value.outputs !== undefined) {
      return fail('A receita é contraditória.');
    }

    if (typeof value.createsStructureId !== 'string' || value.createsStructureId.trim() === '') {
      return fail('A receita é contraditória.');
    }

    if (!structures.has(value.createsStructureId)) {
      return fail('A receita referencia uma estrutura inexistente.');
    }
  } else {
    if (value.createsStructureId !== undefined) {
      return fail('A receita é contraditória.');
    }

    const outputs = inspectIngredients(value.outputs, 'Os materiais de saída da receita são inválidos.');
    if (!outputs.ok) {
      return outputs;
    }

    if (outputs.value.length === 0) {
      return fail('A receita precisa de pelo menos um material de saída.');
    }

    const definition: RecipeDefinition = {
      id: value.id,
      name: value.name,
      kind: value.kind,
      inputs: inputs.value,
      outputs: outputs.value,
      timeCost: { periods: timeCost.value.periods },
      discovery: discovery.value,
    };

    if (requiredStationTags) {
      definition.requiredStationTags = requiredStationTags;
    }

    if (conditions) {
      definition.conditions = conditions;
    }

    return { ok: true, value: definition };
  }

  const definition: RecipeDefinition = {
    id: value.id,
    name: value.name,
    kind: 'structure',
    inputs: inputs.value,
    createsStructureId: value.createsStructureId as string,
    timeCost: { periods: timeCost.value.periods },
    discovery: discovery.value,
  };

  if (requiredStationTags) {
    definition.requiredStationTags = requiredStationTags;
  }

  if (conditions) {
    definition.conditions = conditions;
  }

  return { ok: true, value: definition };
}

function inspectIngredients(value: unknown, reason: string): CraftingInspection<RecipeIngredient[]> {
  if (!Array.isArray(value)) {
    return fail(reason);
  }

  const ingredients: RecipeIngredient[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.itemId !== 'string' || entry.itemId.trim() === '') {
      return fail(reason);
    }

    if (seen.has(entry.itemId)) {
      return fail(
        reason.includes('saída')
          ? 'A receita possui materiais de saída duplicados.'
          : 'A receita possui materiais de entrada duplicados.',
      );
    }

    if (!isPositiveSafeInteger(entry.quantity)) {
      return fail('A quantidade da receita precisa ser um inteiro positivo.');
    }

    seen.add(entry.itemId);
    ingredients.push({ itemId: entry.itemId, quantity: entry.quantity });
  }

  return { ok: true, value: ingredients };
}

function inspectTags(value: unknown, reason: string): CraftingInspection<string[]> {
  if (!Array.isArray(value)) {
    return fail(reason);
  }

  const tags: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      return fail(reason);
    }

    if (seen.has(entry)) {
      return fail(reason);
    }

    seen.add(entry);
    tags.push(entry);
  }

  return { ok: true, value: tags };
}

function inspectDiscovery(value: unknown): CraftingInspection<RecipeDiscovery> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('A descoberta da receita é incompatível.');
  }

  if (value.type === 'known') {
    if (value.flag !== undefined) {
      return fail('A descoberta da receita é incompatível.');
    }

    return { ok: true, value: { type: 'known' } };
  }

  if (value.type === 'flag') {
    if (typeof value.flag !== 'string' || value.flag.trim() === '') {
      return fail('A descoberta da receita é incompatível.');
    }

    return { ok: true, value: { type: 'flag', flag: value.flag } };
  }

  return fail('A descoberta da receita é incompatível.');
}

function inspectWorldStructure(
  value: unknown,
  definitions: IndexedCrafting,
  map: IndexedMap,
): CraftingInspection<WorldStructureState> {
  if (!isRecord(value)) {
    return fail('O estado de crafting é inválido.');
  }

  if (typeof value.structureId !== 'string' || value.structureId.trim() === '') {
    return fail('O estado de crafting possui estrutura desconhecida.');
  }

  if (!definitions.byStructure.has(value.structureId)) {
    return fail('O estado de crafting possui estrutura desconhecida.');
  }

  if (typeof value.locationId !== 'string' || value.locationId.trim() === '' || !map.locations.has(value.locationId)) {
    return fail('O estado de crafting possui localização inexistente.');
  }

  if (typeof value.active !== 'boolean') {
    return fail('O estado de crafting é inválido.');
  }

  if (value.fuel !== undefined && !isNonNegativeSafeInteger(value.fuel)) {
    return fail('O combustível da estrutura é inválido.');
  }

  const structure: WorldStructureState = {
    structureId: value.structureId,
    locationId: value.locationId,
    active: value.active,
  };

  if (value.fuel !== undefined) {
    structure.fuel = value.fuel;
  }

  return { ok: true, value: structure };
}

function inspectConditions(value: unknown): CraftingInspection<GameCondition[]> {
  if (!Array.isArray(value)) {
    return fail('A receita possui condições malformadas.');
  }

  const conditions: GameCondition[] = [];
  for (const entry of value) {
    const condition = inspectCondition(entry);
    if (!condition.ok) {
      return condition;
    }

    conditions.push(condition.value);
  }

  return { ok: true, value: conditions };
}

function inspectCondition(value: unknown): CraftingInspection<GameCondition> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('A receita possui condições malformadas.');
  }

  switch (value.type) {
    case 'flag.is':
      if (typeof value.flag !== 'string' || value.flag.trim() === '' || typeof value.value !== 'boolean') {
        return fail('A receita possui condições malformadas.');
      }
      return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
    case 'attribute.min':
    case 'attribute.max':
      if (!isAttributeId(value.attribute) || !isFiniteNumber(value.amount)) {
        return fail('A receita possui condições malformadas.');
      }
      return {
        ok: true,
        value: { type: value.type, attribute: value.attribute, amount: value.amount },
      };
    case 'inventory.has':
      if (typeof value.itemId !== 'string' || value.itemId.trim() === '') {
        return fail('A receita possui condições malformadas.');
      }
      if (value.quantity !== undefined && !isPositiveInteger(value.quantity)) {
        return fail('A receita possui condições malformadas.');
      }
      return {
        ok: true,
        value:
          value.quantity === undefined
            ? { type: 'inventory.has', itemId: value.itemId }
            : { type: 'inventory.has', itemId: value.itemId, quantity: value.quantity },
      };
    case 'relationship.min':
      if (typeof value.characterId !== 'string' || value.characterId.trim() === '' || !isFiniteNumber(value.amount)) {
        return fail('A receita possui condições malformadas.');
      }
      return {
        ok: true,
        value: { type: 'relationship.min', characterId: value.characterId, amount: value.amount },
      };
    default:
      return fail('A receita possui condições malformadas.');
  }
}

function craftBlockReason(
  context: CraftContext,
  recipe: RecipeDefinition,
  evaluate: CraftingConditionEvaluator | undefined,
): string | undefined {
  if (!context.state.knownRecipeIds.includes(recipe.id)) {
    return UNKNOWN_RECIPE_REASON;
  }

  if (!areConditionsSatisfied(recipe.conditions, evaluate)) {
    return DEFAULT_CRAFTING_BLOCKED_REASON;
  }

  if (recipe.kind === 'structure' && recipe.createsStructureId) {
    const definition = context.definitions.byStructure.get(recipe.createsStructureId);
    if (
      definition?.uniquePerLocation &&
      context.state.structures.some(
        (entry) =>
          entry.structureId === recipe.createsStructureId &&
          entry.locationId === context.navigation.currentLocationId,
      )
    ) {
      return DUPLICATE_STRUCTURE_REASON;
    }
  }

  const stations = missingStationTags(context, recipe);
  if (stations.length > 0) {
    return MISSING_STATION_REASON;
  }

  if (missingInputs(recipe.inputs, context.inventory).length > 0) {
    return MISSING_MATERIALS_REASON;
  }

  try {
    applyInventory(
      context.inventory,
      recipe.inputs,
      recipe.kind === 'structure' ? [] : (recipe.outputs ?? []),
    );
  } catch (error) {
    if (error instanceof CraftingError) {
      return error.message;
    }

    throw error;
  }

  return undefined;
}

function missingInputs(inputs: readonly RecipeIngredient[], inventory: readonly InventoryItem[]): RecipeIngredient[] {
  const missing: RecipeIngredient[] = [];
  for (const input of inputs) {
    const have = itemQuantity(inventory, input.itemId);
    if (have < input.quantity) {
      missing.push({ itemId: input.itemId, quantity: input.quantity - have });
    }
  }

  return missing;
}

function missingStationTags(context: CraftContext, recipe: RecipeDefinition): string[] {
  if (!recipe.requiredStationTags || recipe.requiredStationTags.length === 0) {
    return [];
  }

  const available = availableTags(context);
  return recipe.requiredStationTags.filter((tag) => !available.has(tag));
}

function availableTags(context: CraftContext): Set<string> {
  const tags = new Set<string>();
  for (const structure of context.state.structures) {
    if (!structure.active || structure.locationId !== context.navigation.currentLocationId) {
      continue;
    }

    const definition = context.definitions.byStructure.get(structure.structureId);
    if (!definition) {
      continue;
    }

    for (const tag of definition.tags) {
      tags.add(tag);
    }
  }

  return tags;
}

function createStructure(context: CraftContext, recipe: RecipeDefinition): WorldStructureState {
  const structureId = recipe.createsStructureId;
  if (!structureId) {
    throw new CRAFTING_ERROR('A receita é contraditória.');
  }

  const definition = requireStructure(context.definitions, structureId);
  const created: WorldStructureState = {
    structureId,
    locationId: context.navigation.currentLocationId,
    active: definition.activeByDefault,
  };

  if (definition.initialFuel !== undefined) {
    created.fuel = definition.initialFuel;
  }

  return created;
}

function applyInventory(
  inventory: readonly InventoryItem[],
  consume: readonly RecipeIngredient[],
  produce: readonly RecipeIngredient[],
): InventoryItem[] {
  const quantities = new Map<string, number>();
  for (const item of inventory) {
    quantities.set(item.itemId, item.quantity);
  }

  for (const input of consume) {
    const have = quantities.get(input.itemId) ?? 0;
    if (have < input.quantity) {
      throw new CRAFTING_ERROR(MISSING_MATERIALS_REASON);
    }

    quantities.set(input.itemId, have - input.quantity);
  }

  for (const output of produce) {
    const have = quantities.get(output.itemId) ?? 0;
    if (output.quantity > Number.MAX_SAFE_INTEGER - have) {
      throw new CRAFTING_ERROR(INVENTORY_OVERFLOW_REASON);
    }

    quantities.set(output.itemId, have + output.quantity);
  }

  const next: InventoryItem[] = [];
  const seen = new Set<string>();

  for (const item of inventory) {
    seen.add(item.itemId);
    const quantity = quantities.get(item.itemId) ?? 0;
    if (quantity > 0) {
      next.push({ itemId: item.itemId, quantity });
    }
  }

  for (const output of produce) {
    if (seen.has(output.itemId)) {
      continue;
    }

    const quantity = quantities.get(output.itemId) ?? 0;
    if (quantity > 0) {
      next.push({ itemId: output.itemId, quantity });
    }

    seen.add(output.itemId);
  }

  return next;
}

function itemQuantity(items: readonly InventoryItem[], itemId: string): number {
  return items.find((item) => item.itemId === itemId)?.quantity ?? 0;
}

interface CraftContext {
  map: IndexedMap;
  navigation: NavigationState;
  definitions: IndexedCrafting;
  state: CraftingState;
  inventory: InventoryItem[];
}

function requireCraftContext(
  map: IndexedMap,
  navigation: NavigationState,
  definitions: IndexedCrafting,
  state: CraftingState,
  inventory: readonly InventoryItem[],
): CraftContext {
  const indexedMap = requireIndexedMap(map);
  const currentNavigation = requireNavigation(navigation, indexedMap);
  const indexedDefinitions = requireIndexedDefinitions(definitions);
  const currentState = requireState(state, indexedDefinitions, indexedMap);
  const currentInventory = requireInventory(inventory);

  return {
    map: indexedMap,
    navigation: currentNavigation,
    definitions: indexedDefinitions,
    state: currentState,
    inventory: currentInventory,
  };
}

function requireIndexedMap(map: IndexedMap): IndexedMap {
  const inspected = inspectIndexedMap(map);
  if (!inspected.ok) {
    throw new CRAFTING_ERROR(inspected.reason);
  }

  return inspected.value;
}

function requireIndexedDefinitions(definitions: IndexedCrafting): IndexedCrafting {
  const inspected = inspectIndexedDefinitions(definitions);
  if (!inspected.ok) {
    throw new CRAFTING_ERROR(inspected.reason);
  }

  return inspected.value;
}

function requireNavigation(state: NavigationState, map: IndexedMap): NavigationState {
  const inspected = inspectNavigationState(state, map);
  if (!inspected.ok) {
    throw new CRAFTING_ERROR(inspected.reason);
  }

  return inspected.value;
}

function requireState(state: CraftingState, definitions: IndexedCrafting, map: IndexedMap): CraftingState {
  const inspected = inspectCraftingState(state, definitions, map);
  if (!inspected.ok) {
    throw new CRAFTING_ERROR(inspected.reason);
  }

  return inspected.value;
}

function requireRecipe(definitions: IndexedCrafting, recipeId: string): RecipeDefinition {
  if (typeof recipeId !== 'string' || recipeId.trim() === '') {
    throw new CRAFTING_ERROR('A receita não existe.');
  }

  const recipe = definitions.byRecipe.get(recipeId);
  if (!recipe) {
    throw new CRAFTING_ERROR('A receita não existe.');
  }

  return recipe;
}

function requireStructure(definitions: IndexedCrafting, structureId: string): StructureDefinition {
  if (typeof structureId !== 'string' || structureId.trim() === '') {
    throw new CRAFTING_ERROR('A estrutura não existe.');
  }

  const structure = definitions.byStructure.get(structureId);
  if (!structure) {
    throw new CRAFTING_ERROR('A estrutura não existe.');
  }

  return structure;
}

function requireInventory(value: unknown): InventoryItem[] {
  if (!Array.isArray(value)) {
    throw new CRAFTING_ERROR('O inventário é inválido.');
  }

  const seen = new Set<string>();
  const items: InventoryItem[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.itemId !== 'string' || entry.itemId.trim() === '') {
      throw new CRAFTING_ERROR('O inventário é inválido.');
    }

    if (!isPositiveSafeInteger(entry.quantity) || seen.has(entry.itemId)) {
      throw new CRAFTING_ERROR('O inventário é inválido.');
    }

    seen.add(entry.itemId);
    items.push({ itemId: entry.itemId, quantity: entry.quantity });
  }

  return items;
}

function inspectIndexedMap(map: unknown): CraftingInspection<IndexedMap> {
  if (
    !isRecord(map) ||
    !(map.locations instanceof Map) ||
    !(map.parents instanceof Map) ||
    !(map.children instanceof Map)
  ) {
    return fail('O mapa indexado é inválido.');
  }

  return { ok: true, value: map as unknown as IndexedMap };
}

function inspectIndexedDefinitions(definitions: unknown): CraftingInspection<IndexedCrafting> {
  if (
    !isRecord(definitions) ||
    !Array.isArray(definitions.recipes) ||
    !Array.isArray(definitions.structures) ||
    !(definitions.byRecipe instanceof Map) ||
    !(definitions.byStructure instanceof Map)
  ) {
    return fail('As definições de crafting são inválidas.');
  }

  return { ok: true, value: definitions as unknown as IndexedCrafting };
}

function areConditionsSatisfied(
  conditions: readonly GameCondition[] | undefined,
  evaluate: CraftingConditionEvaluator | undefined,
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  if (!evaluate) {
    return false;
  }

  return evaluate(copyConditions(conditions));
}

function isFlagActive(flag: string, evaluate: CraftingConditionEvaluator | undefined): boolean {
  if (!evaluate) {
    return false;
  }

  return evaluate([{ type: 'flag.is', flag, value: true }]);
}

function resolveEvaluator(source: CraftingConditionSource | undefined): CraftingConditionEvaluator | undefined {
  if (source === undefined) {
    return undefined;
  }

  if (typeof source === 'function') {
    return source;
  }

  return createCraftingEvaluator(source);
}

function copyState(state: CraftingState): CraftingState {
  return {
    knownRecipeIds: [...state.knownRecipeIds],
    structures: state.structures.map(copyStructure),
  };
}

function copyStructure(structure: WorldStructureState): WorldStructureState {
  const copied: WorldStructureState = {
    structureId: structure.structureId,
    locationId: structure.locationId,
    active: structure.active,
  };

  if (structure.fuel !== undefined) {
    copied.fuel = structure.fuel;
  }

  return copied;
}

function copyStructureDefinition(definition: StructureDefinition): StructureDefinition {
  const copied: StructureDefinition = {
    id: definition.id,
    name: definition.name,
    tags: [...definition.tags],
    uniquePerLocation: definition.uniquePerLocation,
    activeByDefault: definition.activeByDefault,
  };

  if (definition.initialFuel !== undefined) {
    copied.initialFuel = definition.initialFuel;
  }

  return copied;
}

function copyRecipe(recipe: RecipeDefinition): RecipeDefinition {
  const copied: RecipeDefinition = {
    id: recipe.id,
    name: recipe.name,
    kind: recipe.kind,
    inputs: recipe.inputs.map(copyIngredient),
    timeCost: { periods: recipe.timeCost.periods },
    discovery: recipe.discovery.type === 'known' ? { type: 'known' } : { type: 'flag', flag: recipe.discovery.flag },
  };

  if (recipe.outputs) {
    copied.outputs = recipe.outputs.map(copyIngredient);
  }

  if (recipe.createsStructureId !== undefined) {
    copied.createsStructureId = recipe.createsStructureId;
  }

  if (recipe.requiredStationTags) {
    copied.requiredStationTags = [...recipe.requiredStationTags];
  }

  if (recipe.conditions) {
    copied.conditions = copyConditions(recipe.conditions);
  }

  return copied;
}

function copyIngredient(ingredient: RecipeIngredient): RecipeIngredient {
  return { itemId: ingredient.itemId, quantity: ingredient.quantity };
}

function copyInventory(items: readonly InventoryItem[]): InventoryItem[] {
  return items.map((item) => ({ itemId: item.itemId, quantity: item.quantity }));
}

function copyConditions(conditions: readonly GameCondition[]): GameCondition[] {
  return conditions.map(copyCondition);
}

function copyCondition(condition: GameCondition): GameCondition {
  switch (condition.type) {
    case 'flag.is':
      return { type: 'flag.is', flag: condition.flag, value: condition.value };
    case 'attribute.min':
    case 'attribute.max':
      return { type: condition.type, attribute: condition.attribute, amount: condition.amount };
    case 'inventory.has':
      return condition.quantity === undefined
        ? { type: 'inventory.has', itemId: condition.itemId }
        : { type: 'inventory.has', itemId: condition.itemId, quantity: condition.quantity };
    case 'relationship.min':
      return { type: 'relationship.min', characterId: condition.characterId, amount: condition.amount };
  }
}

function isRecipeKind(value: unknown): value is RecipeKind {
  return typeof value === 'string' && (RECIPE_KINDS as readonly string[]).includes(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): CraftingInspection<never> {
  return { ok: false, reason };
}
