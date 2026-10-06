// Catálogo de jogos do hub. Cada jogo novo entra aqui com seu próprio motor.

export type GameId = "magnata";

export interface GameInfo {
  id: GameId;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

export const GAMES: Record<GameId, GameInfo> = {
  magnata: {
    id: "magnata",
    name: "Magnata",
    description: "Compre ruas, construa casas e hotéis e cobre aluguel até quebrar a concorrência.",
    minPlayers: 2,
    maxPlayers: 6,
  },
};

export function isGameId(value: unknown): value is GameId {
  return typeof value === "string" && Object.hasOwn(GAMES, value);
}
