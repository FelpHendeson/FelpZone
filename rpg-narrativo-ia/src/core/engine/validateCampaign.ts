import { STORY_VAR_KEYS } from '../../modules/character';
import { isAttributeId, isDayPeriod } from '../state';
import type {
  Campaign,
  EventTransition,
  GameCondition,
  GameEffect,
  StoryChoice,
} from '../events';

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

export function validateCampaign(campaign: Campaign): string[] {
  const errors: string[] = [];
  const eventIds = campaign.events.map((event) => event.id);
  const eventIdSet = new Set(eventIds);
  const itemIds = uniqueIds(campaign.items.map((item) => item.id), 'itens', errors);
  const abilityIds = uniqueIds(campaign.abilities.map((ability) => ability.id), 'capacidades', errors);
  const npcIds = uniqueIds(campaign.npcs.map((npc) => npc.id), 'NPCs', errors);
  const titleIds = uniqueIds(campaign.titles.map((title) => title.id), 'títulos', errors);

  if (eventIdSet.size !== eventIds.length) {
    errors.push('A campanha possui eventos com identificadores repetidos.');
  }

  if (!eventIdSet.has(campaign.firstEventId)) {
    errors.push(`O evento inicial ${campaign.firstEventId} não existe.`);
  }

  const firstEvent = campaign.events.find((event) => event.id === campaign.firstEventId);
  if (firstEvent && firstEvent.conditions && firstEvent.conditions.length > 0) {
    errors.push(`O evento inicial ${firstEvent.id} não é apresentável no começo da partida.`);
  }

  const choiceIds: string[] = [];

  for (const event of campaign.events) {
    if (event.choices.length === 0) {
      errors.push(`O evento ${event.id} não possui escolhas.`);
    }

    const localChoiceIds = event.choices.map((choice) => choice.id);
    if (new Set(localChoiceIds).size !== localChoiceIds.length) {
      errors.push(`O evento ${event.id} possui escolhas com identificadores repetidos.`);
    }

    choiceIds.push(...localChoiceIds);
    errors.push(...validateText(event.id, 'título', event.title));
    errors.push(...validateText(event.id, 'texto', event.body));

    for (const choice of event.choices) {
      errors.push(...validateText(event.id, `escolha ${choice.id}`, choice.label));
      if (choice.hint) {
        errors.push(...validateText(event.id, `dica ${choice.id}`, choice.hint));
      }

      errors.push(...validateTransition(event.id, choice.id, choice.transition, eventIdSet));
      errors.push(
        ...validateEffects(event.id, choice, itemIds, abilityIds, npcIds, titleIds),
      );
      errors.push(...validateConditions(event.id, `escolha ${choice.id}`, choice.conditions, itemIds, npcIds));
    }

    errors.push(...validateConditions(event.id, 'evento', event.conditions, itemIds, npcIds));
  }

  if (new Set(choiceIds).size !== choiceIds.length) {
    errors.push('A campanha possui escolhas com identificadores repetidos entre eventos.');
  }

  for (const title of campaign.titles) {
    errors.push(...validateConditions(`título ${title.id}`, 'condição', title.conditions, itemIds, npcIds));
  }

  errors.push(...validateReachability(campaign, eventIdSet));

  return errors;
}

function uniqueIds(ids: string[], label: string, errors: string[]): Set<string> {
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    errors.push(`A campanha possui ${label} com identificadores repetidos.`);
  }

  return unique;
}

function validateTransition(
  eventId: string,
  choiceId: string,
  transition: EventTransition,
  eventIds: Set<string>,
): string[] {
  if (transition.type === 'event' && !eventIds.has(transition.eventId)) {
    return [`A escolha ${choiceId} do evento ${eventId} aponta para ${transition.eventId}, que não existe.`];
  }

  if (transition.type === 'firstMatch') {
    if (transition.eventIds.length === 0) {
      return [`A escolha ${choiceId} do evento ${eventId} possui firstMatch sem candidatos.`];
    }

    return transition.eventIds
      .filter((candidateId) => !eventIds.has(candidateId))
      .map(
        (candidateId) =>
          `A escolha ${choiceId} do evento ${eventId} aponta para o candidato ${candidateId}, que não existe.`,
      );
  }

  return [];
}

function validateEffects(
  eventId: string,
  choice: StoryChoice,
  itemIds: Set<string>,
  abilityIds: Set<string>,
  npcIds: Set<string>,
  titleIds: Set<string>,
): string[] {
  const errors: string[] = [];

  for (const effect of choice.effects) {
    errors.push(...validateEffect(eventId, choice.id, effect, itemIds, abilityIds, npcIds, titleIds));
  }

  for (const effect of choice.effects) {
    if (effect.type !== 'inventory.remove') {
      continue;
    }

    if (!hasCompatibleItemGuard(choice, effect.itemId, effect.quantity)) {
      errors.push(
        `A escolha ${choice.id} do evento ${eventId} remove ${effect.itemId} sem estar protegida por condição compatível de inventário.`,
      );
    }
  }

  return errors;
}

