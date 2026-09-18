import { inspectCombatCatalog, validateEncounterDiscoveries } from '../combat';
import { inspectConditionsCatalog } from '../conditions';
import { inspectCraftingDefinitions } from '../crafting';
import { inspectEnergeticsCatalog } from '../energetics';
import { inspectExplorationDefinitions } from '../exploration';
import { inspectExecutionCatalog, validateExecutionReferences } from '../execution';
import { inspectGardenCatalog } from '../garden';
import { inspectItemsCatalog } from '../items';
import { inspectMasteryCatalog, validateMasteryReferences } from '../mastery';
import { inspectNavigationMap } from '../navigation';
import { inspectNpcCatalog } from '../npcs';
import { inspectObjectiveCatalog } from '../objectives';
import { inspectBondCatalog } from '../bonds';
import { inspectOrganizationCatalog } from '../organizations';
import { inspectPartyCatalog } from '../party';
import { inspectCalendarCatalog } from '../calendar';
import { inspectFamilyCatalog } from '../family';
import { inspectCivicCatalog } from '../civic';
import { inspectEconomyCatalog } from '../economy';
import { inspectSettlementsCatalog } from '../settlements';
import { inspectPoliticsCatalog } from '../politics';
import { inspectRegistryCatalog } from '../registry';
import { inspectInteractableCatalog } from '../interactables';
import { inspectPresenceCatalog, inspectPresenceInteractionCatalog } from '../presences';
import { inspectResourceDefinitions } from '../resources';
import { inspectSkillsCatalog, type IndexedSkills } from '../skills';
import { inspectTrainingCatalog } from '../training';
import { inspectWorldTriggerCatalog } from '../world-events';
import { ContentError } from './errors';
import { inspectCampaignDocument } from './inspect-campaign';
import type { IndexedWorld } from './types';

export function composeSkills(raw: unknown): IndexedSkills {
  return unwrap(inspectSkillsCatalog(raw), 'O catálogo de habilidades é inválido.');
}

