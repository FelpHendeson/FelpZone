import {
  BOARD,
  BOARD_SIZE,
  JAIL_FINE,
  JAIL_INDEX,
  START_SALARY,
  STARTING_CASH,
  STATION_RENT,
  UTILITY_MULTIPLIER,
  groupTiles,
  isOwnable,
  mortgageValue,
  tilesOfKind,
  unmortgageCost,
  type DeckId,
  type OwnableTile,
} from "./board";
import { DECKS, findCard } from "./cards";

export type Rng = () => number;

export interface Loan {
  /** Valor recebido. */
  amount: number;
  /** Total a pagar (valor + taxa). */
  due: number;
  /** Turnos próprios até o vencimento. */
  turnsLeft: number;
}

export interface MagnataPlayer {
  id: string;
  name: string;
  color: string;
  cash: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  jailCards: DeckId[];
  bankrupt: boolean;
  loan: Loan | null;
}

export interface PropertyState {
  owner: string | null;
  /** 0 a 4 casas; 5 representa um hotel. */
  houses: number;
  mortgaged: boolean;
}

export type Phase = "roll" | "buy" | "debt" | "end" | "finished";

/** O que acontece depois que uma dívida for paga. */
type DebtResume = { kind: "move"; steps: number } | { kind: "roll" } | null;

export interface Debt {
  amount: number;
  creditorId: string | null;
  resume: DebtResume;
}

export type EndReason = "bankruptcy" | "turn-limit" | "round-limit";
export type RentBasis = "base" | "group" | "houses" | "stations" | "utility";

/** Acontecimentos estruturados: o cliente monta o texto com o tema da partida. */
export type GameEventPayload =
  | { type: "game-start"; order: string[] }
  | { type: "turn-start"; playerId: string }
  | { type: "roll"; playerId: string; dice: [number, number]; doubles: boolean }
  | { type: "move"; playerId: string; from: number; to: number; via: "dice" | "card" }
  | { type: "salary"; playerId: string; amount: number }
  | { type: "buy"; playerId: string; tile: number; price: number }
  | { type: "decline"; playerId: string; tile: number }
  | { type: "rent"; playerId: string; ownerId: string; tile: number; amount: number; basis: RentBasis }
  | { type: "rent-waived"; playerId: string; ownerId: string; tile: number }
  | { type: "tax"; playerId: string; tile: number; amount: number }
  | { type: "card"; playerId: string; deck: DeckId; cardId: string }
  | { type: "card-money"; playerId: string; amount: number }
  | { type: "jail"; playerId: string; reason: "tile" | "card" | "doubles" }
  | { type: "jail-stay"; playerId: string; attempt: number }
  | { type: "jail-release"; playerId: string; method: "doubles" | "fine" | "card" | "served"; amount: number }
  | { type: "build" | "sell-building"; playerId: string; tile: number; houses: number; amount: number }
  | { type: "mortgage" | "unmortgage"; playerId: string; tile: number; amount: number }
  | { type: "debt"; playerId: string; creditorId: string | null; amount: number; shortfall: number }
  | { type: "debt-paid"; playerId: string; creditorId: string | null; amount: number }
  | { type: "bankrupt"; playerId: string; creditorId: string | null; resigned: boolean }
  | { type: "loan-taken"; playerId: string; amount: number; due: number; turns: number }
  | { type: "loan-repaid"; playerId: string; amount: number; early: boolean }
  | { type: "loan-due"; playerId: string; amount: number }
  | { type: "away" | "back"; playerId: string }
  | { type: "game-end"; winnerId: string; reason: EndReason; netWorth: number | null };

export type GameEvent = GameEventPayload & { seq: number; round: number };
export type GameEventType = GameEventPayload["type"];

export interface MagnataState {
  players: MagnataPlayer[];
  properties: Record<number, PropertyState>;
  currentPlayerId: string;
  phase: Phase;
  dice: [number, number] | null;
  rollAgain: boolean;
  doublesCount: number;
  debt: Debt | null;
  /** Ordem secreta das cartas: removida da visão pública. */
  decks: Record<DeckId, string[]>;
  lastCard: { deck: DeckId; cardId: string } | null;
  events: GameEvent[];
  eventSeq: number;
  turnNumber: number;
  round: number;
  /** Turno após o qual a partida acaba por patrimônio; `null` = sem limite. */
  turnLimit: number | null;
  /** Rodada após a qual a partida acaba por patrimônio; `null` = sem limite. */
  roundLimit: number | null;
  /** Regra opcional de empréstimos do banco. */
  credit: boolean;
  /** Tema visual; o motor não usa, só repassa. */
  themeId: string;
  winnerId: string | null;
  endReason: EndReason | null;
}

