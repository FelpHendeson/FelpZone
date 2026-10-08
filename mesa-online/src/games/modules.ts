// Liga cada motor de jogo à sala: a sala não conhece as regras de nenhum jogo,
// só pede a este adaptador para começar, aplicar jogadas, mostrar o estado a
// cada pessoa e dizer quem venceu.

import { BOTS, botAction, isBotKind } from "@/bots/strategies";
import type { BotKind } from "@/bots/types";
import type { RoomOptions } from "@/rooms/room";
import { DOMINO_BOTS, dominoBotAction, isDominoBotKind, type DominoBotKind } from "./domino/bots";
import {
  applyDominoAction,
  dominoActorsNeeded,
  dominoView,
  noteDominoEvent,
  parseDominoAction,
  type DominoState,
  type DominoView,
} from "./domino/engine";
import {
  applyMagnataAction,
  createMagnataGame,
  noteEvent,
  parseMagnataAction,
  type MagnataState,
  type MagnataView,
} from "./magnata/engine";
import { createDominoGame } from "./domino/engine";
import type { GameId } from "./registry";
import type { Rng } from "./rules";

export type GameState = MagnataState | DominoState;
export type GameView = MagnataView | DominoView;
export type AnyBotKind = BotKind | DominoBotKind;

export interface Seat {
  id: string;
  name: string;
  color: string;
}

/** Quem venceu e o que cada um conquistou na partida. */
export interface Outcome {
  winners: string[];
  feats: Record<string, string[]>;
}

export interface GameModule {
  start(seats: Seat[], options: RoomOptions, rng: Rng): GameState;
  /** Lê a ação vinda do navegador; `null` quando não faz sentido. */
  parse(input: unknown): unknown | null;
  apply(state: GameState, playerId: string, action: unknown, rng: Rng): GameState;
  actorsNeeded(state: GameState): string[];
  finished(state: GameState): boolean;
  bots: Record<string, { name: string; description: string }>;
  isBot(kind: unknown): kind is AnyBotKind;
  /** Estilo do piloto automático de quem está ausente. */
  autopilot: AnyBotKind;
  /** Uma jogada automática (robô ou piloto automático). */
  autoplay(state: GameState, playerId: string, kind: AnyBotKind, rng: Rng): GameState;
  /** Pausa antes da próxima jogada automática, a partir do ritmo da sala. */
  autoplayDelay(state: GameState, base: number): number;
  note(state: GameState, type: "away" | "back", playerId: string): GameState;
  resignAction: unknown;
  outcome(state: GameState): Outcome;
  /** O que `viewerId` pode ver (sem segredos nem a mão dos outros). */
  view(state: GameState, viewerId: string | null): GameView;
}

/** Quem precisa agir agora no Magnata: a pessoa da vez, quem falta dar lance ou quem recebeu a proposta. */
export function magnataActorsNeeded(game: MagnataView): string[] {
  if (game.phase === "finished") return [];
  if (game.phase === "auction" && game.auction) return game.auction.pending;
  if (game.phase === "trade" && game.trade) return [game.trade.toId];
  return [game.currentPlayerId];
}

const magnata: GameModule = {
  start: (seats, options, rng) =>
    createMagnataGame(seats, rng, {
      roundLimit: options.roundLimit,
      credit: options.credit,
      themeId: options.themeId,
      auctions: options.auctions ?? true,
    }),
  parse: parseMagnataAction,
  apply: (state, playerId, action, rng) => applyMagnataAction(state as MagnataState, playerId, action as never, rng),
  actorsNeeded: (state) => magnataActorsNeeded(state as MagnataState),
  finished: (state) => (state as MagnataState).phase === "finished",
  bots: BOTS,
  isBot: isBotKind,
  autopilot: "conservador",
  autoplay(current, me, kind, rng) {
    let game = current as MagnataState;
    const style = kind as BotKind;
    game = applyMagnataAction(game, me, botAction(style, game, me, rng), rng);
    // Quando a jogada seguinte seria só passar a vez, ela vai junto.
    if (game.phase === "end" && game.currentPlayerId === me && botAction(style, game, me, rng).type === "end-turn") {
      game = applyMagnataAction(game, me, { type: "end-turn" }, rng);
    }
    return game;
  },
  autoplayDelay: (_state, base) => base,
  note: (state, type, playerId) => noteEvent(state as MagnataState, { type, playerId }),
  resignAction: { type: "resign" },
  outcome(state) {
    const game = state as MagnataState;
    const feats: Record<string, string[]> = {};
    for (const [index, property] of Object.entries(game.properties)) {
      if (property?.owner && property.houses === 5) feats[property.owner] = ["hotel"];
      void index;
    }
    return { winners: game.winnerId ? [game.winnerId] : [], feats };
  },
  view(state) {
    const { decks: _decks, ...view } = state as MagnataState;
    void _decks;
    // Lances do leilão são secretos até o fim: só se sabe quem ainda falta.
    return { ...view, auction: view.auction ? { ...view.auction, bids: {} } : null };
  },
};

/** Depois de uma mão, a mesa espera um pouco para todos verem o resultado. */
export const HAND_PAUSE_MS = 6000;

const domino: GameModule = {
  start: (seats, options, rng) => createDominoGame(seats, rng, { mode: options.dominoMode, target: options.dominoTarget }),
  parse: parseDominoAction,
  apply: (state, playerId, action, rng) => applyDominoAction(state as DominoState, playerId, action as never, rng),
  actorsNeeded: (state) => dominoActorsNeeded(state as DominoState),
  finished: (state) => (state as DominoState).phase === "finished",
  bots: DOMINO_BOTS,
  isBot: isDominoBotKind,
  autopilot: "medio",
  autoplay: (state, me, kind, rng) =>
    applyDominoAction(state as DominoState, me, dominoBotAction(kind as DominoBotKind, state as DominoState, me, rng), rng),
  autoplayDelay: (state, base) => ((state as DominoState).phase === "hand-over" ? Math.max(base, HAND_PAUSE_MS) : base),
  note: (state, type, playerId) => noteDominoEvent(state as DominoState, { type, playerId }),
  resignAction: { type: "resign" },
  outcome: (state) => ({ winners: (state as DominoState).winnerIds, feats: (state as DominoState).feats }),
  view: (state, viewerId) => dominoView(state as DominoState, viewerId),
};

export const GAME_MODULES: Record<GameId, GameModule> = { magnata, domino };

export function isMagnata(view: GameView | null): view is MagnataView {
  return view !== null && !("kind" in view && view.kind === "domino");
}

export function isDomino(view: GameView | null): view is DominoView {
  return view !== null && "kind" in view && view.kind === "domino";
}
