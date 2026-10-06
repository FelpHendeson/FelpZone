// Tabuleiro autoral do Magnata. A mecânica segue o clássico jogo de compra e
// venda de imóveis; nomes, cidade e identidade visual são próprios.

export type ColorGroup =
  | "marrom"
  | "celeste"
  | "rosa"
  | "laranja"
  | "vermelho"
  | "amarelo"
  | "verde"
  | "azul";

export type Tile =
  | { kind: "start"; name: string }
  | { kind: "jail"; name: string }
  | { kind: "free-parking"; name: string }
  | { kind: "go-to-jail"; name: string }
  | { kind: "tax"; name: string; amount: number }
  | { kind: "card"; name: string; deck: DeckId }
  | {
      kind: "street";
      name: string;
      group: ColorGroup;
      price: number;
      houseCost: number;
      /** Aluguel sem casas, com 1 a 4 casas e com hotel. */
      rent: [number, number, number, number, number, number];
    }
  | { kind: "station"; name: string; price: number }
  | { kind: "utility"; name: string; price: number };

export type DeckId = "sorte" | "surpresa";

export type OwnableTile = Extract<Tile, { kind: "street" | "station" | "utility" }>;

export const BOARD_SIZE = 40;
export const JAIL_INDEX = 10;
export const START_SALARY = 200;
export const JAIL_FINE = 50;
export const STARTING_CASH = 1500;
export const STATION_RENT = [25, 50, 100, 200];
export const UTILITY_MULTIPLIER = [4, 10];

export const GROUP_COLORS: Record<ColorGroup, string> = {
  marrom: "#8b5a3c",
  celeste: "#7cc7ec",
  rosa: "#d6559a",
  laranja: "#f08c2e",
  vermelho: "#d93b3b",
  amarelo: "#efcb2f",
  verde: "#2f9e5b",
  azul: "#2a55b8",
};

export const BOARD: readonly Tile[] = [
  { kind: "start", name: "Partida" },
  { kind: "street", name: "Rua das Flores", group: "marrom", price: 60, houseCost: 50, rent: [2, 10, 30, 90, 160, 250] },
  { kind: "card", name: "Surpresa", deck: "surpresa" },
  { kind: "street", name: "Beco do Sol", group: "marrom", price: 60, houseCost: 50, rent: [4, 20, 60, 180, 320, 450] },
  { kind: "tax", name: "Imposto de Renda", amount: 200 },
  { kind: "station", name: "Estação Norte", price: 200 },
  { kind: "street", name: "Av. das Palmeiras", group: "celeste", price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
  { kind: "card", name: "Sorte", deck: "sorte" },
  { kind: "street", name: "Rua do Porto", group: "celeste", price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
  { kind: "street", name: "Travessa da Lua", group: "celeste", price: 120, houseCost: 50, rent: [8, 40, 100, 300, 450, 600] },
  { kind: "jail", name: "Prisão" },
  { kind: "street", name: "Praça da Matriz", group: "rosa", price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
  { kind: "utility", name: "Companhia de Energia", price: 150 },
  { kind: "street", name: "Rua dos Ipês", group: "rosa", price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
  { kind: "street", name: "Av. Beira-Rio", group: "rosa", price: 160, houseCost: 100, rent: [12, 60, 180, 500, 700, 900] },
  { kind: "station", name: "Estação Leste", price: 200 },
  { kind: "street", name: "Rua do Mercado", group: "laranja", price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
  { kind: "card", name: "Surpresa", deck: "surpresa" },
  { kind: "street", name: "Largo das Artes", group: "laranja", price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
  { kind: "street", name: "Av. dos Coqueiros", group: "laranja", price: 200, houseCost: 100, rent: [16, 80, 220, 600, 800, 1000] },
  { kind: "free-parking", name: "Estacionamento" },
  { kind: "street", name: "Alameda Jacarandá", group: "vermelho", price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { kind: "card", name: "Sorte", deck: "sorte" },
  { kind: "street", name: "Rua da Serra", group: "vermelho", price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { kind: "street", name: "Av. Horizonte", group: "vermelho", price: 240, houseCost: 150, rent: [20, 100, 300, 750, 925, 1100] },
  { kind: "station", name: "Estação Sul", price: 200 },
  { kind: "street", name: "Praça dos Girassóis", group: "amarelo", price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { kind: "street", name: "Rua das Gaivotas", group: "amarelo", price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { kind: "utility", name: "Companhia de Água", price: 150 },
  { kind: "street", name: "Av. do Farol", group: "amarelo", price: 280, houseCost: 150, rent: [24, 120, 360, 850, 1025, 1200] },
  { kind: "go-to-jail", name: "Vá para a Prisão" },
  { kind: "street", name: "Jardim Imperial", group: "verde", price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { kind: "street", name: "Alameda das Orquídeas", group: "verde", price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { kind: "card", name: "Surpresa", deck: "surpresa" },
  { kind: "street", name: "Av. Panorama", group: "verde", price: 320, houseCost: 200, rent: [28, 150, 450, 1000, 1200, 1400] },
  { kind: "station", name: "Estação Oeste", price: 200 },
  { kind: "card", name: "Sorte", deck: "sorte" },
  { kind: "street", name: "Morro Dourado", group: "azul", price: 350, houseCost: 200, rent: [35, 175, 500, 1100, 1300, 1500] },
  { kind: "tax", name: "Taxa de Luxo", amount: 100 },
  { kind: "street", name: "Av. Diamante", group: "azul", price: 400, houseCost: 200, rent: [50, 200, 600, 1400, 1700, 2000] },
];

export function isOwnable(tile: Tile): tile is OwnableTile {
  return tile.kind === "street" || tile.kind === "station" || tile.kind === "utility";
}

export function mortgageValue(tile: OwnableTile): number {
  return tile.price / 2;
}

/** Valor para quitar a hipoteca: valor hipotecado + 10% de juros. */
export function unmortgageCost(tile: OwnableTile): number {
  // Aritmética inteira: 200 * 1.1 em ponto flutuante dá 220.00000000000003.
  return Math.ceil((mortgageValue(tile) * 11) / 10);
}

export function groupTiles(group: ColorGroup): number[] {
  const indexes: number[] = [];
  BOARD.forEach((tile, index) => {
    if (tile.kind === "street" && tile.group === group) indexes.push(index);
  });
  return indexes;
}

export function tilesOfKind(kind: "station" | "utility"): number[] {
  const indexes: number[] = [];
  BOARD.forEach((tile, index) => {
    if (tile.kind === kind) indexes.push(index);
  });
  return indexes;
}