/** O estado sem a ordem secreta dos baralhos, como o navegador recebe. */
export type MagnataView = Omit<MagnataState, "decks">;

export interface MagnataOptions {
  turnLimit?: number | null;
  roundLimit?: number | null;
  credit?: boolean;
  themeId?: string;
}

export type MagnataAction =
  | { type: "roll" }
  | { type: "buy" }
  | { type: "decline" }
  | { type: "end-turn" }
  | { type: "pay-jail-fine" }
  | { type: "use-jail-card" }
  | { type: "build"; tile: number }
  | { type: "sell-building"; tile: number }
  | { type: "mortgage"; tile: number }
  | { type: "unmortgage"; tile: number }
  | { type: "pay-debt" }
  | { type: "declare-bankruptcy" }
  | { type: "take-loan"; amount: number }
  | { type: "repay-loan" }
  | { type: "resign" };

export const TILE_ACTIONS = ["build", "sell-building", "mortgage", "unmortgage"] as const;
const SIMPLE_ACTIONS = [
  "roll",
  "buy",
  "decline",
  "end-turn",
  "pay-jail-fine",
  "use-jail-card",
  "pay-debt",
  "declare-bankruptcy",
  "repay-loan",
  "resign",
] as const;

/** Regras dos empréstimos (seção 9 da especificação). */
export const LOAN_STEP = 100;
export const LOAN_CAP = 1000;
export const LOAN_TERM_TURNS = 8;
/** Taxa fixa de 20%, em aritmética inteira. */
export const loanDue = (amount: number) => (amount * 12) / 10;

export class GameRuleError extends Error {}

const MAX_EVENTS = 120;

// ---------------------------------------------------------------------------
// Criação e validação de entrada

export function createMagnataGame(
  seats: { id: string; name: string; color: string }[],
  rng: Rng,
  options: MagnataOptions = {},
): MagnataState {
  if (seats.length < 2 || seats.length > 6) {
    throw new GameRuleError("O Magnata precisa de 2 a 6 jogadores.");
  }
  const players = shuffle(seats, rng).map<MagnataPlayer>(({ id, name, color }) => ({
    id,
    name,
    color,
    cash: STARTING_CASH,
    position: 0,
    inJail: false,
    jailTurns: 0,
    jailCards: [],
    bankrupt: false,
    loan: null,
  }));
  const properties: Record<number, PropertyState> = {};
  BOARD.forEach((tile, index) => {
    if (isOwnable(tile)) properties[index] = { owner: null, houses: 0, mortgaged: false };
  });
  const state: MagnataState = {
    players,
    properties,
    currentPlayerId: players[0].id,
    phase: "roll",
    dice: null,
    rollAgain: false,
    doublesCount: 0,
    debt: null,
    decks: {
      sorte: shuffle(DECKS.sorte.map((card) => card.id), rng),
      surpresa: shuffle(DECKS.surpresa.map((card) => card.id), rng),
    },
    lastCard: null,
    events: [],
    eventSeq: 0,
    turnNumber: 1,
    round: 1,
    turnLimit: options.turnLimit ?? null,
    roundLimit: options.roundLimit ?? null,
    credit: options.credit ?? false,
    themeId: options.themeId ?? "classico",
    winnerId: null,
    endReason: null,
  };
  emit(state, { type: "game-start", order: players.map((player) => player.id) });
  emit(state, { type: "turn-start", playerId: players[0].id });
  return state;
}

/** Converte um corpo de requisição desconhecido em ação válida ou `null`. */
export function parseMagnataAction(input: unknown): MagnataAction | null {
  if (typeof input !== "object" || input === null) return null;
  const { type, tile, amount } = input as { type?: unknown; tile?: unknown; amount?: unknown };
  if ((SIMPLE_ACTIONS as readonly unknown[]).includes(type)) {
    return { type } as MagnataAction;
  }
  if ((TILE_ACTIONS as readonly unknown[]).includes(type)) {
    if (typeof tile !== "number" || !Number.isInteger(tile) || tile < 0 || tile >= BOARD_SIZE) {
      return null;
    }
    return { type, tile } as MagnataAction;
  }
  if (type === "take-loan") {
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || amount % LOAN_STEP !== 0) {
      return null;
    }
    return { type, amount };
  }
  return null;
}

