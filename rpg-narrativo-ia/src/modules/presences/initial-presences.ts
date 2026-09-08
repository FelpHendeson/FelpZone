import type { PresenceCatalog, PresenceInteractionCatalog } from './types';

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

export const INITIAL_PRESENCE_INTERACTIONS: PresenceInteractionCatalog = {
  interactions: [
    {
      id: 'observe-mira-awakening-clearing',
      presenceId: 'mira-awakening-clearing',
      kind: 'observe',
      label: 'Observar',
      hint: 'Observar Mira à distância, sem iniciar conversa.',
      timeCost: { periods: 1 },
      effects: [{ type: 'flag.set', flag: 'observed.mira', value: true }],
      feedback: 'Mira permanece alerta, como qualquer sobrevivente depois do Reset.',
      resolvesPresence: false,
    },
    {
      id: 'talk-mira-awakening-clearing',
      presenceId: 'mira-awakening-clearing',
      kind: 'talk',
      label: 'Conversar',
      hint: 'Falar com Mira Vale.',
      timeCost: { periods: 1 },
      narrative: { campaignId: 'first-day', eventId: 'first-priority' },
      resolvesPresence: true,
    },
    {
      id: 'observe-horned-rabbit-dense-woods',
      presenceId: 'horned-rabbit-dense-woods',
      kind: 'observe',
      label: 'Observar',
      hint: 'Observar o animal à distância, sem iniciar diálogo.',
      timeCost: { periods: 1 },
      effects: [{ type: 'flag.set', flag: 'saw.horned.rabbit', value: true }],
      feedback: 'O coelho chifrudo fareja o ar e segue pastando entre os arbustos.',
      resolvesPresence: false,
    },
    {
      id: 'avoid-horned-rabbit-dense-woods',
      presenceId: 'horned-rabbit-dense-woods',
      kind: 'avoid',
      label: 'Evitar',
      hint: 'Dar espaço ao animal e seguir em frente.',
      timeCost: { periods: 0 },
      effects: [{ type: 'flag.set', flag: 'avoided.horned.rabbit', value: true }],
      feedback: 'Você contorna os arbustos. O coelho chifrudo não se aproxima.',
      resolvesPresence: false,
    },
  ],
};
