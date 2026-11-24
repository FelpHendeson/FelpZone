/**
 * Produção, fusão e itens da F8 (GDD §6.3, §9.1, §9.2, §9.4) [Proposta].
 * Números [Calibrar] (ver `docs/CALIBRACAO.md`).
 */
import type { Modificador } from "../modificadores";
import type { Item, SlotItem } from "./coleta";
import { EQUIPAMENTOS } from "./combate";
import type { Raridade } from "./tipos";

export const OFICIOS_PRODUCAO = ["forja", "alquimia", "culinaria"] as const;
export type OficioProducaoId = (typeof OFICIOS_PRODUCAO)[number];
export const NOME_OFICIO_PRODUCAO: Readonly<Record<OficioProducaoId, string>> = { forja: "Ferreiro", alquimia: "Alquimista", culinaria: "Cozinheiro" };

export const CONFIG_PRODUCAO = Object.freeze({
  /** Intelecto acelera a produção (GDD §5.1): +1% por ponto efetivo. */
  bonusIntelectoPorPonto: 0.01,
});

export const CONFIG_FUSAO = Object.freeze({
  maximo: 3,
  /** Chance base de +0 → +1, +1 → +2, +2 → +3. */
  chance: [0.7, 0.55, 0.4],
  /** Sorte efetiva soma chance (0,3 p.p. por ponto, até +20 p.p.). */
  sortePorPonto: 0.003,
  sorteMaxima: 0.2,
  /** Garantia depois de N falhas seguidas no mesmo item. */
  pity: 3,
  /** Custo em gold: preço de venda do item × fator do nível. */
  fatorOuro: [4, 10, 25],
  /** Material por nível. */
  material: [
    { itemId: "minerio-de-ferro", quantidade: 10 },
    { itemId: "minerio-de-prata", quantidade: 10 },
    { itemId: "cinza-de-alma", quantidade: 10 },
  ],
  /** Cada nível de aprimoramento multiplica os bônus do item. */
  bonusPorNivel: 0.2,
});

export const CONFIG_MOCHILA_EXTRA = Object.freeze({ espacosPorCompra: 5, maximoCompras: 6, precoBase: 500, fator: 3 });

const RARIDADES: readonly Raridade[] = ["comum", "incomum", "raro", "epico", "ancestral", "primordial"];

function eq(id: string, nome: string, descricao: string, slot: SlotItem, tier: 1 | 2 | 3, mods: Omit<Modificador, "origem">[], preco: number, extras: Partial<Item> = {}): Item {
  const origem = { tipo: "equipamento" as const, id };
  return {
    id,
    nome,
    categoria: "equipamento",
    raridade: (["comum", "incomum", "raro", "epico"] as const)[tier],
    descricao,
    preco,
    pilha: 1,
    equipamento: { slot, tier, precoCompra: null, modificadores: mods.map((m) => ({ ...m, origem })) },
    ...extras,
  };
}

/** Acessórios (2 slots) e relíquias (1 slot). */
export const ACESSORIOS: readonly Item[] = [
  eq("anel-de-cobre", "Anel de cobre", "Esverdeia o dedo e acalma o coração.", "acessorio", 1, [{ alvo: "vida", operacao: "somar", valor: 15 }], 40),
  eq("anel-de-prata", "Anel de prata", "Brilha quando algo morto está perto.", "acessorio", 2, [{ alvo: "critico", operacao: "somar", valor: 0.03 }], 200),
  eq("amuleto-de-ambar", "Amuleto de âmbar", "O inseto lá dentro ajuda a procurar.", "acessorio", 2, [{ alvo: "chance-raro", operacao: "percentual", valor: 0.2 }], 220),
  eq("amuleto-de-perola", "Amuleto de pérola", "Fresco ao toque, mesmo no fogo.", "acessorio", 2, [{ alvo: "regeneracao", operacao: "percentual", valor: 0.3 }], 220),
];

