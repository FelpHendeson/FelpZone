import type { PresenceCatalog } from './types';

export const INITIAL_PRESENCE_CATALOG: PresenceCatalog = {
  entities: [
    {
      id: 'mira-vale',
      kind: 'npc',
      name: 'Mira Vale',
      description: 'Uma sobrevivente da mesma idade, encontrada depois do Reset.',
      image: { kind: 'portrait', label: 'Mira Vale' },
    },
    {
      id: 'horned-rabbit',
      kind: 'animal',
      name: 'Coelho chifrudo',
      description: 'Pequeno herbívoro de chifres curtos. Deixa rastros na Mata Densa.',
      image: { kind: 'icon', label: 'Coelho chifrudo' },
    },
  ],
  presences: [
    {
      id: 'mira-awakening-clearing',
      entityId: 'mira-vale',
      locationId: 'awakening-clearing',
      discoveryId: 'first-priority-event',
      resolvable: true,
    },
    {
      id: 'horned-rabbit-dense-woods',
      entityId: 'horned-rabbit',
      locationId: 'dense-woods',
      discoveryId: 'horned-rabbit-tracks',
      resolvable: false,
    },
  ],
};
