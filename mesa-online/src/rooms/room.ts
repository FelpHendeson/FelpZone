// Modelo puro de uma sala: lobby, jogadores, chat e a partida em andamento.
// Não conhece HTTP nem armazenamento; recebe tempo, ids e aleatoriedade prontos.

import {
  GameRuleError,
  applyMagnataAction,
  createMagnataGame,
  noteEvent,
  parseMagnataAction,
  type MagnataState,
  type Rng,
} from "@/games/magnata/engine";
import { isThemeId, type ThemeId } from "@/games/magnata/themes";
import { GAMES, type GameId } from "@/games/registry";
import { BOTS, botAction, isBotKind } from "@/bots/strategies";
import type { BotKind } from "@/bots/types";
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
/** Pausa entre jogadas automáticas, para quem está na mesa conseguir acompanhar. */
export const BOT_DELAY_MS = 900;
/** Estilo usado pelo piloto automático de quem está ausente. */
const AUTOPILOT: BotKind = "conservador";

export type RoomStatus = "lobby" | "playing" | "finished";

export interface RoomPlayer {
  id: string;
  name: string;
  color: string;
  avatar: string;
  /** Presente quando o assento é de um robô. */
  bot?: BotKind;
}

export interface RoomOptions {
  /** Rodadas até a partida acabar por patrimônio; `null` = até restar um jogador. */
  roundLimit: number | null;
  /** Segundos sem jogar até o piloto automático assumir; `null` = nunca. */
  turnTimeout: number | null;
  themeId: ThemeId;
  /** Regra opcional de empréstimos do banco. */
  credit: boolean;
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
  game: MagnataState | null;
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
  now: number;
}): Room {
  const name = normalizeName(params.hostName);
  return {
    code: params.code,
    gameId: params.gameId,
    status: "lobby",
    hostId: params.hostId,
    players: [{ id: params.hostId, name, color: TOKEN_COLORS[0], avatar: avatarOr(params.hostAvatar, name) }],
    options: { roundLimit: null, turnTimeout: DEFAULT_TURN_TIMEOUT, themeId: "classico", credit: false },
    game: null,
    away: [],
    chat: [],
    chatSeq: 0,
    recentCommands: [],
    version: 1,
    createdAt: params.now,
    updatedAt: params.now,
  };
}

export function joinRoom(room: Room, playerId: string, rawName: unknown, rawAvatar: unknown, now: number): Room {
  const name = normalizeName(rawName);
  if (room.status !== "lobby") throw new RoomError("A partida já começou.", 409);
  if (room.players.length >= GAMES[room.gameId].maxPlayers) throw new RoomError("A sala está cheia.", 409);
  if (room.players.some((player) => player.name.toLowerCase() === name.toLowerCase())) {
    throw new RoomError("Já existe alguém com esse nome na sala.", 409);
  }
  const player: RoomPlayer = { id: playerId, name, color: freeColor(room), avatar: avatarOr(rawAvatar, name) };
  return touch({ ...room, players: [...room.players, player] }, now);
}

function freeColor(room: Room): string {
  return TOKEN_COLORS.find((candidate) => !room.players.some((player) => player.color === candidate))!;
}

export const isHuman = (player: RoomPlayer) => !player.bot;

// ---------------------------------------------------------------------------
// Jogadas automáticas: robôs e piloto automático de quem está ausente

type Autoplay = { kind: BotKind; playerId: string; becomesAway: boolean };

function pendingAutoplay(room: Room, now: number): Autoplay | null {
  const game = room.game;
  if (room.status !== "playing" || !game || game.phase === "finished") return null;
  const player = room.players.find((candidate) => candidate.id === game.currentPlayerId);
  if (!player) return null;
  const at = nextAutoplayAt(room);
  if (at === null || now < at) return null;
  if (player.bot) return { kind: player.bot, playerId: player.id, becomesAway: false };
  return { kind: AUTOPILOT, playerId: player.id, becomesAway: !room.away.includes(player.id) };
}

/**
 * Momento a partir do qual uma consulta deve fazer a vez andar sozinha, ou
 * `null` quando é a vez de uma pessoa presente sem prazo.
 */