/** Registra um acontecimento vindo de fora do motor (ausência da sala). */
export function noteEvent(current: MagnataState, payload: Extract<GameEventPayload, { type: "away" | "back" }>): MagnataState {
  const state = structuredClone(current);
  emit(state, payload);
  return state;
}

// ---------------------------------------------------------------------------
// Consultas usadas pelo motor e pela interface

export function getPlayer(state: MagnataView, playerId: string): MagnataPlayer {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new GameRuleError("Jogador não participa desta partida.");
  return player;
}

export function activePlayers(state: MagnataView): MagnataPlayer[] {
  return state.players.filter((player) => !player.bankrupt);
}

export function ownsWholeGroup(state: MagnataView, playerId: string, tileIndex: number): boolean {
  const tile = BOARD[tileIndex];
  if (tile.kind !== "street") return false;
  return groupTiles(tile.group).every((index) => state.properties[index].owner === playerId);
}

export function rentFor(state: MagnataView, tileIndex: number, diceTotal: number): number {
  const tile = BOARD[tileIndex];
  const property = state.properties[tileIndex];
  if (!property || !property.owner || property.mortgaged) return 0;
  const owner = property.owner;
  if (tile.kind === "street") {
    if (property.houses > 0) return tile.rent[property.houses];
    return ownsWholeGroup(state, owner, tileIndex) ? tile.rent[0] * 2 : tile.rent[0];
  }
  if (tile.kind === "station") {
    const owned = tilesOfKind("station").filter((index) => state.properties[index].owner === owner);
    return STATION_RENT[owned.length - 1];
  }
  if (tile.kind === "utility") {
    const owned = tilesOfKind("utility").filter((index) => state.properties[index].owner === owner);
    return UTILITY_MULTIPLIER[owned.length - 1] * diceTotal;
  }
  return 0;
}

/** Explica de onde veio o valor do aluguel. */
export function rentBasis(state: MagnataView, tileIndex: number): RentBasis {
  const tile = BOARD[tileIndex];
  const property = state.properties[tileIndex];
  if (tile.kind === "station") return "stations";
  if (tile.kind === "utility") return "utility";
  if (property.houses > 0) return "houses";
  return property.owner && ownsWholeGroup(state, property.owner, tileIndex) ? "group" : "base";
}

/**
 * Dinheiro + valor das propriedades (hipotecadas descontam a quitação) +
 * construções − empréstimo em aberto.
 */
export function netWorth(state: MagnataView, playerId: string): number {
  const player = getPlayer(state, playerId);
  if (player.bankrupt) return 0;
  let total = player.cash - (player.loan?.due ?? 0);
  for (const [index, property] of Object.entries(state.properties)) {
    if (property.owner !== playerId) continue;
    const tile = BOARD[Number(index)] as OwnableTile;
    total += property.mortgaged ? tile.price - unmortgageCost(tile) : tile.price;
    if (tile.kind === "street") total += property.houses * tile.houseCost;
  }
  return total;
}

/** Fases da própria vez em que se pode contratar ou quitar empréstimo. */
const LOAN_PHASES: Phase[] = ["roll", "buy", "end"];

/** Maior empréstimo disponível agora (0 quando não há crédito). */
export function loanLimit(state: MagnataView, playerId: string): number {
  if (!state.credit || state.currentPlayerId !== playerId || !LOAN_PHASES.includes(state.phase)) return 0;
  const player = getPlayer(state, playerId);
  if (player.bankrupt || player.loan) return 0;
  let collateral = 0;
  for (const [index, property] of Object.entries(state.properties)) {
    if (property.owner === playerId && !property.mortgaged) collateral += (BOARD[Number(index)] as OwnableTile).price;
  }
  return Math.min(LOAN_CAP, Math.floor(collateral / 2 / LOAN_STEP) * LOAN_STEP);
}

export function loanError(state: MagnataView, playerId: string, action: { type: "take-loan"; amount: number } | { type: "repay-loan" }): string | null {
  if (!state.credit) return "Empréstimos não estão ativos nesta partida.";
  if (state.currentPlayerId !== playerId) return "Aguarde a sua vez.";
  if (!LOAN_PHASES.includes(state.phase)) return "Esta ação não está disponível agora.";
  const player = getPlayer(state, playerId);
  if (action.type === "repay-loan") {
    if (!player.loan) return "Você não tem empréstimo.";
    if (player.cash < player.loan.due) return "Dinheiro insuficiente para quitar.";
    return null;
  }
  if (player.loan) return "Quite o empréstimo atual antes de pegar outro.";
  if (action.amount <= 0 || action.amount % LOAN_STEP !== 0) return "Valor inválido.";
  if (action.amount > loanLimit(state, playerId)) return "Valor acima do seu limite de crédito.";
  return null;
}

