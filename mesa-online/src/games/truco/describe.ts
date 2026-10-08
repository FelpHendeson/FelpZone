// Acontecimento do Truco → texto curto para a narração e o histórico.

import { CALL_NAMES, rankOf, suitOf, type Card, type TrucoEvent } from "./engine";

export const SUIT_SYMBOLS = { o: "♦", e: "♠", c: "♥", p: "♣" } as const;
export const SUIT_NAMES = { o: "ouros", e: "espadas", c: "copas", p: "paus" } as const;

export const cardLabel = (card: Card) => `${rankOf(card)}${SUIT_SYMBOLS[suitOf(card)]}`;
export const cardSpeech = (card: Card) => `${rankOf(card)} de ${SUIT_NAMES[suitOf(card)]}`;

export interface TrucoLine {
  seq: number;
  icon: string;
  text: string;
  big: boolean;
}

export function describeTrucoEvent(event: TrucoEvent, nameOf: (id: string) => string, teamName: (team: 0 | 1) => string): TrucoLine | null {
  const base = { seq: event.seq, big: false };
  switch (event.type) {
    case "game-start":
      return { ...base, icon: "🃏", text: "Começou a partida de truco." };
    case "hand-start":
      return {
        ...base,
        icon: "🔀",
        text: `Mão ${event.hand}: ${nameOf(event.dealerId)} deu as cartas${event.vira ? `, vira ${cardLabel(event.vira)}` : ""}.${
          event.iron ? " Mão de ferro: sem truco." : event.eleven !== null ? ` Mão de onze para ${teamName(event.eleven)}.` : ""
        }`,
      };
    case "play":
      return { ...base, icon: event.card ? "🂠" : "🙈", text: `${nameOf(event.playerId)} jogou ${event.card ? cardLabel(event.card) : "uma carta coberta"}.` };
    case "round-end":
      return {
        ...base,
        icon: event.team === null ? "🤝" : "✅",
        text: event.team === null ? `Rodada ${event.round}: cangou (empate).` : `Rodada ${event.round}: ${nameOf(event.winnerId!)} fez.`,
      };
    case "call":
      return { ...base, icon: "📣", text: `${nameOf(event.playerId)}: ${CALL_NAMES[event.value].toUpperCase()}!`, big: true };
    case "accept":
      return { ...base, icon: "👍", text: `${nameOf(event.playerId)} aceitou: a mão vale ${event.value}.` };
    case "run":
      return { ...base, icon: "🏃", text: `${nameOf(event.playerId)} correu.` };
    case "eleven":
      return { ...base, icon: "🎯", text: `${nameOf(event.playerId)} ${event.play ? "topou jogar a mão de onze (vale 3)" : "correu da mão de onze"}.` };
    case "hand-end": {
      const result = event.result;
      return {
        ...base,
        icon: "🏁",
        text:
          result.team === null
            ? "Mão empatada: ninguém marca."
            : `${teamName(result.team)} ${result.points === 1 ? "marca 1 ponto" : `marca ${result.points} pontos`}${result.reason === "correu" ? " (a outra dupla correu)" : ""}.`,
        big: true,
      };
    }
    case "resign":
      return { ...base, icon: "🏳️", text: `${nameOf(event.playerId)} desistiu.` };
    case "away":
      return { ...base, icon: "💤", text: `${nameOf(event.playerId)} está ausente: o piloto automático joga.` };
    case "back":
      return { ...base, icon: "👋", text: `${nameOf(event.playerId)} voltou.` };
    case "game-end":
      return { ...base, icon: "🏆", text: `Fim de partida: ${event.winnerIds.map(nameOf).join(" e ")} ${event.winnerIds.length > 1 ? "venceram" : "venceu"}!`, big: true };
  }
}
