// Modelo puro de uma sala: lobby, jogadores, chat e a partida em andamento.
// Não conhece HTTP nem armazenamento; recebe tempo, ids e aleatoriedade prontos.

import { DOMINO_MODES, DOMINO_TARGETS, isDominoMode, isDominoTarget, type DominoMode } from "@/games/domino/engine";
import { isThemeId, type ThemeId } from "@/games/magnata/themes";
import type { MagnataView } from "@/games/magnata/engine";
import { isTrucoMode, type TrucoMode } from "@/games/truco/engine";
import { GAME_MODULES, magnataActorsNeeded, type AnyBotKind, type GameState } from "@/games/modules";
import { GAMES, type GameId } from "@/games/registry";
import { GameRuleError, type Rng } from "@/games/rules";
import { BOT_AVATAR, avatarOr } from "./avatars";

export const TOKEN_COLORS = ["#e4572e", "#2e86ab", "#f2c14e", "#4caf50", "#9c4dcc", "#ff8fb1"];
const MAX_CHAT = 50;
const MAX_CHAT_LENGTH = 200;
const MAX_NAME_LENGTH = 20;
const MAX_RECENT_COMMANDS = 40;
export const ROUND_LIMITS = [30, 60, 100] as const;
/** Prazo por jogada, em segundos, antes do piloto automático assumir. */
export const TURN_TIMEOUTS = [60, 120, 300] as const;
export const DEFAULT_TURN_TIMEOUT = 120;
/**
 * Pausa entre jogadas automáticas (robôs e piloto automático), para quem está
 * na mesa conseguir acompanhar cada ação.
 */
export const BOT_PACES = { fast: 1000, normal: 2500, slow: 4000 } as const;
export type BotPace = keyof typeof BOT_PACES;
export const DEFAULT_BOT_PACE: BotPace = "normal";
/** Preço da jogada por pessoa, em Funcoins (0 = grátis). */
export const STAKES = [0, 10, 25, 50, 100, 250] as const;
/** Quantos resultados de partidas a sala guarda (para liquidar apostas depois). */
const MAX_RESULTS = 5;

export type RoomStatus = "lobby" | "playing" | "finished";

export interface RoomPlayer {
  id: string;
  name: string;
  color: string;
  avatar: string;
  /** Presente quando o assento é de um robô. */
  bot?: AnyBotKind;
  /** Conta ligada ao assento (quem entrou logado). */
  userId?: string;
  /** Vitórias e selos da conta ao entrar, para exibir na mesa. */
  wins?: number;
  badges?: string[];
}

/** Quem está entrando: conta logada ou convidado. */
export interface Identity {
  userId: string;
  nickname: string;
  avatar: string;
  wins: number;
  badges: string[];
}

export interface RoomOptions {
  /** Rodadas até a partida acabar por patrimônio; `null` = até restar um jogador. */
  roundLimit: number | null;
  /** Segundos sem jogar até o piloto automático assumir; `null` = nunca. */
  turnTimeout: number | null;
  themeId: ThemeId;
  /** Regra opcional de empréstimos do banco. */
  credit: boolean;
  /** Ritmo das jogadas automáticas. */
  botPace: BotPace;
  /** Regra: recusar uma compra abre leilão. */
  auctions: boolean;
  /** Dominó: modalidade e meta de pontos (`null` = mão única). */
  dominoMode: DominoMode;
  dominoTarget: number | null;
  /** Preço da jogada por pessoa, em Funcoins (escolhido ao criar a sala). */
  stake: number;
  /** Truco: paulista (com vira) ou mineiro (manilhas fixas). */
  trucoMode: TrucoMode;
}

/** A partida em andamento, para apostas e estatísticas. */
export interface MatchInfo {
  id: string;
  stake: number;
  startedAt: number;
}

