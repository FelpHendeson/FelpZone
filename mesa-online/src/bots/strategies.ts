import { BOARD, type OwnableTile } from "@/games/magnata/board";
import {
  applyMagnataAction,
  getPlayer,
  legalActions,
  type MagnataAction,
  type MagnataState,
  type MagnataView,
  type Rng,
} from "@/games/magnata/engine";
import {
  blocksOpponent,
  byRentEfficiency,
  completesGroupFor,
  decideWith,
  defaultMortgageOrder,
  groupOwnership,
  rounds,
  unownedCount,
  type Profile,
} from "./profile";
import type { BotContext, BotKind, BotStrategy } from "./types";

const cashAfter = (ctx: BotContext, tile: number) =>
  getPlayer(ctx.state, ctx.me).cash - (BOARD[tile] as OwnableTile).price;

const investidor: Profile = {
  shouldBuy: (ctx, tile) => cashAfter(ctx, tile) >= 0,
  buildReserve: 50,
  maxHouses: 5,
  buildOrder: (_ctx, tiles) => byRentEfficiency(tiles),
  unmortgageReserve: 300,
  leaveJailEarly: (ctx) => rounds(ctx.state) < 60,
  mortgageOrder: (ctx, tiles) => defaultMortgageOrder(ctx.state, ctx.me, tiles),
  borrowToComplete: true,
  style: "investidor",
  proposesTrades: true,
  tradeThreshold: 0,
  rivalWeight: 0.4,
};

const conservador: Profile = {
  shouldBuy: (ctx, tile) => cashAfter(ctx, tile) >= (BOARD[tile].kind === "station" ? 150 : 300),
  buildReserve: 500,
  maxHouses: 3,
  buildOrder: (_ctx, tiles) => byRentEfficiency(tiles),
  unmortgageReserve: 800,
  leaveJailEarly: () => false,
  mortgageOrder: (ctx, tiles) => defaultMortgageOrder(ctx.state, ctx.me, tiles),
  borrowToComplete: false,
  style: "conservador",
  proposesTrades: false,
  tradeThreshold: 30,
  rivalWeight: 0.8,
};

const colecionador: Profile = {
  shouldBuy: (ctx, tile) => {
    const { state, me } = ctx;
    const left = cashAfter(ctx, tile);
    if (left < 0) return false;
    const kind = BOARD[tile].kind;
    if (kind === "utility") {
      // Só compra companhia para impedir que alguém fique com as duas.
      return Object.entries(state.properties).some(
        ([index, property]) => BOARD[Number(index)].kind === "utility" && property.owner !== null && property.owner !== me,
      );
    }
    if (kind === "station") return left >= 200;
    if (completesGroupFor(state, me, tile) || blocksOpponent(state, me, tile)) return true;
    const ownership = groupOwnership(state, tile);
    if ((ownership.get(me) ?? 0) > 0) return left >= 100;
    const contested = [...ownership.entries()].some(([owner, count]) => owner !== null && count >= 2);
    return !contested && left >= 200;
  },
  buildReserve: 100,
  maxHouses: 5,
  // Concentra tudo na cor mais barata de construir até o hotel.
  buildOrder: (_ctx, tiles) =>
    [...tiles].sort(
      (a, b) =>
        (BOARD[a] as Extract<OwnableTile, { kind: "street" }>).houseCost -
        (BOARD[b] as Extract<OwnableTile, { kind: "street" }>).houseCost,
    ),
  unmortgageReserve: 200,
  leaveJailEarly: (ctx) => unownedCount(ctx.state) > 8,
  mortgageOrder: (ctx, tiles) => defaultMortgageOrder(ctx.state, ctx.me, tiles),
  borrowToComplete: true,
  style: "colecionador",
  proposesTrades: true,
  tradeThreshold: 0,
  rivalWeight: 0.6,
};

export const BOTS: Record<BotKind, BotStrategy> = {
  investidor: {
    kind: "investidor",
    name: "Investidor",
    description: "Compra tudo e constrói rápido.",
    decide: (ctx) => decideWith(investidor, ctx),
  },
  conservador: {
    kind: "conservador",
    name: "Conservador",
    description: "Guarda dinheiro e arrisca pouco.",
    decide: (ctx) => decideWith(conservador, ctx),
  },
  colecionador: {
    kind: "colecionador",
    name: "Colecionador",
    description: "Caça cores completas e bloqueia as dos outros.",
    decide: (ctx) => decideWith(colecionador, ctx),
  },
};

export const BOT_KINDS = Object.keys(BOTS) as BotKind[];

export function isBotKind(value: unknown): value is BotKind {
  return typeof value === "string" && Object.hasOwn(BOTS, value);
}

/**
 * Pede a jogada ao robô e garante que ela é aceita pelo motor. Se a estratégia
 * errar, cai numa ação segura em vez de travar a partida.
 */
export function botAction(kind: BotKind, state: MagnataView, me: string, rng: Rng): MagnataAction {
  const legal = legalActions(state, me);
  const chosen = BOTS[kind].decide({ state, me, legal, rng });
  if (chosen.type !== "resign" && accepted(state, me, chosen, legal)) return chosen;
  return safeAction(legal);
}

/**
 * O motor aceitaria esta ação? Com o estado completo (servidor), testa de
 * verdade numa cópia; com a visão pública, confere contra as ações legais.
 */
function accepted(state: MagnataView, me: string, action: MagnataAction, legal: MagnataAction[]): boolean {
  // Ações da lista legal passam direto; propostas e lances de outro valor
  // são testados no próprio motor (que copia o estado antes de mudar).
  if (legal.some((candidate) => sameAction(candidate, action))) return true;
  if ("decks" in state) {
    try {
      applyMagnataAction(state as MagnataState, me, action, () => 0.5);
      return true;
    } catch {
      return false;
    }
  }
  return action.type === "bid" && legal.some((candidate) => candidate.type === "bid");
}

const SAFE_ORDER: MagnataAction["type"][] = [
  "pay-debt",
  "declare-bankruptcy",
  "reject-trade",
  "cancel-trade",
  "bid",
  "decline",
  "roll",
  "end-turn",
];

export function safeAction(legal: MagnataAction[]): MagnataAction {
  for (const type of SAFE_ORDER) {
    const action = legal.find((candidate) => candidate.type === type);
    if (action) return action;
  }
  return { type: "resign" };
}

function sameAction(a: MagnataAction, b: MagnataAction): boolean {
  return a.type === b.type && ("tile" in a ? a.tile : -1) === ("tile" in b ? b.tile : -1);
}

