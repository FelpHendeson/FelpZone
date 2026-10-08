// Motor puro do Truco (paulista e mineiro), 1 contra 1 ou em duplas.
// Regras e decisões em docs/ESPECIFICACAO-EVOLUCAO-5.md, seção 5.

import { GameRuleError, type Rng } from "../rules";

export type TrucoMode = "paulista" | "mineiro";
/** Ordem de força das cartas comuns, da mais fraca para a mais forte. */
export const RANKS = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"] as const;
/** Naipes na ordem das manilhas do paulista: ouros < espadas < copas < paus (zap). */
export const SUITS = ["o", "e", "c", "p"] as const;
export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];
/** Carta como texto curto: valor + naipe ("4p" = 4 de paus). */
export type Card = `${Rank}${Suit}`;
export type Team = 0 | 1;
export type TrucoPhase = "playing" | "eleven" | "hand-over" | "finished";

export const TARGET = 12;
/** Valores da mão: normal, truco, seis, nove e doze. */
export const STAKE_STEPS = [1, 3, 6, 9, 12] as const;
export const CALL_NAMES: Record<number, string> = { 3: "Truco", 6: "Seis", 9: "Nove", 12: "Doze" };
/** Manilhas fixas do mineiro, da mais forte para a mais fraca. */
export const MINEIRO_MANILHAS: Card[] = ["4p", "7c", "Ae", "7o"];

export interface TrucoPlayer {
  id: string;
  name: string;
  color: string;
  hand: Card[];
  team: Team;
}

export interface Played {
  playerId: string;
  /** `null` quando a carta foi jogada coberta (nunca é revelada). */
  card: Card | null;
}

export interface RoundResult {
  /** Dupla que venceu a rodada, ou `null` no empate ("cangou"). */
  team: Team | null;
  winnerId: string | null;
  plays: Played[];
}

export interface TrucoCall {
  fromTeam: Team;
  fromId: string;
  /** Valor pedido (3, 6, 9 ou 12). */
  value: number;
  responderId: string;
}

export interface TrucoHandResult {
  hand: number;
  team: Team | null;
  points: number;
  reason: "rodadas" | "correu" | "mao-de-onze" | "empate";
}

export type TrucoEventPayload =
  | { type: "game-start"; mode: TrucoMode; order: string[] }
  | { type: "hand-start"; hand: number; dealerId: string; vira: Card | null; eleven: Team | null; iron: boolean }
  | { type: "play"; playerId: string; card: Card | null }
  | { type: "round-end"; round: number; team: Team | null; winnerId: string | null }
  | { type: "call"; playerId: string; value: number }
  | { type: "accept"; playerId: string; value: number }
  | { type: "run"; playerId: string }
  | { type: "eleven"; playerId: string; play: boolean }
  | { type: "hand-end"; result: TrucoHandResult }
  | { type: "resign"; playerId: string }
  | { type: "away" | "back"; playerId: string }
  | { type: "game-end"; winnerIds: string[] };

export type TrucoEvent = TrucoEventPayload & { seq: number; hand: number };

export interface TrucoState {
  kind: "truco";
  mode: TrucoMode;
  players: TrucoPlayer[];
  scores: [number, number];
  /** Resto do baralho. Segredo: nunca vai para o navegador. */
  deck: Card[];
  /** Cartas já jogadas nesta mão (inclusive cobertas). Segredo. */
  pile: Card[];
  vira: Card | null;
  dealerIndex: number;
  hand: number;
  phase: TrucoPhase;
  currentPlayerId: string;
  /** Cartas da rodada em andamento. */
  table: Played[];
  rounds: RoundResult[];
  roundLeaderId: string;
  /** Quanto a mão vale agora. */
  value: number;
  call: TrucoCall | null;
  /** Dupla que fez o último pedido aceito (não pode pedir de novo em seguida). */
  lastRaiseTeam: Team | null;
  /** Mão de onze: a dupla com 11 decide se joga. */
  elevenTeam: Team | null;
  /** As duas duplas com 11: sem truco. */
  iron: boolean;
  lastHand: TrucoHandResult | null;
  winnerIds: string[];
  feats: Record<string, string[]>;
  events: TrucoEvent[];
  eventSeq: number;
}