export function nextAutoplayAt(room: Room): number | null {
  const game = room.game;
  if (room.status !== "playing" || !game || game.phase === "finished") return null;
  const player = room.players.find((candidate) => candidate.id === game.currentPlayerId);
  if (!player) return null;
  if (player.bot || room.away.includes(player.id)) return room.updatedAt + BOT_DELAY_MS;
  const timeout = room.options.turnTimeout;
  return timeout ? room.updatedAt + timeout * 1000 : null;
}

/** Robô que precisa jogar agora, se houver (ignora o tempo). */
export function awaitingBot(room: Room): BotKind | null {
  const game = room.game;
  if (room.status !== "playing" || !game || game.phase === "finished") return null;
  return room.players.find((player) => player.id === game.currentPlayerId)?.bot ?? null;
}

/**
 * Executa uma jogada automática, se já for a hora. Quando a jogada seguinte
 * seria só passar a vez, ela vai junto, para a mesa não esperar à toa.
 * Devolve `null` quando não há nada a fazer.
 */
export function stepAutoplay(room: Room, rng: Rng, now: number): Room | null {
  const auto = pendingAutoplay(room, now);
  if (!auto) return null;
  let game = room.game!;
  let away = room.away;
  if (auto.becomesAway) {
    away = [...away, auto.playerId];
    game = noteEvent(game, { type: "away", playerId: auto.playerId });
  }
  const me = auto.playerId;
  game = applyMagnataAction(game, me, botAction(auto.kind, game, me, rng), rng);
  if (game.phase === "end" && game.currentPlayerId === me && botAction(auto.kind, game, me, rng).type === "end-turn") {
    game = applyMagnataAction(game, me, { type: "end-turn" }, rng);
  }
  return touch({ ...room, game, away, status: game.phase === "finished" ? "finished" : "playing" }, now);
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
      const { minPlayers } = GAMES[room.gameId];
      if (room.players.length < minPlayers) throw new RoomError(`São necessários pelo menos ${minPlayers} jogadores.`, 409);
      const seats = room.players.map(({ id, name, color }) => ({ id, name, color }));
      const game = createMagnataGame(seats, rng, {
        roundLimit: room.options.roundLimit,
        credit: room.options.credit,
        themeId: room.options.themeId,
      });
      return touch({ ...room, status: "playing", game, away: [] }, now);
    }
    case "game": {
      if (room.status !== "playing" || !room.game) throw new RoomError("Não há partida em andamento.", 409);
      const action = parseMagnataAction(command.action);
      if (!action) throw new RoomError("Ação inválida.");
      let game = room.game;
      let away = room.away;
      // Qualquer jogada de quem estava ausente devolve o controle à pessoa.
      if (away.includes(playerId)) {
        away = away.filter((id) => id !== playerId);
        game = noteEvent(game, { type: "back", playerId });
      }
      const current = game;
      game = withRuleErrors(() => applyMagnataAction(current, playerId, action, rng));
      return touch({ ...room, game, away, status: game.phase === "finished" ? "finished" : "playing" }, now);
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
        return runCommand(room, playerId, { kind: "game", action: { type: "resign" } }, rng, now);
      }
      throw new RoomError("A partida já terminou.", 409);
    }
    case "back": {
      if (!room.away.includes(playerId) || !room.game) return room;
      const game = noteEvent(room.game, { type: "back", playerId });
      return touch({ ...room, game, away: room.away.filter((id) => id !== playerId) }, now);
    }
    case "rematch": {
      // Qualquer pessoa pode pedir: o anfitrião pode ter ido embora.
      if (room.status !== "finished") throw new RoomError("A partida ainda não terminou.", 409);
      return touch({ ...room, status: "lobby", game: null, away: [] }, now);
    }
    case "add-bot": {
      requireHostInLobby(room, playerId);
      if (!isBotKind(command.strategy)) throw new RoomError("Robô desconhecido.");
      if (room.players.length >= GAMES[room.gameId].maxPlayers) throw new RoomError("A sala está cheia.", 409);
      const base = `Robô ${BOTS[command.strategy].name}`;
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
      return touch({ ...room, options: patchOptions(room.options, command.options) }, now);
    }
  }
}

function patchOptions(current: RoomOptions, patch: Record<string, unknown>): RoomOptions {
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
  if ("credit" in patch) {
    if (typeof patch.credit !== "boolean") throw new RoomError("Opção de empréstimo inválida.");
    next.credit = patch.credit;
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
