// Motor puro do dominó (duplo-seis): Bloqueio, Compra, Pontos (5 em 5) e Duplas.
// Sem React e sem HTTP: recebe aleatoriedade pronta e devolve estado novo.
// Regras e decisões em docs/ESPECIFICACAO-EVOLUCAO-4.md, seção 3.

import { GameRuleError, type Rng } from "../rules";

export type DominoMode = "bloqueio" | "compra" | "pontos" | "duplas";
/** Pedra com o menor lado primeiro: [2, 5]. */
export type Tile = [number, number];
/** Pedra na linha, já virada: `a` à esquerda, `b` à direita. */
export interface Placed {
  a: number;
  b: number;
}
export type Side = "left" | "right";
export type BatidaKind = "simples" | "carroca" | "la-e-lo" | "cruzada";
export type DominoPhase = "playing" | "hand-over" | "finished";

export interface DominoPlayer {
  id: string;
  name: string;
  color: string;
  hand: Tile[];
  /** Pontos individuais (fora das duplas). */
  score: number;
  /** Dupla (0 ou 1) nas Duplas; `null` no individual. */
  team: 0 | 1 | null;
  /** Desistiu: não recebe mais pedras nem joga. */
  out: boolean;
}

export interface HandResult {
  hand: number;
  reason: "batida" | "trancada";
  /** Quem ganhou a mão (as duas pessoas da dupla, nas Duplas). Vazio no empate. */
  winnerIds: string[];
  /** Quem bateu. */
  batedorId: string | null;
  batida: BatidaKind | null;
  /** Pontos marcados por quem ganhou (por pessoa no individual, pela dupla nas Duplas). */
  points: number;
  /** Mãos de todos ao fim, à mostra. */
  hands: Record<string, Tile[]>;
  pips: Record<string, number>;
}

export type DominoEventPayload =
  | { type: "game-start"; mode: DominoMode; order: string[] }
  | { type: "hand-start"; hand: number; starterId: string }
  | { type: "play"; playerId: string; tile: Tile; side: Side; ends: [number, number]; points: number }
  | { type: "draw"; playerId: string; count: number }
  | { type: "pass"; playerId: string }
  | { type: "hand-end"; result: HandResult }
  | { type: "resign"; playerId: string }
  | { type: "away" | "back"; playerId: string }
  | { type: "game-end"; winnerIds: string[] };

export type DominoEvent = DominoEventPayload & { seq: number; hand: number };

export interface DominoState {
  kind: "domino";
  mode: DominoMode;
  /** Meta de pontos; `null` = mão única. */
  target: number | null;
  players: DominoPlayer[];
  /** Placar das duplas [dupla 0, dupla 1]; `null` fora das Duplas. */
  teamScores: [number, number] | null;
  /** Monte de compra. Segredo: nunca vai para o navegador. */
  boneyard: Tile[];
  /** Pedras fora de jogo nesta mão ("dormindo"). */
  sleeping: number;
  line: Placed[];
  currentPlayerId: string;
  phase: DominoPhase;
  hand: number;
  starterId: string;
  /** Passes seguidos desde a última pedra jogada. */
  passes: number;
  /** Na primeira mão, a pedra que quem começa é obrigado a jogar. */
  forcedTile: Tile | null;
  nextStarterId: string | null;
  lastHand: HandResult | null;
  winnerIds: string[];
  /** Feitos de cada um na partida (batidas especiais), para conquistas. */
  feats: Record<string, string[]>;
  events: DominoEvent[];
  eventSeq: number;
}

export type DominoView = Omit<DominoState, "boneyard" | "players"> & {
  boneyardCount: number;
  players: (Omit<DominoPlayer, "hand"> & { handCount: number; hand: Tile[] | null })[];
};

export interface DominoOptions {
  mode: DominoMode;
  target: number | null;
}

export type DominoAction = { type: "play"; tile: Tile; side?: Side } | { type: "next-hand" } | { type: "resign" };

export interface DominoSeat {
  id: string;
  name: string;
  color: string;
}

