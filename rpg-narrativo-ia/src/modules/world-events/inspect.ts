import type { Campaign } from '../../core/events';
import { getEventById } from '../../core/events';
import type { IndexedExploration } from '../exploration';
import { WorldEventError } from './errors';
import type {
  IndexedWorldTriggers,
  WorldNarrativeTriggerDefinition,
  WorldTriggerCatalogContext,
  WorldTriggerInspection,
  WorldTriggerSource,
} from './types';
import { WORLD_TRIGGER_SOURCE_TYPES } from './types';

export function inspectWorldTriggerCatalog(
  value: unknown,
  context: WorldTriggerCatalogContext,
): WorldTriggerInspection<IndexedWorldTriggers> {
  if (!isRecord(context) || !isRecord(context.campaign) || !isRecord(context.exploration)) {
    return fail('O contexto do catálogo de gatilhos é inválido.');
  }

  if (typeof context.campaign.id !== 'string' || context.campaign.id.trim() === '') {
    return fail('A campanha do catálogo de gatilhos é inválida.');
  }

  if (!Array.isArray(value)) {
    return fail('O catálogo de gatilhos narrativos é inválido.');
  }

  const definitions: WorldNarrativeTriggerDefinition[] = [];
  const byId = new Map<string, WorldNarrativeTriggerDefinition>();
  const byDiscoveryId = new Map<string, WorldNarrativeTriggerDefinition>();

  for (const entry of value) {
    const inspected = inspectTrigger(entry, context.campaign, context.exploration, byId, byDiscoveryId);
    if (!inspected.ok) {
      return inspected;
    }

    const trigger = inspected.value;
    byId.set(trigger.id, trigger);
    byDiscoveryId.set(trigger.source.discoveryId, trigger);
    definitions.push(trigger);
  }

  return {
    ok: true,
    value: {
      definitions,
      byId,
      byDiscoveryId,
    },
  };
}

export function indexWorldTriggerCatalog(
  value: unknown,
  context: WorldTriggerCatalogContext,
): IndexedWorldTriggers {
  const inspected = inspectWorldTriggerCatalog(value, context);
  if (!inspected.ok) {
    throw new WorldEventError(inspected.reason);
  }

  return inspected.value;
}

function inspectTrigger(
  value: unknown,
  campaign: Campaign,
  exploration: IndexedExploration,
  byId: Map<string, WorldNarrativeTriggerDefinition>,
  byDiscoveryId: Map<string, WorldNarrativeTriggerDefinition>,
): WorldTriggerInspection<WorldNarrativeTriggerDefinition> {
  if (!isRecord(value)) {
    return fail('O gatilho narrativo é inválido.');
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return fail('O identificador do gatilho é inválido.');
  }

  if (byId.has(value.id)) {
    return fail(`O gatilho ${value.id} está duplicado.`);
  }

  const source = inspectSource(value.source, exploration, byDiscoveryId);
  if (!source.ok) {
    return source;
  }

  if (typeof value.campaignId !== 'string' || value.campaignId.trim() === '') {
    return fail(`A campanha do gatilho ${value.id} é inválida.`);
  }

  if (value.campaignId !== campaign.id) {
    return fail(`O gatilho ${value.id} não pertence à campanha ${campaign.id}.`);
  }

  if (typeof value.eventId !== 'string' || value.eventId.trim() === '') {
    return fail(`O evento do gatilho ${value.id} é inválido.`);
  }

  const event = getEventById(campaign, value.eventId);
  if (!event) {
    return fail(`O evento ${value.eventId} do gatilho ${value.id} não existe.`);
  }

  if (event.canStartSession !== true) {
    return fail(`O evento ${value.eventId} não pode iniciar uma sessão pelo mundo.`);
  }

  return {
    ok: true,
    value: {
      id: value.id,
      source: source.value,
      campaignId: value.campaignId,
      eventId: value.eventId,
    },
  };
}

function inspectSource(
  value: unknown,
  exploration: IndexedExploration,
  byDiscoveryId: Map<string, WorldNarrativeTriggerDefinition>,
): WorldTriggerInspection<WorldTriggerSource> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('A origem do gatilho é inválida.');
  }

  if (!(WORLD_TRIGGER_SOURCE_TYPES as readonly string[]).includes(value.type)) {
    return fail('O tipo de origem do gatilho é desconhecido.');
  }

  if (typeof value.discoveryId !== 'string' || value.discoveryId.trim() === '') {
    return fail('A descoberta do gatilho é inválida.');
  }

  if (!exploration.byDiscovery.has(value.discoveryId)) {
    return fail(`A descoberta ${value.discoveryId} não existe nas definições de exploração.`);
  }

  if (byDiscoveryId.has(value.discoveryId)) {
    return fail(`Há gatilhos ambíguos para a descoberta ${value.discoveryId}.`);
  }

  return {
    ok: true,
    value: {
      type: 'discovery.revealed',
      discoveryId: value.discoveryId,
    },
  };
}

function fail(reason: string): WorldTriggerInspection<never> {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
