// Modelo puro de uma sala: lobby, jogadores, chat e a partida em andamento.
// Não conhece HTTP nem armazenamento; recebe tempo, ids e aleatoriedade prontos.

import {
  GameRuleError,
  applyMagnataAction,
  createMagnataGame,
  parseMagnataAction,
  type MagnataState,
  type Rng,
} from "@/games/magnata/engine";
import { GAMES, type GameId } from "@/games/registry";

export const TOKEN_COLORS = ["#e4572e", "#2e86ab", "#f2c14e", "#4caf50", "#9c4dcc", "#ff8fb1"];
const MAX_CHAT = 50;
const MAX_CHAT_LENGTH = 200;
const MAX_NAME_LENGTH = 20;

export type RoomStatus = "lobby" | "playing" | "finished";

export interface RoomPlayer {
  id: string;
  name: string;
  color: string;
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
  game: MagnataState | null;
  chat: ChatMessage[];
  chatSeq: number;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export type RoomCommand =
  | { kind: "start" }
  | { kind: "game"; action: unknown }
  | { kind: "chat"; text: unknown }
  | { kind: "leave" }
  | { kind: "rematch" };

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
  now: number;
}): Room {
  return {
    code: params.code,
    gameId: params.gameId,
    status: "lobby",
    hostId: params.hostId,
    players: [{ id: params.hostId, name: normalizeName(params.hostName), color: TOKEN_COLORS[0] }],
    game: null,
    chat: [],
    chatSeq: 0,
    version: 1,
    createdAt: params.now,
    updatedAt: params.now,
  };
}

export function joinRoom(room: Room, playerId: string, rawName: unknown, now: number): Room {
  const name = normalizeName(rawName);
  if (room.status !== "lobby") throw new RoomError("A partida já começou.", 409);
  if (room.players.length >= GAMES[room.gameId].maxPlayers) throw new RoomError("A sala está cheia.", 409);
  if (room.players.some((player) => player.name.toLowerCase() === name.toLowerCase())) {
    throw new RoomError("Já existe alguém com esse nome na sala.", 409);
  }
  const color = TOKEN_COLORS.find((candidate) => !room.players.some((player) => player.color === candidate))!;
  return touch({ ...room, players: [...room.players, { id: playerId, name, color }] }, now);
}

export function runCommand(room: Room, playerId: string, command: RoomCommand, rng: Rng, now: number): Room {
  const member = room.players.find((player) => player.id === playerId);
  if (!member) throw new RoomError("Você não está nesta sala.", 403);

  switch (command.kind) {
    case "start": {
      if (room.hostId !== playerId) throw new RoomError("Só quem criou a sala pode iniciar.", 403);
      if (room.status !== "lobby") throw new RoomError("A partida já começou.", 409);
      const { minPlayers } = GAMES[room.gameId];
      if (room.players.length < minPlayers) throw new RoomError(`São necessários pelo menos ${minPlayers} jogadores.`, 409);
      return touch({ ...room, status: "playing", game: createMagnataGame(room.players, rng) }, now);
    }
    case "game": {
      if (room.status !== "playing" || !room.game) throw new RoomError("Não há partida em andamento.", 409);
      const action = parseMagnataAction(command.action);
      if (!action) throw new RoomError("Ação inválida.");
      const game = withRuleErrors(() => applyMagnataAction(room.game!, playerId, action, rng));
      return touch({ ...room, game, status: game.phase === "finished" ? "finished" : "playing" }, now);
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
        if (players.length === 0) throw new RoomError("Você é a última pessoa na sala.", 409);
        const hostId = room.hostId === playerId ? players[0].id : room.hostId;
        return touch({ ...room, players, hostId }, now);
      }
      if (room.status === "playing" && room.game) {
        return runCommand(room, playerId, { kind: "game", action: { type: "resign" } }, rng, now);
      }
      throw new RoomError("A partida já terminou.", 409);
    }
    case "rematch": {
      if (room.hostId !== playerId) throw new RoomError("Só quem criou a sala pode recomeçar.", 403);
      if (room.status !== "finished") throw new RoomError("A partida ainda não terminou.", 409);
      return touch({ ...room, status: "lobby", game: null }, now);
    }
  }
}

export function parseRoomCommand(input: unknown): RoomCommand | null {
  if (typeof input !== "object" || input === null) return null;
  const body = input as Record<string, unknown>;
  switch (body.kind) {
    case "start":
    case "leave":
    case "rematch":
      return { kind: body.kind };
    case "game":
      return { kind: "game", action: body.action };
    case "chat":
      return { kind: "chat", text: body.text };
    default:
      return null;
  }
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
