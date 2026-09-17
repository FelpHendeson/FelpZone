import type { InventoryItem } from '../../core/state/types';
import { itemQuantity } from '../inventory';
import { ItemError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_ITEMS_CATALOG } from './initial-items';
import {
  COMBAT_VALUE_TARGETS,
  CONSUMABLE_USE_TYPES,
  EQUIPMENT_SLOTS,
  ITEM_KINDS,
  PREPARATION_SLOT_COUNT,
  RESTORABLE_NEEDS,
  type CatalogItemDefinition,
  type ConsumableDefinition,
  type ConsumableUseDefinition,
  type EquipmentDefinition,
  type EquipmentGrant,
  type EquipmentState,
  type IndexedItems,
  type ItemsInspection,
  type ItemsState,
} from './types';

export { ItemError } from './errors';
export { INITIAL_ITEMS_CATALOG } from './initial-items';
export {
  COMBAT_VALUE_TARGETS,
  CONSUMABLE_USE_TYPES,
  EQUIPMENT_SLOTS,
  ITEM_KINDS,
  PREPARATION_SLOT_COUNT,
  RESTORABLE_NEEDS,
} from './types';
export type {
  CatalogItemDefinition,
  CombatValueTarget,
  ConsumableDefinition,
  ConsumableUseDefinition,
  EquipmentDefinition,
  EquipmentGrant,
  EquipmentSlot,
  EquipmentState,
  IndexedItems,
  ItemDefinition,
  ItemKind,
  ItemsCatalog,
  ItemsInspection,
  ItemsState,
  MaterialDefinition,
  PreparationSlotState,
  PreparationState,
  RestorableNeed,
} from './types';

const MAX_ITEMS = 512;
const MAX_ID_LENGTH = 128;
const MAX_TEXT_LENGTH = 2_000;
const MAX_TAGS = 16;
const MAX_GRANTS = 8;
const MAX_STACK = 999;
const MAX_GRANT_AMOUNT = 99;

export const INITIAL_ITEMS = indexItemsCatalog(INITIAL_ITEMS_CATALOG);

export function inspectItemsCatalog(value: unknown): ItemsInspection<IndexedItems> {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return fail('O catálogo de itens é inválido.');
  }
  if (value.items.length > MAX_ITEMS) {
    return fail('O catálogo de itens excede os limites permitidos.');
  }

  const items: CatalogItemDefinition[] = [];
  const ids = new Set<string>();
  for (const entry of value.items) {
    const inspected = inspectItem(entry, ids);
    if (!inspected.ok) {
      return inspected;
    }
    ids.add(inspected.value.id);
    items.push(inspected.value);
  }

  return { ok: true, value: freezeCatalog(items) };
}

export function indexItemsCatalog(value: unknown): IndexedItems {
  const inspected = inspectItemsCatalog(value);
  if (!inspected.ok) {
    throw new ItemError(inspected.reason);
  }
  return inspected.value;
}

export function getItem(catalog: IndexedItems, itemId: string): CatalogItemDefinition {
  const item = requireIndexed(catalog).byId.get(itemId);
  if (!item) {
    throw new ItemError('O item não existe.');
  }
  return copyItem(item);
}

export function hasItem(catalog: IndexedItems, itemId: unknown): itemId is string {
  return nonEmpty(itemId) && requireIndexed(catalog).byId.has(itemId);
}

export function getEquipment(catalog: IndexedItems, itemId: string): EquipmentDefinition {
  const item = requireIndexed(catalog).equipmentById.get(itemId);
  if (!item) {
    throw new ItemError('O equipamento não existe.');
  }
  return copyEquipment(item);
}

export function getConsumable(catalog: IndexedItems, itemId: string): ConsumableDefinition {
  const item = requireIndexed(catalog).consumableById.get(itemId);
  if (!item) {
    throw new ItemError('O consumível não existe.');
  }
  return copyConsumable(item);
}

export function createInitialItemsState(): ItemsState {
  return {
    equipment: { 'main-hand': null, body: null, accessory: null },
    preparation: {
      slots: [
        { index: 0, itemId: null },
        { index: 1, itemId: null },
      ],
    },
  };
}