export const RELIQUIAS: readonly Item[] = [
  eq("olho-do-rato-rei", "Olho do Rato-Rei", "Vê o que brilha no escuro.", "reliquia", 2, [{ alvo: "chance-raro", operacao: "percentual", valor: 0.25 }], 300, { raridade: "raro" }),
  eq("escama-do-afogador", "Escama do Afogador", "Ainda molhada. Sempre molhada.", "reliquia", 3, [{ alvo: "defesa", operacao: "percentual", valor: 0.08 }], 600),
  eq("coracao-de-casca", "Coração de Casca", "Bate devagar, mas não para.", "reliquia", 3, [{ alvo: "vida", operacao: "percentual", valor: 0.1 }], 600),
  eq("moeda-do-barqueiro", "Moeda do Barqueiro", "Pagamento adiantado de uma viagem que ainda não aconteceu.", "reliquia", 3, [{ alvo: "duracao-limiar", operacao: "percentual", valor: -0.15 }], 0),
].map(nomeado);

/** De onde caem as relíquias (chance por abate). */
export const DROPS_RELIQUIA: Readonly<Record<string, { readonly itemId: string; readonly chance: number }>> = {
  "rato-rei": { itemId: "olho-do-rato-rei", chance: 0.05 },
  "afogador-do-juncal": { itemId: "escama-do-afogador", chance: 0.1 },
  "guardiao-de-casca-negra": { itemId: "coracao-de-casca", chance: 0.1 },
  "o-cobrador": { itemId: "moeda-do-barqueiro", chance: 0.1 },
  "a-rainha-palida": { itemId: "moeda-do-barqueiro", chance: 0.1 },
};

/** Fragmento de chefe (receitas de nomeados). */
export const FRAGMENTO = "fragmento-de-chefe";
export const CHANCE_FRAGMENTO = 0.01;

/** Nomeados (uma unidade por personagem; fora da fusão). */
function nomeado(n: Item): Item {
  const d = n.equipamento!;
  return { ...n, equipamento: { ...d, nomeado: d.nomeado ?? {} } };
}

const LAMINA: Item = {
  ...eq("lamina-desperta", "Lâmina Desperta", "Fala, discorda e cresce com você.", "arma", 2, [], 0),
  raridade: "epico",
  equipamento: { slot: "arma", tier: 2, precoCompra: null, modificadores: [], nomeado: { evoluiComNivel: { alvo: "ataque", base: 4, porNivel: 0.6 } } },
};

export const NOMEADOS: readonly Item[] = [
  LAMINA,
  eq("martelo-do-pai", "Martelo do Pai", "Forjou algo que não devia. Ainda está quente.", "arma", 2, [
    { alvo: "ataque", operacao: "somar", valor: 7 },
    { alvo: "producao.sucesso", operacao: "percentual", valor: 0.15 },
  ], 0, { raridade: "epico" }),
  eq("bussola-quebrada", "Bússola Quebrada", "Aponta para o que vale a pena. Raramente para o norte.", "acessorio", 2, [{ alvo: "chance-raro", operacao: "percentual", valor: 0.3 }], 0, { raridade: "epico" }),
  eq("presa-da-matriarca", "Presa da Matriarca", "Forjada com o que restou da loba mais velha do bosque.", "arma", 3, [
    { alvo: "ataque", operacao: "somar", valor: 24 },
    { alvo: "critico", operacao: "somar", valor: 0.05 },
  ], 0, { raridade: "epico" }),
  eq("coroa-do-afogado", "Coroa do Afogado", "Pesa como água parada.", "elmo", 3, [
    { alvo: "defesa", operacao: "somar", valor: 7 },
    { alvo: "vida", operacao: "somar", valor: 80 },
  ], 0, { raridade: "epico" }),
].map(nomeado);

/** Nomeados que as origens especiais dão de saída (ORIGENS.md). */
export const NOMEADOS_DE_ORIGEM: Readonly<Record<string, string>> = {
  "portador-da-lamina-desperta": "lamina-desperta",
  "filho-do-ferreiro-maldito": "martelo-do-pai",
  "naufrago-das-estrelas": "bussola-quebrada",
};

function consumivel(id: string, nome: string, descricao: string, tipo: "pocao" | "comida", preco: number, cura?: number): Item {
  return { id, nome, categoria: "consumivel", raridade: "comum", descricao, preco, pilha: 50, consumivel: cura === undefined ? { tipo } : { tipo, cura } };
}

