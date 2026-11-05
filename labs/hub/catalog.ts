// Catálogo do hub: cada seção agrupa labs de um projeto, ou experimentos gerais.

export type LabStatus = 'Em teste' | 'Concluído' | 'Descartado';

export interface Lab {
  /** Pasta do lab a partir da raiz do hub, terminando em barra. */
  path: string;
  title: string;
  question: string;
  status: LabStatus;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  labs: Lab[];
}

export const SECTIONS: Section[] = [
  {
    id: 'basilis',
    title: 'Basilis: O Novo Mundo',
    description: 'RPG de ação top-down para celular e navegador. Cada lab responde uma pergunta e vira parte da engine do jogo.',
    labs: [
      {
        path: 'basilis/01-controles/',
        title: '01 — Controles',
        question: 'Andar, atacar e esquivar ficam bons no celular e no navegador?',
        status: 'Em teste',
      },
    ],
  },
  {
    id: 'geral',
    title: 'Geral',
    description: 'Experimentos de jogo que não pertencem a um projeto: técnicas de render, física, efeitos, ideias soltas.',
    labs: [],
  },
];
