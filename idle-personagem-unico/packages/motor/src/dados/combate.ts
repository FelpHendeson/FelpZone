/**
 * Combate por área (GDD §7) [Proposta]: equipamentos, monstros e áreas.
 * Números [Calibrar] (ver `docs/CALIBRACAO.md`).
 */
import type { Modificador } from "../modificadores";
import type { Item, Slot } from "./coleta";
import type { Raridade } from "./tipos";

// ------------------------------------------------------------ Equipamentos

function eq(
  id: string,
  nome: string,
  descricao: string,
  slot: Slot,
  tier: 0 | 1 | 2 | 3,
  bonus: { ataque?: number; defesa?: number; vida?: number },
  preco: number,
  precoCompra: number | null,
): Item {
  const raridade: Raridade = (["comum", "comum", "incomum", "raro"] as const)[tier];
  const origem = { tipo: "equipamento" as const, id };
  const modificadores: Modificador[] = [];
  if (bonus.ataque) modificadores.push({ alvo: "ataque", operacao: "somar", valor: bonus.ataque, origem });
  if (bonus.defesa) modificadores.push({ alvo: "defesa", operacao: "somar", valor: bonus.defesa, origem });
  if (bonus.vida) modificadores.push({ alvo: "vida", operacao: "somar", valor: bonus.vida, origem });
  return { id, nome, categoria: "equipamento", raridade, descricao, preco, pilha: 1, equipamento: { slot, tier, precoCompra, modificadores } };
}

export const EQUIPAMENTOS: readonly Item[] = [
  // Kit básico (GDD §4.1): arma e roupa simples.
  eq("porrete-de-carvalho", "Porrete de carvalho", "Melhor que nada. Um pouco.", "arma", 0, { ataque: 2 }, 1, null),
  eq("gibao-de-viagem", "Gibão de viagem", "Remendado em três lugares, rasgado em quatro.", "peitoral", 0, { defesa: 1 }, 1, null),
  // Tier 1: couro e ferro rústico (Ferreiro e drops das áreas 1–2).
  eq("espada-curta", "Espada curta", "Curta de propósito, dizem.", "arma", 1, { ataque: 5 }, 30, 120),
  eq("capuz-de-couro", "Capuz de couro", "Protege a cabeça e esconde a cara.", "elmo", 1, { defesa: 1, vida: 10 }, 15, 60),
  eq("gibao-de-couro", "Gibão de couro", "Cheira a lobo, o que ajuda.", "peitoral", 1, { defesa: 3 }, 25, 100),
  eq("calcas-de-couro", "Calças de couro", "Rangem a cada passo.", "calcas", 1, { defesa: 2 }, 20, 80),
  eq("botas-de-couro", "Botas de couro", "Já foram de alguém.", "botas", 1, { defesa: 1, vida: 5 }, 15, 60),
  // Tier 2: ferro (Ferreiro e drops das áreas 3–4).
  eq("espada-de-ferro", "Espada de ferro", "Pesada, honesta e sem apelido.", "arma", 2, { ataque: 11 }, 250, 1_000),
  eq("elmo-de-ferro", "Elmo de ferro", "Ouve-se tudo abafado, inclusive os gritos.", "elmo", 2, { defesa: 2, vida: 25 }, 150, 600),
  eq("cota-de-malha", "Cota de malha", "Mil anéis, nenhum de casamento.", "peitoral", 2, { defesa: 7 }, 300, 1_200),
  eq("grevas-de-ferro", "Grevas de ferro", "Para chutar com convicção.", "calcas", 2, { defesa: 5 }, 200, 800),
  eq("botas-ferradas", "Botas ferradas", "Barulhentas em qualquer piso.", "botas", 2, { defesa: 2, vida: 15 }, 150, 600),
  // Tier 3: aço (só por drop das áreas 5–6).
  eq("espada-de-aco-escuro", "Espada de aço escuro", "Tirada de um afogado. Ainda pinga.", "arma", 3, { ataque: 20 }, 1_500, null),
  eq("elmo-do-poco", "Elmo do poço", "Alguém morreu com ele. Talvez você também.", "elmo", 3, { defesa: 4, vida: 50 }, 900, null),
  eq("couraca-de-aco", "Couraça de aço", "Fria por dentro, sempre.", "peitoral", 3, { defesa: 13 }, 1_800, null),
  eq("grevas-de-aco", "Grevas de aço", "Pesam como uma decisão errada.", "calcas", 3, { defesa: 9 }, 1_200, null),
  eq("botas-de-aco", "Botas de aço", "Afundam na lama do lago e voltam.", "botas", 3, { defesa: 4, vida: 30 }, 900, null),
];

/** Kit básico de combate equipado ao criar o personagem. */
export const KIT_COMBATE: Readonly<Record<Slot, string | null>> = {
  arma: "porrete-de-carvalho",
  elmo: null,
  peitoral: "gibao-de-viagem",
  calcas: null,
  botas: null,
};

// ------------------------------------------------------------ Materiais de combate

