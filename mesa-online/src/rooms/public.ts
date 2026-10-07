// O que o navegador pode ver de uma sala. Toda resposta da API passa por aqui,
// então segredos (ordem dos baralhos, ids internos de comandos) nunca saem.

import type { MagnataView } from "@/games/magnata/engine";
import type { Room } from "./room";

export type PublicRoom = Omit<Room, "recentCommands" | "game"> & { game: MagnataView | null };

export function publicRoom(room: Room): PublicRoom {
  const { recentCommands: _commands, game, ...rest } = room;
  void _commands;
  if (!game) return { ...rest, game: null };
  const { decks: _decks, ...view } = game;
  void _decks;
  // Lances do leilão são secretos até o fim: só se sabe quem ainda falta.
  const auction = view.auction ? { ...view.auction, bids: {} } : null;
  return { ...rest, game: { ...view, auction } };
}