export function composeWorld(raw: unknown, sourceId = 'memory'): IndexedWorld {
  if (!isRecord(raw)) {
    throw new ContentError('O pack de mundo é inválido.');
  }
  if (!nonEmpty(raw.id) || !nonEmpty(raw.startingLocationId)) {
    throw new ContentError('O pack de mundo é inválido.');
  }

  try {
    const energetics = unwrap(inspectEnergeticsCatalog(raw.energetics), 'O catálogo de energéticos é inválido.');
    const skills = composeSkills(raw.skills);
    const training = unwrap(inspectTrainingCatalog(raw.training, skills), 'O catálogo de treinamentos é inválido.');
    const items = unwrap(inspectItemsCatalog(raw.items), 'O catálogo de itens é inválido.');
    const conditions = unwrap(inspectConditionsCatalog(raw.conditions), 'O catálogo de condições é inválido.');
    const execution = unwrap(inspectExecutionCatalog(raw.execution), 'O catálogo de execução é inválido.');
    const mastery = unwrap(inspectMasteryCatalog(raw.mastery), 'O catálogo de maestria é inválido.');
    const garden = unwrap(
      inspectGardenCatalog(raw.garden, skills, new Set(mastery.milestones.map((milestone) => milestone.id))),
      'O catálogo do Jardim é inválido.',
    );
    const combat = unwrap(inspectCombatCatalog(raw.combat, skills, items), 'O catálogo de combate é inválido.');
    const map = unwrap(inspectNavigationMap(raw.map, raw.startingLocationId), 'O mapa do pack é inválido.');
    if (!map.locations.has(raw.startingLocationId)) {
      throw new ContentError('A localização inicial não existe.');
    }
    const exploration = unwrap(
      inspectExplorationDefinitions(raw.exploration, map),
      'As definições de exploração são inválidas.',
    );
    validateEncounterDiscoveries(combat, new Set(exploration.byDiscovery.keys()));
    validateExecutionReferences(execution, new Set(skills.skills.map((skill) => skill.id)));
    validateMasteryReferences(mastery, {
      skillIds: new Set(skills.skills.map((skill) => skill.id)),
      trainingMethodIds: new Set(training.methods.map((method) => method.id)),
      encounterIds: new Set(combat.encounters.map((encounter) => encounter.id)),
    });
    const resources = unwrap(
      inspectResourceDefinitions(raw.resourceNodes, raw.populations, map, exploration),
      'As definições de recursos são inválidas.',
    );
    const crafting = unwrap(
      inspectCraftingDefinitions(raw.craftingRecipes, raw.craftingStructures, items),
      'As definições de crafting são inválidas.',
    );
    const presences = unwrap(
      inspectPresenceCatalog(raw.presences, map, exploration),
      'O catálogo de presenças é inválido.',
    );
    const campaign = inspectCampaignDocument(raw.campaign, raw.events);
    const presenceInteractions = unwrap(
      inspectPresenceInteractionCatalog(raw.presenceInteractions, presences, campaign),
      'O catálogo de interações é inválido.',
    );
    const interactables = unwrap(
      inspectInteractableCatalog(raw.interactables, map, exploration),
      'O catálogo de pontos de interesse é inválido.',
    );
    const bonds = unwrap(inspectBondCatalog(raw.bonds), 'O catálogo de relacionamentos é inválido.');
    const organizations = unwrap(inspectOrganizationCatalog(raw.organizations), 'O catálogo de organizações é inválido.');
    const registry = unwrap(inspectRegistryCatalog(raw.registry), 'O catálogo do Registro é inválido.');
    const npcs = unwrap(inspectNpcCatalog(raw.npcs, new Set(map.locations.keys())), 'O catálogo de NPCs é inválido.');
    const party = unwrap(inspectPartyCatalog(raw.party), 'O catálogo de party é inválido.');
    const calendar = unwrap(inspectCalendarCatalog(raw.calendar), 'O catálogo de calendário é inválido.');
    const family = unwrap(inspectFamilyCatalog(raw.family), 'O catálogo de família é inválido.');
    validateFamilyWorld(family, map, npcs);
    const civic = unwrap(inspectCivicCatalog(raw.civic), 'O catálogo cívico é inválido.');
    validateCivicWorld(civic, map, npcs);
    const economy = unwrap(inspectEconomyCatalog(raw.economy), 'O catálogo econômico é inválido.');
    validateEconomyWorld(economy, map, npcs, items);
    const settlements = unwrap(inspectSettlementsCatalog(raw.settlements), 'O catálogo de assentamentos é inválido.');
    validateSettlementsWorld(settlements, map, npcs, items, economy);
    const politics = unwrap(inspectPoliticsCatalog(raw.politics), 'O catálogo político é inválido.');
    validatePoliticsWorld(politics, map, npcs);
    validatePartyWorld(party, combat, npcs, organizations);
    const objectives = unwrap(inspectObjectiveCatalog(raw.objectives), 'O catálogo de jornadas é inválido.');
    const worldTriggers = unwrap(
      inspectWorldTriggerCatalog(raw.worldTriggers, { campaign, exploration }),
      'O catálogo de gatilhos é inválido.',
    );
    const firstPriorityTrigger = inspectFirstPriorityTrigger(raw.firstPriorityTrigger);
    const stationLabels = inspectStationLabels(raw.labels);

    return {
      id: raw.id,
      sourceId,
      startingLocationId: raw.startingLocationId,
      campaign,
      map,
      exploration,
      resources,
      crafting,
      presences,
      presenceInteractions,
      interactables,
      bonds,
      organizations,
      party,
      calendar,
      family,
      civic,
      economy,
      settlements,
      politics,
      registry,
      combat,
      mastery,
      skills,
      training,
      energetics,
      garden,
      items,
      conditions,
      execution,
      npcs,
      objectives,
      worldTriggers,
      firstPriorityTrigger,
      stationLabels,
    };
  } catch (error) {
    if (error instanceof ContentError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new ContentError(error.message, { cause: error });
    }
    throw new ContentError('O pack de mundo é inválido.');
  }
}

function inspectFirstPriorityTrigger(value: unknown): IndexedWorld['firstPriorityTrigger'] {
  if (
    !isRecord(value) ||
    !nonEmpty(value.id) ||
    !nonEmpty(value.campaignId) ||
    !nonEmpty(value.eventId) ||
    !isRecord(value.source) ||
    value.source.type !== 'discovery.revealed' ||
    !nonEmpty(value.source.discoveryId)
  ) {
    throw new ContentError('O gatilho de primeiro encontro é inválido.');
  }
  return {
    id: value.id,
    campaignId: value.campaignId,
    eventId: value.eventId,
    source: { type: 'discovery.revealed', discoveryId: value.source.discoveryId },
  };
}

function validatePartyWorld(
  party: IndexedWorld['party'],
  combat: IndexedWorld['combat'],
  npcs: IndexedWorld['npcs'],
  organizations: IndexedWorld['organizations'],
): void {
  for (const companion of party.companions) {
    if (!npcs.npcById.has(companion.npcId)) {
      throw new ContentError('O companheiro referencia um NPC inexistente.');
    }
    for (const actionId of companion.actionIds) {
      if (!combat.actionById.has(actionId)) {
        throw new ContentError('O companheiro referencia uma ação de combate inexistente.');
      }
    }
  }
  for (const encounter of combat.encounters) {
    if (encounter.requiredOrganizationId && !organizations.organizationById.has(encounter.requiredOrganizationId)) {
      throw new ContentError('O encontro referencia uma organização inexistente.');
    }
  }
}

