// Robôs do dominó. Só olham a própria mão e a mesa — nunca a mão dos outros
// nem o monte —, então jogam como uma pessoa jogaria.

import type { Rng } from "../rules";
import { endsCount, getDominoPlayer, legalPlays, type DominoAction, type DominoState, type Placed, type Side, type Tile } from "./engine";

export type DominoBotKind = "facil" | "medio" | "dificil";

export const DOMINO_BOTS: Record<DominoBotKind, { name: string; description: string }> = {
  facil: { name: "Fácil", description: "Joga uma pedra válida qualquer." },
  medio: { name: "Médio", description: "Livra-se das pedras pesadas e das carroças primeiro." },
  dificil: { name: "Difícil", description: "Pensa nos pontos da jogada e em continuar tendo o que jogar." },
};

export const DOMINO_BOT_KINDS = Object.keys(DOMINO_BOTS) as DominoBotKind[];

export function isDominoBotKind(value: unknown): value is DominoBotKind {
  return typeof value === "string" && Object.hasOwn(DOMINO_BOTS, value);
}

interface Candidate {
  tile: Tile;
  side: Side;
}

export function dominoBotAction(kind: DominoBotKind, state: DominoState, me: string, rng: Rng): DominoAction {
  if (state.phase === "hand-over") return { type: "next-hand" };
  const player = getDominoPlayer(state, me);
  const candidates: Candidate[] = legalPlays(state, player.hand).flatMap((play) => play.sides.map((side) => ({ tile: play.tile, side })));
  // Não acontece: o motor passa sozinho quem não tem jogada. Fica a primeira pedra por segurança.
  if (candidates.length === 0) return { type: "play", tile: player.hand[0] };

  if (kind === "facil") {
    const pick = candidates[Math.floor(rng() * candidates.length)];
    return { type: "play", ...pick };
  }

  const scored = candidates.map((candidate) => ({ candidate, score: score(kind, state, player.hand, candidate) }));
  const best = Math.max(...scored.map((item) => item.score));
  const top = scored.filter((item) => item.score === best);
  return { type: "play", ...top[Math.floor(rng() * top.length)].candidate };
}

function score(kind: DominoBotKind, state: DominoState, hand: Tile[], { tile, side }: Candidate): number {
  const weight = tile[0] + tile[1];
  const double = tile[0] === tile[1] ? 1 : 0;
  if (kind === "medio") return weight * 2 + double * 3;

  const line = place(state.line, tile, side);
  const rest = hand.filter((candidate) => candidate !== tile);
  const ends = [line[0].a, line[line.length - 1].b];
  // Quantas pedras minhas continuam servindo nas pontas novas.
  const keeps = rest.filter((candidate) => ends.some((end) => candidate[0] === end || candidate[1] === end)).length;
  const count = endsCount(line);
  const points = state.mode === "pontos" && count > 0 && count % 5 === 0 ? count : 0;
  return points * 4 + weight + double * 4 + keeps * 3;
}

function place(line: Placed[], tile: Tile, side: Side): Placed[] {
  if (line.length === 0) return [{ a: tile[0], b: tile[1] }];
  if (side === "left") {
    const end = line[0].a;
    return [{ a: tile[0] === end ? tile[1] : tile[0], b: end }, ...line];
  }
  const end = line[line.length - 1].b;
  return [...line, { a: end, b: tile[0] === end ? tile[1] : tile[0] }];
}
