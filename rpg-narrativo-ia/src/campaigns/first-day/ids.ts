import type { EventTransition } from '../../core/events';

export const NPC_MIRA = 'mira-vale';

export const ITEM_WATER = 'agua-limpa';
export const ITEM_FRUIT = 'fruto-desconhecido';
export const ITEM_BRANCH = 'galho-resistente';

export const ABILITY_PERCEPTION = 'olhar-atento';
export const ABILITY_RESILIENCE = 'resiliencia';
export const ABILITY_EMPATHY = 'voz-calma';

export const FLAG_ABILITY_PERCEPTION = 'ability.olhar-atento';
export const FLAG_ABILITY_RESILIENCE = 'ability.resiliencia';
export const FLAG_ABILITY_EMPATHY = 'ability.voz-calma';
export const FLAG_SOUGHT_WATER = 'sought.water';
export const FLAG_SOUGHT_SHELTER = 'sought.shelter';
export const FLAG_SOUGHT_LOCATION = 'sought.location';
export const FLAG_DANGER_HIDDEN = 'danger.hidden';
export const FLAG_DANGER_CONFRONTED = 'danger.confronted';
export const FLAG_DANGER_FLED = 'danger.fled';
export const FLAG_SHARED_RESOURCE = 'moral.shared';
export const FLAG_KEPT_RESOURCE = 'moral.kept';
export const FLAG_SHARED_WATER = 'moral.shared-water';
export const FLAG_REPAIRED = 'moral.repaired';
export const FLAG_CAMPED_TOGETHER = 'camp.together';
export const FLAG_CAMPED_ALONE = 'camp.alone';

export const TO_DANGER: EventTransition = {
  type: 'firstMatch',
  eventIds: ['danger-alert', 'danger-sudden'],
};

export const TO_DUSK: EventTransition = {
  type: 'firstMatch',
  eventIds: ['dusk-trusted', 'dusk-wary'],
};