export const DOMINO_MODES: Record<DominoMode, { name: string; short: string; description: string; minPlayers: number; maxPlayers: number }> = {
  bloqueio: {
    name: "Bloqueio",
    short: "Sem compra",
    description: "7 pedras cada e nada de comprar: sem jogada, passa. Quem bate leva os pontos das mãos dos outros.",
    minPlayers: 2,
    maxPlayers: 4,
  },
  compra: {
    name: "Compra",
    short: "Com monte",
    description: "Sem pedra que sirva, compra do monte até poder jogar. Quem bate leva os pontos dos outros.",
    minPlayers: 2,
    maxPlayers: 4,
  },
  pontos: {
    name: "Pontos (5 em 5)",
    short: "5 em 5",
    description: "Com compra. Marca quem deixa a soma das pontas em múltiplo de 5. Carroça na ponta conta dobrado.",
    minPlayers: 2,
    maxPlayers: 4,
  },
  duplas: {
    name: "Duplas",
    short: "2 contra 2",
    description: "4 pessoas, parceiros frente a frente. Batida simples 1, carroça 2, lá-e-lô 3, cruzada 4.",
    minPlayers: 4,
    maxPlayers: 4,
  },
};

/** Metas permitidas por modalidade (`null` = mão única); a primeira é o padrão. */
export const DOMINO_TARGETS: Record<DominoMode, (number | null)[]> = {
  bloqueio: [50, 100, 150, null],
  compra: [50, 100, 150, null],
  pontos: [100, 150, 200],
  duplas: [6, 3, 12, null],
};

export function isDominoMode(value: unknown): value is DominoMode {
  return typeof value === "string" && Object.hasOwn(DOMINO_MODES, value);
}

export function isDominoTarget(mode: DominoMode, value: unknown): value is number | null {
  return (DOMINO_TARGETS[mode] as unknown[]).includes(value);
}

const MAX_EVENTS = 120;
/** Na mão trancada ou na batida do 5 em 5, os pontos vão para o múltiplo de 5 mais próximo. */
export const roundToFive = (value: number) => Math.round(value / 5) * 5;
export const pips = (tiles: Tile[]) => tiles.reduce((sum, [a, b]) => sum + a + b, 0);
export const tileKey = ([a, b]: Tile) => `${a}-${b}`;
const sameTile = (x: Tile, y: Tile) => x[0] === y[0] && x[1] === y[1];
const isDouble = ([a, b]: Tile) => a === b;
const usesDraw = (mode: DominoMode) => mode === "compra" || mode === "pontos";

export function fullSet(): Tile[] {
  const tiles: Tile[] = [];
  for (let a = 0; a <= 6; a += 1) for (let b = a; b <= 6; b += 1) tiles.push([a, b]);
  return tiles;
}

export function handSize(mode: DominoMode, players: number): number {
  return usesDraw(mode) && players > 2 ? 5 : 7;
}

// ---------------------------------------------------------------------------
// Criação

export function createDominoGame(seats: DominoSeat[], rng: Rng, options: DominoOptions): DominoState {
  const { mode } = options;
  const info = DOMINO_MODES[mode];
  if (seats.length < info.minPlayers || seats.length > info.maxPlayers) {
    throw new GameRuleError(
      info.minPlayers === info.maxPlayers
        ? `${info.name} precisa de exatamente ${info.minPlayers} jogadores.`
        : `${info.name} é para ${info.minPlayers} a ${info.maxPlayers} jogadores.`,
    );
  }
  const state: DominoState = {
    kind: "domino",
    mode,
    target: options.target,
    players: seats.map((seat, index) => ({
      ...seat,
      hand: [],
      score: 0,
      team: mode === "duplas" ? ((index % 2) as 0 | 1) : null,
      out: false,
    })),
    teamScores: mode === "duplas" ? [0, 0] : null,
    boneyard: [],
    sleeping: 0,
    line: [],
    currentPlayerId: seats[0].id,
    phase: "playing",
    hand: 0,
    starterId: seats[0].id,
    passes: 0,
    forcedTile: null,
    nextStarterId: null,
    lastHand: null,
    winnerIds: [],
    feats: {},
    events: [],
    eventSeq: 0,
  };
  emit(state, { type: "game-start", mode, order: seats.map((seat) => seat.id) });
  dealHand(state, rng);
  return state;
}

