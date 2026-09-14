import type { SkillsCatalog } from './types';

export const INITIAL_SKILLS_CATALOG = {
  paths: [
    {
      id: 'body-reinforcement',
      name: 'Reforço do Corpo',
      description: 'Aplicações interiorizadas do Númen para fortalecer sentidos, resistência e movimento.',
      field: 'corpo',
    },
    {
      id: 'numen-manifestation',
      name: 'Manifestação de Númen',
      description: 'Aplicações exteriorizadas do Númen que projetam técnica e efeitos no mundo.',
      field: 'poder',
    },
  ],
  skills: [
    {
      id: 'sharpened-senses',
      name: 'Sentidos Aguçados',
      description: 'Percepção reforçada pelo Númen que revela detalhes e sinais do ambiente.',
      pathId: 'body-reinforcement',
    },
    {
      id: 'steady-body',
      name: 'Corpo Firme',
      description: 'Resistência interiorizada que sustenta esforço prolongado com menos desgaste.',
      pathId: 'body-reinforcement',
    },
    {
      id: 'guiding-spark',
      name: 'Fagulha Condutora',
      description: 'Primeira manifestação exteriorizada do Númen, uma centelha controlada de energia.',
      pathId: 'numen-manifestation',
    },
  ],
} as const satisfies SkillsCatalog;