export type TrucoView = Omit<TrucoState, "deck" | "pile" | "players"> & {
  players: (Omit<TrucoPlayer, "hand"> & { handCount: number; hand: Card[] | null })[];
};

export type TrucoAction =
  | { type: "play"; card: Card; covered?: boolean }
  | { type: "call" }
  | { type: "accept" }
  | { type: "run" }
  | { type: "raise" }
  | { type: "eleven"; play: boolean }
  | { type: "next-hand" }
  | { type: "resign" };

export interface TrucoSeat {
  id: string;
  name: string;
  color: string;
}

export const TRUCO_MODES: Record<TrucoMode, { name: string; description: string }> = {
  paulista: {
    name: "Paulista",
    description: "Com vira: a manilha é a carta seguinte à vira, e os naipes desempatam (♦ < ♠ < ♥ < ♣ zap).",
  },
  mineiro: {
    name: "Mineiro",
    description: "Sem vira: manilhas fixas 4♣ (zap), 7♥ (copas), A♠ (espadilha) e 7♦ (pica-fumo).",
  },
};

export function isTrucoMode(value: unknown): value is TrucoMode {
  return typeof value === "string" && Object.hasOwn(TRUCO_MODES, value);
}

const MAX_EVENTS = 120;
export const rankOf = (card: Card) => card.slice(0, -1) as Rank;
export const suitOf = (card: Card) => card.slice(-1) as Suit;

export function fullDeck(): Card[] {
  return RANKS.flatMap((rank) => SUITS.map((suit) => `${rank}${suit}` as Card));
}

export function isCard(value: unknown): value is Card {
  return typeof value === "string" && (fullDeck() as string[]).includes(value);
}

/** Valor que vira manilha no paulista: o seguinte ao da vira. */
export function manilhaRank(vira: Card): Rank {
  return RANKS[(RANKS.indexOf(rankOf(vira)) + 1) % RANKS.length];
}

/** Força da carta: comuns de 0 a 9; manilhas de 100 a 103. */
export function cardPower(card: Card, mode: TrucoMode, vira: Card | null): number {
  if (mode === "mineiro") {
    const index = MINEIRO_MANILHAS.indexOf(card);
    if (index >= 0) return 103 - index;
  } else if (vira && rankOf(card) === manilhaRank(vira)) {
    return 100 + SUITS.indexOf(suitOf(card));
  }
  return RANKS.indexOf(rankOf(card));
}

export const isManilha = (card: Card, mode: TrucoMode, vira: Card | null) => cardPower(card, mode, vira) >= 100;
export const teamOf = (state: { players: { id: string; team: Team }[] }, playerId: string) =>
  state.players.find((player) => player.id === playerId)!.team;
export const nextStake = (value: number) => STAKE_STEPS[STAKE_STEPS.indexOf(value as (typeof STAKE_STEPS)[number]) + 1] ?? null;

// ---------------------------------------------------------------------------
// Criação