export function inspectItemsState(value: unknown, catalog: IndexedItems = INITIAL_ITEMS): ItemsInspection<ItemsState> {
  if (!isRecord(value) || !isRecord(value.equipment) || !isRecord(value.preparation) || !Array.isArray(value.preparation.slots)) {
    return fail('O estado de itens é inválido.');
  }
  if (value.preparation.slots.length !== PREPARATION_SLOT_COUNT) {
    return fail('A preparação precisa de exatamente dois espaços.');
  }

  const equipment: EquipmentState = { 'main-hand': null, body: null, accessory: null };
  const seenEquipment = new Set<string>();
  for (const slot of EQUIPMENT_SLOTS) {
    const equipped = value.equipment[slot];
    if (equipped === null || equipped === undefined) {
      equipment[slot] = null;
      continue;
    }
    if (!nonEmpty(equipped)) {
      return fail('O equipamento persistido é inválido.');
    }
    const definition = catalog.equipmentById.get(equipped);
    if (!definition || definition.slot !== slot) {
      return fail('O save referencia um equipamento inexistente ou incompatível.');
    }
    if (seenEquipment.has(equipped)) {
      return fail('O mesmo equipamento não pode ocupar dois espaços.');
    }
    seenEquipment.add(equipped);
    equipment[slot] = equipped;
  }

  for (const slot of Object.keys(value.equipment)) {
    if (!includes(EQUIPMENT_SLOTS, slot)) {
      return fail('O save declara um espaço de equipamento desconhecido.');
    }
  }

  const slots: { index: number; itemId: string | null }[] = [];
  const seenIndex = new Set<number>();
  for (let expected = 0; expected < PREPARATION_SLOT_COUNT; expected += 1) {
    const entry = value.preparation.slots[expected];
    if (!isRecord(entry) || entry.index !== expected || seenIndex.has(expected)) {
      return fail('Os espaços de preparação são inválidos.');
    }
    seenIndex.add(expected);
    if (entry.itemId === null) {
      slots.push({ index: expected, itemId: null });
      continue;
    }
    if (!nonEmpty(entry.itemId)) {
      return fail('A preparação referencia um consumível inválido.');
    }
    const consumable = catalog.consumableById.get(entry.itemId);
    if (!consumable || consumable.use.type !== 'combat.heal') {
      return fail('Só é possível preparar um consumível de combate conhecido.');
    }
    slots.push({ index: expected, itemId: entry.itemId });
  }

  return { ok: true, value: freezeItemsState({ equipment, preparation: { slots } }) };
}

export function copyItemsState(state: ItemsState): ItemsState {
  return {
    equipment: { ...state.equipment },
    preparation: {
      slots: state.preparation.slots.map((slot) => ({ index: slot.index, itemId: slot.itemId })),
    },
  };
}

export function reservedQuantity(state: ItemsState, itemId: string): number {
  let reserved = 0;
  for (const slot of EQUIPMENT_SLOTS) {
    if (state.equipment[slot] === itemId) {
      reserved += 1;
    }
  }
  for (const slot of state.preparation.slots) {
    if (slot.itemId === itemId) {
      reserved += 1;
    }
  }
  return reserved;
}

export function availableQuantity(inventory: readonly InventoryItem[], state: ItemsState, itemId: string): number {
  return Math.max(0, itemQuantity(inventory, itemId) - reservedQuantity(state, itemId));
}

export function inspectItemsAgainstInventory(
  state: unknown,
  inventory: readonly InventoryItem[],
  catalog: IndexedItems = INITIAL_ITEMS,
  validateInventoryCatalog = true,
): ItemsInspection<ItemsState> {
  if (!Array.isArray(inventory) || inventory.length > MAX_ITEMS) {
    return fail('O inventário excede os limites permitidos.');
  }
  const seenInventory = new Set<string>();
  for (const entry of inventory) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.itemId) ||
      seenInventory.has(entry.itemId) ||
      !positiveSafeInteger(entry.quantity)
    ) {
      return fail('O inventário possui uma entrada inválida ou duplicada.');
    }
    if (validateInventoryCatalog) {
      const definition = catalog.byId.get(entry.itemId);
      if (!definition) {
        return fail('O inventário referencia um item inexistente.');
      }
      if (entry.quantity > definition.stackLimit) {
        return fail('O inventário excede o limite de pilha de um item.');
      }
    }
    seenInventory.add(entry.itemId);
  }

  const inspected = inspectItemsState(state, catalog);
  if (!inspected.ok) {
    return inspected;
  }

  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = inspected.value.equipment[slot];
    if (itemId && itemQuantity(inventory, itemId) < 1) {
      return fail('O loadout referencia um equipamento que não está na posse.');
    }
  }

  const reserved = new Map<string, number>();
  for (const slot of inspected.value.preparation.slots) {
    if (!slot.itemId) {
      continue;
    }
    reserved.set(slot.itemId, (reserved.get(slot.itemId) ?? 0) + 1);
  }
  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = inspected.value.equipment[slot];
    if (itemId) {
      reserved.set(itemId, (reserved.get(itemId) ?? 0) + 1);
    }
  }
  for (const [itemId, quantity] of reserved) {
    if (itemQuantity(inventory, itemId) < quantity) {
      return fail('A preparação reserva mais unidades do que o inventário possui.');
    }
  }

  return inspected;
}

