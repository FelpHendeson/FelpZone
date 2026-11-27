/**
 * Status treináveis (GDD §5.1), perfil numérico de cada raça e atividades de
 * treino (GDD §6.1). Todos os números são [Calibrar] (ver `docs/CALIBRACAO.md`).
 */
export const STATUS = ["vigor", "forca", "resistencia", "agilidade", "intelecto", "espirito", "percepcao", "sorte"] as const;
export type StatusId = (typeof STATUS)[number];

export const NOME_STATUS: Readonly<Record<StatusId, string>> = {
  vigor: "Vigor",
  forca: "Força",
  resistencia: "Resistência",
  agilidade: "Agilidade",
  intelecto: "Intelecto",
  espirito: "Espírito",
  percepcao: "Percepção",
  sorte: "Sorte",
};

export interface PerfilRaca {
  /** Teto de cada status no nível 1 (antes de modificadores). */
  readonly base: Readonly<Record<StatusId, number>>;
  /** Piso = fração × teto (GDD §5.2). Humano alto, Draconato baixo. */
  readonly fracaoPiso: number;
}

function perfil(padrao: number, fracaoPiso: number, destaques: Partial<Record<StatusId, number>>): PerfilRaca {
  const base = {} as Record<StatusId, number>;
  for (const s of STATUS) base[s] = destaques[s] ?? padrao;
  return { base, fracaoPiso };
}

/**
 * Perfis por raça, coerentes com o texto `perfil` da F1: destaque 13, fraqueza 7,
 * resto 10. Draconato tem teto geral maior e piso menor ("cresce devagar, vai
 * longe"); Humano, piso maior e nenhum destaque ("equilibrado").
 */
export const PERFIS_RACA: Readonly<Record<string, PerfilRaca>> = {
  humano: perfil(10, 0.65, {}),
  anao: perfil(10, 0.55, { vigor: 13, resistencia: 13, agilidade: 7 }),
  elfo: perfil(10, 0.55, { percepcao: 13, intelecto: 13, vigor: 7 }),
  orc: perfil(10, 0.55, { forca: 13, vigor: 13, intelecto: 7 }),
  lobisomem: perfil(10, 0.55, { agilidade: 13, percepcao: 12, forca: 12, espirito: 7 }),
  "sangue-palido": perfil(10, 0.55, { intelecto: 13, espirito: 13, vigor: 8 }),
  draconato: perfil(11, 0.45, { forca: 14, resistencia: 14, espirito: 14 }),
  silfo: perfil(10, 0.5, { agilidade: 13, espirito: 12, sorte: 13, resistencia: 7 }),
};


export interface AtividadeTreino {
  readonly tipo: "treino";
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly status: StatusId;
  readonly nivel: 1 | 2 | 3;
  readonly fatorDeGanho: number;
  readonly requisito?: { readonly contador: string; readonly ciclos: number };
  /** Duração base de um ciclo, em ms (antes da velocidade). */
  readonly cicloBaseMs: number;
  /** XP do personagem por ciclo completo. */
  readonly xpPorCiclo: number;
  /** Desde a F3, todo treino acontece no Campo de Treino de Pedravau. */
  readonly localId: string;
  readonly subareaId: string;
}

export const CICLO_TREINO_INICIAL_MS = 6_000;

function treino(status: StatusId, id: string, nome: string, descricao: string): AtividadeTreino {
  return { tipo: "treino", id, nome, descricao, status, nivel: 1, fatorDeGanho: CICLO_TREINO_INICIAL_MS / 30_000, cicloBaseMs: CICLO_TREINO_INICIAL_MS, xpPorCiclo: 2, localId: "pedravau", subareaId: "campo-de-treino" };
}

export const ATIVIDADES_TREINO: readonly AtividadeTreino[] = [
  treino("vigor", "corrida-de-folego", "Corrida de fôlego", "Voltas na muralha até o pulmão reclamar."),
  treino("forca", "levantamento-de-pedras", "Levantamento de pedras", "Pedras do rio, cada dia uma maior."),
  treino("resistencia", "treino-de-impacto", "Treino de impacto", "Apanhar de um boneco de treino que bate de volta."),
  treino("agilidade", "circuito-de-obstaculos", "Circuito de obstáculos", "Cordas, troncos e um cachorro mal-humorado."),
  treino("intelecto", "estudo-de-tomos", "Estudo de tomos", "Livros velhos com anotações de alguém que morreu cedo."),
  treino("espirito", "meditacao", "Meditação", "Silêncio, respiração e a voz que não deveria estar ali."),
  treino("percepcao", "vigilia-na-torre", "Vigília na torre", "Contar quem entra e sai da cidade, de madrugada."),
  treino("sorte", "jogos-na-taverna", "Jogos na taverna", "Dados viciados, mas não por você."),
];

const TREINOS_AVANCADOS: readonly AtividadeTreino[] = ATIVIDADES_TREINO.flatMap((base) => ([
  { nivel: 2, cicloBaseMs: 8_000, xpPorCiclo: 3, requisito: { contador: base.status, ciclos: 10 } },
  { nivel: 3, cicloBaseMs: 10_000, xpPorCiclo: 4, requisito: { contador: `${base.id}-2`, ciclos: 25 } },
] as const).map((nivel) => ({
  ...base,
  ...nivel,
  id: `${base.id}-${nivel.nivel}`,
  nome: `${base.nome} · Nível ${nivel.nivel}`,
  fatorDeGanho: nivel.xpPorCiclo / 10,
})));

export const TODOS_OS_TREINOS = [...ATIVIDADES_TREINO, ...TREINOS_AVANCADOS] as const;
