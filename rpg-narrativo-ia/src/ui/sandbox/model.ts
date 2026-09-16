import type { Campaign, ImageKind } from '../../core/events';
import type { GameState, InventoryItem } from '../../core/state';
import { findAbility } from '../../campaigns/first-day';
import { fullName } from '../../modules/character';
import {
  MAX_EXPLORATION_PROGRESS,
  canExploreLocation,
  getLocationExploration,
} from '../../modules/exploration';
import {
  getCurrentLocation,
  listVisibleDestinations,
  type LocationRelation,
} from '../../modules/navigation';
import {
  listKnownPresenceInteractions,
  listKnownPresencesAtLocation,
  type PresenceInteractionKind,
  type VisiblePresenceStatus,
  type WorldEntityKind,
} from '../../modules/presences';
import {
  getCollectionCost,
  getPopulationStatus,
  inspectResourceAccess,
} from '../../modules/resources';
import { inspectRecipeAccess } from '../../modules/crafting';
import {
  EQUIPMENT_SLOTS,
  INITIAL_ITEMS,
  availableQuantity,
  type EquipmentSlot,
  type ItemKind,
} from '../../modules/items';
import { INITIAL_CONDITIONS } from '../../modules/conditions';
import { INITIAL_NPCS, deriveNpcAt, type DerivedNpcView } from '../../modules/npcs';
import {
  INITIAL_CONSUMABLES,
  planNeedsConsumption,
  planNeedsRest,
  type NeedId,
  type RestMode,
} from '../../modules/needs';
import type { SandboxContext } from '../../modules/sandbox';
import { describeWorld } from '../../modules/world';
import { sandboxItemName, sandboxStationName } from './labels';
import { attributesToNeedsSnapshot, buildNeedsPresentation, type NeedPresentation } from '../needs/presentation';

export interface NeedEffectView {
  needId: NeedId;
  amount: number;
  limited: boolean;
}

export interface DestinationView {
  locationId: string;
  name: string;
  relation?: LocationRelation;
  relationLabel?: string;
  costPeriods: number;
  accessible: boolean;
  blockedReason?: string;
}

export interface ResourceView {
  nodeId: string;
  name: string;
  availableUnits: number;
  maxCollectable: number;
  yields: Array<{ itemId: string; name: string; quantityPerUnit: number }>;
  costPeriods: number;
  collectable: boolean;
  blockedReason?: string;
}

export interface RecipeView {
  recipeId: string;
  name: string;
  ingredients: Array<{ itemId: string; name: string; quantity: number }>;
  products: Array<{ itemId: string; name: string; quantity: number }>;
  structureName?: string;
  stationTags: string[];
  costPeriods: number;
  craftable: boolean;
  blockedReason?: string;
}

export interface InventoryViewItem {
  itemId: string;
  name: string;
  quantity: number;
  kind: ItemKind | 'unknown';
  description?: string;
  consumable: boolean;
  canEquip: boolean;
  canPrepare: boolean;
  equipped: boolean;
  preparedSlots: number[];
  effects: NeedEffectView[];
}

export interface EquipmentSlotView {
  slot: EquipmentSlot;
  label: string;
  itemId: string | null;
  itemName: string | null;
}

export interface PreparationSlotView {
  index: number;
  itemId: string | null;
  itemName: string | null;
}

export interface LingeringView {
  conditionId: string;
  name: string;
  remainingPeriods: number;
}

export interface RestView {
  mode: RestMode;
  label: string;
  description: string;
  costPeriods: number;
  effects: NeedEffectView[];
  recommended: boolean;
}

export interface PresenceInteractionView {
  interactionId: string;
  kind: PresenceInteractionKind;
  label: string;
  hint?: string;
  costPeriods: number;
  available: boolean;
  blockedReason?: string;
}

export interface PresenceView {
  presenceId: string;
  entityId: string;
  kind: WorldEntityKind;
  kindLabel: string;
  kindSymbol: string;
  name: string;
  description: string;
  imageKind: ImageKind;
  imageLabel: string;
  status: VisiblePresenceStatus;
  statusLabel: string;
  trust?: number;
  hint?: string;
  interactions: PresenceInteractionView[];
}

