// Esqueleto comum dos robôs: cada estratégia só ajusta as preferências.
// Fora de dívida o robô nunca vende nem hipoteca, e em dívida nunca constrói,
// então uma sequência de decisões dentro da mesma fase sempre termina.

import { BOARD, groupTiles, unmortgageCost, type OwnableTile } from "@/games/magnata/board";
import { getPlayer, ownsWholeGroup, type MagnataAction, type MagnataView } from "@/games/magnata/engine";
import type { BotContext } from "./types";

export interface Profile {
  shouldBuy(ctx: BotContext, tile: number): boolean;
  /** Caixa mínimo que deve sobrar depois de construir. */
  buildReserve: number;
  /** Máximo de construções por rua (5 = hotel). */
  maxHouses: number;
  /** Ordena as ruas candidatas a construção, da mais desejada para a menos. */
  buildOrder(ctx: BotContext, tiles: number[]): number[];
  /** Caixa mínimo que deve sobrar depois de quitar uma hipoteca. */
  unmortgageReserve: number;
  /** Paga a fiança (ou usa a carta) logo em vez de tentar a dupla? */
  leaveJailEarly(ctx: BotContext): boolean;
  /** Ordena propriedades para hipotecar numa dívida, da mais descartável para a menos. */
  mortgageOrder(ctx: BotContext, tiles: number[]): number[];
  /** Pega empréstimo (quando a regra existe) para comprar a rua que completa uma cor. */
  borrowToComplete: boolean;
}

/** Caixa que precisa sobrar para o robô quitar um empréstimo antes do vencimento. */
const REPAY_RESERVE = 300;

export function decideWith(profile: Profile, ctx: BotContext): MagnataAction {
  const { state, me, legal } = ctx;
  const player = getPlayer(state, me);
  const find = (type: MagnataAction["type"], tile?: number) =>
    legal.find((action) => action.type === type && (tile === undefined || ("tile" in action && action.tile === tile)));

  if (state.phase === "debt") {
    const pay = find("pay-debt");
    if (pay) return pay;
    const sells = tilesFor(legal, "sell-building");
    if (sells.length) return { type: "sell-building", tile: cheapestToLose(state, sells) };
    const mortgages = tilesFor(legal, "mortgage");
    if (mortgages.length) return { type: "mortgage", tile: profile.mortgageOrder(ctx, mortgages)[0] };
    return { type: "declare-bankruptcy" };
  }

  if (state.phase === "buy") {
    const buy = find("buy");
    if (buy && profile.shouldBuy(ctx, player.position)) return buy;
    if (!buy && profile.borrowToComplete && completesGroupFor(state, me, player.position)) {
      const shortfall = (BOARD[player.position] as OwnableTile).price - player.cash;
      const loan = legal
        .filter((action): action is Extract<MagnataAction, { type: "take-loan" }> => action.type === "take-loan")
        .find((action) => action.amount >= shortfall);
      if (loan) return loan;
    }
    return { type: "decline" };
  }

  // Fases "roll" e "end": primeiro investir, depois jogar.
  const unmortgages = tilesFor(legal, "unmortgage")
    .filter((tile) => player.cash - unmortgageCostOf(tile) >= profile.unmortgageReserve)
    .sort((a, b) => Number(ownsWholeGroup(state, me, b)) - Number(ownsWholeGroup(state, me, a)));
  if (unmortgages.length) return { type: "unmortgage", tile: unmortgages[0] };

  const repay = find("repay-loan");
  if (repay && player.loan && player.cash - player.loan.due >= REPAY_RESERVE) return repay;

  const builds = tilesFor(legal, "build").filter((tile) => {
    const street = BOARD[tile] as Extract<OwnableTile, { kind: "street" }>;
    return state.properties[tile].houses < profile.maxHouses && player.cash - street.houseCost >= profile.buildReserve;
  });
  if (builds.length) return { type: "build", tile: profile.buildOrder(ctx, builds)[0] };

  if (state.phase === "roll") {
    if (player.inJail) {
      const card = find("use-jail-card");
      if (card && (player.jailTurns >= 2 || profile.leaveJailEarly(ctx))) return card;
      const fine = find("pay-jail-fine");
      if (fine && profile.leaveJailEarly(ctx)) return fine;
    }
    return { type: "roll" };
  }
  return { type: "end-turn" };
}

function tilesFor(legal: MagnataAction[], type: "build" | "sell-building" | "mortgage" | "unmortgage"): number[] {
  return legal.flatMap((action) => (action.type === type ? [action.tile] : []));
}

function unmortgageCostOf(tile: number): number {
  return unmortgageCost(BOARD[tile] as OwnableTile);
}

/** Vende primeiro onde a construção é mais barata. */
function cheapestToLose(state: MagnataView, tiles: number[]): number {
  return [...tiles].sort(
    (a, b) =>
      (BOARD[a] as Extract<OwnableTile, { kind: "street" }>).houseCost -
      (BOARD[b] as Extract<OwnableTile, { kind: "street" }>).houseCost,
  )[0];
}

// ---------------------------------------------------------------------------
// Consultas usadas pelas estratégias

export function rounds(state: MagnataView): number {
  return state.turnNumber / Math.max(1, state.players.filter((player) => !player.bankrupt).length);
}

export function unownedCount(state: MagnataView): number {
  return Object.values(state.properties).filter((property) => property.owner === null).length;
}

/** Quantas ruas da cor de `tile` cada dono tem. */
export function groupOwnership(state: MagnataView, tile: number): Map<string | null, number> {
  const street = BOARD[tile];
  const counts = new Map<string | null, number>();
  if (street.kind !== "street") return counts;
  for (const index of groupTiles(street.group)) {
    const owner = state.properties[index].owner;
    counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  return counts;
}

export function completesGroupFor(state: MagnataView, playerId: string, tile: number): boolean {
  const street = BOARD[tile];
  if (street.kind !== "street") return false;
  return groupTiles(street.group).every((index) => index === tile || state.properties[index].owner === playerId);
}

/** Comprar esta rua impede um adversário de completar a cor? */
export function blocksOpponent(state: MagnataView, me: string, tile: number): boolean {
  const street = BOARD[tile];
  if (street.kind !== "street") return false;
  const others = groupTiles(street.group).filter((index) => index !== tile);
  const owner = state.properties[others[0]].owner;
  return owner !== null && owner !== me && others.every((index) => state.properties[index].owner === owner);
}

/** Ruas sem cor promissora (estações, companhias, ruas isoladas) são hipotecadas primeiro. */
export function defaultMortgageOrder(state: MagnataView, me: string, tiles: number[]): number[] {
  const promise = (tile: number) => {
    const ownership = groupOwnership(state, tile);
    return ownership.get(me) ?? 0;
  };
  return [...tiles].sort((a, b) => promise(a) - promise(b) || (BOARD[a] as OwnableTile).price - (BOARD[b] as OwnableTile).price);
}

/** Aluguel com 3 casas dividido pelo custo para chegar lá: melhor retorno primeiro. */
export function byRentEfficiency(tiles: number[]): number[] {
  const score = (tile: number) => {
    const street = BOARD[tile] as Extract<OwnableTile, { kind: "street" }>;
    return street.rent[3] / (street.price + 3 * street.houseCost);
  };
  return [...tiles].sort((a, b) => score(b) - score(a));
}
