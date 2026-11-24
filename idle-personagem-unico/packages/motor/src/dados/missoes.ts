/**
 * Missões e Guilda (GDD §11) [Autor: tipos e ranks; conteúdo e números: Proposta].
 * Metas próprias (só XP), missões de NPC (XP, gold e itens) e da Guilda
 * (XP, gold, Mérito e itens). Números [Calibrar].
 */
import type { StatusId } from "./status";
import type { OficioId } from "./coleta";

/** Ranks da guilda [Autor]. O Ato I vai até S; o resto fica para os próximos Atos. */
export const RANKS = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS", "Lendário", "Mítico", "Supremo", "Divino"] as const;
export const RANK_MAXIMO_ATO_I = 6; // S

export const CONFIG_GUILDA = Object.freeze({
  /** Mérito para subir do rank r para r+1 (Ato I). */
  meritoParaSubir: [100, 250, 500, 900, 1_500, 2_500],
  /** Bônus por rank: desconto em compras e rendimento de coleta. */
  descontoPorRank: 0.02,
  coletaPorRank: 0.02,
  /** Missões da guilda voltam ao quadro depois disto (tempo do jogo). */
  esperaRepetivelMs: 20 * 60 * 60_000,
  maximoAtivas: 10,
});

export type Objetivo =
  | { readonly tipo: "abater"; readonly monstros: readonly string[]; readonly quantidade: number }
  | { readonly tipo: "obter"; readonly itens: readonly string[]; readonly quantidade: number }
  | { readonly tipo: "treinar"; readonly status?: StatusId; readonly ciclos: number }
  | { readonly tipo: "nivel"; readonly nivel: number }
  | { readonly tipo: "oficio"; readonly oficio?: OficioId; readonly nivel: number }
  | { readonly tipo: "maestria"; readonly maestria: number }
  | { readonly tipo: "limiar"; readonly vezes: number };

export interface Recompensa {
  readonly xp: number;
  readonly ouro: number;
  readonly merito: number;
  readonly itens: readonly { readonly itemId: string; readonly quantidade: number }[];
}

export type TipoMissao = "meta" | "npc" | "guilda" | "prova";

export interface Missao {
  readonly id: string;
  readonly tipo: TipoMissao;
  readonly titulo: string;
  readonly descricao: string;
  /** NPC que dá e recebe a missão (tipo "npc"). */
  readonly npcId?: string;
  /** Guilda: rank do quadro; prova: rank de origem da promoção. */
  readonly rank?: number;
  readonly requisitos: { readonly missoes?: readonly string[]; readonly nivel?: number };
  readonly objetivo: Objetivo;
  readonly recompensa: Recompensa;
  readonly repetivel?: boolean;
}

export interface Npc {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly localId: string;
  readonly subareaId: string;
}

export const NPCS: readonly Npc[] = [
  { id: "iolanda", nome: "Velha Iolanda", descricao: "Dona da Taverna do Corvo Torto. Sabe de tudo e cobra por metade.", localId: "pedravau", subareaId: "taverna" },
  { id: "brom", nome: "Brom, o ferreiro", descricao: "Martela mais forte quando discorda de você.", localId: "pedravau", subareaId: "ferreiro" },
  { id: "tico", nome: "Tico", descricao: "Vende no Mercado o que ninguém sabe de onde veio.", localId: "pedravau", subareaId: "mercado" },
  { id: "pescador-mudo", nome: "O Pescador Mudo", descricao: "Não fala. Aponta. Geralmente para a água.", localId: "lago-espelho", subareaId: "margem" },
];

const R = (xp: number, ouro = 0, merito = 0, itens: Recompensa["itens"] = []): Recompensa => ({ xp, ouro, merito, itens });
const COLETA_QUALQUER = ["tora-de-pinho", "tora-de-carvalho", "tora-de-carvalho-escuro", "minerio-de-cobre", "minerio-de-ferro", "minerio-de-prata", "lambari", "tilapia-do-lago", "peixe-lua", "trigo", "batata", "abobora-de-muro"];
const CHEFES = ["velha-matriarca", "a-ninhada", "afogador-do-juncal", "guardiao-de-casca-negra", "senhora-do-fundo", "o-que-cava"];