export function stackLimitFor(catalog: IndexedItems, itemId: string): number {
  const item = requireIndexed(catalog).byId.get(itemId);
  return item?.stackLimit ?? Number.MAX_SAFE_INTEGER;
}

export function canAcceptQuantity(
  catalog: IndexedItems,
  inventory: readonly InventoryItem[],
  itemId: string,
  quantity: number,
): boolean {
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || !hasItem(catalog, itemId)) {
    return false;
  }
  const next = itemQuantity(inventory, itemId) + quantity;
  return Number.isSafeInteger(next) && next <= stackLimitFor(catalog, itemId);
}

function inspectItem(value: unknown, existing: ReadonlySet<string>): ItemsInspection<CatalogItemDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || value.id.length > MAX_ID_LENGTH || existing.has(value.id)) {
    return fail('O item é inválido ou duplicado.');
  }
  if (!nonEmpty(value.name) || value.name.length > MAX_TEXT_LENGTH || !nonEmpty(value.description) || value.description.length > MAX_TEXT_LENGTH) {
    return fail('O item possui texto inválido.');
  }
  if (!includes(ITEM_KINDS, value.kind)) {
    return fail('O tipo do item é inválido.');
  }
  if (!positiveSafeInteger(value.stackLimit) || value.stackLimit > MAX_STACK) {
    return fail('O limite de pilha do item é inválido.');
  }
  const tags = inspectTags(value.tags);
  if (!tags.ok) {
    return tags;
  }

  if (value.kind === 'material') {
    if (value.slot !== undefined || value.grants !== undefined || value.use !== undefined) {
      return fail('O material não pode declarar uso de equipamento ou consumível.');
    }
    if (value.stackLimit < 1) {
      return fail('O limite de pilha do item é inválido.');
    }
    return {
      ok: true,
      value: {
        id: value.id,
        name: value.name,
        description: value.description,
        kind: 'material',
        stackLimit: value.stackLimit,
        tags: tags.value,
      },
    };
  }

  if (value.kind === 'equipment') {
    if (value.stackLimit !== 1) {
      return fail('Equipamento aceita no máximo uma unidade por item.');
    }
    if (!includes(EQUIPMENT_SLOTS, value.slot)) {
      return fail('O espaço do equipamento é inválido.');
    }
    if (value.use !== undefined) {
      return fail('Equipamento não declara uso de consumível.');
    }
    const grants = inspectGrants(value.grants);
    if (!grants.ok) {
      return grants;
    }
    return {
      ok: true,
      value: {
        id: value.id,
        name: value.name,
        description: value.description,
        kind: 'equipment',
        stackLimit: 1,
        tags: tags.value,
        slot: value.slot,
        grants: grants.value,
      },
    };
  }

  if (value.slot !== undefined || value.grants !== undefined) {
    return fail('Consumível não declara espaço ou concessão de equipamento.');
  }
  const use = inspectUse(value.use);
  if (!use.ok) {
    return use;
  }
  return {
    ok: true,
    value: {
      id: value.id,
      name: value.name,
      description: value.description,
      kind: 'consumable',
      stackLimit: value.stackLimit,
      tags: tags.value,
      use: use.value,
    },
  };
}

function inspectGrants(value: unknown): ItemsInspection<EquipmentGrant[]> {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_GRANTS) {
    return fail('As concessões do equipamento são inválidas.');
  }
  const grants: EquipmentGrant[] = [];
  const actions = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || entry.type === 'combat.action.available') {
      if (!isRecord(entry) || entry.type !== 'combat.action.available' || !nonEmpty(entry.actionId)) {
        return fail('A concessão de ação do equipamento é inválida.');
      }
      if (actions.has(entry.actionId)) {
        return fail('O equipamento concede a mesma ação mais de uma vez.');
      }
      actions.add(entry.actionId);
      grants.push({ type: 'combat.action.available', actionId: entry.actionId });
      continue;
    }
    if (entry.type !== 'combat.value.modify' || !includes(COMBAT_VALUE_TARGETS, entry.target)) {
      return fail('A concessão numérica do equipamento é inválida.');
    }
    if (typeof entry.amount !== 'number' || !Number.isSafeInteger(entry.amount) || entry.amount === 0 || Math.abs(entry.amount) > MAX_GRANT_AMOUNT) {
      return fail('O modificador do equipamento está fora dos limites.');
    }
    grants.push({ type: 'combat.value.modify', target: entry.target, amount: entry.amount });
  }
  return { ok: true, value: grants };
}

