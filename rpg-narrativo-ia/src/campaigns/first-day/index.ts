import type { Campaign } from '../../core/events';
import catalog from '../../../content/first-day/campaign/campaign.json' with { type: 'json' };
import events from '../../../content/first-day/campaign/events.json' with { type: 'json' };

export const firstDayCampaign: Campaign = {
  ...(catalog as Omit<Campaign, 'events'>),
  events: events as Campaign['events'],
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