/** Todas as ações que o motor aceitaria agora deste jogador. */
export function legalActions(state: MagnataView, playerId: string): MagnataAction[] {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.bankrupt || state.phase === "finished") return [];
  const actions: MagnataAction[] = [];
  if (state.currentPlayerId === playerId) {
    switch (state.phase) {
      case "roll":
        actions.push({ type: "roll" });
        if (player.inJail && player.cash >= JAIL_FINE) actions.push({ type: "pay-jail-fine" });
        if (player.inJail && player.jailCards.length > 0) actions.push({ type: "use-jail-card" });
        break;
      case "buy":
        if (player.cash >= (BOARD[player.position] as OwnableTile).price) actions.push({ type: "buy" });
        actions.push({ type: "decline" });
        break;
      case "debt":
        if (state.debt && player.cash >= state.debt.amount) actions.push({ type: "pay-debt" });
        actions.push({ type: "declare-bankruptcy" });
        break;
      case "end":
        actions.push({ type: "end-turn" });
        break;
    }
    for (const index of Object.keys(state.properties).map(Number)) {
      if (state.properties[index].owner !== playerId) continue;
      for (const type of TILE_ACTIONS) {
        if (tileActionError(state, playerId, { type, tile: index }) === null) actions.push({ type, tile: index });
      }
    }
    for (let amount = LOAN_STEP; amount <= loanLimit(state, playerId); amount += LOAN_STEP) {
      actions.push({ type: "take-loan", amount });
    }
    if (state.credit && loanError(state, playerId, { type: "repay-loan" }) === null) actions.push({ type: "repay-loan" });
  }
  actions.push({ type: "resign" });
  return actions;
}

/** Fases em que o jogador da vez pode vender construções e hipotecar. */
const RAISE_CASH_PHASES: Phase[] = ["roll", "buy", "debt", "end"];
/** Fases em que o jogador da vez pode construir e quitar hipotecas. */
const INVEST_PHASES: Phase[] = ["roll", "end"];