function material(id: string, nome: string, descricao: string, preco: number): Item {
  return { id, nome, categoria: "material", raridade: "comum", descricao, preco, pilha: 100 };
}

export const MATERIAIS_COMBATE: readonly Item[] = [
  material("couro-de-lobo", "Couro de lobo", "Ainda quente, o que é preocupante.", 3),
  material("presa-de-roedor", "Presa de roedor", "Amarela e afiada como fofoca.", 5),
  material("escama-de-juncal", "Escama de juncal", "Escorrega da mão e da memória.", 8),
  material("seiva-negra", "Seiva negra", "Escorre de árvores que não deviam sangrar.", 12),
  material("lodo-de-afogado", "Lodo de afogado", "Vende bem. Não pergunte para quê.", 18),
  material("pedra-do-poco", "Pedra do poço", "Fria e com marcas de unha.", 25),
];

// ------------------------------------------------------------ Monstros

export type TipoMonstro = "comum" | "raro" | "chefe";

export interface Drop {
  readonly itemId: string;
  readonly chance: number;
  readonly quantidade: number;
}

export interface Monstro {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly tipo: TipoMonstro;
  readonly nivel: number;
  readonly vida: number;
  readonly ataque: number;
  readonly defesa: number;
  readonly intervaloMs: number;
  /** XP do personagem por abate. */
  readonly xp: number;
  readonly drops: readonly Drop[];
  /** Chance de largar um equipamento do tier da área. */
  readonly chanceEquipamento: number;
  /** Chance de largar um livro de habilidade (F5). */
  readonly chanceLivro: number;
}

type Perfil = "agil" | "tanque" | "raro" | "chefe";

/**
 * Monstro a partir do nível e de um perfil [Calibrar]. Os status crescem no
 * mesmo ritmo do personagem preparado (status + equipamento do tier):
 * × (1 + 0,15 × (nível − 1)).
 */
function monstro(id: string, nome: string, descricao: string, nivel: number, perfil: Perfil, materialId: string): Monstro {
  const g = 1 + 0.15 * (nivel - 1);
  const base = { vida: 45 * g, ataque: 7 * g, defesa: 2 * g, xp: 5 + 0.5 * nivel };
  const p = {
    agil: { tipo: "comum", vida: 0.85, ataque: 0.85, defesa: 0.9, intervalo: 1_900, xp: 1, drop: [0.7, 1], equip: 0.015, livro: 0 },
    tanque: { tipo: "comum", vida: 1.3, ataque: 1, defesa: 1.15, intervalo: 2_800, xp: 1.1, drop: [0.7, 1], equip: 0.015, livro: 0 },
    raro: { tipo: "raro", vida: 2, ataque: 1.3, defesa: 1.2, intervalo: 2_200, xp: 4, drop: [1, 3], equip: 0.15, livro: 0.03 },
    chefe: { tipo: "chefe", vida: 6, ataque: 1.5, defesa: 1.5, intervalo: 2_400, xp: 15, drop: [1, 10], equip: 0.6, livro: 0.15 },
  }[perfil];
  return {
    id,
    nome,
    descricao,
    tipo: p.tipo as TipoMonstro,
    nivel,
    vida: Math.round(base.vida * p.vida),
    ataque: Math.round(base.ataque * p.ataque * 10) / 10,
    defesa: Math.round(base.defesa * p.defesa * 10) / 10,
    intervaloMs: p.intervalo,
    xp: Math.round(base.xp * p.xp),
    drops: [{ itemId: materialId, chance: p.drop[0]!, quantidade: p.drop[1]! }],
    chanceEquipamento: p.equip,
    chanceLivro: p.livro,
  };
}

// ------------------------------------------------------------ Áreas

export interface AtividadeCombate {
  readonly tipo: "combate";
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly localId: string;
  readonly subareaId: string;
  readonly nivelRecomendado: number;
  /** Comuns e raro, com peso de aparição. */
  readonly monstros: readonly { readonly monstroId: string; readonly peso: number }[];
  readonly chefeId: string;
  /** O chefe aparece a cada N abates na área. */
  readonly abatesParaChefe: number;
  /** Tier dos equipamentos que caem aqui. */
  readonly tierEquipamento: 1 | 2 | 3;
}

interface DefArea {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly localId: string;
  readonly nivel: number;
  readonly tier: 1 | 2 | 3;
  readonly material: string;
  readonly monstros: readonly [agil: [string, string, string], tanque: [string, string, string], raro: [string, string, string], chefe: [string, string, string]];
}

