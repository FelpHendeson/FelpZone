import { inspectBondCatalog, INITIAL_BONDS } from '../bonds';
import { inspectOrganizationCatalog, INITIAL_ORGANIZATIONS } from '../organizations';
import { inspectCalendarCatalog, INITIAL_CALENDAR } from '../calendar';
import { inspectFamilyCatalog, INITIAL_FAMILY } from '../family';
import { inspectCivicCatalog, INITIAL_CIVIC } from '../civic';
import { inspectEconomyCatalog, INITIAL_ECONOMY } from '../economy';
import { inspectSettlementsCatalog, INITIAL_SETTLEMENTS } from '../settlements';
import { inspectPoliticsCatalog, INITIAL_POLITICS } from '../politics';
import { inspectRegistryCatalog, INITIAL_REGISTRY } from '../registry';
import { inspectExecutionCatalog, INITIAL_EXECUTION } from '../execution';
import { inspectPartyCatalog, INITIAL_PARTY } from '../party';
import { inspectCraftingDefinitions } from '../crafting';
import { inspectExplorationDefinitions } from '../exploration';
import { inspectInteractableCatalog } from '../interactables';
import { inspectItemsCatalog } from '../items';
import { inspectNavigationMap } from '../navigation';
import { inspectNpcCatalog } from '../npcs';
import { inspectObjectiveCatalog } from '../objectives';
import { inspectPresenceCatalog, inspectPresenceInteractionCatalog } from '../presences';
import { inspectResourceDefinitions } from '../resources';
import { inspectWorldTriggerCatalog } from '../world-events';
import { firstDayCampaign } from '../../campaigns/first-day';
import type { Campaign } from '../../core/events';
import type { SandboxContext, SandboxContextInspection } from './types';

