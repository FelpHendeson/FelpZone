// O que o navegador pode ver de uma sala. Toda resposta da API passa por aqui,
// então segredos (baralhos, monte, mãos dos outros, ids internos de comandos)
// nunca saem. A visão depende de quem pergunta: cada um vê a própria mão.

import { GAME_MODULES, type GameView } from "@/games/modules";
import type { Room } from "./room";

export type PublicRoom = Omit<Room, "recentCommands" | "game"> & { game: GameView | null };

export function publicRoom(room: Room, viewerId: string | null = null): PublicRoom {
  const { recentCommands: _commands, game, ...rest } = room;
  void _commands;
  return {
    ...rest,
    // Salas gravadas antes das contas não têm estes campos.
    match: rest.match ?? null,
    results: rest.results ?? [],
    options: { ...rest.options, stake: rest.options.stake ?? 0 },
    game: game ? GAME_MODULES[room.gameId].view(game, viewerId) : null,
  };
}