function validateEffect(
  eventId: string,
  choiceId: string,
  effect: GameEffect,
  itemIds: Set<string>,
  abilityIds: Set<string>,
  npcIds: Set<string>,
  titleIds: Set<string>,
): string[] {
  const prefix = `A escolha ${choiceId} do evento ${eventId}`;

  switch (effect.type) {
    case 'attribute.change':
      if (!isAttributeId(effect.attribute) || !Number.isFinite(effect.amount)) {
        return [`${prefix} possui variação de atributo inválida.`];
      }
      return [];
    case 'inventory.add':
    case 'inventory.remove':
      if (!itemIds.has(effect.itemId)) {
        return [`${prefix} referencia o item ${effect.itemId}, que não existe.`];
      }
      if (!Number.isInteger(effect.quantity) || effect.quantity <= 0) {
        return [`${prefix} possui quantidade inválida.`];
      }
      return [];
    case 'relationship.change':
      if (!npcIds.has(effect.characterId) || !Number.isFinite(effect.amount)) {
        return [`${prefix} possui relação inválida.`];
      }
      return [];
    case 'flag.set':
      if (effect.flag.trim() === '' || typeof effect.value !== 'boolean') {
        return [`${prefix} possui flag inválida.`];
      }
      return [];
    case 'world.period':
      if (!isDayPeriod(effect.period)) {
        return [`${prefix} possui período inválido.`];
      }
      return [];
    case 'progression.ability':
      if (!abilityIds.has(effect.abilityId)) {
        return [`${prefix} referencia a capacidade ${effect.abilityId}, que não existe.`];
      }
      return [];
    case 'progression.title':
      if (!titleIds.has(effect.titleId)) {
        return [`${prefix} referencia o título ${effect.titleId}, que não existe.`];
      }
      return [];
    case 'game.complete':
      return [];
  }
}

function validateConditions(
  ownerId: string,
  context: string,
  conditions: GameCondition[] | undefined,
  itemIds: Set<string>,
  npcIds: Set<string>,
): string[] {
  if (!conditions) {
    return [];
  }

  const errors: string[] = [];
  for (const condition of conditions) {
    switch (condition.type) {
      case 'flag.is':
        if (condition.flag.trim() === '' || typeof condition.value !== 'boolean') {
          errors.push(`A ${context} de ${ownerId} possui flag inválida.`);
        }
        break;
      case 'attribute.min':
      case 'attribute.max':
        if (!isAttributeId(condition.attribute) || !Number.isFinite(condition.amount)) {
          errors.push(`A ${context} de ${ownerId} possui atributo inválido.`);
        }
        break;
      case 'inventory.has':
        if (!itemIds.has(condition.itemId)) {
          errors.push(`A ${context} de ${ownerId} referencia o item ${condition.itemId}, que não existe.`);
        }
        if (condition.quantity !== undefined && (!Number.isInteger(condition.quantity) || condition.quantity <= 0)) {
          errors.push(`A ${context} de ${ownerId} possui quantidade inválida.`);
        }
        break;
      case 'relationship.min':
        if (!npcIds.has(condition.characterId) || !Number.isFinite(condition.amount)) {
          errors.push(`A ${context} de ${ownerId} possui relação inválida.`);
        }
        break;
    }
  }

  return errors;
}

function hasCompatibleItemGuard(choice: StoryChoice, itemId: string, quantity: number): boolean {
  return (choice.conditions ?? []).some(
    (condition) =>
      condition.type === 'inventory.has' &&
      condition.itemId === itemId &&
      (condition.quantity ?? 1) >= quantity,
  );
}

function validateText(eventId: string, field: string, text: string): string[] {
  const unknown = [...text.matchAll(PLACEHOLDER)]
    .map((match) => match[1])
    .filter((key) => !(STORY_VAR_KEYS as readonly string[]).includes(key));

  return unknown.map(
    (key) => `O ${field} do evento ${eventId} usa a variável {{${key}}}, que não é conhecida.`,
  );
}

function validateReachability(campaign: Campaign, eventIds: Set<string>): string[] {
  const errors: string[] = [];
  const reachable = reachableEvents(campaign);
  const firstExists = eventIds.has(campaign.firstEventId);

  for (const event of campaign.events) {
    if (firstExists && !reachable.has(event.id)) {
      errors.push(`O evento ${event.id} é inalcançável a partir do início.`);
    }
  }

  const hasEnding = [...reachable].some((eventId) => {
    const event = campaign.events.find((entry) => entry.id === eventId);
    return event?.choices.some((choice) => endsCampaign(choice));
  });

  if (firstExists && !hasEnding) {
    errors.push('A campanha não possui um encerramento alcançável.');
  }

  return errors;
}

function reachableEvents(campaign: Campaign): Set<string> {
  const byId = new Map(campaign.events.map((event) => [event.id, event]));
  const seen = new Set<string>();
  const queue = [campaign.firstEventId];

  while (queue.length > 0) {
    const eventId = queue.pop();
    if (!eventId || seen.has(eventId)) {
      continue;
    }

    seen.add(eventId);
    const event = byId.get(eventId);
    if (!event) {
      continue;
    }

    for (const choice of event.choices) {
      queue.push(...transitionTargets(choice.transition));
    }
  }

  return seen;
}

function transitionTargets(transition: EventTransition): string[] {
  if (transition.type === 'event') {
    return [transition.eventId];
  }

  if (transition.type === 'firstMatch') {
    return transition.eventIds;
  }

  return [];
}

function endsCampaign(choice: StoryChoice): boolean {
  return choice.transition.type === 'complete' || choice.effects.some((effect) => effect.type === 'game.complete');
}
