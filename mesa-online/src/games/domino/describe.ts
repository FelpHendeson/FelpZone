// Acontecimento do dominó → texto curto para narração e histórico.

import { DOMINO_MODES, type BatidaKind, type DominoEvent, type Tile } from "./engine";

export interface DominoLine {
  seq: number;
  icon: string;
  text: string;
  tone: "info" | "good" | "neutral";
  actorId: string | null;
  /** Encerra a mão ou a partida: merece destaque. */
  big: boolean;
}

export const BATIDA_NAMES: Record<BatidaKind, string> = {
  simples: "batida simples",
  carroca: "batida de carroça",
  "la-e-lo": "lá-e-lô",
  cruzada: "cruzada",
};

export const tileLabel = ([a, b]: Tile) => `${a}|${b}`;

export function describeDominoEvent(event: DominoEvent, nameOf: (id: string) => string): DominoLine | null {
  const base = { seq: event.seq, tone: "info" as const, big: false };
  switch (event.type) {
    case "game-start":
      return { ...base, icon: "🁫", text: `Começou a partida de ${DOMINO_MODES[event.mode].name}.`, actorId: null };
    case "hand-start":
      return { ...base, icon: "🔀", text: `Mão ${event.hand}: ${nameOf(event.starterId)} começa.`, actorId: event.starterId };
    case "play":
      return {
        ...base,
        icon: event.tile[0] === event.tile[1] ? "🀱" : "▫️",
        text: `${nameOf(event.playerId)} jogou ${tileLabel(event.tile)}${event.points ? ` e marcou ${event.points}` : ""}.`,
        tone: event.points ? "good" : "info",
        actorId: event.playerId,
      };
    case "draw":
      return { ...base, icon: "🫳", text: `${nameOf(event.playerId)} comprou ${event.count} ${event.count === 1 ? "pedra" : "pedras"}.`, tone: "neutral", actorId: event.playerId };
    case "pass":
      return { ...base, icon: "✋", text: `${nameOf(event.playerId)} passou.`, tone: "neutral", actorId: event.playerId };
    case "hand-end": {
      const result = event.result;
      const winners = result.winnerIds.map(nameOf).join(" e ");
      const text =
        result.reason === "batida"
          ? `${nameOf(result.batedorId!)} bateu${result.batida && result.batida !== "simples" ? ` de ${BATIDA_NAMES[result.batida]}` : ""}! ${winners} ${result.winnerIds.length > 1 ? "marcam" : "marca"} ${result.points}.`
          : result.winnerIds.length
            ? `Mão trancada. ${winners} ${result.winnerIds.length > 1 ? "marcam" : "marca"} ${result.points} por ter menos pontos na mão.`
            : "Mão trancada e empatada: ninguém marca.";
      return { ...base, icon: result.reason === "batida" ? "💥" : "🔒", text, tone: "good", actorId: result.batedorId, big: true };
    }
    case "resign":
      return { ...base, icon: "🏳️", text: `${nameOf(event.playerId)} desistiu.`, tone: "neutral", actorId: event.playerId };
    case "away":
      return { ...base, icon: "💤", text: `${nameOf(event.playerId)} está ausente: o piloto automático joga.`, tone: "neutral", actorId: event.playerId };
    case "back":
      return { ...base, icon: "👋", text: `${nameOf(event.playerId)} voltou.`, tone: "neutral", actorId: event.playerId };
    case "game-end":
      return { ...base, icon: "🏆", text: `Fim de partida: ${event.winnerIds.map(nameOf).join(" e ")} ${event.winnerIds.length > 1 ? "venceram" : "venceu"}!`, tone: "good", actorId: event.winnerIds[0] ?? null, big: true };
  }
}
