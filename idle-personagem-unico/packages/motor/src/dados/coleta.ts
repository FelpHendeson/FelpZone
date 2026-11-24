/**
 * Ofícios de coleta, itens, ferramentas e recursos (GDD §6.2, §9.2, §9.3).
 * Números [Calibrar] (ver `docs/CALIBRACAO.md`).
 */
import type { Modificador } from "../modificadores";
import type { Raridade } from "./tipos";

export const OFICIOS = ["lenhador", "mineracao", "pesca", "agricultura"] as const;
export type OficioId = (typeof OFICIOS)[number];

export const NOME_OFICIO: Readonly<Record<OficioId, string>> = {
  lenhador: "Lenhador",
  mineracao: "Minerador",
  pesca: "Pescador",
  agricultura: "Fazendeiro",
};

export type CategoriaItem = "material" | "raro" | "equipamento" | "livro";

/** Slots de combate da F4 (manoplas, mão secundária, acessórios e relíquia vêm depois). */
export const SLOTS = ["arma", "elmo", "peitoral", "calcas", "botas"] as const;
export type Slot = (typeof SLOTS)[number];

export const NOME_SLOT: Readonly<Record<Slot, string>> = { arma: "Arma", elmo: "Elmo", peitoral: "Peitoral", calcas: "Calças", botas: "Botas" };

export interface DadosEquipamento {
  readonly slot: Slot;
  /** 0 = kit inicial; 1–3 = tiers das áreas. */
  readonly tier: 0 | 1 | 2 | 3;
  /** Preço no Ferreiro; `null` = só por drop (ou kit). */
  readonly precoCompra: number | null;
  readonly modificadores: readonly Modificador[];
}

export interface Item {
  readonly id: string;
  readonly nome: string;
  readonly categoria: CategoriaItem;
  readonly raridade: Raridade;
  readonly descricao: string;
  /** Preço de venda ao Mercado, em gold. */
  readonly preco: number;
  /** Quantos cabem num espaço da mochila. */
  readonly pilha: number;
  readonly equipamento?: DadosEquipamento;
  /** Livro: ensina a habilidade ao ser lido (F5). `precoCompra` é o preço no Mercado. */
  readonly livro?: { readonly habilidadeId: string; readonly precoCompra: number };
}

export interface Ferramenta {
  readonly id: string;
  readonly nome: string;
  readonly oficio: OficioId;
  readonly grau: 1 | 2 | 3;
  readonly raridade: Raridade;
  /** Multiplica a quantidade coletada por ciclo. */
  readonly eficiencia: number;
  /** Multiplica a velocidade do ciclo. */
  readonly velocidade: number;
  /** Preço no Ferreiro (0 = kit inicial, não se compra). */
  readonly preco: number;
  /** Nível do ofício exigido para comprar. */
  readonly nivelMinimo: number;
}

const PILHA = 100;

export const ITENS: readonly Item[] = [
  { id: "tora-de-pinho", nome: "Tora de pinho", categoria: "material", raridade: "comum", descricao: "Leve, reta e cheia de nós.", preco: 2, pilha: PILHA },
  { id: "tora-de-carvalho", nome: "Tora de carvalho", categoria: "material", raridade: "comum", descricao: "Madeira séria, para gente séria.", preco: 5, pilha: PILHA },
  { id: "tora-de-carvalho-escuro", nome: "Tora de carvalho escuro", categoria: "material", raridade: "incomum", descricao: "Escura por dentro. Ninguém gosta de saber por quê.", preco: 12, pilha: PILHA },
  { id: "minerio-de-cobre", nome: "Minério de cobre", categoria: "material", raridade: "comum", descricao: "Esverdeia nas mãos.", preco: 2, pilha: PILHA },
  { id: "minerio-de-ferro", nome: "Minério de ferro", categoria: "material", raridade: "comum", descricao: "Pesado e confiável.", preco: 5, pilha: PILHA },
  { id: "minerio-de-prata", nome: "Minério de prata", categoria: "material", raridade: "incomum", descricao: "Fere coisas que não deviam existir.", preco: 12, pilha: PILHA },
  { id: "lambari", nome: "Lambari", categoria: "material", raridade: "comum", descricao: "Pequeno, muitos, resignados.", preco: 2, pilha: PILHA },
  { id: "tilapia-do-lago", nome: "Tilápia do lago", categoria: "material", raridade: "comum", descricao: "Encara o pescador com desdém.", preco: 5, pilha: PILHA },
  { id: "peixe-lua", nome: "Peixe-lua", categoria: "material", raridade: "incomum", descricao: "Brilha fraco no escuro do balde.", preco: 12, pilha: PILHA },
  { id: "trigo", nome: "Trigo", categoria: "material", raridade: "comum", descricao: "Pão, cerveja e esperança.", preco: 2, pilha: PILHA },
  { id: "batata", nome: "Batata", categoria: "material", raridade: "comum", descricao: "Sobrevive a tudo, inclusive à culinária local.", preco: 5, pilha: PILHA },
  { id: "abobora-de-muro", nome: "Abóbora de muro", categoria: "material", raridade: "incomum", descricao: "Cresce encostada na muralha, como se quisesse fugir.", preco: 12, pilha: PILHA },
  { id: "ambar-antigo", nome: "Âmbar antigo", categoria: "raro", raridade: "raro", descricao: "Tem um inseto dentro. Ele pisca.", preco: 60, pilha: 20 },
  { id: "geodo-oco", nome: "Geodo oco", categoria: "raro", raridade: "raro", descricao: "Cristais por dentro e um eco que não é seu.", preco: 60, pilha: 20 },
  { id: "perola-turva", nome: "Pérola turva", categoria: "raro", raridade: "raro", descricao: "Achada na barriga de um peixe que sorria.", preco: 60, pilha: 20 },
  { id: "semente-dourada", nome: "Semente dourada", categoria: "raro", raridade: "raro", descricao: "Ninguém sabe o que nasce dela. Melhor vender.", preco: 60, pilha: 20 },
];