export const CONSUMIVEIS: readonly Item[] = [
  consumivel("pocao-de-vida-menor", "Poção de vida menor", "Cura 30% da vida. Usada sozinha no combate com a vida abaixo de 40%.", "pocao", 15, 0.3),
  consumivel("pocao-de-vida", "Poção de vida", "Cura 60% da vida. Usada sozinha no combate com a vida abaixo de 40%.", "pocao", 45, 0.6),
  consumivel("pao-de-trigo", "Pão de trigo", "Duro, honesto, vende bem.", "comida", 8),
  consumivel("ensopado-de-peixe", "Ensopado de peixe", "Quente, escuro e reconfortante.", "comida", 40),
  consumivel("torta-de-abobora", "Torta de abóbora", "Doce como a muralha não é.", "comida", 90),
  consumivel("racao-de-viagem", "Ração de viagem", "Para bichos e para gente sem paladar.", "comida", 6),
];

export const ITENS_PRODUCAO: readonly Item[] = [
  { id: FRAGMENTO, nome: "Fragmento de chefe", categoria: "material", raridade: "raro", descricao: "Lasca de algo que não queria morrer.", preco: 80, pilha: 20 },
];

/** Variantes aprimoradas (+1 a +3) de cada equipamento não nomeado. */
function variantes(): Item[] {
  const lista: Item[] = [];
  for (const base of [...EQUIPAMENTOS, ...ACESSORIOS]) {
    const d = base.equipamento!;
    if (d.tier === 0) continue;
    const i0 = RARIDADES.indexOf(base.raridade);
    for (let n = 1; n <= CONFIG_FUSAO.maximo; n++) {
      const id = `${base.id}+${n}`;
      const fator = 1 + CONFIG_FUSAO.bonusPorNivel * n;
      lista.push({
        ...base,
        id,
        nome: `${base.nome} +${n}`,
        raridade: RARIDADES[Math.min(RARIDADES.length - 1, i0 + n)]!,
        preco: Math.round(base.preco * (1 + n)),
        equipamento: {
          ...d,
          precoCompra: null,
          aprimoramento: n,
          baseId: base.id,
          modificadores: d.modificadores.map((m) => ({ ...m, valor: m.valor * fator, origem: { tipo: "equipamento" as const, id } })),
        },
      });
    }
  }
  return lista;
}
export const VARIANTES: readonly Item[] = variantes();

/** Id do próximo aprimoramento (ou `null` no máximo). */
export function proximoAprimoramento(itemId: string): string | null {
  const m = /^(.*)\+(\d)$/.exec(itemId);
  const base = m ? m[1]! : itemId;
  const n = m ? Number(m[2]) : 0;
  return n >= CONFIG_FUSAO.maximo ? null : `${base}+${n + 1}`;
}

// ---------------------------------------------------------------- Receitas

export interface AtividadeProducao {
  readonly tipo: "producao";
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly oficio: OficioProducaoId;
  readonly localId: string;
  readonly subareaId: string;
  readonly nivelMinimo: number;
  readonly cicloBaseMs: number;
  readonly xpPorCiclo: number;
  readonly xpOficio: number;
  readonly entradas: readonly { readonly itemId: string; readonly quantidade: number }[];
  readonly saida: { readonly itemId: string; readonly quantidade: number };
}

function receita(
  oficio: OficioProducaoId,
  id: string,
  saida: string,
  quantidade: number,
  entradas: [string, number][],
  nivelMinimo: number,
  cicloBaseMs: number,
  xpOficio: number,
): AtividadeProducao {
  const local = { forja: "ferreiro", alquimia: "alquimista", culinaria: "taverna" }[oficio];
  return {
    tipo: "producao",
    id,
    nome: `Produzir: ${saida}`,
    descricao: "",
    oficio,
    localId: "pedravau",
    subareaId: local,
    nivelMinimo,
    cicloBaseMs,
    xpPorCiclo: 5,
    xpOficio,
    entradas: entradas.map(([itemId, q]) => ({ itemId, quantidade: q })),
    saida: { itemId: saida, quantidade },
  };
}