/** Metas próprias: tutorial encadeado, só XP. A primeira já começa ativa. */
type Base = Omit<Missao, "tipo" | "requisitos">;
const METAS_BASE: readonly Base[] = [
  { id: "meta-primeiro-suor", titulo: "Primeiro suor", descricao: "Complete 10 ciclos de treino.", objetivo: { tipo: "treinar", ciclos: 10 }, recompensa: R(150) },
  { id: "meta-nivel-3", titulo: "Pegando o jeito", descricao: "Chegue ao nível 3.", objetivo: { tipo: "nivel", nivel: 3 }, recompensa: R(200) },
  { id: "meta-mao-na-terra", titulo: "Mão na terra", descricao: "Obtenha 50 recursos de coleta.", objetivo: { tipo: "obter", itens: COLETA_QUALQUER, quantidade: 50 }, recompensa: R(300) },
  { id: "meta-primeiro-sangue", titulo: "Primeiro sangue", descricao: "Abata 20 monstros.", objetivo: { tipo: "abater", monstros: [], quantidade: 20 }, recompensa: R(400) },
  { id: "meta-oficio-5", titulo: "Ofício de verdade", descricao: "Leve um ofício ao nível 5.", objetivo: { tipo: "oficio", nivel: 5 }, recompensa: R(500) },
  { id: "meta-nivel-10", titulo: "Dez", descricao: "Chegue ao nível 10.", objetivo: { tipo: "nivel", nivel: 10 }, recompensa: R(1_200) },
  { id: "meta-maestria-10", titulo: "Segunda natureza", descricao: "Leve uma habilidade à maestria 10.", objetivo: { tipo: "maestria", maestria: 10 }, recompensa: R(1_500) },
  { id: "meta-chefe", titulo: "Cabeça de chefe", descricao: "Abata um chefe de área.", objetivo: { tipo: "abater", monstros: CHEFES, quantidade: 1 }, recompensa: R(2_000) },
  { id: "meta-voltar", titulo: "Ida e volta", descricao: "Volte do Limiar uma vez (morrer conta).", objetivo: { tipo: "limiar", vezes: 1 }, recompensa: R(1_000) },
  { id: "meta-nivel-20", titulo: "Vinte", descricao: "Chegue ao nível 20.", objetivo: { tipo: "nivel", nivel: 20 }, recompensa: R(5_000) },
];
const METAS: readonly Missao[] = METAS_BASE.map((m, i, todas) => ({ ...m, tipo: "meta", requisitos: i === 0 ? {} : { missoes: [todas[i - 1]!.id] } }));

/** Missões de NPC: cadeias curtas (cada uma pede a anterior). */
const DE_NPC_BASE: readonly Omit<Missao, "tipo">[] = [
  { id: "iolanda-1", npcId: "iolanda", titulo: "Cozinha vazia", descricao: "“Trigo, querida. Cinquenta. Ontem.”", requisitos: {}, objetivo: { tipo: "obter", itens: ["trigo"], quantidade: 50 }, recompensa: R(250, 150) },
  { id: "iolanda-2", npcId: "iolanda", titulo: "Lobos no caminho", descricao: "“Os lobos comem os meus fornecedores. Dê um jeito.”", requisitos: { missoes: ["iolanda-1"] }, objetivo: { tipo: "abater", monstros: ["lobo-cinzento"], quantidade: 30 }, recompensa: R(500, 300, 0, [{ itemId: "capuz-de-couro", quantidade: 1 }]) },
  { id: "iolanda-3", npcId: "iolanda", titulo: "O rei dos ratos", descricao: "“Dizem que tem um rato que manda nos outros. Traga a coroa dele. Ou o que sobrar.”", requisitos: { missoes: ["iolanda-2"], nivel: 8 }, objetivo: { tipo: "abater", monstros: ["rato-rei"], quantidade: 1 }, recompensa: R(1_200, 600, 0, [{ itemId: "livro-grito-de-guerra", quantidade: 1 }]) },
  { id: "brom-1", npcId: "brom", titulo: "Ferro para a forja", descricao: "“Minério de ferro. Quarenta. E não me olhe assim.”", requisitos: { nivel: 5 }, objetivo: { tipo: "obter", itens: ["minerio-de-ferro"], quantidade: 40 }, recompensa: R(800, 500, 0, [{ itemId: "espada-de-ferro", quantidade: 1 }]) },
  { id: "brom-2", npcId: "brom", titulo: "Prata que fere", descricao: "“Prata. Vinte. Tem coisa na mina que só morre com ela.”", requisitos: { missoes: ["brom-1"] }, objetivo: { tipo: "obter", itens: ["minerio-de-prata"], quantidade: 20 }, recompensa: R(2_000, 1_500, 0, [{ itemId: "elmo-de-ferro", quantidade: 1 }]) },
  { id: "tico-1", npcId: "tico", titulo: "Pérola para a noiva", descricao: "“Uma pérola. Não precisa ser bonita. A noiva também não é.”", requisitos: {}, objetivo: { tipo: "obter", itens: ["perola-turva"], quantidade: 1 }, recompensa: R(300, 400) },
  { id: "tico-2", npcId: "tico", titulo: "Âmbar com inseto", descricao: "“O inseto tem que piscar. É o que vende.”", requisitos: { missoes: ["tico-1"] }, objetivo: { tipo: "obter", itens: ["ambar-antigo"], quantidade: 3 }, recompensa: R(600, 900, 0, [{ itemId: "livro-olhos-atentos", quantidade: 1 }]) },
  { id: "pescador-1", npcId: "pescador-mudo", titulo: "Isca", descricao: "Ele aponta para os lambaris. Depois para você. Depois para os lambaris.", requisitos: {}, objetivo: { tipo: "obter", itens: ["lambari"], quantidade: 30 }, recompensa: R(250, 100, 0, [{ itemId: "livro-manual-do-pescador", quantidade: 1 }]) },
  { id: "pescador-2", npcId: "pescador-mudo", titulo: "O que mora no juncal", descricao: "Ele aponta para o Juncal Escuro e faz um gesto de pescoço cortado.", requisitos: { missoes: ["pescador-1"], nivel: 10 }, objetivo: { tipo: "abater", monstros: ["afogador-do-juncal"], quantidade: 1 }, recompensa: R(2_500, 1_200) },
];
const DE_NPC: readonly Missao[] = DE_NPC_BASE.map((m) => ({ ...m, tipo: "npc" }));

