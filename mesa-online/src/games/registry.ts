// Catálogo de jogos do hub. Cada jogo novo entra aqui com seu próprio motor
// (e em `modules.ts`, que liga o motor à sala).

export type GameId = "magnata" | "domino";

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
};

export const GAME_IDS = Object.keys(GAMES) as GameId[];

export function isGameId(value: unknown): value is GameId {
  return typeof value === "string" && Object.hasOwn(GAMES, value);
}