/** Como uma partida terminou: base para pagar apostas e contar vitórias. */
export interface MatchResult {
  matchId: string;
  gameId: GameId;
  stake: number;
  pot: number;
  winners: string[];
  seats: { playerId: string; name: string; userId: string | null; bot: boolean }[];
  /** Funcoins que cada assento recebe do pote. */
  payouts: Record<string, number>;
  feats: Record<string, string[]>;
  finishedAt: number;
}

export interface ChatMessage {
  id: number;
  playerId: string;
  name: string;
  text: string;
  at: number;
}

export interface Room {
  code: string;
  gameId: GameId;
  status: RoomStatus;
  hostId: string;
  players: RoomPlayer[];
  options: RoomOptions;
  game: GameState | null;
  match: MatchInfo | null;
  results: MatchResult[];
  /** Pessoas cuja vez está sendo jogada pelo piloto automático. */
  away: string[];
  chat: ChatMessage[];
  chatSeq: number;
  /** Ids dos últimos comandos, para não repetir efeitos em reenvios. Interno. */
  recentCommands: string[];
  version: number;
  createdAt: number;
  updatedAt: number;
}

export type RoomCommand =
  | { kind: "start" }
  | { kind: "game"; action: unknown }
  | { kind: "chat"; text: unknown }
  | { kind: "leave" }
  | { kind: "back" }
  | { kind: "rematch" }
  | { kind: "add-bot"; strategy: unknown }
  | { kind: "remove-bot"; playerId: unknown }
  | { kind: "set-options"; options: Record<string, unknown> };

export class RoomError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function normalizeName(input: unknown): string {
  if (typeof input !== "string") throw new RoomError("Informe um nome.");
  const name = input.replace(/[\p{C}]/gu, "").replace(/\s+/g, " ").trim();
  if (!name) throw new RoomError("Informe um nome.");
  if ([...name].length > MAX_NAME_LENGTH) throw new RoomError(`Use até ${MAX_NAME_LENGTH} caracteres no nome.`);
  return name;
}

export function createRoom(params: {
  code: string;
  gameId: GameId;
  hostId: string;
  hostName: string;
  hostAvatar?: unknown;
  identity?: Identity | null;
  options?: Record<string, unknown>;
  now: number;
}): Room {
  const host = seatFor(params.hostId, params.hostName, params.hostAvatar, params.identity ?? null, TOKEN_COLORS[0]);
  const defaults: RoomOptions = {
    roundLimit: null,
    turnTimeout: DEFAULT_TURN_TIMEOUT,
    themeId: "classico",
    credit: false,
    botPace: DEFAULT_BOT_PACE,
    auctions: true,
    dominoMode: "bloqueio",
    dominoTarget: DOMINO_TARGETS.bloqueio[0],
    stake: 0,
    trucoMode: "paulista",
  };
  const options = patchOptions(defaults, params.options ?? {}, [host]);
  return {
    code: params.code,
    gameId: params.gameId,
    status: "lobby",
    hostId: params.hostId,
    players: [host],
    options,
    game: null,
    match: null,
    results: [],
    away: [],
    chat: [],
    chatSeq: 0,
    recentCommands: [],
    version: 1,
    createdAt: params.now,
    updatedAt: params.now,
  };
}

export function joinRoom(room: Room, playerId: string, rawName: unknown, rawAvatar: unknown, now: number, identity: Identity | null = null): Room {
  const player = seatFor(playerId, rawName, rawAvatar, identity, "");
  if (room.status !== "lobby") throw new RoomError("A partida já começou.", 409);
  if (room.players.length >= maxPlayers(room)) throw new RoomError("A sala está cheia.", 409);
  if (identity && room.players.some((seat) => seat.userId === identity.userId)) {
    throw new RoomError("Sua conta já está nesta sala. Abra pelo aparelho em que você entrou.", 409);
  }
  if (room.players.some((seat) => seat.name.toLowerCase() === player.name.toLowerCase())) {
    throw new RoomError("Já existe alguém com esse nome na sala.", 409);
  }
  if (stakeOf(room) > 0 && !identity) throw new RoomError("Esta mesa vale Funcoins: entre com a sua conta para jogar.", 403);
  return touch({ ...room, players: [...room.players, { ...player, color: freeColor(room) }] }, now);
}

