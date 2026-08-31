import type { LocationNode } from './types';

export const DEFAULT_STARTING_LOCATION_ID = 'awakening-clearing';

export const INITIAL_WORLD_MAP: LocationNode = {
  id: 'new-world',
  name: 'Novo Mundo',
  description: 'A geografia refeita após o Reset. O antigo mapa não serve mais.',
  image: { kind: 'scene', label: 'Novo Mundo' },
  children: [
    {
      id: 'horned-rabbit-forest',
      name: 'Floresta dos Coelhos Chifrudos',
      description: 'Uma floresta jovem e densa, onde a vegetação cresce rápido demais para parecer antiga.',
      image: { kind: 'scene', label: 'Floresta dos Coelhos Chifrudos' },
      travelCost: { periods: 1 },
      children: [
        {
          id: 'awakening-clearing',
          name: 'Clareira do Despertar',
          description: 'O claro irregular onde você abriu os olhos depois do Reset.',
          image: { kind: 'scene', label: 'Clareira do Despertar' },
        },
        {
          id: 'great-tree',
          name: 'Grande Árvore',
          description: 'Uma árvore desproporcional marca o centro visível da floresta.',
          image: { kind: 'scene', label: 'Grande Árvore' },
          travelCost: { periods: 1 },
        },
        {
          id: 'spring-lake',
          name: 'Nascente e Pequeno Lago',
          description: 'Água clara emerge da terra e se acumula num lago raso.',
          image: { kind: 'scene', label: 'Nascente e Pequeno Lago' },
          travelCost: { periods: 1 },
        },
        {
          id: 'dense-woods',
          name: 'Mata Densa',
          description: 'A vegetação se fecha e reduz a visibilidade entre os troncos.',
          image: { kind: 'scene', label: 'Mata Densa' },
          travelCost: { periods: 1 },
          children: [
            {
              id: 'hidden-cave',
              name: 'Caverna Oculta',
              description: 'Uma abertura baixa, encoberta por raízes e pedra úmida.',
              image: { kind: 'scene', label: 'Caverna Oculta' },
              travelCost: { periods: 1 },
              visibility: 'hidden',
              lockedReason: 'A entrada está encoberta pela vegetação.',
            },
          ],
        },
      ],
    },
  ],
};
