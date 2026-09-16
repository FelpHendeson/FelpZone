import type { NpcCatalog } from './types';

export const INITIAL_NPC_CATALOG = {
  npcs: [
    {
      id: 'mira-vale',
      entityId: 'mira-vale',
      name: 'Mira Vale',
      defaultScheduleId: 'mira-routine',
    },
  ],
  schedules: [
    {
      id: 'mira-routine',
      npcId: 'mira-vale',
      fallbackLocationId: 'awakening-clearing',
      entries: [
        { period: 'alvorecer', locationId: 'spring-lake', availability: 'available' },
        { period: 'manha', locationId: 'spring-lake', availability: 'available' },
        { period: 'meio-dia', locationId: 'awakening-clearing', availability: 'available' },
        { period: 'tarde', locationId: 'awakening-clearing', availability: 'available' },
        { period: 'entardecer', locationId: 'awakening-clearing', availability: 'busy' },
        { period: 'noite', locationId: 'awakening-clearing', availability: 'hidden' },
      ],
    },
  ],
  facts: [
    {
      id: 'mira-first-talk',
      npcId: 'mira-vale',
      summary: 'Vocês conversaram depois do despertar.',
    },
    {
      id: 'mira-seeks-water',
      npcId: 'mira-vale',
      summary: 'Costuma buscar água pela manhã.',
    },
  ],
} as const satisfies NpcCatalog;
