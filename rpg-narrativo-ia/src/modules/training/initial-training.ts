import type { TrainingCatalog } from './types';

export const INITIAL_TRAINING_CATALOG = {
  methods: [
    {
      id: 'focused-perception-drill',
      name: 'Treino de Percepção Focada',
      description: 'Exercícios de atenção que assentam os Sentidos Aguçados enquanto o personagem observa o ambiente.',
      target: { type: 'skill', id: 'sharpened-senses' },
      cost: { periods: 1 },
      effects: [{ type: 'skill.proficiency.increase', skillId: 'sharpened-senses', amount: 1 }],
    },
    {
      id: 'body-reinforcement-routine',
      name: 'Rotina de Reforço do Corpo',
      description: 'Repetição orientada pelo Sistema que amadurece o caminho de Reforço do Corpo e revela o Corpo Firme.',
      target: { type: 'path', id: 'body-reinforcement' },
      cost: { periods: 2 },
      effects: [{ type: 'skill.learn', skillId: 'steady-body' }],
    },
  ],
} as const satisfies TrainingCatalog;
