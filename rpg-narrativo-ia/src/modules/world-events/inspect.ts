import type { Campaign } from '../../core/events';
import { getEventById } from '../../core/events';
import type { IndexedExploration } from '../exploration';
import type { IndexedSkills } from '../skills';
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
  if (!isRecord(context) || !isRecord(context.campaign) || !isRecord(context.exploration) || !isRecord(context.skills)) {
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
  const byDiscoveryId = new Map<string, WorldNarrativeTriggerDefinition[]>();

  for (const entry of value) {
    const inspected = inspectTrigger(entry, context.campaign, context.exploration, context.skills, byId);
    if (!inspected.ok) {
      return inspected;
    }

    const trigger = inspected.value;
    byId.set(trigger.id, trigger);
    if (trigger.source.type === 'discovery.revealed') {
      const entries = byDiscoveryId.get(trigger.source.discoveryId) ?? [];
      entries.push(trigger);
      byDiscoveryId.set(trigger.source.discoveryId, entries);
    }
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
  skills: IndexedSkills,
  byId: Map<string, WorldNarrativeTriggerDefinition>,
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

  const source = inspectSource(value.source, exploration, skills);
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
  skills: IndexedSkills,
): WorldTriggerInspection<WorldTriggerSource> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('A origem do gatilho é inválida.');
  }

  if (!(WORLD_TRIGGER_SOURCE_TYPES as readonly string[]).includes(value.type)) {
    return fail('O tipo de origem do gatilho é desconhecido.');
  }

  switch (value.type) {
    case 'discovery.revealed':
      if (typeof value.discoveryId !== 'string' || value.discoveryId.trim() === '') {
        return fail('A descoberta do gatilho é inválida.');
      }
      if (!exploration.byDiscovery.has(value.discoveryId)) {
        return fail(`A descoberta ${value.discoveryId} não existe nas definições de exploração.`);
      }
      return {
        ok: true,
        value: { type: value.type, discoveryId: value.discoveryId },
      };
    case 'system.skill.proficiency.min':
      if (
        typeof value.skillId !== 'string' ||
        value.skillId.trim() === '' ||
        !Number.isSafeInteger(value.amount) ||
        (value.amount as number) < 0
      ) {
        return fail('O marco de proficiência do gatilho é inválido.');
      }
      if (!skills.skillById.has(value.skillId)) {
        return fail(`A habilidade ${value.skillId} do gatilho não existe.`);
      }
      return {
        ok: true,
        value: { type: value.type, skillId: value.skillId, amount: value.amount as number },
      };
    case 'world.day.min':
      if (!Number.isSafeInteger(value.day) || (value.day as number) <= 0) {
        return fail('O dia mínimo do gatilho é inválido.');
      }
      return {
        ok: true,
        value: { type: value.type, day: value.day as number },
      };
  }

  return fail('O tipo de origem do gatilho é desconhecido.');
}

function fail(reason: string): WorldTriggerInspection<never> {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