export function createTrucoGame(seats: TrucoSeat[], rng: Rng, options: { mode: TrucoMode }): TrucoState {
  if (seats.length !== 2 && seats.length !== 4) throw new GameRuleError("Truco é para 2 jogadores (1 contra 1) ou 4 (duplas).");
  const state: TrucoState = {
    kind: "truco",
    mode: options.mode,
    players: seats.map((seat, index) => ({ ...seat, hand: [], team: (index % 2) as Team })),
    scores: [0, 0],
    deck: [],
    pile: [],
    vira: null,
    // A primeira mão é dada pelo último, para o primeiro da lista começar.
    dealerIndex: seats.length - 1,
    hand: 0,
    phase: "playing",
    currentPlayerId: seats[0].id,
    table: [],
    rounds: [],
    roundLeaderId: seats[0].id,
    value: 1,
    call: null,
    lastRaiseTeam: null,
    elevenTeam: null,
    iron: false,
    lastHand: null,
    winnerIds: [],
    feats: {},
    events: [],
    eventSeq: 0,
  };
  emit(state, { type: "game-start", mode: options.mode, order: seats.map((seat) => seat.id) });
  dealHand(state, rng);
  return state;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

const seatAfter = (state: TrucoState, index: number) => state.players[(index + 1) % state.players.length];

function dealHand(state: TrucoState, rng: Rng) {
  state.hand += 1;
  const deck = shuffle(fullDeck(), rng);
  const count = state.players.length;
  for (const player of state.players) player.hand = [];
  // Três cartas para cada um, a partir de quem está depois de quem dá.
  for (let card = 0; card < 3; card += 1) {
    for (let step = 1; step <= count; step += 1) state.players[(state.dealerIndex + step) % count].hand.push(deck.shift()!);
  }
  state.vira = state.mode === "paulista" ? deck.shift()! : null;
  state.deck = deck;
  state.pile = [];
  const first = seatAfter(state, state.dealerIndex);
  state.currentPlayerId = first.id;
  state.roundLeaderId = first.id;
  state.table = [];
  state.rounds = [];
  state.value = 1;
  state.call = null;
  state.lastRaiseTeam = null;
  const at11 = ([0, 1] as Team[]).filter((team) => state.scores[team] === TARGET - 1);
  state.iron = at11.length === 2;
  state.elevenTeam = at11.length === 1 ? at11[0] : null;
  state.phase = state.elevenTeam !== null ? "eleven" : "playing";
  emit(state, {
    type: "hand-start",
    hand: state.hand,
    dealerId: state.players[state.dealerIndex].id,
    vira: state.vira,
    eleven: state.elevenTeam,
    iron: state.iron,
  });
}

// ---------------------------------------------------------------------------
// Consultas

/** Quem precisa agir agora. */
export function trucoActorsNeeded(state: TrucoState | TrucoView): string[] {
  if (state.phase === "finished") return [];
  if (state.phase === "hand-over") return [state.players[(state.dealerIndex + 1) % state.players.length].id];
  if (state.phase === "eleven") return [elevenDecider(state)];
  if (state.call) return [state.call.responderId];
  return [state.currentPlayerId];
}

/** Na mão de onze, decide quem da dupla com 11 joga primeiro na mão. */
export function elevenDecider(state: { players: { id: string; team: Team }[]; dealerIndex: number; elevenTeam: Team | null }): string {
  for (let step = 1; step <= state.players.length; step += 1) {
    const player = state.players[(state.dealerIndex + step) % state.players.length];
    if (player.team === state.elevenTeam) return player.id;
  }
  return state.players[0].id;
}

/** Pode pedir truco (ou o valor seguinte) agora? */
export function canCall(state: TrucoState | TrucoView, playerId: string): boolean {
  return (
    state.phase === "playing" &&
    state.call === null &&
    state.currentPlayerId === playerId &&
    state.elevenTeam === null &&
    !state.iron &&
    nextStake(state.value) !== null &&
    state.lastRaiseTeam !== teamOf(state, playerId)
  );
}

/** Melhor carta da rodada até agora (para os robôs e para a mesa). */
export function tableLeader(state: Pick<TrucoState, "table" | "mode" | "vira" | "players">): { team: Team | null; power: number; playerId: string | null } {
  let best = -1;
  let team: Team | null = null;
  let playerId: string | null = null;
  for (const play of state.table) {
    const power = play.card ? cardPower(play.card, state.mode, state.vira) : -1;
    const playTeam = teamOf(state, play.playerId);
    if (power > best) {
      best = power;
      team = playTeam;
      playerId = play.playerId;
    } else if (power === best && power >= 0 && playTeam !== team) {
      team = null;
    }
  }
  return { team, power: best, playerId };
}

// ---------------------------------------------------------------------------
// Ações

export function parseTrucoAction(input: unknown): TrucoAction | null {
  if (typeof input !== "object" || input === null) return null;
  const body = input as Record<string, unknown>;
  switch (body.type) {
    case "call":
    case "accept":
    case "run":
    case "raise":
    case "next-hand":
    case "resign":
      return { type: body.type };
    case "eleven":
      return typeof body.play === "boolean" ? { type: "eleven", play: body.play } : null;
    case "play":
      return isCard(body.card) ? { type: "play", card: body.card, ...(body.covered === true ? { covered: true } : {}) } : null;
    default:
      return null;
  }
}

export function applyTrucoAction(current: TrucoState, playerId: string, action: TrucoAction, rng: Rng): TrucoState {
  const state = structuredClone(current);
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new GameRuleError("Jogador não está nesta partida.");
  if (state.phase === "finished") throw new GameRuleError("A partida já terminou.");
  const team = player.team;

  switch (action.type) {
    case "resign":
      emit(state, { type: "resign", playerId });
      finish(state, (team === 0 ? 1 : 0) as Team);
      return state;
    case "next-hand":
      if (state.phase !== "hand-over") throw new GameRuleError("A mão ainda está em andamento.");
      dealHand(state, rng);
      return state;
    case "eleven": {
      if (state.phase !== "eleven") throw new GameRuleError("Não é mão de onze.");
      if (team !== state.elevenTeam) throw new GameRuleError("Quem decide é a dupla com 11 pontos.");
      emit(state, { type: "eleven", playerId, play: action.play });
      if (!action.play) {
        endHand(state, (team === 0 ? 1 : 0) as Team, 1, "mao-de-onze");
        return state;
      }
      state.value = 3;
      state.phase = "playing";
      return state;
    }
    case "call": {
      if (!canCall(state, playerId)) throw new GameRuleError("Agora não dá para pedir truco.");
      const value = nextStake(state.value)!;
      state.call = { fromTeam: team, fromId: playerId, value, responderId: nextOpponent(state, playerId) };
      emit(state, { type: "call", playerId, value });
      return state;
    }
    case "accept":
    case "run":
    case "raise": {
      const call = state.call;
      if (!call) throw new GameRuleError("Ninguém pediu truco.");
      if (team === call.fromTeam) throw new GameRuleError("Quem responde é a outra dupla.");
      if (action.type === "accept") {
        state.value = call.value;
        state.lastRaiseTeam = call.fromTeam;
        state.call = null;
        emit(state, { type: "accept", playerId, value: call.value });
        return state;
      }
      if (action.type === "run") {
        emit(state, { type: "run", playerId });
        endHand(state, call.fromTeam, state.value, "correu");
        return state;
      }
      const raised = nextStake(call.value);
      if (raised === null) throw new GameRuleError("Doze é o máximo.");
      // Aumentar aceita o pedido anterior e devolve a decisão para quem pediu.
      state.value = call.value;
      state.lastRaiseTeam = call.fromTeam;
      state.call = { fromTeam: team, fromId: playerId, value: raised, responderId: call.fromId };
      emit(state, { type: "call", playerId, value: raised });
      return state;
    }
    case "play":
      if (state.phase !== "playing") throw new GameRuleError(state.phase === "eleven" ? "Primeiro decidam a mão de onze." : "Espere a próxima mão.");
      if (state.call) throw new GameRuleError("Responda o truco antes de jogar.");
      if (state.currentPlayerId !== playerId) throw new GameRuleError("Aguarde a sua vez.");
      play(state, player, action.card, action.covered === true);
      return state;
  }
}

function nextOpponent(state: TrucoState, playerId: string): string {
  const index = state.players.findIndex((player) => player.id === playerId);
  const team = state.players[index].team;
  for (let step = 1; step <= state.players.length; step += 1) {
    const candidate = state.players[(index + step) % state.players.length];
    if (candidate.team !== team) return candidate.id;
  }
  throw new Error("Truco: sem adversário.");
}

function play(state: TrucoState, player: TrucoPlayer, card: Card, covered: boolean) {
  const index = player.hand.indexOf(card);
  if (index < 0) throw new GameRuleError("Essa carta não está na sua mão.");
  if (covered && state.rounds.length === 0) throw new GameRuleError("Carta coberta só a partir da segunda rodada.");
  player.hand.splice(index, 1);
  state.pile.push(card);
  const played: Played = { playerId: player.id, card: covered ? null : card };
  state.table.push(played);
  emit(state, { type: "play", playerId: player.id, card: played.card });

  if (state.table.length < state.players.length) {
    state.currentPlayerId = seatAfter(state, state.players.indexOf(player)).id;
    return;
  }

  // Rodada completa.
  const leader = tableLeader(state);
  const result: RoundResult = {
    team: leader.power < 0 ? null : leader.team,
    winnerId: leader.power < 0 || leader.team === null ? null : leader.playerId,
    plays: state.table,
  };
  state.rounds.push(result);
  emit(state, { type: "round-end", round: state.rounds.length, team: result.team, winnerId: result.winnerId });
  state.table = [];

  const decided = handWinner(state.rounds);
  if (decided.done) {
    endHand(state, decided.team, decided.team === null ? 0 : state.value, decided.team === null ? "empate" : "rodadas");
    return;
  }
  // Quem ganhou começa a próxima; no empate, começa de novo quem abriu a rodada.
  const next = result.winnerId ?? state.roundLeaderId;
  state.roundLeaderId = next;
  state.currentPlayerId = next;
}

/** Quem ganha a mão pelas rodadas (`done: false` enquanto não se sabe). */
export function handWinner(rounds: Pick<RoundResult, "team">[]): { done: boolean; team: Team | null } {
  const wins = [0, 0];
  for (const round of rounds) if (round.team !== null) wins[round.team] += 1;
  if (wins[0] >= 2) return { done: true, team: 0 };
  if (wins[1] >= 2) return { done: true, team: 1 };
  if (rounds.length >= 2) {
    const first = rounds[0].team;
    if (first === null) {
      // Primeira empatada: decide a próxima que não empatar.
      const decisive = rounds.slice(1).find((round) => round.team !== null);
      if (decisive) return { done: true, team: decisive.team };
    } else if (rounds.slice(1).some((round) => round.team === null)) {
      // Primeira com vencedor e uma das seguintes empatada: vale a primeira.
      return { done: true, team: first };
    }
  }
  if (rounds.length === 3) return { done: true, team: null };
  return { done: false, team: null };
}

function endHand(state: TrucoState, team: Team | null, points: number, reason: TrucoHandResult["reason"]) {
  if (team !== null) {
    state.scores[team] = Math.min(TARGET, state.scores[team] + points);
    if (points === 12) {
      for (const player of state.players.filter((candidate) => candidate.team === team)) addFeat(state, player.id, "mao-de-doze");
    }
  }
  state.call = null;
  state.table = [];
  const result: TrucoHandResult = { hand: state.hand, team, points: team === null ? 0 : points, reason };
  state.lastHand = result;
  emit(state, { type: "hand-end", result });
  state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
  const winner = ([0, 1] as Team[]).find((candidate) => state.scores[candidate] >= TARGET);
  if (winner !== undefined) finish(state, winner);
  else state.phase = "hand-over";
}

function finish(state: TrucoState, team: Team) {
  state.phase = "finished";
  state.call = null;
  state.winnerIds = state.players.filter((player) => player.team === team).map((player) => player.id);
  emit(state, { type: "game-end", winnerIds: state.winnerIds });
}

export function noteTrucoEvent(current: TrucoState, payload: Extract<TrucoEventPayload, { type: "away" | "back" }>): TrucoState {
  const state = structuredClone(current);
  emit(state, payload);
  return state;
}

function addFeat(state: TrucoState, playerId: string, feat: string) {
  const list = state.feats[playerId] ?? [];
  if (!list.includes(feat)) state.feats[playerId] = [...list, feat];
}

function emit(state: TrucoState, payload: TrucoEventPayload) {
  state.eventSeq += 1;
  state.events = [...state.events, { ...payload, seq: state.eventSeq, hand: state.hand }].slice(-MAX_EVENTS);
}

// ---------------------------------------------------------------------------
// Visão de cada pessoa

/**
 * O que `viewerId` pode ver: a própria mão e, na mão de onze, a do parceiro
 * (a dupla com 11 decide olhando as duas). Baralho e cartas cobertas nunca saem.
 */
export function trucoView(state: TrucoState, viewerId: string | null): TrucoView {
  const { deck: _deck, pile: _pile, players, ...rest } = state;
  void _deck;
  void _pile;
  const viewer = players.find((player) => player.id === viewerId) ?? null;
  const seesPartner = viewer !== null && state.phase === "eleven" && viewer.team === state.elevenTeam;
  return {
    ...rest,
    players: players.map(({ hand, ...player }) => ({
      ...player,
      handCount: hand.length,
      hand: player.id === viewerId || (seesPartner && player.team === viewer!.team) ? hand : null,
    })),
  };
}
