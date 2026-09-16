import type { AbilityDefinition, ItemDefinition, NpcDefinition, TitleDefinition } from '../../core/events';
import { firstDayCampaign } from './index';

export const items: ItemDefinition[] = firstDayCampaign.items;
export const abilities: AbilityDefinition[] = firstDayCampaign.abilities;
export const npcs: NpcDefinition[] = firstDayCampaign.npcs;
export const titles: TitleDefinition[] = firstDayCampaign.titles;