function dealHand(state: DominoState, rng: Rng) {
  const active = activePlayers(state);
  const tiles = shuffle(fullSet(), rng);
  const size = handSize(state.mode, active.length);
  for (const player of state.players) player.hand = [];
  for (const player of active) player.hand = sortHand(tiles.splice(0, size));
  state.boneyard = usesDraw(state.mode) ? tiles : [];
  state.sleeping = usesDraw(state.mode) ? 0 : tiles.length;
  state.line = [];
  state.passes = 0;
  state.hand += 1;
  state.phase = "playing";

  let starter: DominoPlayer;
  if (state.hand === 1) {
    // Primeira mão: a maior carroça começa (ou, sem carroças, a pedra mais alta).
    const opening = openingTile(active);
    starter = opening.player;
    state.forcedTile = opening.tile;
  } else {
    starter = firstActiveFrom(state, state.nextStarterId ?? state.starterId);
    state.forcedTile = null;
  }
  state.starterId = starter.id;
  state.currentPlayerId = starter.id;
  state.nextStarterId = null;
  emit(state, { type: "hand-start", hand: state.hand, starterId: starter.id });
}

function openingTile(players: DominoPlayer[]): { player: DominoPlayer; tile: Tile } {
  let best: { player: DominoPlayer; tile: Tile; rank: number } | null = null;
  for (const player of players) {
    for (const tile of player.hand) {
      // Carroças sempre acima das outras; entre as demais, a soma e depois o lado maior.
      const rank = isDouble(tile) ? 1000 + tile[0] : (tile[0] + tile[1]) * 10 + tile[1];
      if (!best || rank > best.rank) best = { player, tile, rank };
    }
  }
  return best!;
}

