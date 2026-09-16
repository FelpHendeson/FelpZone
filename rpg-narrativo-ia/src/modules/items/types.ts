export const ITEM_KINDS = ['material', 'consumable', 'equipment'] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];

export const EQUIPMENT_SLOTS = ['main-hand', 'body', 'accessory'] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export const EQUIPMENT_GRANT_TYPES = ['combat.action.available', 'combat.value.modify'] as const;

export type EquipmentGrantType = (typeof EQUIPMENT_GRANT_TYPES)[number];

export const COMBAT_VALUE_TARGETS = ['damage', 'guard', 'healing'] as const;

export type CombatValueTarget = (typeof COMBAT_VALUE_TARGETS)[number];

export type EquipmentGrant =
  | { type: 'combat.action.available'; actionId: string }
  | { type: 'combat.value.modify'; target: CombatValueTarget; amount: number };

export const CONSUMABLE_USE_TYPES = ['combat.heal', 'need.restore'] as const;

export type ConsumableUseType = (typeof CONSUMABLE_USE_TYPES)[number];

export const RESTORABLE_NEEDS = ['fome', 'sede'] as const;

export type RestorableNeed = (typeof RESTORABLE_NEEDS)[number];

export type ConsumableUseDefinition =
  | { type: 'combat.heal'; amount: number }
  | { type: 'need.restore'; need: RestorableNeed; amount: number };

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  kind: ItemKind;
  stackLimit: number;
  tags: readonly string[];
}

export interface MaterialDefinition extends ItemDefinition {
  kind: 'material';
}

export interface EquipmentDefinition extends ItemDefinition {
  kind: 'equipment';
  slot: EquipmentSlot;
  grants: readonly EquipmentGrant[];
}

export interface ConsumableDefinition extends ItemDefinition {
  kind: 'consumable';
  use: ConsumableUseDefinition;
}

export type CatalogItemDefinition = MaterialDefinition | EquipmentDefinition | ConsumableDefinition;

export interface ItemsCatalog {
  items: readonly CatalogItemDefinition[];
}

export interface IndexedItems {
  readonly items: readonly CatalogItemDefinition[];
  readonly byId: ReadonlyMap<string, CatalogItemDefinition>;
  readonly equipmentById: ReadonlyMap<string, EquipmentDefinition>;
  readonly consumableById: ReadonlyMap<string, ConsumableDefinition>;
}

export interface PreparationSlotState {
  index: number;
  itemId: string | null;
}

export interface PreparationState {
  slots: readonly PreparationSlotState[];
}

export interface EquipmentState {
  'main-hand': string | null;
  body: string | null;
  accessory: string | null;
}

export interface ItemsState {
  equipment: EquipmentState;
  preparation: PreparationState;
}

export const PREPARATION_SLOT_COUNT = 2;

export type ItemsInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
