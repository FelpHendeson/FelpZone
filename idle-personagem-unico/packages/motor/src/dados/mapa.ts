/**
 * Mapa do Ato I (GDD §8) [Proposta]: 1 região, 4 locais. Dentro de um local o
 * movimento é instantâneo; entre locais há viagem curta (≤ 10 s) [Autor].
 */

export type TipoSubarea = "estabelecimento" | "treino" | "coleta" | "passagem";

export interface Subarea {
  readonly id: string;
  readonly nome: string;
  readonly tipo: TipoSubarea;
  readonly descricao: string;
}

export interface Local {
  readonly id: string;
  readonly nome: string;
  readonly regiaoId: string;
  readonly tipo: "cidade" | "floresta" | "mina" | "lago";
  /** Local natural (vale para Passo Silvestre, do Elfo). */
  readonly natural: boolean;
  readonly descricao: string;
  readonly subareas: readonly Subarea[];
}

export interface Regiao {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
}

export const REGIOES: readonly Regiao[] = [
  {
    id: "vale-de-pedravau",
    nome: "Vale de Pedravau",
    descricao: "Um vale de neblina baixa, onde tudo que presta foi minerado, pescado ou cortado por alguém que já morreu.",
  },
];

export const LOCAIS: readonly Local[] = [
  {
    id: "pedravau",
    nome: "Pedravau",
    regiaoId: "vale-de-pedravau",
    tipo: "cidade",
    natural: false,
    descricao: "Cidade murada e cansada. Tem de tudo, inclusive quem cobre caro por isso.",
    subareas: [
      { id: "praca", nome: "Praça", tipo: "passagem", descricao: "Fonte seca, pombos e notícias erradas." },
      { id: "mercado", nome: "Mercado", tipo: "estabelecimento", descricao: "Compra quase tudo, por quase nada." },
      { id: "ferreiro", nome: "Ferreiro", tipo: "estabelecimento", descricao: "Vende ferramentas e opiniões não pedidas." },
      { id: "campo-de-treino", nome: "Campo de Treino", tipo: "treino", descricao: "Onde se treina corpo, mente e paciência." },
      { id: "hortas", nome: "Hortas do Muro", tipo: "coleta", descricao: "Canteiros encostados na muralha." },
      { id: "guilda", nome: "Guilda de Aventureiros", tipo: "estabelecimento", descricao: "Fechada para reforma até a F7." },
      { id: "taverna", nome: "Taverna do Corvo Torto", tipo: "estabelecimento", descricao: "Cerveja morna e boatos quentes." },
    ],
  },
  {
    id: "bosque-raso",
    nome: "Bosque Raso",
    regiaoId: "vale-de-pedravau",
    tipo: "floresta",
    natural: true,
    descricao: "Árvores velhas que rangem como se reclamassem de quem chega.",
    subareas: [
      { id: "orla", nome: "Orla do Bosque", tipo: "coleta", descricao: "Pinheiros e carvalhos ao alcance da cidade." },
      { id: "clareira-funda", nome: "Clareira Funda", tipo: "coleta", descricao: "Onde o carvalho fica escuro e o silêncio, pesado." },
    ],
  },
  {
    id: "mina-velha",
    nome: "Mina Velha",
    regiaoId: "vale-de-pedravau",
    tipo: "mina",
    natural: true,
    descricao: "Abandonada duas vezes. Ninguém conta por quê.",
    subareas: [
      { id: "galeria-alta", nome: "Galeria Alta", tipo: "coleta", descricao: "Veios rasos, ar respirável." },
      { id: "galeria-funda", nome: "Galeria Funda", tipo: "coleta", descricao: "Veios ricos, ar discutível." },
    ],
  },
  {
    id: "lago-espelho",
    nome: "Lago Espelho",
    regiaoId: "vale-de-pedravau",
    tipo: "lago",
    natural: true,
    descricao: "Tão parado que reflete coisas que não estão na margem.",
    subareas: [
      { id: "margem", nome: "Margem", tipo: "coleta", descricao: "Pesca fácil, peixe pequeno." },
      { id: "pier-quebrado", nome: "Píer Quebrado", tipo: "coleta", descricao: "Águas fundas e peixes que encaram de volta." },
    ],
  },
];

export const LOCAL_INICIAL = { localId: "pedravau", subareaId: "praca" } as const;

/** Viagem base entre locais, em ms [Calibrar]. Simétrica; sempre de 3 a 10 s. */
const VIAGEM_BASE_S: Readonly<Record<string, number>> = {
  "bosque-raso|pedravau": 4,
  "lago-espelho|pedravau": 5,
  "mina-velha|pedravau": 6,
  "bosque-raso|lago-espelho": 4,
  "bosque-raso|mina-velha": 8,
  "lago-espelho|mina-velha": 9,
};

/** Duração base da viagem entre dois locais (0 no mesmo local). */
export function viagemBaseMs(origem: string, destino: string): number {
  if (origem === destino) return 0;
  const chave = [origem, destino].sort().join("|");
  const s = VIAGEM_BASE_S[chave];
  if (s === undefined) throw new RangeError(`Sem rota entre ${origem} e ${destino}.`);
  return s * 1000;
}
