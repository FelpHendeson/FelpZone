// Tipos da praça (quem está online, conversa e avisos), comuns ao servidor e ao navegador.

import { isGameId, type GameId } from "@/games/registry";
import type { PlayerCard } from "./account";

export type Where = { status: "menu" } | { status: "lobby" | "playing"; gameId: GameId };

export interface OnlineEntry extends PlayerCard {
  where: Where | null;
}

export interface PlazaMessage {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  text: string;
  at: number;
}

export type Notice =
  | { id: string; kind: "wave"; from: PlayerCard; at: number }
  | { id: string; kind: "invite"; from: PlayerCard; code: string; gameId: GameId; at: number };

export interface Plaza {
  meId: string | null;
  online: OnlineEntry[];
  chat: PlazaMessage[];
  inbox: Notice[];
}

export function parseWhere(status: string | null, gameId: string | null): Where | null {
  if (status === "menu") return { status: "menu" };
  if ((status === "lobby" || status === "playing") && isGameId(gameId)) return { status, gameId };
  return null;
}
