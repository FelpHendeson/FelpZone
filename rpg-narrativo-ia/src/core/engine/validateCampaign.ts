import type { Campaign, EventTransition } from '../events';

export function validateCampaign(campaign: Campaign): string[] {
  const errors: string[] = [];
  const eventIds = campaign.events.map((event) => event.id);
  const uniqueIds = new Set(eventIds);

  if (uniqueIds.size !== eventIds.length) {
    errors.push('A campanha possui eventos com identificadores repetidos.');
  }

  if (!uniqueIds.has(campaign.firstEventId)) {
    errors.push(`O evento inicial ${campaign.firstEventId} não existe.`);
  }

  for (const event of campaign.events) {
    if (event.choices.length === 0) {
      errors.push(`O evento ${event.id} não possui escolhas.`);
    }

    const choiceIds = event.choices.map((choice) => choice.id);
    if (new Set(choiceIds).size !== choiceIds.length) {
      errors.push(`O evento ${event.id} possui escolhas com identificadores repetidos.`);
    }

    for (const choice of event.choices) {
      errors.push(...validateTransition(event.id, choice.id, choice.transition, uniqueIds));
    }
  }

  return errors;
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
    return transition.eventIds
      .filter((candidateId) => !eventIds.has(candidateId))
      .map(
        (candidateId) =>
          `A escolha ${choiceId} do evento ${eventId} aponta para o candidato ${candidateId}, que não existe.`,
      );
  }

  return [];
}
