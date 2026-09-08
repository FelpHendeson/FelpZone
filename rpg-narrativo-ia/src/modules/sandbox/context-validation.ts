import { inspectCraftingDefinitions } from '../crafting';
import { inspectExplorationDefinitions } from '../exploration';
import { inspectNavigationMap } from '../navigation';
import { inspectPresenceCatalog, inspectPresenceInteractionCatalog } from '../presences';
import { inspectResourceDefinitions } from '../resources';
import { firstDayCampaign } from '../../campaigns/first-day';
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

  const crafting = inspectCraftingDefinitions(value.crafting.recipes, value.crafting.structures);
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

  const presenceInteractions = inspectPresenceInteractionCatalog(
    { interactions: value.presenceInteractions.interactions },
    presences.value,
    firstDayCampaign,
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
  };

  return { ok: true, value: context };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): SandboxContextInspection {
  return { ok: false, reason };
}