export function inspectSandboxContext(value: unknown): SandboxContextInspection {
  if (!isRecord(value)) {
    return fail('O contexto do sandbox é inválido.');
  }

  if (typeof value.startingLocationId !== 'string' || value.startingLocationId.trim() === '') {
    return fail('A localização inicial não existe.');
  }

  if (!isRecord(value.map) || !isRecord(value.map.root)) {
    return fail('O mapa indexado é inválido.');
  }

  const map = inspectNavigationMap(value.map.root, value.startingLocationId);
  if (!map.ok) {
    return fail(map.reason);
  }

  if (!map.value.locations.has(value.startingLocationId)) {
    return fail('A localização inicial não existe.');
  }

  if (!isRecord(value.exploration) || !Array.isArray(value.exploration.definitions)) {
    return fail('As definições de exploração são inválidas.');
  }

  const exploration = inspectExplorationDefinitions(value.exploration.definitions, map.value);
  if (!exploration.ok) {
    return fail(exploration.reason);
  }

  if (!isRecord(value.resources) || !Array.isArray(value.resources.nodes) || !Array.isArray(value.resources.populations)) {
    return fail('As definições de recursos são inválidas.');
  }

  const resources = inspectResourceDefinitions(
    value.resources.nodes,
    value.resources.populations,
    map.value,
    exploration.value,
  );
  if (!resources.ok) {
    return fail(resources.reason);
  }

  if (!isRecord(value.crafting) || !Array.isArray(value.crafting.recipes) || !Array.isArray(value.crafting.structures)) {
    return fail('As definições de crafting são inválidas.');
  }

  const items = value.items === undefined ? undefined : inspectItemsCatalog(value.items);
  if (items && !items.ok) {
    return fail(items.reason);
  }

  const crafting = inspectCraftingDefinitions(value.crafting.recipes, value.crafting.structures, items?.value);
  if (!crafting.ok) {
    return fail(crafting.reason);
  }

  if (!isRecord(value.presences) || !Array.isArray(value.presences.entities) || !Array.isArray(value.presences.presences)) {
    return fail('O catálogo de presenças é inválido.');
  }

  const presences = inspectPresenceCatalog(
    { entities: value.presences.entities, presences: value.presences.presences },
    map.value,
    exploration.value,
  );
  if (!presences.ok) {
    return fail(presences.reason);
  }

  if (!isRecord(value.presenceInteractions) || !Array.isArray(value.presenceInteractions.interactions)) {
    return fail('O catálogo de interações é inválido.');
  }

  const campaign = inspectCampaign(value.campaign);
  if (!campaign.ok) {
    return fail(campaign.reason);
  }

  const presenceInteractions = inspectPresenceInteractionCatalog(
    { interactions: value.presenceInteractions.interactions },
    presences.value,
    campaign.value,
  );
  if (!presenceInteractions.ok) {
    return fail(presenceInteractions.reason);
  }

  const context: SandboxContext = {
    startingLocationId: value.startingLocationId,
    map: map.value,
    exploration: exploration.value,
    resources: resources.value,
    crafting: crafting.value,
    presences: presences.value,
    presenceInteractions: presenceInteractions.value,
    campaign: campaign.value,
  };

  if (value.interactables !== undefined) {
    const interactables = inspectInteractableCatalog(value.interactables, map.value, exploration.value, items?.value);
    if (!interactables.ok) {
      return fail(interactables.reason);
    }
    context.interactables = interactables.value;
  } else {
    const interactables = inspectInteractableCatalog(
      { interactables: [], actions: [] },
      map.value,
      exploration.value,
      items?.value,
    );
    if (!interactables.ok) {
      return fail(interactables.reason);
    }
    context.interactables = interactables.value;
  }

  if (value.bonds !== undefined) {
    const bonds = inspectBondCatalog(value.bonds);
    if (!bonds.ok) {
      return fail(bonds.reason);
    }
    context.bonds = bonds.value;
  } else {
    context.bonds = INITIAL_BONDS;
  }

  if (value.organizations !== undefined) {
    const organizations = inspectOrganizationCatalog(value.organizations);
    if (!organizations.ok) {
      return fail(organizations.reason);
    }
    context.organizations = organizations.value;
  } else {
    context.organizations = INITIAL_ORGANIZATIONS;
  }

  if (value.calendar !== undefined) {
    const calendar = inspectCalendarCatalog(value.calendar);
    if (!calendar.ok) {
      return fail(calendar.reason);
    }
    context.calendar = calendar.value;
  } else {
    context.calendar = INITIAL_CALENDAR;
  }

  if (value.family !== undefined) {
    const family = inspectFamilyCatalog(value.family);
    if (!family.ok) {
      return fail(family.reason);
    }
    context.family = family.value;
  } else {
    context.family = INITIAL_FAMILY;
  }

  if (value.civic !== undefined) {
    const civic = inspectCivicCatalog(value.civic);
    if (!civic.ok) {
      return fail(civic.reason);
    }
    context.civic = civic.value;
  } else {
    context.civic = INITIAL_CIVIC;
  }

  if (value.economy !== undefined) {
    const economy = inspectEconomyCatalog(value.economy);
    if (!economy.ok) {
      return fail(economy.reason);
    }
    context.economy = economy.value;
  } else {
    context.economy = INITIAL_ECONOMY;
  }

  if (value.settlements !== undefined) {
    const settlements = inspectSettlementsCatalog(value.settlements);
    if (!settlements.ok) {
      return fail(settlements.reason);
    }
    context.settlements = settlements.value;
  } else {
    context.settlements = INITIAL_SETTLEMENTS;
  }

  if (value.politics !== undefined) {
    const politics = inspectPoliticsCatalog(value.politics);
    if (!politics.ok) {
      return fail(politics.reason);
    }
    context.politics = politics.value;
  } else {
    context.politics = INITIAL_POLITICS;
  }

  if (value.registry !== undefined) {
    const registry = inspectRegistryCatalog(value.registry);
    if (!registry.ok) {
      return fail(registry.reason);
    }
    context.registry = registry.value;
  } else {
    context.registry = INITIAL_REGISTRY;
  }

  if (value.execution !== undefined) {
    const execution = inspectExecutionCatalog(value.execution);
    if (!execution.ok) {
      return fail(execution.reason);
    }
    context.execution = execution.value;
  } else {
    context.execution = INITIAL_EXECUTION;
  }

  if (value.party !== undefined) {
    const party = inspectPartyCatalog(value.party);
    if (!party.ok) {
      return fail(party.reason);
    }
    context.party = party.value;
  } else {
    context.party = INITIAL_PARTY;
  }

  if (value.npcs !== undefined) {
    const npcs = inspectNpcCatalog(value.npcs, new Set(map.value.locations.keys()));
    if (!npcs.ok) {
      return fail(npcs.reason);
    }
    context.npcs = npcs.value;
  }
  if (items) {
    context.items = items.value;
  }
  if (value.objectives !== undefined) {
    const objectives = inspectObjectiveCatalog(value.objectives);
    if (!objectives.ok) {
      return fail(objectives.reason);
    }
    context.objectives = objectives.value;
  }
  if (value.worldTriggers !== undefined) {
    if (!isRecord(value.worldTriggers) || !Array.isArray(value.worldTriggers.definitions)) {
      return fail('O catálogo de gatilhos narrativos é inválido.');
    }
    const worldTriggers = inspectWorldTriggerCatalog(value.worldTriggers.definitions, {
      campaign: campaign.value,
      exploration: exploration.value,
    });
    if (!worldTriggers.ok) {
      return fail(worldTriggers.reason);
    }
    context.worldTriggers = worldTriggers.value;
  }
  if (value.stationLabels !== undefined && !isRecord(value.stationLabels)) {
    return fail('Os rótulos de estação são inválidos.');
  }
  if (isRecord(value.stationLabels)) {
    const stations: Record<string, string> = {};
    for (const [key, label] of Object.entries(value.stationLabels)) {
      if (key.trim() === '' || typeof label !== 'string' || label.trim() === '') {
        return fail('Os rótulos de estação são inválidos.');
      }
      stations[key] = label;
    }
    context.stationLabels = Object.freeze(stations);
  }

  return { ok: true, value: context };
}