function sortHand(tiles: Tile[]): Tile[] {
  return [...tiles].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Consultas

export function activePlayers(state: DominoState): DominoPlayer[] {
  return state.players.filter((player) => !player.out);
}

export function getDominoPlayer(state: DominoState, playerId: string): DominoPlayer {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new GameRuleError("Jogador não está nesta partida.");
  return player;
}

/** Pontas da linha: [esquerda, direita], ou `null` com a mesa vazia. */
export function lineEnds(line: Placed[]): [number, number] | null {
  if (line.length === 0) return null;
  return [line[0].a, line[line.length - 1].b];
}

/** Lados em que a pedra encaixa agora (ignora a obrigação da primeira pedra). */
export function sidesFor(line: Placed[], tile: Tile): Side[] {
  const ends = lineEnds(line);
  if (!ends) return ["left"];
  const sides: Side[] = [];
  if (tile[0] === ends[0] || tile[1] === ends[0]) sides.push("left");
  if (tile[0] === ends[1] || tile[1] === ends[1]) sides.push("right");
  return sides;
}

export interface LegalPlay {
  tile: Tile;
  sides: Side[];
}

/** Pedras que a pessoa pode jogar agora, com os lados possíveis. */
export function legalPlays(state: Pick<DominoState, "line" | "forcedTile">, hand: Tile[]): LegalPlay[] {
  if (state.line.length === 0) {
    const options = state.forcedTile ? hand.filter((tile) => sameTile(tile, state.forcedTile!)) : hand;
    return options.map((tile) => ({ tile, sides: ["left"] as Side[] }));
  }
  return hand.map((tile) => ({ tile, sides: sidesFor(state.line, tile) })).filter((play) => play.sides.length > 0);
}

/**
 * Soma das pontas para o 5 em 5. Carroça na ponta conta pelos dois lados; a
 * primeira pedra da mão conta pelo seu total.
 */
export function endsCount(line: Placed[]): number {
  if (line.length === 0) return 0;
  if (line.length === 1) return line[0].a + line[0].b;
  const left = line[0];
  const right = line[line.length - 1];
  return (left.a === left.b ? left.a * 2 : left.a) + (right.a === right.b ? right.b * 2 : right.b);
}

/** Tipo de batida da última pedra, dadas as pontas antes de jogá-la. */
export function batidaKind(endsBefore: [number, number] | null, tile: Tile): BatidaKind {
  if (!endsBefore) return isDouble(tile) ? "carroca" : "simples";
  const [left, right] = endsBefore;
  const fitsLeft = tile[0] === left || tile[1] === left;
  const fitsRight = tile[0] === right || tile[1] === right;
  if (isDouble(tile)) return fitsLeft && fitsRight ? "cruzada" : "carroca";
  if (left !== right && fitsLeft && fitsRight) return "la-e-lo";
  return "simples";
}

export const BATIDA_POINTS: Record<BatidaKind, number> = { simples: 1, carroca: 2, "la-e-lo": 3, cruzada: 4 };

/** Quem precisa agir agora. */
export function dominoActorsNeeded(state: DominoState | DominoView): string[] {
  if (state.phase === "finished") return [];
  if (state.phase === "hand-over") {
    const starter = state.nextStarterId ?? state.starterId;
    const players: { id: string; out: boolean }[] = state.players;
    const player = players.find((candidate) => candidate.id === starter && !candidate.out) ?? players.find((candidate) => !candidate.out);
    return player ? [player.id] : [];
  }
  return [state.currentPlayerId];
}

// ---------------------------------------------------------------------------
// Ações

export function parseDominoAction(input: unknown): DominoAction | null {
  if (typeof input !== "object" || input === null) return null;
  const body = input as Record<string, unknown>;
  if (body.type === "next-hand" || body.type === "resign") return { type: body.type };
  if (body.type !== "play") return null;
  const tile = body.tile;
  if (!Array.isArray(tile) || tile.length !== 2) return null;
  const [a, b] = tile.map(Number);
  if (![a, b].every((value) => Number.isInteger(value) && value >= 0 && value <= 6)) return null;
  const side = body.side;
  if (side !== undefined && side !== "left" && side !== "right") return null;
  return { type: "play", tile: a <= b ? [a, b] : [b, a], ...(side ? { side } : {}) };
}

export function applyDominoAction(current: DominoState, playerId: string, action: DominoAction, rng: Rng): DominoState {
  const state = structuredClone(current);
  const player = getDominoPlayer(state, playerId);
  if (state.phase === "finished") throw new GameRuleError("A partida já terminou.");
  if (player.out) throw new GameRuleError("Você já saiu desta partida.");

  switch (action.type) {
    case "resign":
      resign(state, player, rng);
      return state;
    case "next-hand":
      if (state.phase !== "hand-over") throw new GameRuleError("A mão ainda está em andamento.");
      dealHand(state, rng);
      return state;
    case "play":
      if (state.phase !== "playing") throw new GameRuleError("Espere a próxima mão.");
      if (state.currentPlayerId !== player.id) throw new GameRuleError("Aguarde a sua vez.");
      play(state, player, action.tile, action.side, rng);
      return state;
  }
}

function play(state: DominoState, player: DominoPlayer, tile: Tile, wanted: Side | undefined, rng: Rng) {
  const index = player.hand.findIndex((candidate) => sameTile(candidate, tile));
  if (index < 0) throw new GameRuleError("Essa pedra não está na sua mão.");
  if (state.line.length === 0 && state.forcedTile && !sameTile(tile, state.forcedTile)) {
    throw new GameRuleError(`A primeira pedra tem que ser a ${tile[0] === tile[1] ? "carroça" : "pedra"} ${tileKey(state.forcedTile)}.`);
  }
  const sides = sidesFor(state.line, tile);
  if (sides.length === 0) throw new GameRuleError("Essa pedra não encaixa em nenhuma ponta.");
  const ends = lineEnds(state.line);
  let side: Side;
  if (wanted) {
    if (!sides.includes(wanted)) throw new GameRuleError("Essa pedra não encaixa nessa ponta.");
    side = wanted;
  } else if (sides.length === 1 || (ends && ends[0] === ends[1])) {
    side = sides[sides.length - 1];
  } else {
    throw new GameRuleError("Escolha em qual ponta jogar.");
  }

  const kind = batidaKind(ends, tile);
  player.hand.splice(index, 1);
  if (!ends) {
    state.line.push({ a: tile[0], b: tile[1] });
  } else if (side === "left") {
    const other = tile[0] === ends[0] ? tile[1] : tile[0];
    state.line.unshift({ a: other, b: ends[0] });
  } else {
    const other = tile[0] === ends[1] ? tile[1] : tile[0];
    state.line.push({ a: ends[1], b: other });
  }
  state.forcedTile = null;
  state.passes = 0;

  let points = 0;
  if (state.mode === "pontos") {
    const count = endsCount(state.line);
    if (count > 0 && count % 5 === 0) {
      points = count;
      player.score += count;
    }
  }
  emit(state, { type: "play", playerId: player.id, tile, side, ends: lineEnds(state.line)!, points });

  if (player.hand.length === 0) {
    endHand(state, "batida", player, kind);
    return;
  }
  if (state.mode === "pontos" && state.target !== null && player.score >= state.target) {
    finish(state, leaders(state));
    return;
  }
  advance(state, rng);
}

/**
 * Passa a vez adiante. Quem não tem pedra que sirva compra (nas modalidades
 * com monte) e, se ainda assim não puder, passa — não há escolha a fazer.
 */
function advance(state: DominoState, rng: Rng) {
  void rng;
  const active = activePlayers(state);
  let current = state.currentPlayerId;
  for (let guard = 0; guard < active.length * 30; guard += 1) {
    const next = nextActive(state, current);
    current = next.id;
    if (legalPlays(state, next.hand).length > 0) {
      state.currentPlayerId = next.id;
      return;
    }
    if (usesDraw(state.mode) && state.boneyard.length > 0) {
      let drawn = 0;
      while (state.boneyard.length > 0 && legalPlays(state, next.hand).length === 0) {
        next.hand = sortHand([...next.hand, state.boneyard.shift()!]);
        drawn += 1;
      }
      emit(state, { type: "draw", playerId: next.id, count: drawn });
      if (legalPlays(state, next.hand).length > 0) {
        state.currentPlayerId = next.id;
        return;
      }
    }
    emit(state, { type: "pass", playerId: next.id });
    state.passes += 1;
    if (state.passes >= active.length) {
      state.currentPlayerId = next.id;
      endHand(state, "trancada", null, null);
      return;
    }
  }
  throw new Error("Dominó: a vez não encontrou ninguém para jogar.");
}

function nextActive(state: DominoState, fromId: string): DominoPlayer {
  const index = state.players.findIndex((player) => player.id === fromId);
  for (let step = 1; step <= state.players.length; step += 1) {
    const candidate = state.players[(index + step) % state.players.length];
    if (!candidate.out) return candidate;
  }
  throw new Error("Dominó: ninguém ativo.");
}

function firstActiveFrom(state: DominoState, id: string): DominoPlayer {
  const player = state.players.find((candidate) => candidate.id === id);
  return player && !player.out ? player : nextActive(state, id);
}

function endHand(state: DominoState, reason: "batida" | "trancada", batedor: DominoPlayer | null, kind: BatidaKind | null) {
  const active = activePlayers(state);
  const pipsOf: Record<string, number> = {};
  const hands: Record<string, Tile[]> = {};
  for (const player of active) {
    pipsOf[player.id] = pips(player.hand);
    hands[player.id] = player.hand;
  }
  let winnerIds: string[] = [];
  let points = 0;
  let nextStarter: string | null = null;

  if (state.mode === "duplas") {
    const teamPips = [0, 1].map((team) => active.filter((player) => player.team === team).reduce((sum, player) => sum + pipsOf[player.id], 0));
    let team: 0 | 1 | null = null;
    if (batedor) {
      team = batedor.team;
      points = BATIDA_POINTS[kind!];
      nextStarter = batedor.id;
    } else if (teamPips[0] !== teamPips[1]) {
      team = teamPips[0] < teamPips[1] ? 0 : 1;
      points = 1;
      nextStarter = active.filter((player) => player.team === team).sort((x, y) => pipsOf[x.id] - pipsOf[y.id])[0].id;
    }
    if (team !== null) {
      state.teamScores![team] += points;
      winnerIds = state.players.filter((player) => player.team === team).map((player) => player.id);
    }
  } else {
    let winner: DominoPlayer | null = batedor;
    if (!winner) {
      const lowest = Math.min(...active.map((player) => pipsOf[player.id]));
      const tied = active.filter((player) => pipsOf[player.id] === lowest);
      winner = tied.length === 1 ? tied[0] : null;
    }
    if (winner) {
      const others = active.filter((player) => player.id !== winner!.id).reduce((sum, player) => sum + pipsOf[player.id], 0);
      points = state.mode === "pontos" ? roundToFive(others) : others;
      winner.score += points;
      winnerIds = [winner.id];
      nextStarter = winner.id;
    }
  }

  if (batedor && kind && kind !== "simples") addFeat(state, batedor.id, `batida-${kind}`);
  state.nextStarterId = nextStarter ?? nextActive(state, state.starterId).id;
  const result: HandResult = { hand: state.hand, reason, winnerIds, batedorId: batedor?.id ?? null, batida: kind, points, hands, pips: pipsOf };
  state.lastHand = result;
  emit(state, { type: "hand-end", result });

  if (state.target === null) {
    finish(state, winnerIds.length > 0 ? winnerIds : active.map((player) => player.id));
    return;
  }
  const reached = state.teamScores ? state.teamScores.some((score) => score >= state.target!) : active.some((player) => player.score >= state.target!);
  if (reached) finish(state, leaders(state));
  else state.phase = "hand-over";
}

/** Quem tem mais pontos agora (as duas pessoas da dupla, nas Duplas). */
function leaders(state: DominoState): string[] {
  if (state.teamScores) {
    const [zero, one] = state.teamScores;
    const teams = zero === one ? [0, 1] : [zero > one ? 0 : 1];
    return state.players.filter((player) => teams.includes(player.team!)).map((player) => player.id);
  }
  const active = activePlayers(state);
  const best = Math.max(...active.map((player) => player.score));
  return active.filter((player) => player.score === best).map((player) => player.id);
}

function finish(state: DominoState, winnerIds: string[]) {
  state.phase = "finished";
  state.winnerIds = winnerIds;
  if (state.mode === "duplas" && winnerIds.length > 0 && winnerIds.length < state.players.length) {
    for (const id of winnerIds) addFeat(state, id, "venceu-duplas");
  }
  emit(state, { type: "game-end", winnerIds });
}

function resign(state: DominoState, player: DominoPlayer, rng: Rng) {
  emit(state, { type: "resign", playerId: player.id });
  if (state.mode === "duplas") {
    // Em duplas, desistir entrega a partida à outra dupla.
    player.out = true;
    const otherTeam = player.team === 0 ? 1 : 0;
    finish(state, state.players.filter((candidate) => candidate.team === otherTeam).map((candidate) => candidate.id));
    return;
  }
  const wasCurrent = state.phase === "playing" && state.currentPlayerId === player.id;
  state.sleeping += player.hand.length;
  player.hand = [];
  player.out = true;
  const active = activePlayers(state);
  if (active.length === 1) {
    finish(state, [active[0].id]);
    return;
  }
  if (state.nextStarterId === player.id) state.nextStarterId = nextActive(state, player.id).id;
  if (wasCurrent) advance(state, rng);
}

/** Ausência e volta (piloto automático) também ficam na narração. */
export function noteDominoEvent(current: DominoState, payload: Extract<DominoEventPayload, { type: "away" | "back" }>): DominoState {
  const state = structuredClone(current);
  emit(state, payload);
  return state;
}

function addFeat(state: DominoState, playerId: string, feat: string) {
  const list = state.feats[playerId] ?? [];
  if (!list.includes(feat)) state.feats[playerId] = [...list, feat];
}

function emit(state: DominoState, payload: DominoEventPayload) {
  state.eventSeq += 1;
  state.events = [...state.events, { ...payload, seq: state.eventSeq, hand: state.hand }].slice(-MAX_EVENTS);
}

// ---------------------------------------------------------------------------
// Visão de cada pessoa

/** O que `viewerId` pode ver: a própria mão e só a quantidade de pedras dos outros. */
export function dominoView(state: DominoState, viewerId: string | null): DominoView {
  const { boneyard, players, ...rest } = state;
  return {
    ...rest,
    boneyardCount: boneyard.length,
    players: players.map(({ hand, ...player }) => ({
      ...player,
      handCount: hand.length,
      hand: player.id === viewerId ? hand : null,
    })),
  };
}
