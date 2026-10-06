// Temas visuais do Magnata. Mudam nomes e cores, nunca preços ou regras:
// o motor só conhece índices de casa, e os nomes vêm daqui.

import { BOARD } from "./board";

export type ThemeId = "classico" | "maceio" | "sao-paulo" | "brasil" | "vila-ninja";

export interface Theme {
  id: ThemeId;
  version: number;
  name: string;
  emoji: string;
  description: string;
  /** Critério usado para ordenar as casas do mais barato ao mais caro. */
  criterion: string;
  /** Nome por índice de casa; o que faltar vem do Clássico. */
  tiles: Partial<Record<number, string>>;
  palette: { felt: string; feltDark: string; accent: string };
  /** Nome do banco nos textos. */
  bank: string;
}

const classico: Theme = {
  id: "classico",
  version: 1,
  name: "Clássico",
  emoji: "🏙️",
  description: "A cidade fictícia do Magnata.",
  criterion: "Ruas fictícias, das mais simples às mais nobres.",
  tiles: Object.fromEntries(BOARD.map((tile, index) => [index, tile.name])),
  palette: { felt: "#1f5135", feltDark: "#163b27", accent: "#e0a526" },
  bank: "Banco",
};

const maceio: Theme = {
  id: "maceio",
  version: 1,
  name: "Maceió",
  emoji: "🏖️",
  description: "Bairros da capital alagoana, da lagoa à orla.",
  criterion: "Bairros, do mais acessível ao mais disputado da orla.",
  tiles: {
    1: "Vergel do Lago",
    3: "Levada",
    5: "Rodoviária",
    6: "Bebedouro",
    8: "Bom Parto",
    9: "Trapiche da Barra",
    11: "Prado",
    12: "Usina de Energia",
    13: "Poço",
    14: "Centro",
    15: "Porto de Maceió",
    16: "Jaraguá",
    18: "Pontal da Barra",
    19: "Farol",
    21: "Tabuleiro",
    23: "Serraria",
    24: "Gruta de Lourdes",
    25: "Aeroporto",
    26: "Cruz das Almas",
    27: "Jacarecica",
    28: "Saneamento",
    29: "Garça Torta",
    31: "Mangabeiras",
    32: "Stella Maris",
    34: "Jatiúca",
    35: "Estação Central",
    37: "Pajuçara",
    39: "Ponta Verde",
  },
  palette: { felt: "#0f5e6e", feltDark: "#0a4652", accent: "#f2b84b" },
  bank: "Banco",
};

const saoPaulo: Theme = {
  id: "sao-paulo",
  version: 1,
  name: "São Paulo",
  emoji: "🌆",
  description: "Bairros e avenidas da maior cidade do país.",
  criterion: "Bairros, da periferia ao centro expandido.",
  tiles: {
    1: "São Miguel Paulista",
    3: "Itaquera",
    5: "Estação da Luz",
    6: "Santo Amaro",
    8: "Penha",
    9: "Lapa",
    11: "Tatuapé",
    12: "Companhia de Energia",
    13: "Mooca",
    14: "Santana",
    15: "Estação Sé",
    16: "Liberdade",
    18: "Bela Vista",
    19: "Consolação",
    21: "Vila Mariana",
    23: "Pinheiros",
    24: "Perdizes",
    25: "Terminal Tietê",
    26: "Moema",
    27: "Vila Madalena",
    28: "Companhia de Água",
    29: "Higienópolis",
    31: "Itaim Bibi",
    32: "Brooklin",
    34: "Vila Olímpia",
    35: "Congonhas",
    37: "Jardins",
    39: "Avenida Paulista",
  },
  palette: { felt: "#3a3f4b", feltDark: "#2a2e37", accent: "#f0c419" },
  bank: "Banco",
};

const brasil: Theme = {
  id: "brasil",
  version: 1,
  name: "Brasil",
  emoji: "🇧🇷",
  description: "Capitais brasileiras de norte a sul.",
  criterion: "22 capitais em ordem aproximada de população (Censo 2022).",
  tiles: {
    1: "Porto Velho",
    3: "Florianópolis",
    5: "Rodovia BR-101",
    6: "Aracaju",
    8: "Cuiabá",
    9: "Natal",
    11: "João Pessoa",
    12: "Hidrelétrica",
    13: "Teresina",
    14: "Campo Grande",
    15: "Rodovia BR-116",
    16: "Maceió",
    18: "São Luís",
    19: "Belém",
    21: "Porto Alegre",
    23: "Goiânia",
    24: "Recife",
    25: "Ferrovia Norte-Sul",
    26: "Curitiba",
    27: "Manaus",
    28: "Saneamento",
    29: "Belo Horizonte",
    31: "Salvador",
    32: "Fortaleza",
    34: "Brasília",
    35: "Porto de Santos",
    37: "Rio de Janeiro",
    39: "São Paulo",
  },
  palette: { felt: "#1d6b3a", feltDark: "#14502b", accent: "#f7d117" },
  bank: "Banco Central",
};

const vilaNinja: Theme = {
  id: "vila-ninja",
  version: 1,
  name: "Vila Ninja",
  emoji: "🥷",
  description: "Uma vila ninja original, com dojos, templos e fortalezas.",
  criterion: "Lugares da vila, da trilha do bambu ao castelo do xogum.",
  tiles: {
    1: "Trilha do Bambu",
    3: "Poço do Sapo",
    5: "Portal do Norte",
    6: "Ponte de Corda",
    8: "Casa de Chá",
    9: "Jardim das Lanternas",
    11: "Dojo do Vento",
    12: "Fonte Espiritual",
    13: "Mercado de Pergaminhos",
    14: "Templo das Cerejeiras",
    15: "Portal do Leste",
    16: "Forja das Lâminas",
    18: "Arena dos Clãs",
    19: "Torre do Vigia",
    21: "Vale do Dragão",
    23: "Cascata Rubra",
    24: "Fortaleza Carmesim",
    25: "Portal do Sul",
    26: "Santuário do Sol",
    27: "Biblioteca Proibida",
    28: "Poço Sagrado",
    29: "Jardim de Pedra",
    31: "Floresta Sombria",
    32: "Lago da Lua",
    34: "Palácio de Jade",
    35: "Portal do Oeste",
    37: "Pico da Tempestade",
    39: "Castelo do Xogum",
  },
  palette: { felt: "#3b2340", feltDark: "#2a1830", accent: "#e8564f" },
  bank: "Tesouro da Vila",
};

export const THEMES: Record<ThemeId, Theme> = {
  classico,
  maceio,
  "sao-paulo": saoPaulo,
  brasil,
  "vila-ninja": vilaNinja,
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && Object.hasOwn(THEMES, value);
}

/** Tema pelo id, caindo para o Clássico se for desconhecido. */
export function themeOf(id: string | null | undefined): Theme {
  return id && isThemeId(id) ? THEMES[id] : classico;
}

export function tileNameIn(theme: Theme, index: number): string {
  return theme.tiles[index] ?? classico.tiles[index] ?? BOARD[index].name;
}
