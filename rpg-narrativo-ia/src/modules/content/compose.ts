import { inspectCombatCatalog, validateEncounterDiscoveries } from '../combat';
import { inspectConditionsCatalog } from '../conditions';
import { inspectCraftingDefinitions } from '../crafting';
import { inspectEnergeticsCatalog } from '../energetics';
import { inspectExplorationDefinitions } from '../exploration';
import { inspectGardenCatalog } from '../garden';
import { inspectItemsCatalog } from '../items';
import { inspectMasteryCatalog, validateMasteryReferences } from '../mastery';
import { inspectNavigationMap } from '../navigation';
import { inspectNpcCatalog } from '../npcs';
import { inspectObjectiveCatalog } from '../objectives';
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
    const npcs = unwrap(inspectNpcCatalog(raw.npcs, new Set(map.locations.keys())), 'O catálogo de NPCs é inválido.');
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
      combat,
      mastery,
      skills,
      training,
      energetics,
      garden,
      items,
      conditions,
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