const RECEITAS_BASE: readonly AtividadeProducao[] = [
  // Forja: ferro (tier 2), aço (tier 3, antes só por drop), anéis e nomeados.
  receita("forja", "forjar-espada-de-ferro", "espada-de-ferro", 1, [["minerio-de-ferro", 25], ["tora-de-carvalho", 6]], 1, 60_000, 20),
  receita("forja", "forjar-elmo-de-ferro", "elmo-de-ferro", 1, [["minerio-de-ferro", 15], ["couro-de-lobo", 4]], 1, 60_000, 20),
  receita("forja", "forjar-cota-de-malha", "cota-de-malha", 1, [["minerio-de-ferro", 30], ["couro-de-lobo", 6]], 3, 60_000, 25),
  receita("forja", "forjar-grevas-de-ferro", "grevas-de-ferro", 1, [["minerio-de-ferro", 20], ["couro-de-lobo", 5]], 3, 60_000, 25),
  receita("forja", "forjar-botas-ferradas", "botas-ferradas", 1, [["minerio-de-ferro", 14], ["couro-de-lobo", 5]], 1, 60_000, 20),
  receita("forja", "forjar-espada-de-aco-escuro", "espada-de-aco-escuro", 1, [["minerio-de-prata", 30], ["tora-de-carvalho-escuro", 15], ["lodo-de-afogado", 10]], 12, 120_000, 60),
  receita("forja", "forjar-couraca-de-aco", "couraca-de-aco", 1, [["minerio-de-prata", 40], ["pedra-do-poco", 15]], 12, 120_000, 60),
  receita("forja", "forjar-anel-de-cobre", "anel-de-cobre", 1, [["minerio-de-cobre", 10]], 1, 45_000, 15),
  receita("forja", "forjar-anel-de-prata", "anel-de-prata", 1, [["minerio-de-prata", 8], ["escama-de-juncal", 3]], 8, 60_000, 35),
  receita("forja", "forjar-presa-da-matriarca", "presa-da-matriarca", 1, [[FRAGMENTO, 3], ["ambar-antigo", 5], ["espada-de-ferro+2", 1]], 15, 300_000, 200),
  receita("forja", "forjar-coroa-do-afogado", "coroa-do-afogado", 1, [[FRAGMENTO, 4], ["perola-turva", 5], ["elmo-de-ferro+2", 1]], 18, 300_000, 200),
  // Alquimia: poções e amuletos.
  receita("alquimia", "preparar-pocao-de-vida-menor", "pocao-de-vida-menor", 2, [["lambari", 4], ["trigo", 2]], 1, 30_000, 8),
  receita("alquimia", "preparar-pocao-de-vida", "pocao-de-vida", 2, [["peixe-lua", 2], ["seiva-negra", 2]], 10, 45_000, 20),
  receita("alquimia", "preparar-amuleto-de-ambar", "amuleto-de-ambar", 1, [["ambar-antigo", 2], ["minerio-de-prata", 1]], 6, 90_000, 40),
  receita("alquimia", "preparar-amuleto-de-perola", "amuleto-de-perola", 1, [["perola-turva", 2], ["minerio-de-prata", 1]], 6, 90_000, 40),
  // Culinária: comida (vende melhor que os ingredientes; ração para os pets da F10).
  receita("culinaria", "assar-pao", "pao-de-trigo", 2, [["trigo", 4]], 1, 20_000, 5),
  receita("culinaria", "cozinhar-ensopado", "ensopado-de-peixe", 1, [["tilapia-do-lago", 3], ["batata", 2]], 5, 40_000, 12),
  receita("culinaria", "assar-torta", "torta-de-abobora", 1, [["abobora-de-muro", 3], ["trigo", 2]], 12, 60_000, 25),
  receita("culinaria", "preparar-racao", "racao-de-viagem", 3, [["lambari", 2], ["trigo", 2]], 1, 20_000, 5),
];

export const ITENS_F8: readonly Item[] = [...ACESSORIOS, ...RELIQUIAS, ...NOMEADOS, ...CONSUMIVEIS, ...ITENS_PRODUCAO, ...VARIANTES];

const VERBO: Readonly<Record<OficioProducaoId, string>> = { forja: "Forjar", alquimia: "Preparar", culinaria: "Cozinhar" };
const NOMES = new Map([...EQUIPAMENTOS, ...ITENS_F8].map((i) => [i.id, i.nome]));

/** Receitas de produção (Ferreiro, Alquimista e Taverna, em Pedravau). */
export const RECEITAS: readonly AtividadeProducao[] = RECEITAS_BASE.map((r) => {
  const nome = NOMES.get(r.saida.itemId) ?? r.saida.itemId;
  return { ...r, nome: `${VERBO[r.oficio]}: ${nome}${r.saida.quantidade > 1 ? ` (×${r.saida.quantidade})` : ""}`, descricao: `Transforma materiais em ${nome.toLowerCase()}.` };
});
