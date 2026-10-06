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
}

export interface PropertyState {
  owner: string | null;
  /** 0 a 4 casas; 5 representa um hotel. */
  houses: number;
  mortgaged: boolean;
}

export type Phase = "roll" | "buy" | "debt" | "end" | "finished";

/** O que acontece depois que uma dívida for paga. */
type DebtResume = { kind: "move"; steps: number } | null;

export interface Debt {
  amount: number;
  creditorId: string | null;
  resume: DebtResume;
}

export interface LogEntry {
  id: number;
  text: string;
}

export interface MagnataState {
  players: MagnataPlayer[];
  properties: Record<number, PropertyState>;
  currentPlayerId: string;
  phase: Phase;
  dice: [number, number] | null;
  rollAgain: boolean;
  doublesCount: number;
  debt: Debt | null;
  decks: Record<DeckId, string[]>;
  lastCard: { deck: DeckId; text: string } | null;
  log: LogEntry[];
  logSeq: number;
  turnNumber: number;
  /** Turno após o qual a partida acaba e vence o maior patrimônio; `null` = sem limite. */
  turnLimit: number | null;
  winnerId: string | null;
  endReason: "bankruptcy" | "turn-limit" | null;
}

export interface MagnataOptions {
  turnLimit?: number | null;
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
  "resign",
] as const;

export class GameRuleError extends Error {}

