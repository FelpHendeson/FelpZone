// Catálogo de jogos do hub. Cada jogo novo entra aqui com seu próprio motor
// (e em `modules.ts`, que liga o motor à sala).

export type GameId = "magnata" | "domino" | "truco";

export interface GameInfo {
  id: GameId;
  name: string;
  emoji: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

export const GAMES: Record<GameId, GameInfo> = {
  magnata: {
    id: "magnata",
    name: "Magnata",
    emoji: "🏙️",
    description: "Compre ruas, construa casas e hotéis e cobre aluguel até quebrar a concorrência.",
    minPlayers: 2,
    maxPlayers: 6,
  },
  domino: {
    id: "domino",
    name: "Dominó",
    emoji: "🁫",
    description: "Duplo-seis em quatro modalidades: Bloqueio, Compra, Pontos (5 em 5) e Duplas.",
    minPlayers: 2,
    maxPlayers: 4,
  },
  truco: {
    id: "truco",
    name: "Truco",
    emoji: "🃏",
    description: "Paulista ou mineiro, 1 contra 1 ou em duplas: truco, seis, nove e doze, até 12 pontos.",
    minPlayers: 2,
    maxPlayers: 4,
  },
};

export const GAME_IDS = Object.keys(GAMES) as GameId[];

export function isGameId(value: unknown): value is GameId {
  return typeof value === "string" && Object.hasOwn(GAMES, value);
}
