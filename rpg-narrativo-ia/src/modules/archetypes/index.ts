import catalogJson from '../../../content/first-day/system/archetypes.json' with { type: 'json' };
import type { InventoryItem } from '../../core/state/types';
import { inspectImageReference, type ImageReference } from '../../core/events';
import { ACTION_POSES, INITIAL_COMBAT, type ActionPose, type IndexedCombat } from '../combat';
import { addItem } from '../inventory';
import { INITIAL_ITEMS, copyItemsState, type IndexedItems, type ItemsState } from '../items';

/**
 * Arquétipos de aprendiz: a identidade escolhida na criação do personagem. Um arquétipo não
 * trava técnicas — ele define o equipamento de assinatura que o Desperto já traz, a técnica que
 * esse equipamento concede, a pose da silhueta e a paleta. Tudo vem do pack.
 */
export interface ArchetypeDefinition {
  id: string;
  name: string;
  summary: string;
  description: string;
  pose: ActionPose;
  /** Adereço que a silhueta do arquétipo carrega. */
  prop: ArchetypeProp;
  palette: { primary: string; secondary: string };
  startingItems: { itemId: string; quantity: number }[];
  equip: string[];
  signatureActionIds: string[];
  /** Arte opcional da carta (gerada por IA, por exemplo); sem ela, a silhueta aparece. */
  image?: ImageReference;
}

export const ARCHETYPE_PROPS = ['none', 'sword', 'dagger', 'bow', 'staff'] as const;

export type ArchetypeProp = (typeof ARCHETYPE_PROPS)[number];

export interface IndexedArchetypes {
  readonly archetypes: readonly ArchetypeDefinition[];
  readonly byId: ReadonlyMap<string, ArchetypeDefinition>;
}

export type ArchetypeInspection<T> = { ok: true; value: T } | { ok: false; reason: string };

export class ArchetypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArchetypeError';
  }
}

const COLOR = /^#[0-9a-f]{6}$/i;

export function inspectArchetypeCatalog(
  value: unknown,
  items: IndexedItems = INITIAL_ITEMS,
  combat: IndexedCombat = INITIAL_COMBAT,
): ArchetypeInspection<IndexedArchetypes> {
  if (!isRecord(value) || !Array.isArray(value.archetypes) || value.archetypes.length === 0 || value.archetypes.length > 32) {
    return fail('O catálogo de arquétipos é inválido.');
  }
  const archetypes: ArchetypeDefinition[] = [];
  const seen = new Set<string>();
  for (const entry of value.archetypes) {
    if (!isRecord(entry) || !nonEmpty(entry.id) || seen.has(entry.id) || !nonEmpty(entry.name) || !nonEmpty(entry.summary) || !nonEmpty(entry.description)) {
      return fail('Um arquétipo é inválido ou repetido.');
    }
    if (!(ACTION_POSES as readonly unknown[]).includes(entry.pose)) return fail(`A pose do arquétipo ${entry.id} é inválida.`);
    if (!(ARCHETYPE_PROPS as readonly unknown[]).includes(entry.prop)) return fail(`O adereço do arquétipo ${entry.id} é inválido.`);
    if (!isRecord(entry.palette) || !COLOR.test(String(entry.palette.primary)) || !COLOR.test(String(entry.palette.secondary))) {
      return fail(`A paleta do arquétipo ${entry.id} é inválida.`);
    }
    if (!Array.isArray(entry.startingItems) || !Array.isArray(entry.equip) || !Array.isArray(entry.signatureActionIds)) {
      return fail(`O arquétipo ${entry.id} está incompleto.`);
    }
    const image = entry.image === undefined ? undefined : inspectImageReference(entry.image);
    if (entry.image !== undefined && !image) return fail(`A imagem do arquétipo ${entry.id} é inválida.`);
    const startingItems: { itemId: string; quantity: number }[] = [];
    for (const item of entry.startingItems) {
      if (!isRecord(item) || !nonEmpty(item.itemId) || !items.byId.has(item.itemId) || !Number.isSafeInteger(item.quantity) || (item.quantity as number) < 1 || (item.quantity as number) > 10) {
        return fail(`O arquétipo ${entry.id} traz um item inicial inválido.`);
      }
      startingItems.push({ itemId: item.itemId, quantity: item.quantity as number });
    }
    const equip: string[] = [];
    const granted = new Set<string>();
    for (const itemId of entry.equip) {
      const equipment = nonEmpty(itemId) ? items.equipmentById.get(itemId) : undefined;
      if (!equipment || !startingItems.some((item) => item.itemId === itemId)) {
        return fail(`O arquétipo ${entry.id} equipa algo que não traz.`);
      }
      equip.push(itemId);
      for (const grant of equipment.grants) {
        if (grant.type === 'combat.action.available') granted.add(grant.actionId);
      }
    }
    const signatureActionIds: string[] = [];
    for (const actionId of entry.signatureActionIds) {
      if (!nonEmpty(actionId) || !combat.actionById.has(actionId) || !granted.has(actionId)) {
        return fail(`A técnica de assinatura de ${entry.id} precisa vir do equipamento inicial.`);
      }
      signatureActionIds.push(actionId);
    }
    seen.add(entry.id);
    archetypes.push({
      id: entry.id,
      name: entry.name,
      summary: entry.summary,
      description: entry.description,
      pose: entry.pose as ActionPose,
      prop: entry.prop as ArchetypeProp,
      palette: { primary: String(entry.palette.primary), secondary: String(entry.palette.secondary) },
      startingItems,
      equip,
      signatureActionIds,
      ...(image ? { image } : {}),
    });
  }
  return { ok: true, value: freeze(archetypes) };
}

export function indexArchetypeCatalog(value: unknown, items?: IndexedItems, combat?: IndexedCombat): IndexedArchetypes {
  const inspected = inspectArchetypeCatalog(value, items, combat);
  if (!inspected.ok) throw new ArchetypeError(inspected.reason);
  return inspected.value;
}

export const INITIAL_ARCHETYPES = indexArchetypeCatalog(catalogJson);

/** Técnicas de assinatura que o arquétipo leva (também para o Selo do Eco). */
export function archetypeSignatureActions(catalog: IndexedArchetypes, archetypeId: string | undefined): string[] {
  return archetypeId ? [...(catalog.byId.get(archetypeId)?.signatureActionIds ?? [])] : [];
}

/** Aplica o equipamento e os itens iniciais do arquétipo ao começo da partida. */
export function applyArchetypeStart(
  catalog: IndexedArchetypes,
  archetypeId: string,
  inventory: InventoryItem[],
  itemsState: ItemsState,
  items: IndexedItems = INITIAL_ITEMS,
): { inventory: InventoryItem[]; items: ItemsState } {
  const archetype = catalog.byId.get(archetypeId);
  if (!archetype) throw new ArchetypeError('O arquétipo escolhido não existe.');
  let nextInventory = inventory;
  for (const item of archetype.startingItems) nextInventory = addItem(nextInventory, item.itemId, item.quantity);
  const nextItems = copyItemsState(itemsState);
  for (const itemId of archetype.equip) {
    const equipment = items.equipmentById.get(itemId);
    if (equipment) nextItems.equipment[equipment.slot] = itemId;
  }
  return { inventory: nextInventory, items: nextItems };
}

function freeze(archetypes: ArchetypeDefinition[]): IndexedArchetypes {
  const frozen = Object.freeze(archetypes.map((entry) => Object.freeze({ ...entry })));
  return Object.freeze({ archetypes: frozen, byId: new Map(frozen.map((entry) => [entry.id, entry])) });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}
