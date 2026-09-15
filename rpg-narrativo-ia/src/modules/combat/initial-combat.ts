import { DEFAULT_STARTING_LOCATION_ID } from '../navigation';
import type { CombatCatalog } from './types';

export const PLAYER_COMBAT_MAX_HEALTH = 20;

export const INITIAL_COMBAT_CATALOG = {
  actions: [
    {
      id: 'attack',
      name: 'Golpe',
      description: 'Um golpe direto e confiável.',
      speed: 10,
      target: 'opponent',
      effects: [{ type: 'damage', amount: 5 }],
    },
    {
      id: 'guard',
      name: 'Postura Defensiva',
      description: 'Prepara-se para absorver o próximo dano.',
      speed: 14,
      target: 'self',
      effects: [{ type: 'guard', amount: 6 }],
    },
    {
      id: 'focus-strike',
      name: 'Golpe Preciso',
      description: 'Usa os Sentidos Aguçados para acertar um ponto vulnerável.',
      speed: 8,
      target: 'opponent',
      effects: [{ type: 'damage', amount: 9 }],
      skillId: 'sharpened-senses',
    },
    {
      id: 'mend',
      name: 'Estancar Ferida',
      description: 'A resistência do Corpo Firme permite conter o próprio sangramento.',
      speed: 12,
      target: 'self',
      effects: [{ type: 'heal', amount: 6 }],
      skillId: 'steady-body',
    },
  ],
  combatants: [
    {
      id: 'wary-predator',
      name: 'Predador Arisco',
      maxHealth: 18,
      actionIds: ['attack', 'guard'],
    },
  ],
  encounters: [
    {
      id: 'clearing-predator',
      locationId: DEFAULT_STARTING_LOCATION_ID,
      opponentId: 'wary-predator',
      name: 'Predador Arisco',
      description: 'Uma criatura esguia rosna entre a vegetação, medindo se você é presa ou ameaça.',
      timeCost: { periods: 1 },
      requiredDiscoveryIds: ['wary-predator-tracks'],
    },
  ],
} as const satisfies CombatCatalog;
