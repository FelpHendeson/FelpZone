// Robôs do Truco. Só olham a própria mão, a vira e as cartas na mesa (e, na
// mão de onze, a do parceiro, como qualquer pessoa da dupla).

import type { Rng } from "../rules";
import {
  canCall,
  cardPower,
  nextStake,
  tableLeader,
  teamOf,
  type Card,
  type TrucoAction,
  type TrucoState,
} from "./engine";

export type TrucoBotKind = "facil" | "medio" | "dificil";

export const TRUCO_BOTS: Record<TrucoBotKind, { name: string; description: string }> = {
  facil: { name: "Fácil", description: "Joga direto, nunca pede truco e só aceita com manilha." },
  medio: { name: "Médio", description: "Pede truco com mão boa, blefa de vez em quando e cobre carta perdida." },
  dificil: { name: "Difícil", description: "Aumenta com mão muito forte e guarda a manilha para quando precisa." },
};

export function isTrucoBotKind(value: unknown): value is TrucoBotKind {
  return typeof value === "string" && Object.hasOwn(TRUCO_BOTS, value);
}

/** Força de 0 a 1 de uma carta (manilhas perto de 1). */
function strengthOf(card: Card, state: TrucoState): number {
  const power = cardPower(card, state.mode, state.vira);
  return power >= 100 ? 0.85 + (power - 100) * 0.05 : power / 12;
}

/** Força da mão: média das duas melhores cartas que ainda tem, com bônus por rodada ganha. */
export function handStrength(state: TrucoState, cards: Card[], playerId: string): number {
  const values = cards.map((card) => strengthOf(card, state)).sort((a, b) => b - a);
  const top = values.slice(0, 2);
  const base = top.length ? top.reduce((sum, value) => sum + value, 0) / top.length : 0;
  const team = teamOf(state, playerId);
  const won = state.rounds.filter((round) => round.team === team).length;
  const lost = state.rounds.filter((round) => round.team !== null && round.team !== team).length;
  return Math.min(1, Math.max(0, base + won * 0.2 - lost * 0.2));
}

export function trucoBotAction(kind: TrucoBotKind, state: TrucoState, me: string, rng: Rng): TrucoAction {
  const player = state.players.find((candidate) => candidate.id === me)!;
  const team = player.team;

  if (state.phase === "hand-over") return { type: "next-hand" };

  if (state.phase === "eleven") {
    const cards = state.players.filter((candidate) => candidate.team === team).flatMap((candidate) => candidate.hand);
    const best = cards.map((card) => strengthOf(card, state)).sort((a, b) => b - a);
    const strength = (best[0] + (best[1] ?? 0)) / 2;
    return { type: "eleven", play: strength >= (kind === "facil" ? 0.55 : 0.5) };
  }

  const strength = handStrength(state, player.hand, me);

  if (state.call) {
    const hasManilha = player.hand.some((card) => cardPower(card, state.mode, state.vira) >= 100);
    if (kind === "facil") return hasManilha ? { type: "accept" } : { type: "run" };
    const step = [3, 6, 9, 12].indexOf(state.call.value);
    const raiseAt = kind === "dificil" ? 0.82 : 0.9;
    if (strength >= raiseAt && nextStake(state.call.value) !== null) return { type: "raise" };
    return strength >= 0.5 + step * 0.05 ? { type: "accept" } : { type: "run" };
  }

  if (kind !== "facil" && canCall(state, me)) {
    const bluff = rng() < 0.08;
    if (strength >= (kind === "dificil" ? 0.68 : 0.72) || bluff) return { type: "call" };
  }

  return { type: "play", ...chooseCard(kind, state, player.hand, team) };
}

function chooseCard(kind: TrucoBotKind, state: TrucoState, hand: Card[], team: 0 | 1): { card: Card; covered?: boolean } {
  const byPower = [...hand].sort((a, b) => cardPower(a, state.mode, state.vira) - cardPower(b, state.mode, state.vira));
  const lowest = byPower[0];
  const highest = byPower[byPower.length - 1];
  const canCover = state.rounds.length > 0 && kind !== "facil";

  if (state.table.length === 0) {
    if (kind === "facil") return { card: highest };
    // Já ganhou a primeira: o difícil joga baixo e guarda a força para a última.
    const wonFirst = state.rounds[0]?.team === team;
    if (kind === "dificil" && wonFirst && byPower.length > 1) return { card: lowest };
    return { card: byPower.length === 3 ? byPower[1] : highest };
  }

  const leader = tableLeader(state);
  if (leader.team === team) return canCover && byPower.length > 1 ? { card: lowest, covered: kind === "dificil" } : { card: lowest };
  const winning = byPower.find((card) => cardPower(card, state.mode, state.vira) > leader.power);
  if (winning) return { card: winning };
  return canCover ? { card: lowest, covered: true } : { card: lowest };
}
