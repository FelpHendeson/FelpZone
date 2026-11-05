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
        status: 'Concluído',
      },
      {
        path: 'basilis/02-cenario/',
        title: '02 — Cenário e escala',
        question: 'O movimento num cenário de pixel art montado de uma spritesheet (gerada ou de IA) fica nítido em qualquer tela?',
        status: 'Concluído',
      },
      {
        path: 'basilis/03-combate/',
        title: '03 — Combate',
        question: 'Colisão, dano, empurrão, recargas e inimigos que avisam antes de atacar ficam justos e legíveis no celular?',
        status: 'Concluído',
      },
      {
        path: 'basilis/04-animacao/',
        title: '04 — Animação',
        question: 'Estados animados (parado, andar, atacar, dano, esquiva, morte) deixam herói e inimigos legíveis, com o golpe no quadro certo?',
        status: 'Concluído',
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