export interface ExplorationView {
  characterName: string;
  worldLabel: string;
  abilityName: string;
  location: {
    id: string;
    name: string;
    description: string;
    imageLabel: string;
    progress: number;
    canExplore: boolean;
    exploreDisabledReason?: string;
    exploreCostPeriods: number;
  };
  destinations: DestinationView[];
  resources: ResourceView[];
  recipes: RecipeView[];
  inventory: InventoryViewItem[];
  equipment: EquipmentSlotView[];
  preparation: PreparationSlotView[];
  lingering: LingeringView[];
  knownNpcs: DerivedNpcView[];
  presences: PresenceView[];
  needs: NeedPresentation[];
  rest: RestView;
}

const RELATION_LABELS: Record<LocationRelation, string> = {
  parent: 'Região',
  sibling: 'Próximo',
  child: 'Interior',
};

const ENTITY_KIND_PRESENTATION: Record<WorldEntityKind, { label: string; symbol: string }> = {
  npc: { label: 'NPC', symbol: '♙' },
  animal: { label: 'Animal', symbol: '♧' },
  creature: { label: 'Criatura', symbol: '◈' },
};

const PRESENCE_STATUS_LABELS: Record<VisiblePresenceStatus, string> = {
  available: 'Disponível',
  unavailable: 'Indisponível',
  resolved: 'Resolvida',
};

export function buildExplorationView(
  state: GameState,
  campaign: Campaign,
  context: SandboxContext,
): ExplorationView {
  const location = getCurrentLocation(context.map, state.sandbox.navigation);
  const exploration = getLocationExploration(state.sandbox.exploration, location.id);
  const definition = context.exploration.byLocation.get(location.id);
  const hasDefinition = canExploreLocation(
    context.map,
    state.sandbox.navigation,
    context.exploration,
    location.id,
  );
  const complete = exploration.progress >= MAX_EXPLORATION_PROGRESS;
  const abilityId = state.progression.abilityIds[0];
  const ability = abilityId ? findAbility(campaign, abilityId) : undefined;

  return {
    characterName: fullName(state.character),
    worldLabel: describeWorld(state.world),
    abilityName: ability?.name ?? 'Nenhuma',
    location: {
      id: location.id,
      name: location.name,
      description: location.description ?? '',
      imageLabel: location.image?.label ?? location.name,
      progress: exploration.progress,
      canExplore: hasDefinition && !complete,
      exploreDisabledReason: exploreDisabledReason(hasDefinition, complete),
      exploreCostPeriods: definition?.timeCost.periods ?? 0,
    },
    destinations: listVisibleDestinations(context.map, state.sandbox.navigation, state).map((destination) => ({
      locationId: destination.location.id,
      name: destination.location.name,
      relation: destination.relation,
      relationLabel: RELATION_LABELS[destination.relation],
      costPeriods: destination.travelCost.periods,
      accessible: destination.accessible,
      blockedReason: destination.blockedReason,
    })),
    resources: visibleResources(state, context, location.id),
    recipes: visibleRecipes(state, context),
    inventory: copyInventory(state.inventory, state),
    equipment: EQUIPMENT_SLOTS.map((slot) => {
      const itemId = state.items.equipment[slot];
      return {
        slot,
        label: EQUIPMENT_SLOT_LABELS[slot],
        itemId,
        itemName: itemId ? sandboxItemName(itemId) : null,
      };
    }),
    preparation: state.items.preparation.slots.map((slot) => ({
      index: slot.index,
      itemId: slot.itemId,
      itemName: slot.itemId ? sandboxItemName(slot.itemId) : null,
    })),
    lingering: state.lingering.entries.map((entry) => ({
      conditionId: entry.conditionId,
      name: INITIAL_CONDITIONS.conditionById.get(entry.conditionId)?.name ?? entry.conditionId,
      remainingPeriods: entry.remainingPeriods,
    })),
    knownNpcs: visibleNpcs(state),
    presences: visiblePresences(state, context, location.id),
    needs: buildNeedsPresentation(state.attributes),
    rest: buildRestView(state, location.id),
  };
}

function exploreDisabledReason(hasDefinition: boolean, complete: boolean): string | undefined {
  if (!hasDefinition) {
    return 'Não há o que explorar neste local.';
  }

  if (complete) {
    return 'Este local já foi completamente explorado.';
  }

  return undefined;
}

