import type { Mod, PersonagemId, Stat } from '../tipos';

export interface No {
  id: string;
  /** Nó de habilidade (ensina) ou de bônus (modificadores permanentes). */
  habilidade?: string;
  nome?: string;
  mods?: Mod[];
  custo: number;
  nivel: number;
  requer: string[];
  /** Posição no desenho: coluna 0–3, linha 0–4. */
  x: number;
  y: number;
  /** Já vem aprendido (habilidades iniciais). */
  raiz?: boolean;
}

export interface Arvore {
  ramos: [string, string];
  nos: No[];
}

const st = (stat: Stat, pct: number): Mod => ({ tipo: 'stat', stat, pct });

export const ARVORES: Record<PersonagemId, Arvore> = {
  leao: {
    ramos: ['Fúria do Leão', 'Cavaleiro de Hope'],
    nos: [
      { id: 'raiz1', habilidade: 'golpeJusto', custo: 0, nivel: 1, requer: [], x: 1, y: 0, raiz: true },
      { id: 'raiz2', habilidade: 'escudoDeHope', custo: 0, nivel: 1, requer: [], x: 3, y: 0, raiz: true },
      { id: 'l1', habilidade: 'rugidoFlamejante', custo: 1, nivel: 3, requer: ['raiz1'], x: 1, y: 1 },
      { id: 'h1', nome: 'Disciplina', mods: [st('def', 8), st('vida', 6)], custo: 1, nivel: 3, requer: ['raiz2'], x: 3, y: 1 },
      {
        id: 'l2', nome: 'Brasas da Alma', mods: [st('atq', 8), { tipo: 'elemento', elemento: 'fogo', pct: 10 }],
        custo: 1, nivel: 6, requer: ['l1'], x: 0, y: 2,
      },
      { id: 'l3', habilidade: 'investidaDoLeao', custo: 1, nivel: 9, requer: ['l1'], x: 1, y: 2 },
      { id: 'h2', habilidade: 'juramentoInabalavel', custo: 1, nivel: 8, requer: ['h1'], x: 3, y: 2 },
      { id: 'l4', habilidade: 'sedeDeBatalha', custo: 1, nivel: 12, requer: ['l2'], x: 0, y: 3 },
      { id: 'l5', habilidade: 'leaoDasChamas', custo: 2, nivel: 15, requer: ['l3', 'h2'], x: 2, y: 3 },
      {
        id: 'h3', nome: 'Honra de Hope', mods: [st('defM', 10), { tipo: 'danoCausado', pct: 5 }],
        custo: 1, nivel: 15, requer: ['h2'], x: 3, y: 3,
      },
      {
        id: 'l6', nome: 'Fúria Rubra', mods: [{ tipo: 'danoCritico', pct: 20 }, { tipo: 'critico', pct: 8 }],
        custo: 2, nivel: 22, requer: ['l5'], x: 2, y: 4,
      },
    ],
  },
  quentin: {
    ramos: ['Escamas', 'Brasa'],
    nos: [
      { id: 'raiz1', habilidade: 'provocar', custo: 0, nivel: 1, requer: [], x: 1, y: 0, raiz: true },
      { id: 'raiz2', habilidade: 'golpeDeEscudo', custo: 0, nivel: 1, requer: [], x: 3, y: 0, raiz: true },
      { id: 'q1', nome: 'Escamas Duras', mods: [st('def', 10)], custo: 1, nivel: 3, requer: ['raiz1'], x: 1, y: 1 },
      { id: 'q2', habilidade: 'caudaIgnea', custo: 1, nivel: 4, requer: ['raiz2'], x: 3, y: 1 },
      { id: 'q3', habilidade: 'peleDeBrasa', custo: 1, nivel: 7, requer: ['q1'], x: 0, y: 2 },
      { id: 'q4', nome: 'Vigor Salamandrino', mods: [st('vida', 12)], custo: 1, nivel: 9, requer: ['q1'], x: 2, y: 2 },
      { id: 'q5', habilidade: 'muralha', custo: 1, nivel: 12, requer: ['q4'], x: 2, y: 3 },
      { id: 'q6', habilidade: 'ultimaBrasa', custo: 1, nivel: 16, requer: ['q3'], x: 0, y: 3 },
      {
        id: 'q7', nome: 'Coração de Magma', mods: [st('def', 10), st('defM', 10), { tipo: 'ameaca', pct: 20 }],
        custo: 2, nivel: 22, requer: ['q5', 'q6'], x: 1, y: 4,
      },
    ],
  },
  cyrus: {
    ramos: ['Tempestade', 'Proteção'],
    nos: [
      { id: 'raiz1', habilidade: 'faiscaEmCadeia', custo: 0, nivel: 1, requer: [], x: 1, y: 0, raiz: true },
      { id: 'raiz2', habilidade: 'barreiraEstatica', custo: 0, nivel: 1, requer: [], x: 3, y: 0, raiz: true },
      { id: 'c1', nome: 'Foco Arcano', mods: [st('atqM', 10)], custo: 1, nivel: 3, requer: ['raiz1'], x: 1, y: 1 },
      {
        id: 'c5', nome: 'Condutividade', mods: [{ tipo: 'elemento', elemento: 'raio', pct: 10 }, st('defM', 8)],
        custo: 1, nivel: 5, requer: ['raiz2'], x: 3, y: 1,
      },
      { id: 'c2', habilidade: 'lancaTrovejante', custo: 1, nivel: 6, requer: ['c1'], x: 0, y: 2 },
      { id: 'c3', habilidade: 'tempestade', custo: 1, nivel: 9, requer: ['c1'], x: 2, y: 2 },
      { id: 'c6', habilidade: 'campoCondutor', custo: 1, nivel: 14, requer: ['c5'], x: 3, y: 2 },
      { id: 'c4', habilidade: 'sobrecarga', custo: 1, nivel: 12, requer: ['c2'], x: 0, y: 3 },
      {
        id: 'c7', nome: 'Olho da Tempestade', mods: [st('velM', 12), { tipo: 'elemento', elemento: 'raio', pct: 10 }],
        custo: 2, nivel: 20, requer: ['c3', 'c4'], x: 1, y: 4,
      },
    ],
  },
  vesper: {
    ramos: ['Lâminas', 'Venenos'],
    nos: [
      { id: 'raiz1', habilidade: 'corteDuplo', custo: 0, nivel: 1, requer: [], x: 1, y: 0, raiz: true },
      { id: 'raiz2', habilidade: 'laminaVenenosa', custo: 0, nivel: 1, requer: [], x: 3, y: 0, raiz: true },
      { id: 'v1', nome: 'Reflexos', mods: [st('vel', 10)], custo: 1, nivel: 3, requer: ['raiz1'], x: 1, y: 1 },
      { id: 'v3', habilidade: 'marcaDaMorte', custo: 1, nivel: 8, requer: ['raiz2'], x: 3, y: 1 },
      { id: 'v2', habilidade: 'passoSombrio', custo: 1, nivel: 6, requer: ['v1'], x: 0, y: 2 },
      { id: 'v4', habilidade: 'dancaDasLaminas', custo: 1, nivel: 11, requer: ['v1'], x: 2, y: 2 },
      {
        id: 'v5', nome: 'Veneno Refinado', mods: [{ tipo: 'elemento', elemento: 'natureza', pct: 20 }, st('atq', 8)],
        custo: 1, nivel: 12, requer: ['v3'], x: 3, y: 2,
      },
      { id: 'v6', habilidade: 'instintoAssassino', custo: 1, nivel: 16, requer: ['v2'], x: 0, y: 3 },
      {
        id: 'v7', nome: 'Sombra Viva', mods: [st('atq', 10), { tipo: 'critico', pct: 10 }],
        custo: 2, nivel: 22, requer: ['v4', 'v6'], x: 1, y: 4,
      },
    ],
  },
  odalys: {
    ramos: ['Bênçãos', 'Maldições'],
    nos: [
      { id: 'raiz1', habilidade: 'bencaoDeHope', custo: 0, nivel: 1, requer: [], x: 1, y: 0, raiz: true },
      { id: 'raiz2', habilidade: 'maldicaoDeEspinhos', custo: 0, nivel: 1, requer: [], x: 3, y: 0, raiz: true },
      { id: 'o1', nome: 'Runas Firmes', mods: [st('atqM', 10), { tipo: 'cura', pct: 10 }], custo: 1, nivel: 3, requer: ['raiz1'], x: 1, y: 1 },
      { id: 'o3', habilidade: 'raizesLentas', custo: 1, nivel: 7, requer: ['raiz2'], x: 3, y: 1 },
      { id: 'o2', habilidade: 'seivaRestauradora', custo: 1, nivel: 5, requer: ['o1'], x: 0, y: 2 },
      { id: 'o4', habilidade: 'cancaoDoVento', custo: 1, nivel: 10, requer: ['o1'], x: 2, y: 2 },
      { id: 'o5', nome: 'Galhos Antigos', mods: [st('defM', 12), st('vida', 10)], custo: 1, nivel: 11, requer: ['o3'], x: 3, y: 2 },
      { id: 'o6', habilidade: 'florescer', custo: 1, nivel: 15, requer: ['o2'], x: 0, y: 3 },
      {
        id: 'o7', nome: 'Voz das Sky Islands', mods: [{ tipo: 'recarga', pct: 10 }, st('velM', 10)],
        custo: 2, nivel: 21, requer: ['o4', 'o6'], x: 1, y: 4,
      },
    ],
  },
};

export function noDaArvore(heroi: PersonagemId, id: string): No | undefined {
  return ARVORES[heroi].nos.find((n) => n.id === id);
}
