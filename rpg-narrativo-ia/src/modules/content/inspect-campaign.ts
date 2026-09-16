import { validateCampaign } from '../../core/engine';
import type { Campaign, StoryEvent } from '../../core/events';
import { ContentError } from './errors';

export function inspectCampaignDocument(value: unknown, events: unknown): Campaign {
  if (!isRecord(value)) {
    throw new ContentError('A campanha do pack é inválida.');
  }
  if (!nonEmpty(value.id) || !nonEmpty(value.title) || !nonEmpty(value.firstEventId)) {
    throw new ContentError('A campanha do pack é inválida.');
  }
  if (!Array.isArray(value.items) || !Array.isArray(value.abilities) || !Array.isArray(value.npcs) || !Array.isArray(value.titles)) {
    throw new ContentError('A campanha do pack é inválida.');
  }
  if (!Array.isArray(events)) {
    throw new ContentError('Os eventos da campanha são inválidos.');
  }
  for (const event of events) {
    if (!isRecord(event) || !nonEmpty(event.id) || !nonEmpty(event.title) || !nonEmpty(event.body) || !Array.isArray(event.choices)) {
      throw new ContentError('Os eventos da campanha são inválidos.');
    }
  }

  const campaign: Campaign = {
    id: value.id,
    title: value.title,
    firstEventId: value.firstEventId,
    events: events as StoryEvent[],
    items: value.items as Campaign['items'],
    abilities: value.abilities as Campaign['abilities'],
    npcs: value.npcs as Campaign['npcs'],
    titles: value.titles as Campaign['titles'],
  };

  const errors = validateCampaign(campaign);
  if (errors.length > 0) {
    throw new ContentError(errors[0] ?? 'A campanha do pack é inválida.');
  }

  return campaign;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