function visibleResources(state: GameState, context: SandboxContext, locationId: string): ResourceView[] {
  const exploration = getLocationExploration(state.sandbox.exploration, locationId);
  const views: ResourceView[] = [];

  for (const node of context.resources.nodes) {
    if (node.locationId !== locationId) {
      continue;
    }

    if (!exploration.revealedDiscoveryIds.includes(node.discoveryId)) {
      continue;
    }

    const access = inspectResourceAccess(
      context.map,
      state.sandbox.navigation,
      context.exploration,
      state.sandbox.exploration,
      context.resources,
      state.sandbox.resources,
      node.id,
      state,
    );
    const populationId =
      node.renewal.type === 'population' ? node.renewal.populationId : undefined;
    const pressure =
      populationId !== undefined
        ? getPopulationStatus(context.resources, state.sandbox.resources, populationId)
        : undefined;

    views.push({
      nodeId: node.id,
      name: node.name,
      availableUnits: access.availableUnits,
      maxCollectable: access.maxCollectable,
      yields: node.yields.map((entry) => ({
        itemId: entry.itemId,
        name: sandboxItemName(entry.itemId),
        quantityPerUnit: entry.quantityPerUnit,
      })),
      costPeriods: getCollectionCost(context.resources, node.id).periods,
      collectable: access.collectable,
      blockedReason: resourceBlockedReason(access.blockedReason, pressure),
    });
  }

  return views;
}

function resourceBlockedReason(
  reason: string | undefined,
  pressure: ReturnType<typeof getPopulationStatus> | undefined,
): string | undefined {
  if (reason) {
    return reason;
  }

  if (pressure === 'declining') {
    return 'A população local está sob pressão.';
  }

  if (pressure === 'threatened') {
    return 'A população local está ameaçada.';
  }

  return undefined;
}

function visibleRecipes(state: GameState, context: SandboxContext): RecipeView[] {
  const views: RecipeView[] = [];

  for (const recipeId of state.sandbox.crafting.knownRecipeIds) {
    const recipe = context.crafting.byRecipe.get(recipeId);
    if (!recipe) {
      continue;
    }

    const access = inspectRecipeAccess(
      context.map,
      state.sandbox.navigation,
      context.crafting,
      state.sandbox.crafting,
      state.inventory,
      recipe.id,
      state,
    );
    const structure = recipe.createsStructureId
      ? context.crafting.byStructure.get(recipe.createsStructureId)
      : undefined;

    views.push({
      recipeId: recipe.id,
      name: recipe.name,
      ingredients: recipe.inputs.map((entry) => ({
        itemId: entry.itemId,
        name: sandboxItemName(entry.itemId),
        quantity: entry.quantity,
      })),
      products: (recipe.outputs ?? []).map((entry) => ({
        itemId: entry.itemId,
        name: sandboxItemName(entry.itemId),
        quantity: entry.quantity,
      })),
      structureName: structure?.name,
      stationTags: (recipe.requiredStationTags ?? []).map(sandboxStationName),
      costPeriods: access.timeCost.periods,
      craftable: access.craftable,
      blockedReason: access.blockedReason,
    });
  }

  return views;
}

const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  'main-hand': 'Mão',
  body: 'Corpo',
  accessory: 'Acessório',
};

function copyInventory(items: readonly InventoryItem[], state: GameState): InventoryViewItem[] {
  const snapshot = attributesToNeedsSnapshot(state.attributes);
  return items.map((item) => {
    const definition = INITIAL_ITEMS.byId.get(item.itemId);
    const equipped = EQUIPMENT_SLOTS.some((slot) => state.items.equipment[slot] === item.itemId);
    const preparedSlots = state.items.preparation.slots
      .filter((slot) => slot.itemId === item.itemId)
      .map((slot) => slot.index);
    const canEquip = definition?.kind === 'equipment' && availableQuantity(items, state.items, item.itemId) > 0;
    const canPrepare =
      definition?.kind === 'consumable' &&
      definition.use.type === 'combat.heal' &&
      availableQuantity(items, state.items, item.itemId) > 0;
    return {
      itemId: item.itemId,
      name: sandboxItemName(item.itemId),
      quantity: item.quantity,
      kind: definition?.kind ?? 'unknown',
      description: definition?.description,
      consumable: INITIAL_CONSUMABLES.byItemId.has(item.itemId),
      canEquip: Boolean(canEquip),
      canPrepare: Boolean(canPrepare),
      equipped,
      preparedSlots,
      effects: INITIAL_CONSUMABLES.byItemId.has(item.itemId)
        ? planNeedsConsumption(snapshot, item.itemId).appliedEffects.map(copyNeedEffect)
        : [],
    };
  });
}