const AREAS_DEF: readonly DefArea[] = [
  {
    id: "trilha-dos-lobos",
    nome: "Trilha dos Lobos",
    descricao: "Uma trilha que os lobos usam mais que as pessoas.",
    localId: "bosque-raso",
    nivel: 1,
    tier: 1,
    material: "couro-de-lobo",
    monstros: [
      ["lobo-cinzento", "Lobo cinzento", "Magro, rápido e com fome de sobra."],
      ["javali-magro", "Javali magro", "Mal-humorado desde que nasceu."],
      ["lobo-de-olhos-brancos", "Lobo de olhos brancos", "Não pisca. Nunca."],
      ["velha-matriarca", "A Velha Matriarca", "A loba mais velha do bosque. Ela lembra de você."],
    ],
  },
  {
    id: "galeria-dos-ratos",
    nome: "Galeria dos Ratos",
    descricao: "Túneis abandonados que algo bem pequeno resolveu ocupar.",
    localId: "mina-velha",
    nivel: 5,
    tier: 1,
    material: "presa-de-roedor",
    monstros: [
      ["rato-de-mina", "Rato de mina", "Do tamanho de um cachorro e com a moral de um rato."],
      ["morcego-de-veio", "Morcego-de-veio", "Come minério. E dedos."],
      ["rato-rei", "Rato-rei", "Sete ratos de rabo amarrado e um só humor."],
      ["a-ninhada", "A Ninhada", "Ninguém contou quantos são. Ninguém voltou para contar."],
    ],
  },
  {
    id: "juncal-escuro",
    nome: "Juncal Escuro",
    descricao: "Juncos altos, água rasa e coisas que respiram embaixo dela.",
    localId: "lago-espelho",
    nivel: 10,
    tier: 2,
    material: "escama-de-juncal",
    monstros: [
      ["garca-ladra", "Garça ladra", "Rouba peixe, isca e, se der, o anzol."],
      ["sapo-cao", "Sapo-cão", "Late. Ninguém sabe por quê."],
      ["sapo-de-tres-olhos", "Sapo de três olhos", "O terceiro olho é o que mais julga."],
      ["afogador-do-juncal", "O Afogador do Juncal", "Puxa pelo tornozelo e não pede desculpa."],
    ],
  },
  {
    id: "coracao-do-bosque",
    nome: "Coração do Bosque",
    descricao: "Onde as árvores se mexem quando ninguém olha. E quando olham.",
    localId: "bosque-raso",
    nivel: 15,
    tier: 2,
    material: "seiva-negra",
    monstros: [
      ["aranha-de-casca", "Aranha de casca", "Parece um nó de madeira até ter pernas."],
      ["galho-raivoso", "Galho raivoso", "Uma árvore jovem com problemas de temperamento."],
      ["corca-sem-rosto", "Corça sem rosto", "Elegante, silenciosa e sem rosto. Melhor não pensar nisso."],
      ["guardiao-de-casca-negra", "Guardião de Casca Negra", "Protege o bosque de tudo, inclusive de você."],
    ],
  },
  {
    id: "margem-afogada",
    nome: "Margem Afogada",
    descricao: "A margem que o lago engoliu, com tudo o que estava nela.",
    localId: "lago-espelho",
    nivel: 20,
    tier: 3,
    material: "lodo-de-afogado",
    monstros: [
      ["enguia-navalha", "Enguia-navalha", "Corta antes de você ver."],
      ["afogado", "Afogado", "Era pescador. Ainda pesca, de certo modo."],
      ["afogado-de-coroa", "Afogado de coroa", "Foi rei de alguma coisa. Agora é rei da lama."],
      ["senhora-do-fundo", "A Senhora do Fundo", "Canta. A música é bonita. Não escute."],
    ],
  },
  {
    id: "poco-sem-fundo",
    nome: "Poço sem Fundo",
    descricao: "O fundo da Mina Velha, que tem fundo, só que ninguém chegou lá.",
    localId: "mina-velha",
    nivel: 25,
    tier: 3,
    material: "pedra-do-poco",
    monstros: [
      ["larva-de-pedra", "Larva de pedra", "Come rocha e sonha com carne."],
      ["mineiro-que-nao-saiu", "Mineiro que não saiu", "Continua cavando. Não pergunta por quê."],
      ["capataz-ossudo", "Capataz ossudo", "Ainda cobra produtividade dos mortos."],
      ["o-que-cava", "O Que Cava", "A razão de a mina ter sido abandonada duas vezes."],
    ],
  },
];

function montar() {
  const monstros: Monstro[] = [];
  const areas: AtividadeCombate[] = [];
  for (const a of AREAS_DEF) {
    const perfis: Perfil[] = ["agil", "tanque", "raro", "chefe"];
    const ms = a.monstros.map(([id, nome, desc], i) => monstro(id, nome, desc, a.nivel, perfis[i]!, a.material));
    monstros.push(...ms);
    areas.push({
      tipo: "combate",
      id: a.id,
      nome: a.nome,
      descricao: a.descricao,
      localId: a.localId,
      subareaId: a.id,
      nivelRecomendado: a.nivel,
      monstros: [
        { monstroId: ms[0]!.id, peso: 47.5 },
        { monstroId: ms[1]!.id, peso: 47.5 },
        { monstroId: ms[2]!.id, peso: 5 },
      ],
      chefeId: ms[3]!.id,
      abatesParaChefe: 50,
      tierEquipamento: a.tier,
    });
  }
  return { monstros, areas };
}

const MONTADO = montar();
export const MONSTROS: readonly Monstro[] = MONTADO.monstros;
export const AREAS_COMBATE: readonly AtividadeCombate[] = MONTADO.areas;
