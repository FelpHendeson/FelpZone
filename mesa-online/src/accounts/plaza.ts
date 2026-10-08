// Tipos da praça (quem está online, conversa e avisos), comuns ao servidor e ao navegador.

import { isGameId, type GameId } from "@/games/registry";
import type { PlayerCard } from "./account";

/** Onde a pessoa está. O código da sala só fica no servidor (para os avisos de vez). */
export type Where = { status: "menu" } | { status: "lobby" | "playing"; gameId: GameId; code?: string };

export interface OnlineEntry extends PlayerCard {
  where: Where | null;
  /** Grupos em comum com quem está olhando. */
  groups: string[];
}

export interface PlazaMessage {
  id: string;
  groupId: string;
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
  /** Online entre os grupos de quem está olhando (incluindo a própria pessoa). */
  online: OnlineEntry[];
  /** Conversa do grupo pedido. */
  chatGroupId: string | null;
  chat: PlazaMessage[];
  inbox: Notice[];
}

export function parseWhere(status: string | null, gameId: string | null, code: string | null = null): Where | null {
  if (status === "menu") return { status: "menu" };
  if ((status === "lobby" || status === "playing") && isGameId(gameId)) {
    return code && /^[A-Z0-9]{5}$/.test(code) ? { status, gameId, code } : { status, gameId };
  }
  return null;
}