function inspectUse(value: unknown): ItemsInspection<ConsumableUseDefinition> {
  if (!isRecord(value) || !includes(CONSUMABLE_USE_TYPES, value.type)) {
    return fail('O uso do consumível é inválido.');
  }
  if (value.type === 'combat.heal') {
    if (!positiveSafeInteger(value.amount) || value.amount > MAX_GRANT_AMOUNT) {
      return fail('A cura do consumível é inválida.');
    }
    return { ok: true, value: { type: 'combat.heal', amount: value.amount } };
  }
  if (!includes(RESTORABLE_NEEDS, value.need) || !positiveSafeInteger(value.amount) || value.amount > 100) {
    return fail('A restauração do consumível é inválida.');
  }
  return { ok: true, value: { type: 'need.restore', need: value.need, amount: value.amount } };
}

function inspectTags(value: unknown): ItemsInspection<string[]> {
  if (!Array.isArray(value) || value.length > MAX_TAGS) {
    return fail('As tags do item são inválidas.');
  }
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!nonEmpty(entry) || entry.length > MAX_ID_LENGTH || seen.has(entry)) {
      return fail('As tags do item são inválidas.');
    }
    seen.add(entry);
    tags.push(entry);
  }
  return { ok: true, value: tags };
}

function freezeCatalog(items: CatalogItemDefinition[]): IndexedItems {
  const frozen = Object.freeze(items.map(freezeItem));
  const equipment = frozen.filter((item): item is EquipmentDefinition => item.kind === 'equipment');
  const consumables = frozen.filter((item): item is ConsumableDefinition => item.kind === 'consumable');
  return Object.freeze({
    items: frozen,
    byId: new ImmutableIndex(frozen.map((item) => [item.id, item] as const)),
    equipmentById: new ImmutableIndex(equipment.map((item) => [item.id, item] as const)),
    consumableById: new ImmutableIndex(consumables.map((item) => [item.id, item] as const)),
  });
}

function freezeItem(item: CatalogItemDefinition): CatalogItemDefinition {
  if (item.kind === 'equipment') {
    return Object.freeze({
      ...item,
      tags: Object.freeze([...item.tags]),
      grants: Object.freeze(item.grants.map((grant) => Object.freeze({ ...grant }))),
    });
  }
  if (item.kind === 'consumable') {
    return Object.freeze({
      ...item,
      tags: Object.freeze([...item.tags]),
      use: Object.freeze({ ...item.use }),
    });
  }
  return Object.freeze({ ...item, tags: Object.freeze([...item.tags]) });
}

function freezeItemsState(state: ItemsState): ItemsState {
  return Object.freeze({
    equipment: Object.freeze({ ...state.equipment }),
    preparation: Object.freeze({
      slots: Object.freeze(state.preparation.slots.map((slot) => Object.freeze({ ...slot }))),
    }),
  });
}

function copyItem(item: CatalogItemDefinition): CatalogItemDefinition {
  if (item.kind === 'equipment') {
    return copyEquipment(item);
  }
  if (item.kind === 'consumable') {
    return copyConsumable(item);
  }
  return { ...item, tags: [...item.tags] };
}

function copyEquipment(item: EquipmentDefinition): EquipmentDefinition {
  return { ...item, tags: [...item.tags], grants: item.grants.map((grant) => ({ ...grant })) };
}

function copyConsumable(item: ConsumableDefinition): ConsumableDefinition {
  return { ...item, tags: [...item.tags], use: { ...item.use } };
}

function requireIndexed(catalog: IndexedItems): IndexedItems {
  if (!isRecord(catalog) || !Array.isArray(catalog.items) || !isReadonlyMap(catalog.byId)) {
    throw new ItemError('O catálogo indexado de itens é inválido.');
  }
  return catalog;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReadonlyMap(value: unknown): value is ReadonlyMap<unknown, unknown> {
  return isRecord(value) && typeof value.get === 'function' && typeof value.has === 'function';
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function includes<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

function fail<T>(reason: string): ItemsInspection<T> {
  return { ok: false, reason };
}