function visibleNpcs(state: GameState): DerivedNpcView[] {
  const discovered = new Set(state.sandbox.navigation.discoveredLocationIds);
  const views: DerivedNpcView[] = [];
  for (const npc of INITIAL_NPCS.npcs) {
    const view = deriveNpcAt(INITIAL_NPCS, state.sandbox.npcs, npc.id, state.world.period, (locationId) =>
      discovered.has(locationId),
    );
    if (view) {
      views.push(view);
    }
  }
  return views;
}

function buildRestView(state: GameState, locationId: string): RestView {
  const campfireAvailable = state.sandbox.crafting.structures.some(
    (structure) =>
      structure.structureId === 'campfire' && structure.locationId === locationId && structure.active,
  );
  const mode: RestMode = campfireAvailable ? 'campfire' : 'simple';
  const plan = planNeedsRest(attributesToNeedsSnapshot(state.attributes), mode);
  const energy = buildNeedsPresentation(state.attributes).find((need) => need.id === 'energia');

  return {
    mode,
    label: campfireAvailable ? 'Repousar junto à fogueira' : 'Repousar',
    description: campfireAvailable
      ? 'A fogueira ativa melhora o descanso e permite recuperar um pouco de saúde.'
      : 'Recupere energia em qualquer local. Uma fogueira ativa torna o repouso mais eficiente.',
    costPeriods: plan.timeCost.periods,
    effects: plan.appliedEffects.map(copyNeedEffect),
    recommended: energy?.band === 'urgent' || energy?.band === 'critical',
  };
}

function copyNeedEffect(effect: { needId: NeedId; amount: number; limited: boolean }): NeedEffectView {
  return { needId: effect.needId, amount: effect.amount, limited: effect.limited };
}

function visiblePresences(state: GameState, context: SandboxContext, locationId: string): PresenceView[] {
  return listKnownPresencesAtLocation(
    context.presences,
    state.sandbox.presences,
    locationId,
    state,
  ).map((known) => {
    const kindPresentation = ENTITY_KIND_PRESENTATION[known.entity.kind];
    const relationship = state.relationships.find((entry) => entry.characterId === known.entity.id);
    const view: PresenceView = {
      presenceId: known.presence.id,
      entityId: known.entity.id,
      kind: known.entity.kind,
      kindLabel: kindPresentation.label,
      kindSymbol: kindPresentation.symbol,
      name: known.entity.name,
      description: known.entity.description,
      imageKind: known.entity.image?.kind ?? (known.entity.kind === 'npc' ? 'portrait' : 'icon'),
      imageLabel: known.entity.image?.label ?? known.entity.name,
      status: known.status,
      statusLabel: PRESENCE_STATUS_LABELS[known.status],
      hint:
        known.entity.id === 'mira-vale'
          ? visibleNpcs(state).find((npc) => npc.npcId === 'mira-vale' && npc.locationId === locationId)?.hint
          : undefined,
      interactions: listKnownPresenceInteractions(
        context.presences,
        context.presenceInteractions,
        state.sandbox.presences,
        known.presence.id,
        locationId,
        state,
      ).map((knownInteraction) => {
        const interactionView: PresenceInteractionView = {
          interactionId: knownInteraction.interaction.id,
          kind: knownInteraction.interaction.kind,
          label: knownInteraction.interaction.label,
          costPeriods: knownInteraction.interaction.timeCost.periods,
          available: knownInteraction.available,
        };

        if (knownInteraction.interaction.hint) {
          interactionView.hint = knownInteraction.interaction.hint;
        }

        if (knownInteraction.blockedReason) {
          interactionView.blockedReason = knownInteraction.blockedReason;
        }

        return interactionView;
      }),
    };

    if (relationship) {
      view.trust = relationship.trust;
    }

    return view;
  });
}