/** Assento de quem entra: logado, usa apelido e retrato da conta. */
function seatFor(id: string, rawName: unknown, rawAvatar: unknown, identity: Identity | null, color: string): RoomPlayer {
  if (identity) {
    return { id, name: identity.nickname, color, avatar: identity.avatar, userId: identity.userId, wins: identity.wins, badges: identity.badges };
  }
  const name = normalizeName(rawName);
  return { id, name, color, avatar: avatarOr(rawAvatar, name) };
}

const stakeOf = (room: Room) => room.options.stake ?? 0;

/** Limite de pessoas da sala: o do jogo, ou o da modalidade do dominó. */
export function maxPlayers(room: Pick<Room, "gameId" | "options">): number {
  return room.gameId === "domino" ? DOMINO_MODES[room.options.dominoMode ?? "bloqueio"].maxPlayers : GAMES[room.gameId].maxPlayers;
}

export function minPlayers(room: Pick<Room, "gameId" | "options">): number {
  return room.gameId === "domino" ? DOMINO_MODES[room.options.dominoMode ?? "bloqueio"].minPlayers : GAMES[room.gameId].minPlayers;
}

function freeColor(room: Room): string {
  return TOKEN_COLORS.find((candidate) => !room.players.some((player) => player.color === candidate))!;
}

export const isHuman = (player: RoomPlayer) => !player.bot;

// ---------------------------------------------------------------------------
// Jogadas automáticas: robôs e piloto automático de quem está ausente

type Autoplay = { kind: AnyBotKind; playerId: string; becomesAway: boolean };

/** Quem precisa agir agora no Magnata (mantido para os testes dos robôs). */
export function actorsNeeded(game: MagnataView): string[] {
  return magnataActorsNeeded(game);
}

const moduleOf = (room: Pick<Room, "gameId">) => GAME_MODULES[room.gameId];

/** Quem precisa agir agora na sala (pessoas e robôs). */
export function playersToAct(room: Room): RoomPlayer[] {
  return neededPlayers(room);
}

function neededPlayers(room: Room): RoomPlayer[] {
  if (room.status !== "playing" || !room.game) return [];
  return moduleOf(room)
    .actorsNeeded(room.game)
    .map((id) => room.players.find((player) => player.id === id))
    .filter((player): player is RoomPlayer => player !== undefined);
}

function pendingAutoplay(room: Room, now: number): Autoplay | null {
  const at = nextAutoplayAt(room);
  if (at === null || now < at) return null;
  const needed = neededPlayers(room);
  const autopilot = moduleOf(room).autopilot;
  const automatic = needed.find((player) => player.bot || room.away.includes(player.id));
  if (automatic) {
    return { kind: automatic.bot ?? autopilot, playerId: automatic.id, becomesAway: false };
  }
  // Prazo estourado: o piloto automático assume a primeira pessoa que falta.
  const late = needed[0];
  return late ? { kind: autopilot, playerId: late.id, becomesAway: !room.away.includes(late.id) } : null;
}

/**
 * Momento a partir do qual uma consulta deve fazer a partida andar sozinha, ou
 * `null` quando só falta uma pessoa presente e não há prazo.
 */
export function nextAutoplayAt(room: Room): number | null {
  const needed = neededPlayers(room);
  if (needed.length === 0) return null;
  if (needed.some((player) => player.bot || room.away.includes(player.id))) {
    return room.updatedAt + moduleOf(room).autoplayDelay(room.game!, botDelay(room));
  }
  const timeout = room.options.turnTimeout;
  return timeout ? room.updatedAt + timeout * 1000 : null;
}

export function botDelay(room: Room): number {
  return BOT_PACES[room.options.botPace] ?? BOT_PACES[DEFAULT_BOT_PACE];
}

/**
 * Executa uma jogada automática, se já for a hora. Devolve `null` quando não
 * há nada a fazer.
 */