const MAX_LOG = 60;

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
  const players = shuffle(seats, rng).map<MagnataPlayer>((seat) => ({
    ...seat,
    cash: STARTING_CASH,
    position: 0,
    inJail: false,
    jailTurns: 0,
    jailCards: [],
    bankrupt: false,
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
    log: [],
    logSeq: 0,
    turnNumber: 1,
    turnLimit: options.turnLimit ?? null,
    winnerId: null,
    endReason: null,
  };
  log(state, `Partida iniciada. ${players[0].name} começa.`);
  return state;
}

/** Converte um corpo de requisição desconhecido em ação válida ou `null`. */
export function parseMagnataAction(input: unknown): MagnataAction | null {
  if (typeof input !== "object" || input === null) return null;
  const { type, tile } = input as { type?: unknown; tile?: unknown };
  if ((SIMPLE_ACTIONS as readonly unknown[]).includes(type)) {
    return { type } as MagnataAction;
  }
  if ((TILE_ACTIONS as readonly unknown[]).includes(type)) {
    if (typeof tile !== "number" || !Number.isInteger(tile) || tile < 0 || tile >= BOARD_SIZE) {
      return null;
    }
    return { type, tile } as MagnataAction;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Consultas usadas pelo motor e pela interface

export function getPlayer(state: MagnataState, playerId: string): MagnataPlayer {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new GameRuleError("Jogador não participa desta partida.");
  return player;
}

export function activePlayers(state: MagnataState): MagnataPlayer[] {
  return state.players.filter((player) => !player.bankrupt);
}

export function ownsWholeGroup(state: MagnataState, playerId: string, tileIndex: number): boolean {
  const tile = BOARD[tileIndex];
  if (tile.kind !== "street") return false;
  return groupTiles(tile.group).every((index) => state.properties[index].owner === playerId);
}

export function rentFor(state: MagnataState, tileIndex: number, diceTotal: number): number {
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

/** Dinheiro + valor das propriedades (hipotecadas descontam a quitação) + construções. */
export function netWorth(state: MagnataState, playerId: string): number {
  const player = getPlayer(state, playerId);
  if (player.bankrupt) return 0;
  let total = player.cash;
  for (const [index, property] of Object.entries(state.properties)) {
    if (property.owner !== playerId) continue;
    const tile = BOARD[Number(index)] as OwnableTile;
    total += property.mortgaged ? tile.price - unmortgageCost(tile) : tile.price;
    if (tile.kind === "street") total += property.houses * tile.houseCost;
  }
  return total;
}

/** Todas as ações que o motor aceitaria agora deste jogador. */
export function legalActions(state: MagnataState, playerId: string): MagnataAction[] {
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
  }
  actions.push({ type: "resign" });
  return actions;
}

/** Fases em que o jogador da vez pode vender construções e hipotecar. */
const RAISE_CASH_PHASES: Phase[] = ["roll", "buy", "debt", "end"];
/** Fases em que o jogador da vez pode construir e quitar hipotecas. */
const INVEST_PHASES: Phase[] = ["roll", "end"];

export function tileActionError(
  state: MagnataState,
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
    log(state, `${player.name} desistiu da partida.`);
    goBankrupt(state, player, null);
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
      log(state, `${player.name} comprou ${tile.name} por ${money(tile.price)}.`);
      state.phase = phaseAfterResolution(state, player);
      break;
    }
    case "decline":
      requirePhase(state, "buy");
      log(state, `${player.name} não comprou ${BOARD[player.position].name}.`);
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
      log(state, `${player.name} pagou ${money(JAIL_FINE)} de fiança.`);
      break;
    case "use-jail-card": {
      requirePhase(state, "roll");
      if (!player.inJail) throw new GameRuleError("Você não está na prisão.");
      const deck = player.jailCards.pop();
      if (!deck) throw new GameRuleError("Você não tem carta de liberdade.");
      returnJailCard(state, deck);
      releaseFromJail(player);
      log(state, `${player.name} usou uma carta de liberdade.`);
      break;
    }
    case "build":
    case "sell-building":
    case "mortgage":
    case "unmortgage":
      applyTileAction(state, player, action);
      break;
    case "pay-debt": {
      requirePhase(state, "debt");
      const debt = state.debt!;
      if (player.cash < debt.amount) throw new GameRuleError("Dinheiro insuficiente. Hipoteque ou venda algo antes.");
      transfer(state, player, debt.creditorId, debt.amount);
      state.debt = null;
      log(state, `${player.name} quitou a dívida de ${money(debt.amount)}.`);
      if (debt.resume?.kind === "move") {
        moveBy(state, player, debt.resume.steps);
        state.phase = resolveLanding(state, player);
      } else {
        state.phase = phaseAfterResolution(state, player);
      }
      break;
    }
    case "declare-bankruptcy": {
      requirePhase(state, "debt");
      const creditorId = state.debt!.creditorId;
      log(state, `${player.name} declarou falência.`);
      goBankrupt(state, player, creditorId);
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
      log(state, `${player.name} construiu ${property.houses === 5 ? "um hotel" : "uma casa"} em ${tile.name}.`);
      break;
    }
    case "sell-building": {
      const refund = (tile as Extract<OwnableTile, { kind: "street" }>).houseCost / 2;
      player.cash += refund;
      property.houses -= 1;
      log(state, `${player.name} vendeu uma construção em ${tile.name} por ${money(refund)}.`);
      break;
    }
    case "mortgage":
      player.cash += mortgageValue(tile);
      property.mortgaged = true;
      log(state, `${player.name} hipotecou ${tile.name} por ${money(mortgageValue(tile))}.`);
      break;
    case "unmortgage":
      player.cash -= unmortgageCost(tile);
      property.mortgaged = false;
      log(state, `${player.name} quitou a hipoteca de ${tile.name}.`);
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
  log(state, `${player.name} tirou ${dice[0]} e ${dice[1]}.`);

  if (player.inJail) {
    state.rollAgain = false;
    if (doubles) {
      releaseFromJail(player);
      log(state, `${player.name} tirou dupla e saiu da prisão.`);
      moveBy(state, player, total);
      state.phase = resolveLanding(state, player);
      return;
    }
    player.jailTurns += 1;
    if (player.jailTurns < 3) {
      log(state, `${player.name} continua na prisão.`);
      state.phase = "end";
      return;
    }
    releaseFromJail(player);
    log(state, `${player.name} cumpriu a pena e paga ${money(JAIL_FINE)} para sair.`);
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
      log(state, `${player.name} tirou três duplas seguidas e foi para a prisão.`);
      sendToJail(state, player);
      state.phase = "end";
      return;
    }
  }
  state.rollAgain = doubles;
  moveBy(state, player, total);
  state.phase = resolveLanding(state, player);
}

function moveBy(state: MagnataState, player: MagnataPlayer, steps: number) {
  const target = (player.position + steps) % BOARD_SIZE;
  if (target < player.position) collectSalary(state, player);
  player.position = target;
  log(state, `${player.name} parou em ${BOARD[target].name}.`);
}

function moveTo(state: MagnataState, player: MagnataPlayer, target: number) {
  if (target <= player.position) collectSalary(state, player);
  player.position = target;
  log(state, `${player.name} foi para ${BOARD[target].name}.`);
}

function collectSalary(state: MagnataState, player: MagnataPlayer) {
  player.cash += START_SALARY;
  log(state, `${player.name} passou pela Partida e recebeu ${money(START_SALARY)}.`);
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
        log(state, `${tile.name} está hipotecada; nada a pagar.`);
        break;
      }
      const diceTotal = state.dice ? state.dice[0] + state.dice[1] : 0;
      const rent = rentFor(state, index, diceTotal);
      const owner = getPlayer(state, property.owner);
      log(state, `${player.name} deve ${money(rent)} de aluguel para ${owner.name}.`);
      if (charge(state, player, rent, owner.id, null) === "debt") return "debt";
      break;
    }
    case "tax":
      log(state, `${player.name} deve ${money(tile.amount)} de ${tile.name}.`);
      if (charge(state, player, tile.amount, null, null) === "debt") return "debt";
      break;
    case "go-to-jail":
      sendToJail(state, player);
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
  state.lastCard = { deck, text: card.text };
  log(state, `${player.name} pegou ${deck === "sorte" ? "Sorte" : "Surpresa"}: ${card.text}`);

  const effect = card.effect;
  switch (effect.type) {
    case "collect":
      player.cash += effect.amount;
      break;
    case "pay":
      if (charge(state, player, effect.amount, null, null) === "debt") return "debt";
      break;
    case "repairs": {
      let total = 0;
      for (const property of Object.values(state.properties)) {
        if (property.owner !== player.id) continue;
        total += property.houses === 5 ? effect.perHotel : property.houses * effect.perHouse;
      }
      if (charge(state, player, total, null, null) === "debt") return "debt";
      break;
    }
    case "move-to":
      moveTo(state, player, effect.tile);
      return resolveLanding(state, player);
    case "move-back":
      player.position = (player.position - effect.steps + BOARD_SIZE) % BOARD_SIZE;
      log(state, `${player.name} voltou para ${BOARD[player.position].name}.`);
      return resolveLanding(state, player);
    case "go-to-jail":
      sendToJail(state, player);
      break;
    case "jail-card":
      break;
  }
  return phaseAfterResolution(state, player);
}