function inspectCampaign(value: unknown): { ok: true; value: Campaign } | { ok: false; reason: string } {
  if (value === undefined) {
    return { ok: true, value: firstDayCampaign };
  }
  if (
    !isRecord(value) ||
    !nonEmpty(value.id) ||
    !nonEmpty(value.title) ||
    !nonEmpty(value.firstEventId) ||
    !Array.isArray(value.events) ||
    value.events.length > 2_048 ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.abilities) ||
    !Array.isArray(value.npcs) ||
    !Array.isArray(value.titles)
  ) {
    return { ok: false, reason: 'A campanha do sandbox é inválida.' };
  }
  const eventIds = new Set<string>();
  for (const event of value.events) {
    if (
      !isRecord(event) ||
      !nonEmpty(event.id) ||
      eventIds.has(event.id) ||
      !nonEmpty(event.title) ||
      !nonEmpty(event.body) ||
      !Array.isArray(event.choices) ||
      event.choices.length > 256
    ) {
      return { ok: false, reason: 'A campanha do sandbox é inválida.' };
    }
    const choiceIds = new Set<string>();
    for (const choice of event.choices) {
      if (
        !isRecord(choice) ||
        !nonEmpty(choice.id) ||
        choiceIds.has(choice.id) ||
        !nonEmpty(choice.label) ||
        !isRecord(choice.transition) ||
        !Array.isArray(choice.effects)
      ) {
        return { ok: false, reason: 'A campanha do sandbox é inválida.' };
      }
      choiceIds.add(choice.id);
    }
    eventIds.add(event.id);
  }
  if (!eventIds.has(value.firstEventId)) {
    return { ok: false, reason: 'A campanha do sandbox é inválida.' };
  }
  return { ok: true, value: value as unknown as Campaign };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function fail(reason: string): SandboxContextInspection {
  return { ok: false, reason };
}