export function stepAutoplay(room: Room, rng: Rng, now: number): Room | null {
  const auto = pendingAutoplay(room, now);
  if (!auto) return null;
  const rules = moduleOf(room);
  let game = room.game!;
  let away = room.away;
  if (auto.becomesAway) {
    away = [...away, auto.playerId];
    game = rules.note(game, "away", auto.playerId);
  }
  game = rules.autoplay(game, auto.playerId, auto.kind, rng);
  return settle({ ...room, game, away }, now);
}

/** Grava o estado novo da partida e, se ela acabou, o resultado. */
function settle(room: Room, now: number): Room {
  const game = room.game!;
  if (!moduleOf(room).finished(game)) return touch({ ...room, status: "playing" }, now);
  // Salas gravadas antes das apostas não têm `results`.
  const results = [...(room.results ?? []), matchResult(room, now)].slice(-MAX_RESULTS);
  return touch({ ...room, status: "finished", results }, now);
}

/** Vencedores, pote e pagamento de cada assento. Robôs entram com Funcoins da casa. */
export function matchResult(room: Room, now: number): MatchResult {
  const outcome = moduleOf(room).outcome(room.game!);
  const stake = room.match?.stake ?? 0;
  const pot = stake * room.players.length;
  const share = outcome.winners.length > 0 ? Math.floor(pot / outcome.winners.length) : 0;
  const payouts: Record<string, number> = {};
  for (const player of room.players) payouts[player.id] = outcome.winners.includes(player.id) ? share : 0;
  return {
    matchId: room.match?.id ?? `${room.code}-${room.version}`,
    gameId: room.gameId,
    stake,
    pot,
    winners: outcome.winners,
    seats: room.players.map((player) => ({ playerId: player.id, name: player.name, userId: player.userId ?? null, bot: Boolean(player.bot) })),
    payouts,
    feats: outcome.feats,
    finishedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Comandos

export function runCommand(room: Room, playerId: string, command: RoomCommand, rng: Rng, now: number): Room {
  const member = room.players.find((player) => player.id === playerId);
  if (!member || member.bot) throw new RoomError("Você não está nesta sala.", 403);

  switch (command.kind) {
    case "start": {
      if (room.hostId !== playerId) throw new RoomError("Só quem criou a sala pode iniciar.", 403);
      if (room.status !== "lobby") throw new RoomError("A partida já começou.", 409);
      const min = minPlayers(room);
      const max = maxPlayers(room);
      if (room.players.length < min) {
        throw new RoomError(min === max ? `Esta modalidade precisa de exatamente ${min} jogadores.` : `São necessários pelo menos ${min} jogadores.`, 409);
      }
      if (room.players.length > max) throw new RoomError(`Esta modalidade é para até ${max} jogadores.`, 409);
      if (stakeOf(room) > 0 && room.players.some((player) => !player.bot && !player.userId)) {
        throw new RoomError("Mesa que vale Funcoins: todas as pessoas precisam estar com a conta.", 409);
      }
      const seats = room.players.map(({ id, name, color }) => ({ id, name, color }));
      const game = withRuleErrors(() => moduleOf(room).start(seats, room.options, rng));
      const match: MatchInfo = { id: `${room.code}-${room.version}`, stake: stakeOf(room), startedAt: now };
      return touch({ ...room, status: "playing", game, match, away: [] }, now);
    }
    case "game": {
      if (room.status !== "playing" || !room.game) throw new RoomError("Não há partida em andamento.", 409);
      const rules = moduleOf(room);
      const action = rules.parse(command.action);
      if (!action) throw new RoomError("Ação inválida.");
      let game = room.game;
      let away = room.away;
      // Qualquer jogada de quem estava ausente devolve o controle à pessoa.
      if (away.includes(playerId)) {
        away = away.filter((id) => id !== playerId);
        game = rules.note(game, "back", playerId);
      }
      const current = game;
      game = withRuleErrors(() => rules.apply(current, playerId, action, rng));
      return settle({ ...room, game, away }, now);
    }
    case "chat": {
      if (typeof command.text !== "string") throw new RoomError("Mensagem inválida.");
      const text = command.text.replace(/[\p{C}]/gu, " ").trim();
      if (!text) throw new RoomError("Mensagem vazia.");
      if ([...text].length > MAX_CHAT_LENGTH) throw new RoomError(`Use até ${MAX_CHAT_LENGTH} caracteres.`);
      const chatSeq = room.chatSeq + 1;
      const chat = [...room.chat, { id: chatSeq, playerId, name: member.name, text, at: now }].slice(-MAX_CHAT);
      return touch({ ...room, chat, chatSeq }, now);
    }
    case "leave": {
      if (room.status === "lobby") {
        const players = room.players.filter((player) => player.id !== playerId);
        const nextHost = players.find(isHuman);
        if (!nextHost) throw new RoomError("Você é a última pessoa na sala.", 409);
        const hostId = room.hostId === playerId ? nextHost.id : room.hostId;
        return touch({ ...room, players, hostId }, now);
      }
      if (room.status === "playing" && room.game) {
        return runCommand(room, playerId, { kind: "game", action: moduleOf(room).resignAction }, rng, now);
      }
      throw new RoomError("A partida já terminou.", 409);
    }
    case "back": {
      if (!room.away.includes(playerId) || !room.game) return room;
      const game = moduleOf(room).note(room.game, "back", playerId);
      return touch({ ...room, game, away: room.away.filter((id) => id !== playerId) }, now);
    }
    case "rematch": {
      // Qualquer pessoa pode pedir: o anfitrião pode ter ido embora.
      if (room.status !== "finished") throw new RoomError("A partida ainda não terminou.", 409);
      return touch({ ...room, status: "lobby", game: null, match: null, away: [] }, now);
    }
    case "add-bot": {
      requireHostInLobby(room, playerId);
      const rules = moduleOf(room);
      if (!rules.isBot(command.strategy)) throw new RoomError("Robô desconhecido.");
      if (room.players.length >= maxPlayers(room)) throw new RoomError("A sala está cheia.", 409);
      const base = `Robô ${rules.bots[command.strategy].name}`;
      let name = base;
      for (let n = 2; room.players.some((player) => player.name === name); n += 1) name = `${base} ${n}`;
      const bot: RoomPlayer = {
        id: `bot-${room.version}-${room.players.length}`,
        name,
        color: freeColor(room),
        avatar: BOT_AVATAR,
        bot: command.strategy,
      };
      return touch({ ...room, players: [...room.players, bot] }, now);
    }
    case "remove-bot": {
      requireHostInLobby(room, playerId);
      const target = room.players.find((player) => player.id === command.playerId);
      if (!target?.bot) throw new RoomError("Robô não encontrado.", 404);
      return touch({ ...room, players: room.players.filter((player) => player.id !== target.id) }, now);
    }
    case "set-options": {
      requireHostInLobby(room, playerId);
      return touch({ ...room, options: patchOptions(room.options, command.options, room.players) }, now);
    }
  }
}

function patchOptions(current: RoomOptions, patch: Record<string, unknown>, players: RoomPlayer[]): RoomOptions {
  const next = { ...current };
  if ("roundLimit" in patch) {
    const value = patch.roundLimit ?? null;
    if (value !== null && !(ROUND_LIMITS as readonly unknown[]).includes(value)) throw new RoomError("Duração inválida.");
    next.roundLimit = value as number | null;
  }
  if ("turnTimeout" in patch) {
    const value = patch.turnTimeout ?? null;
    if (value !== null && !(TURN_TIMEOUTS as readonly unknown[]).includes(value)) throw new RoomError("Prazo inválido.");
    next.turnTimeout = value as number | null;
  }
  if ("themeId" in patch) {
    if (!isThemeId(patch.themeId)) throw new RoomError("Tema desconhecido.");
    next.themeId = patch.themeId;
  }
  if ("botPace" in patch) {
    if (typeof patch.botPace !== "string" || !Object.hasOwn(BOT_PACES, patch.botPace)) {
      throw new RoomError("Ritmo dos robôs inválido.");
    }
    next.botPace = patch.botPace as BotPace;
  }
  if ("auctions" in patch) {
    if (typeof patch.auctions !== "boolean") throw new RoomError("Opção de leilão inválida.");
    next.auctions = patch.auctions;
  }
  if ("credit" in patch) {
    if (typeof patch.credit !== "boolean") throw new RoomError("Opção de empréstimo inválida.");
    next.credit = patch.credit;
  }
  if ("dominoMode" in patch) {
    if (!isDominoMode(patch.dominoMode)) throw new RoomError("Modalidade de dominó desconhecida.");
    if (patch.dominoMode !== next.dominoMode) next.dominoTarget = DOMINO_TARGETS[patch.dominoMode][0];
    next.dominoMode = patch.dominoMode;
    if (players.length > DOMINO_MODES[next.dominoMode].maxPlayers) {
      throw new RoomError(`${DOMINO_MODES[next.dominoMode].name} é para até ${DOMINO_MODES[next.dominoMode].maxPlayers} jogadores.`, 409);
    }
  }
  if ("dominoTarget" in patch) {
    const value = patch.dominoTarget ?? null;
    if (!isDominoTarget(next.dominoMode, value)) throw new RoomError("Meta de pontos inválida.");
    next.dominoTarget = value;
  }
  if ("trucoMode" in patch) {
    if (!isTrucoMode(patch.trucoMode)) throw new RoomError("Modalidade de truco desconhecida.");
    next.trucoMode = patch.trucoMode;
  }
  if ("stake" in patch) {
    if (!(STAKES as readonly unknown[]).includes(patch.stake)) throw new RoomError("Preço da jogada inválido.");
    if ((patch.stake as number) > 0 && players.some((player) => !player.bot && !player.userId)) {
      throw new RoomError("Há convidados sem conta na mesa: para valer Funcoins, todos precisam entrar com a conta.", 409);
    }
    next.stake = patch.stake as number;
  }
  return next;
}

function requireHostInLobby(room: Room, playerId: string) {
  if (room.hostId !== playerId) throw new RoomError("Só quem criou a sala pode fazer isso.", 403);
  if (room.status !== "lobby") throw new RoomError("A partida já começou.", 409);
}

export function parseRoomCommand(input: unknown): RoomCommand | null {
  if (typeof input !== "object" || input === null) return null;
  const body = input as Record<string, unknown>;
  switch (body.kind) {
    case "start":
    case "leave":
    case "back":
    case "rematch":
      return { kind: body.kind };
    case "game":
      return { kind: "game", action: body.action };
    case "add-bot":
      return { kind: "add-bot", strategy: body.strategy };
    case "remove-bot":
      return { kind: "remove-bot", playerId: body.playerId };
    case "set-options": {
      const options = typeof body.options === "object" && body.options !== null ? body.options : {};
      // Formato antigo: { kind: "set-options", roundLimit }.
      const legacy = "roundLimit" in body ? { roundLimit: body.roundLimit } : {};
      return { kind: "set-options", options: { ...legacy, ...(options as Record<string, unknown>) } };
    }
    case "chat":
      return { kind: "chat", text: body.text };
    default:
      return null;
  }
}

/** Registra o id do comando; devolve `null` se ele já tinha sido aplicado. */
export function rememberCommand(room: Room, commandId: string): Room | null {
  if (room.recentCommands.includes(commandId)) return null;
  return { ...room, recentCommands: [...room.recentCommands, commandId].slice(-MAX_RECENT_COMMANDS) };
}

function withRuleErrors<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof GameRuleError) throw new RoomError(error.message, 409);
    throw error;
  }
}

function touch(room: Room, now: number): Room {
  return { ...room, version: room.version + 1, updatedAt: now };
}