function ferramentas(oficio: OficioId, nomes: readonly [string, string, string]): Ferramenta[] {
  return [
    { id: `${oficio}-basica`, nome: nomes[0], oficio, grau: 1, raridade: "comum", eficiencia: 1, velocidade: 1, preco: 0, nivelMinimo: 1 },
    { id: `${oficio}-de-ferro`, nome: nomes[1], oficio, grau: 2, raridade: "incomum", eficiencia: 1.25, velocidade: 1.1, preco: 400, nivelMinimo: 5 },
    { id: `${oficio}-de-aco`, nome: nomes[2], oficio, grau: 3, raridade: "raro", eficiencia: 1.5, velocidade: 1.2, preco: 2_500, nivelMinimo: 15 },
  ];
}

export const FERRAMENTAS: readonly Ferramenta[] = [
  ...ferramentas("lenhador", ["Machado gasto", "Machado de ferro", "Machado de aço"]),
  ...ferramentas("mineracao", ["Picareta gasta", "Picareta de ferro", "Picareta de aço"]),
  ...ferramentas("pesca", ["Vara remendada", "Vara com anzol de ferro", "Vara de aço flexível"]),
  ...ferramentas("agricultura", ["Enxada torta", "Enxada de ferro", "Foice e enxada de aço"]),
];

export interface AtividadeColeta {
  readonly tipo: "coleta";
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly oficio: OficioId;
  readonly tier: 1 | 2 | 3;
  readonly localId: string;
  readonly subareaId: string;
  readonly nivelMinimo: number;
  readonly cicloBaseMs: number;
  /** XP do personagem por ciclo. */
  readonly xpPorCiclo: number;
  readonly xpOficio: number;
  readonly itemId: string;
  /** Quantidade média por ciclo antes da ferramenta. */
  readonly rendimentoBase: number;
  /** Achado raro: item e chance base por ciclo. */
  readonly raro: { readonly itemId: string; readonly chanceBase: number };
}

function coleta(
  oficio: OficioId,
  tier: 1 | 2 | 3,
  id: string,
  nome: string,
  descricao: string,
  localId: string,
  subareaId: string,
  itemId: string,
  raroId: string,
): AtividadeColeta {
  const porTier = { 1: [1, 30_000, 5], 2: [10, 36_000, 9], 3: [20, 42_000, 14] } as const;
  const [nivelMinimo, cicloBaseMs, xpOficio] = porTier[tier];
  return {
    tipo: "coleta",
    id,
    nome,
    descricao,
    oficio,
    tier,
    localId,
    subareaId,
    nivelMinimo,
    cicloBaseMs,
    xpPorCiclo: 5,
    xpOficio,
    itemId,
    rendimentoBase: 1,
    raro: { itemId: raroId, chanceBase: 0.01 },
  };
}

export const ATIVIDADES_COLETA: readonly AtividadeColeta[] = [
  coleta("lenhador", 1, "cortar-pinho", "Cortar pinho", "Pinheiros finos da orla.", "bosque-raso", "orla", "tora-de-pinho", "ambar-antigo"),
  coleta("lenhador", 2, "cortar-carvalho", "Cortar carvalho", "Carvalhos de tronco grosso.", "bosque-raso", "orla", "tora-de-carvalho", "ambar-antigo"),
  coleta("lenhador", 3, "cortar-carvalho-escuro", "Cortar carvalho escuro", "Só existe na Clareira Funda.", "bosque-raso", "clareira-funda", "tora-de-carvalho-escuro", "ambar-antigo"),
  coleta("mineracao", 1, "minerar-cobre", "Minerar cobre", "Veios rasos e esverdeados.", "mina-velha", "galeria-alta", "minerio-de-cobre", "geodo-oco"),
  coleta("mineracao", 2, "minerar-ferro", "Minerar ferro", "Ferro bom, braço cansado.", "mina-velha", "galeria-alta", "minerio-de-ferro", "geodo-oco"),
  coleta("mineracao", 3, "minerar-prata", "Minerar prata", "Na Galeria Funda, onde o ar é discutível.", "mina-velha", "galeria-funda", "minerio-de-prata", "geodo-oco"),
  coleta("pesca", 1, "pescar-lambari", "Pescar lambari", "Paciência e minhoca.", "lago-espelho", "margem", "lambari", "perola-turva"),
  coleta("pesca", 2, "pescar-tilapia", "Pescar tilápia", "Peixe que briga de volta.", "lago-espelho", "margem", "tilapia-do-lago", "perola-turva"),
  coleta("pesca", 3, "pescar-peixe-lua", "Pescar peixe-lua", "Do Píer Quebrado, em águas fundas.", "lago-espelho", "pier-quebrado", "peixe-lua", "perola-turva"),
  coleta("agricultura", 1, "colher-trigo", "Colher trigo", "Nas Hortas do Muro.", "pedravau", "hortas", "trigo", "semente-dourada"),
  coleta("agricultura", 2, "colher-batata", "Colher batata", "Cavar, sacudir, repetir.", "pedravau", "hortas", "batata", "semente-dourada"),
  coleta("agricultura", 3, "colher-abobora", "Colher abóbora de muro", "As que crescem coladas na muralha.", "pedravau", "hortas", "abobora-de-muro", "semente-dourada"),
];