function validateFamilyWorld(
  family: IndexedWorld['family'],
  map: IndexedWorld['map'],
  npcs: IndexedWorld['npcs'],
): void {
  for (const household of family.households) {
    if (!map.locations.has(household.locationId)) {
      throw new ContentError('O lar referencia uma localização inexistente.');
    }
  }
  for (const action of family.actions) {
    if (action.npcId && !npcs.npcById.has(action.npcId)) {
      throw new ContentError('A ação de família referencia um NPC inexistente.');
    }
  }
}

function validateCivicWorld(
  civic: IndexedWorld['civic'],
  map: IndexedWorld['map'],
  npcs: IndexedWorld['npcs'],
): void {
  for (const scope of civic.scopes) {
    if (!map.locations.has(scope.id)) {
      throw new ContentError('O escopo cívico referencia uma localização inexistente.');
    }
  }
  for (const authority of civic.authorities) {
    if (!npcs.npcById.has(authority.id)) {
      throw new ContentError('A autoridade cívica referencia um NPC inexistente.');
    }
  }
  for (const action of civic.actions) {
    if (action.npcId && !npcs.npcById.has(action.npcId)) {
      throw new ContentError('A ação cívica referencia um NPC inexistente.');
    }
  }
}

function validateEconomyWorld(
  economy: IndexedWorld['economy'],
  map: IndexedWorld['map'],
  npcs: IndexedWorld['npcs'],
  items: IndexedWorld['items'],
): void {
  for (const property of economy.properties) {
    if (!map.locations.has(property.locationId)) {
      throw new ContentError('A propriedade referencia uma localização inexistente.');
    }
  }
  for (const offer of economy.offers) {
    if (!items.byId.has(offer.itemId)) {
      throw new ContentError('A oferta referencia um item inexistente.');
    }
  }
  for (const action of economy.actions) {
    if (action.npcId && !npcs.npcById.has(action.npcId)) {
      throw new ContentError('A ação econômica referencia um NPC inexistente.');
    }
  }
}

function validateSettlementsWorld(
  settlements: IndexedWorld['settlements'],
  map: IndexedWorld['map'],
  npcs: IndexedWorld['npcs'],
  items: IndexedWorld['items'],
  economy: IndexedWorld['economy'],
): void {
  for (const territory of settlements.territories) {
    if (!map.locations.has(territory.locationId)) {
      throw new ContentError('O território referencia uma localização inexistente.');
    }
    if (!economy.propertyById.has(territory.requiredPropertyId)) {
      throw new ContentError('O território referencia uma propriedade inexistente.');
    }
  }
  for (const project of settlements.projects) {
    for (const cost of project.costs) {
      if (!items.byId.has(cost.itemId)) {
        throw new ContentError('O projeto referencia um item inexistente.');
      }
    }
  }
  for (const recipe of settlements.recipes) {
    for (const entry of [...recipe.inputs, ...recipe.outputs]) {
      if (!items.byId.has(entry.itemId)) {
        throw new ContentError('A receita produtiva referencia um item inexistente.');
      }
    }
  }
  for (const action of settlements.actions) {
    if (action.npcId && !npcs.npcById.has(action.npcId)) {
      throw new ContentError('A ação de assentamento referencia um NPC inexistente.');
    }
  }
}

function validatePoliticsWorld(
  politics: IndexedWorld['politics'],
  map: IndexedWorld['map'],
  npcs: IndexedWorld['npcs'],
): void {
  for (const law of politics.laws) {
    if (!map.locations.has(law.jurisdictionLocationId)) {
      throw new ContentError('A lei referencia uma jurisdição inexistente.');
    }
  }
  for (const action of politics.actions) {
    if (action.npcId && !npcs.npcById.has(action.npcId)) {
      throw new ContentError('A ação política referencia um NPC inexistente.');
    }
  }
}

function inspectStationLabels(value: unknown): Readonly<Record<string, string>> {
  if (!isRecord(value) || !isRecord(value.stations)) {
    throw new ContentError('Os rótulos de estação são inválidos.');
  }
  const stations: Record<string, string> = {};
  for (const [key, label] of Object.entries(value.stations)) {
    if (!nonEmpty(key) || !nonEmpty(label)) {
      throw new ContentError('Os rótulos de estação são inválidos.');
    }
    stations[key] = label;
  }
  return Object.freeze(stations);
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; reason: string }, fallback: string): T {
  if (!result.ok) {
    throw new ContentError(result.reason || fallback);
  }
  return result.value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