/** Quadro da Guilda: por rank, repetíveis. Áreas e tiers acompanham o rank. */
const AREAS_POR_RANK: readonly { readonly area: string; readonly monstros: readonly string[]; readonly item: string; readonly chefe: string }[] = [
  { area: "Trilha dos Lobos", monstros: ["lobo-cinzento", "javali-magro"], item: "tora-de-pinho", chefe: "velha-matriarca" },
  { area: "Galeria dos Ratos", monstros: ["rato-de-mina", "morcego-de-veio"], item: "minerio-de-cobre", chefe: "a-ninhada" },
  { area: "Juncal Escuro", monstros: ["garca-ladra", "sapo-cao"], item: "tilapia-do-lago", chefe: "afogador-do-juncal" },
  { area: "Coração do Bosque", monstros: ["aranha-de-casca", "galho-raivoso"], item: "tora-de-carvalho", chefe: "guardiao-de-casca-negra" },
  { area: "Margem Afogada", monstros: ["enguia-navalha", "afogado"], item: "peixe-lua", chefe: "senhora-do-fundo" },
  { area: "Poço sem Fundo", monstros: ["larva-de-pedra", "mineiro-que-nao-saiu"], item: "minerio-de-prata", chefe: "o-que-cava" },
  { area: "Poço sem Fundo", monstros: ["larva-de-pedra", "mineiro-que-nao-saiu"], item: "abobora-de-muro", chefe: "o-que-cava" },
];

function quadro(): Missao[] {
  const lista: Missao[] = [];
  AREAS_POR_RANK.forEach((a, rank) => {
    const r = RANKS[rank]!;
    const escala = 1 + rank;
    lista.push(
      { id: `guilda-${r}-caca`, tipo: "guilda", rank, titulo: `Caça em ${a.area}`, descricao: `Contrato de rank ${r}: limpar ${a.area}.`, requisitos: {}, objetivo: { tipo: "abater", monstros: a.monstros, quantidade: 40 + 10 * rank }, recompensa: R(300 * escala, 150 * escala, 25 + 10 * rank), repetivel: true },
      { id: `guilda-${r}-coleta`, tipo: "guilda", rank, titulo: `Encomenda de ${a.item.replace(/-/g, " ")}`, descricao: `Contrato de rank ${r}: entregar recursos ao armazém da guilda.`, requisitos: {}, objetivo: { tipo: "obter", itens: [a.item], quantidade: 60 + 20 * rank }, recompensa: R(250 * escala, 120 * escala, 20 + 10 * rank), repetivel: true },
      { id: `guilda-${r}-treino`, tipo: "guilda", rank, titulo: "Instrução de recrutas", descricao: `Contrato de rank ${r}: mostrar serviço no Campo de Treino.`, requisitos: {}, objetivo: { tipo: "treinar", ciclos: 30 + 10 * rank }, recompensa: R(200 * escala, 80 * escala, 15 + 5 * rank), repetivel: true },
    );
    // Prova de promoção (de r para r+1), até chegar em S.
    if (rank < RANK_MAXIMO_ATO_I) {
      lista.push({
        id: `prova-${r}`,
        tipo: "prova",
        rank,
        titulo: `Prova de promoção a ${RANKS[rank + 1]}`,
        descricao: `Derrote o chefe de ${a.area} e volte para contar.`,
        requisitos: {},
        objetivo: { tipo: "abater", monstros: [a.chefe], quantidade: 1 },
        recompensa: R(500 * escala, 0, 0),
      });
    }
  });
  return lista;
}

export const MISSOES: readonly Missao[] = [...METAS, ...DE_NPC, ...quadro()];
export const PRIMEIRA_META = METAS[0]!.id;
