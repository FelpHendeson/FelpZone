import type { Campaign } from '../../core/events';
import { abilities, items, npcs, titles } from './catalog';
import { events } from './events';

export const firstDayCampaign: Campaign = {
  id: 'first-day',
  title: 'O primeiro dia',
  firstEventId: 'awakening',
  events,
  items,
  abilities,
  npcs,
  titles,
};

export function findItem(campaign: Campaign, itemId: string) {
  return campaign.items.find((item) => item.id === itemId);
}

export function findAbility(campaign: Campaign, abilityId: string) {
  return campaign.abilities.find((ability) => ability.id === abilityId);
}

export function findNpc(campaign: Campaign, characterId: string) {
  return campaign.npcs.find((npc) => npc.id === characterId);
}

export function findTitle(campaign: Campaign, titleId: string) {
  return campaign.titles.find((title) => title.id === titleId);
}