export function tileActionError(
  state: MagnataView,
  playerId: string,
  action: Extract<MagnataAction, { tile: number }>,
): string | null {
  if (state.currentPlayerId !== playerId) return "Aguarde a sua vez.";
  const allowed = action.type === "build" || action.type === "unmortgage" ? INVEST_PHASES : RAISE_CASH_PHASES;
  if (!allowed.includes(state.phase)) return "Esta ação não está disponível agora.";
  const tile = BOARD[action.tile];
  const property = state.properties[action.tile];
  if (!isOwnable(tile) || !property) return "Este espaço não é uma propriedade.";
  if (property.owner !== playerId) return "Esta propriedade não é sua.";
  const player = getPlayer(state, playerId);

  switch (action.type) {
    case "build": {
      if (tile.kind !== "street") return "Só é possível construir em ruas.";
      if (!ownsWholeGroup(state, playerId, action.tile)) return "Você precisa ter todas as ruas da cor.";
      const group = groupTiles(tile.group).map((index) => state.properties[index]);
      if (group.some((item) => item.mortgaged)) return "Quite as hipotecas desta cor antes de construir.";
      if (property.houses >= 5) return "Esta rua já tem hotel.";
      if (property.houses > Math.min(...group.map((item) => item.houses))) {
        return "Construa de maneira uniforme entre as ruas da cor.";
      }
      if (player.cash < tile.houseCost) return "Dinheiro insuficiente.";
      return null;
    }
    case "sell-building": {
      if (tile.kind !== "street" || property.houses === 0) return "Não há construções para vender.";
      const group = groupTiles(tile.group).map((index) => state.properties[index]);
      if (property.houses < Math.max(...group.map((item) => item.houses))) {
        return "Venda de maneira uniforme entre as ruas da cor.";
      }
      return null;
    }
    case "mortgage": {
      if (property.mortgaged) return "Esta propriedade já está hipotecada.";
      if (tile.kind === "street" && groupTiles(tile.group).some((index) => state.properties[index].houses > 0)) {
        return "Venda as construções da cor antes de hipotecar.";
      }
      return null;
    }
    case "unmortgage": {
      if (!property.mortgaged) return "Esta propriedade não está hipotecada.";
      if (player.cash < unmortgageCost(tile)) return "Dinheiro insuficiente.";
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Aplicação de ações

export function applyMagnataAction(
  current: MagnataState,
  playerId: string,
  action: MagnataAction,
  rng: Rng,
): MagnataState {
  if (current.phase === "finished") throw new GameRuleError("A partida já terminou.");
  const state = structuredClone(current);
  const player = getPlayer(state, playerId);
  if (player.bankrupt) throw new GameRuleError("Você já saiu desta partida.");

  if (action.type === "resign") {
    goBankrupt(state, player, null, true);
    return state;
  }

  if (state.currentPlayerId !== playerId) throw new GameRuleError("Aguarde a sua vez.");

  switch (action.type) {
    case "roll":
      requirePhase(state, "roll");
      roll(state, player, rng);
      break;
    case "buy": {
      requirePhase(state, "buy");
      const tile = BOARD[player.position] as OwnableTile;
      if (player.cash < tile.price) throw new GameRuleError("Dinheiro insuficiente. Hipoteque ou venda algo antes.");
      player.cash -= tile.price;
      state.properties[player.position].owner = player.id;
      emit(state, { type: "buy", playerId: player.id, tile: player.position, price: tile.price });
      state.phase = phaseAfterResolution(state, player);
      break;
    }
    case "decline":
      requirePhase(state, "buy");
      emit(state, { type: "decline", playerId: player.id, tile: player.position });
      state.phase = phaseAfterResolution(state, player);
      break;
    case "end-turn":
      requirePhase(state, "end");
      advanceTurn(state);
      break;
    case "pay-jail-fine":
      requirePhase(state, "roll");
      if (!player.inJail) throw new GameRuleError("Você não está na prisão.");
      if (player.cash < JAIL_FINE) throw new GameRuleError("Dinheiro insuficiente para a fiança.");
      player.cash -= JAIL_FINE;
      releaseFromJail(player);
      emit(state, { type: "jail-release", playerId: player.id, method: "fine", amount: JAIL_FINE });
      break;
    case "use-jail-card": {
      requirePhase(state, "roll");
      if (!player.inJail) throw new GameRuleError("Você não está na prisão.");
      const deck = player.jailCards.pop();
      if (!deck) throw new GameRuleError("Você não tem carta de liberdade.");
      returnJailCard(state, deck);
      releaseFromJail(player);
      emit(state, { type: "jail-release", playerId: player.id, method: "card", amount: 0 });
      break;
    }
    case "build":
    case "sell-building":
    case "mortgage":
    case "unmortgage":
      applyTileAction(state, player, action);
      break;
    case "take-loan": {
      const error = loanError(state, player.id, action);
      if (error) throw new GameRuleError(error);
      const due = loanDue(action.amount);
      player.cash += action.amount;
      player.loan = { amount: action.amount, due, turnsLeft: LOAN_TERM_TURNS };
      emit(state, { type: "loan-taken", playerId: player.id, amount: action.amount, due, turns: LOAN_TERM_TURNS });
      break;
    }
    case "repay-loan": {
      const error = loanError(state, player.id, action);
      if (error) throw new GameRuleError(error);
      const due = player.loan!.due;
      player.cash -= due;
      player.loan = null;
      emit(state, { type: "loan-repaid", playerId: player.id, amount: due, early: true });
      break;
    }
    case "pay-debt": {
      requirePhase(state, "debt");
      const debt = state.debt!;
      if (player.cash < debt.amount) throw new GameRuleError("Dinheiro insuficiente. Hipoteque ou venda algo antes.");
      transfer(state, player, debt.creditorId, debt.amount);
      state.debt = null;
      emit(state, { type: "debt-paid", playerId: player.id, creditorId: debt.creditorId, amount: debt.amount });
      if (debt.resume?.kind === "move") {
        moveBy(state, player, debt.resume.steps);
        state.phase = resolveLanding(state, player);
      } else if (debt.resume?.kind === "roll") {
        state.phase = "roll";
      } else {
        state.phase = phaseAfterResolution(state, player);
      }
      break;
    }
    case "declare-bankruptcy": {
      requirePhase(state, "debt");
      goBankrupt(state, player, state.debt!.creditorId, false);
      break;
    }
  }
  return state;
}

function applyTileAction(
  state: MagnataState,
  player: MagnataPlayer,
  action: Extract<MagnataAction, { tile: number }>,
) {
  const error = tileActionError(state, player.id, action);
  if (error) throw new GameRuleError(error);
  const tile = BOARD[action.tile] as OwnableTile;
  const property = state.properties[action.tile];
  switch (action.type) {
    case "build": {
      const cost = (tile as Extract<OwnableTile, { kind: "street" }>).houseCost;
      player.cash -= cost;
      property.houses += 1;
      emit(state, { type: "build", playerId: player.id, tile: action.tile, houses: property.houses, amount: cost });
      break;
    }
    case "sell-building": {
      const refund = (tile as Extract<OwnableTile, { kind: "street" }>).houseCost / 2;
      player.cash += refund;
      property.houses -= 1;
      emit(state, { type: "sell-building", playerId: player.id, tile: action.tile, houses: property.houses, amount: refund });
      break;
    }
    case "mortgage":
      player.cash += mortgageValue(tile);
      property.mortgaged = true;
      emit(state, { type: "mortgage", playerId: player.id, tile: action.tile, amount: mortgageValue(tile) });
      break;
    case "unmortgage":
      player.cash -= unmortgageCost(tile);
      property.mortgaged = false;
      emit(state, { type: "unmortgage", playerId: player.id, tile: action.tile, amount: unmortgageCost(tile) });
      break;
  }
}

// ---------------------------------------------------------------------------
// Movimento e resolução de casas

function roll(state: MagnataState, player: MagnataPlayer, rng: Rng) {
  const dice: [number, number] = [rollDie(rng), rollDie(rng)];
  const total = dice[0] + dice[1];
  const doubles = dice[0] === dice[1];
  state.dice = dice;
  state.lastCard = null;
  emit(state, { type: "roll", playerId: player.id, dice, doubles });

  if (player.inJail) {
    state.rollAgain = false;
    if (doubles) {
      releaseFromJail(player);
      emit(state, { type: "jail-release", playerId: player.id, method: "doubles", amount: 0 });
      moveBy(state, player, total);
      state.phase = resolveLanding(state, player);
      return;
    }
    player.jailTurns += 1;
    if (player.jailTurns < 3) {
      emit(state, { type: "jail-stay", playerId: player.id, attempt: player.jailTurns });
      state.phase = "end";
      return;
    }
    releaseFromJail(player);
    emit(state, { type: "jail-release", playerId: player.id, method: "served", amount: JAIL_FINE });
    const outcome = charge(state, player, JAIL_FINE, null, { kind: "move", steps: total });
    if (outcome === "debt") {
      state.phase = "debt";
      return;
    }
    moveBy(state, player, total);
    state.phase = resolveLanding(state, player);
    return;
  }

  if (doubles) {
    state.doublesCount += 1;
    if (state.doublesCount === 3) {
      sendToJail(state, player, "doubles");
      state.phase = "end";
      return;
    }
  }
  state.rollAgain = doubles;
  moveBy(state, player, total);
  state.phase = resolveLanding(state, player);
}

function moveBy(state: MagnataState, player: MagnataPlayer, steps: number) {
  const from = player.position;
  const target = (from + steps) % BOARD_SIZE;
  player.position = target;
  emit(state, { type: "move", playerId: player.id, from, to: target, via: "dice" });
  if (target < from) collectSalary(state, player);
}

function moveTo(state: MagnataState, player: MagnataPlayer, target: number) {
  const from = player.position;
  player.position = target;
  emit(state, { type: "move", playerId: player.id, from, to: target, via: "card" });
  if (target <= from) collectSalary(state, player);
}

function collectSalary(state: MagnataState, player: MagnataPlayer) {
  player.cash += START_SALARY;
  emit(state, { type: "salary", playerId: player.id, amount: START_SALARY });
}

/** Resolve a casa atual e devolve a fase seguinte. */
function resolveLanding(state: MagnataState, player: MagnataPlayer): Phase {
  const index = player.position;
  const tile = BOARD[index];

  switch (tile.kind) {
    case "street":
    case "station":
    case "utility": {
      const property = state.properties[index];
      if (!property.owner) return "buy";
      if (property.owner === player.id) break;
      if (property.mortgaged) {
        emit(state, { type: "rent-waived", playerId: player.id, ownerId: property.owner, tile: index });
        break;
      }
      const diceTotal = state.dice ? state.dice[0] + state.dice[1] : 0;
      const rent = rentFor(state, index, diceTotal);
      const basis = rentBasis(state, index);
      if (charge(state, player, rent, property.owner, null) === "debt") return "debt";
      emit(state, { type: "rent", playerId: player.id, ownerId: property.owner, tile: index, amount: rent, basis });
      break;
    }
    case "tax":
      if (charge(state, player, tile.amount, null, null) === "debt") return "debt";
      emit(state, { type: "tax", playerId: player.id, tile: index, amount: tile.amount });
      break;
    case "go-to-jail":
      sendToJail(state, player, "tile");
      break;
    case "card":
      return drawCard(state, player, tile.deck);
    default:
      break;
  }
  return phaseAfterResolution(state, player);
}

function drawCard(state: MagnataState, player: MagnataPlayer, deck: DeckId): Phase {
  const id = state.decks[deck].shift()!;
  const card = findCard(deck, id);
  if (card.effect.type === "jail-card") player.jailCards.push(deck);
  else state.decks[deck].push(id);
  state.lastCard = { deck, cardId: id };
  emit(state, { type: "card", playerId: player.id, deck, cardId: id });

  const effect = card.effect;
  switch (effect.type) {
    case "collect":
      player.cash += effect.amount;
      emit(state, { type: "card-money", playerId: player.id, amount: effect.amount });
      break;
    case "pay":
      if (charge(state, player, effect.amount, null, null) === "debt") return "debt";
      emit(state, { type: "card-money", playerId: player.id, amount: -effect.amount });
      break;
    case "repairs": {
      let total = 0;
      for (const property of Object.values(state.properties)) {
        if (property.owner !== player.id) continue;
        total += property.houses === 5 ? effect.perHotel : property.houses * effect.perHouse;
      }
      if (charge(state, player, total, null, null) === "debt") return "debt";
      if (total > 0) emit(state, { type: "card-money", playerId: player.id, amount: -total });
      break;
    }
    case "move-to":
      moveTo(state, player, effect.tile);
      return resolveLanding(state, player);
    case "move-back": {
      const from = player.position;
      player.position = (from - effect.steps + BOARD_SIZE) % BOARD_SIZE;
      emit(state, { type: "move", playerId: player.id, from, to: player.position, via: "card" });
      return resolveLanding(state, player);
    }
    case "go-to-jail":
      sendToJail(state, player, "card");
      break;
    case "jail-card":
      break;
  }
  return phaseAfterResolution(state, player);
}

function phaseAfterResolution(state: MagnataState, player: MagnataPlayer): Phase {
  return state.rollAgain && !player.inJail ? "roll" : "end";
}

function sendToJail(state: MagnataState, player: MagnataPlayer, reason: "tile" | "card" | "doubles") {
  player.position = JAIL_INDEX;
  player.inJail = true;
  player.jailTurns = 0;
  state.rollAgain = false;
  emit(state, { type: "jail", playerId: player.id, reason });
}

function releaseFromJail(player: MagnataPlayer) {
  player.inJail = false;
  player.jailTurns = 0;
}

function returnJailCard(state: MagnataState, deck: DeckId) {
  const card = DECKS[deck].find((candidate) => candidate.effect.type === "jail-card")!;
  state.decks[deck].push(card.id);
}

// ---------------------------------------------------------------------------
// Dinheiro, falência e turnos

/** Cobra o valor ou registra uma dívida quando o jogador não tem dinheiro. */
function charge(
  state: MagnataState,
  player: MagnataPlayer,
  amount: number,
  creditorId: string | null,
  resume: DebtResume,
): "paid" | "debt" {
  if (amount <= 0) return "paid";
  if (player.cash >= amount) {
    transfer(state, player, creditorId, amount);
    return "paid";
  }
  state.debt = { amount, creditorId, resume };
  emit(state, { type: "debt", playerId: player.id, creditorId, amount, shortfall: amount - player.cash });
  return "debt";
}

function transfer(state: MagnataState, from: MagnataPlayer, toId: string | null, amount: number) {
  from.cash -= amount;
  if (!toId) return;
  const creditor = getPlayer(state, toId);
  if (!creditor.bankrupt) creditor.cash += amount;
}

function goBankrupt(state: MagnataState, player: MagnataPlayer, creditorId: string | null, resigned: boolean) {
  const creditor = creditorId ? getPlayer(state, creditorId) : null;
  const heir = creditor && !creditor.bankrupt ? creditor : null;

  for (const [index, property] of Object.entries(state.properties)) {
    if (property.owner !== player.id) continue;
    const tile = BOARD[Number(index)];
    if (tile.kind === "street" && property.houses > 0) {
      player.cash += (property.houses * tile.houseCost) / 2;
      property.houses = 0;
    }
    if (heir) {
      property.owner = heir.id;
    } else {
      property.owner = null;
      property.mortgaged = false;
    }
  }
  if (heir) {
    heir.cash += Math.max(player.cash, 0);
    heir.jailCards.push(...player.jailCards);
  } else {
    player.jailCards.forEach((deck) => returnJailCard(state, deck));
  }
  emit(state, { type: "bankrupt", playerId: player.id, creditorId: heir?.id ?? null, resigned });
  player.jailCards = [];
  player.cash = 0;
  player.bankrupt = true;
  player.inJail = false;
  // O banco absorve o empréstimo: ele não passa ao credor.
  player.loan = null;

  const wasCurrent = state.currentPlayerId === player.id;
  if (wasCurrent) state.debt = null;

  const remaining = activePlayers(state);
  if (remaining.length === 1) {
    state.winnerId = remaining[0].id;
    state.endReason = "bankruptcy";
    state.phase = "finished";
    state.debt = null;
    emit(state, { type: "game-end", winnerId: remaining[0].id, reason: "bankruptcy", netWorth: null });
    return;
  }
  if (wasCurrent) advanceTurn(state);
}

function advanceTurn(state: MagnataState) {
  const order = state.players;
  const currentIndex = order.findIndex((player) => player.id === state.currentPlayerId);
  let nextIndex = currentIndex;
  for (let step = 1; step <= order.length; step += 1) {
    const candidate = (currentIndex + step) % order.length;
    if (!order[candidate].bankrupt) {
      nextIndex = candidate;
      break;
    }
  }
  // A rodada vira quando a vez dá a volta na mesa.
  if (nextIndex <= currentIndex) state.round += 1;
  state.currentPlayerId = order[nextIndex].id;
  state.phase = "roll";
  state.rollAgain = false;
  state.doublesCount = 0;
  state.lastCard = null;
  state.turnNumber += 1;
  if (state.roundLimit && state.round > state.roundLimit) {
    state.round -= 1;
    state.turnNumber -= 1;
    finishByNetWorth(state, "round-limit");
    return;
  }
  if (state.turnLimit && state.turnNumber > state.turnLimit) {
    state.turnNumber -= 1;
    finishByNetWorth(state, "turn-limit");
    return;
  }
  const player = order[nextIndex];
  emit(state, { type: "turn-start", playerId: player.id });

  if (player.loan) {
    player.loan.turnsLeft -= 1;
    if (player.loan.turnsLeft <= 0) {
      const due = player.loan.due;
      player.loan = null;
      emit(state, { type: "loan-due", playerId: player.id, amount: due });
      if (charge(state, player, due, null, { kind: "roll" }) === "debt") {
        state.phase = "debt";
      } else {
        emit(state, { type: "loan-repaid", playerId: player.id, amount: due, early: false });
      }
    }
  }
}

function finishByNetWorth(state: MagnataState, reason: EndReason) {
  // Desempate: patrimônio, depois dinheiro, depois a ordem da mesa.
  const [winner] = activePlayers(state)
    .map((player, order) => ({ player, order, worth: netWorth(state, player.id) }))
    .sort((a, b) => b.worth - a.worth || b.player.cash - a.player.cash || a.order - b.order);
  state.winnerId = winner.player.id;
  state.endReason = reason;
  state.phase = "finished";
  emit(state, { type: "game-end", winnerId: winner.player.id, reason, netWorth: winner.worth });
}

// ---------------------------------------------------------------------------
// Utilitários

function requirePhase(state: MagnataState, phase: Phase) {
  if (state.phase !== phase) throw new GameRuleError("Esta ação não está disponível agora.");
}

function rollDie(rng: Rng): number {
  return 1 + Math.floor(rng() * 6);
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function emit(state: MagnataState, payload: GameEventPayload) {
  state.eventSeq += 1;
  state.events.push({ ...payload, seq: state.eventSeq, round: state.round } as GameEvent);
  if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
}

export function money(amount: number): string {
  return `$${amount.toLocaleString("pt-BR")}`;
}