function phaseAfterResolution(state: MagnataState, player: MagnataPlayer): Phase {
  return state.rollAgain && !player.inJail ? "roll" : "end";
}

function sendToJail(state: MagnataState, player: MagnataPlayer) {
  player.position = JAIL_INDEX;
  player.inJail = true;
  player.jailTurns = 0;
  state.rollAgain = false;
  log(state, `${player.name} foi para a prisão.`);
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
  log(state, `${player.name} precisa levantar ${money(amount - player.cash)} para pagar.`);
  return "debt";
}

function transfer(state: MagnataState, from: MagnataPlayer, toId: string | null, amount: number) {
  from.cash -= amount;
  if (!toId) return;
  const creditor = getPlayer(state, toId);
  if (!creditor.bankrupt) creditor.cash += amount;
}

function goBankrupt(state: MagnataState, player: MagnataPlayer, creditorId: string | null) {
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
    log(state, `Os bens de ${player.name} foram para ${heir.name}.`);
  } else {
    player.jailCards.forEach((deck) => returnJailCard(state, deck));
    log(state, `Os bens de ${player.name} voltaram para o banco.`);
  }
  player.jailCards = [];
  player.cash = 0;
  player.bankrupt = true;
  player.inJail = false;

  const wasCurrent = state.currentPlayerId === player.id;
  if (wasCurrent) state.debt = null;

  const remaining = activePlayers(state);
  if (remaining.length === 1) {
    state.winnerId = remaining[0].id;
    state.endReason = "bankruptcy";
    state.phase = "finished";
    state.debt = null;
    log(state, `${remaining[0].name} venceu a partida!`);
    return;
  }
  if (wasCurrent) advanceTurn(state);
}

function advanceTurn(state: MagnataState) {
  const order = state.players;
  const currentIndex = order.findIndex((player) => player.id === state.currentPlayerId);
  for (let step = 1; step <= order.length; step += 1) {
    const candidate = order[(currentIndex + step) % order.length];
    if (!candidate.bankrupt) {
      state.currentPlayerId = candidate.id;
      break;
    }
  }
  state.phase = "roll";
  state.rollAgain = false;
  state.doublesCount = 0;
  state.lastCard = null;
  state.turnNumber += 1;
  if (state.turnLimit && state.turnNumber > state.turnLimit) {
    finishByNetWorth(state);
    return;
  }
  log(state, `Vez de ${getPlayer(state, state.currentPlayerId).name}.`);
}

function finishByNetWorth(state: MagnataState) {
  // Desempate: patrimônio, depois dinheiro, depois a ordem da mesa.
  const [winner] = activePlayers(state)
    .map((player, order) => ({ player, order, worth: netWorth(state, player.id) }))
    .sort((a, b) => b.worth - a.worth || b.player.cash - a.player.cash || a.order - b.order);
  state.winnerId = winner.player.id;
  state.endReason = "turn-limit";
  state.phase = "finished";
  state.turnNumber -= 1;
  log(state, `Limite de turnos atingido. ${winner.player.name} vence com patrimônio de ${money(winner.worth)}!`);
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

function log(state: MagnataState, text: string) {
  state.logSeq += 1;
  state.log.push({ id: state.logSeq, text });
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG);
}

export function money(amount: number): string {
  return `$${amount.toLocaleString("pt-BR")}`;
}
