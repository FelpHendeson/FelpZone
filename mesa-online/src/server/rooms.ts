// Casos de uso das salas: ligam o modelo puro ao armazenamento e à identidade.

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { Rng } from "@/games/magnata/engine";
import { isGameId } from "@/games/registry";
import {
  RoomError,
  createRoom,
  joinRoom,
  normalizeName,
  parseRoomCommand,
  runCommand,
  type Room,
} from "@/rooms/room";
import { getRoomStore, type RoomStore, type StoredRoom } from "./store";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const MAX_WRITE_ATTEMPTS = 6;

export interface Seat {
  playerId: string;
  token: string;
}

export const secureRng: Rng = () => randomInt(0, 2 ** 32) / 2 ** 32;

export function normalizeCode(input: string): string {
  const code = input.toUpperCase();
  if (code.length !== CODE_LENGTH || [...code].some((char) => !CODE_ALPHABET.includes(char))) {
    throw new RoomError("Código de sala inválido.", 404);
  }
  return code;
}

export async function createRoomFor(
  input: { name: unknown; gameId?: unknown },
  store: RoomStore = getRoomStore(),
): Promise<Seat & { room: Room }> {
  const gameId = input.gameId ?? "magnata";
  if (!isGameId(gameId)) throw new RoomError("Jogo desconhecido.");
  const hostName = normalizeName(input.name);
  const seat = newSeat();
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const room = createRoom({ code: newCode(), gameId, hostId: seat.playerId, hostName, now: Date.now() });
    if (await store.create({ room, tokens: { [seat.playerId]: hashToken(seat.token) } })) {
      return { ...seat, room };
    }
  }
  throw new RoomError("Não foi possível criar a sala. Tente novamente.", 503);
}

export async function joinRoomAs(
  rawCode: string,
  input: { name: unknown },
  store: RoomStore = getRoomStore(),
): Promise<Seat & { room: Room }> {
  const seat = newSeat();
  const room = await mutate(rawCode, store, (stored) => ({
    room: joinRoom(stored.room, seat.playerId, input.name, Date.now()),
    tokens: { ...stored.tokens, [seat.playerId]: hashToken(seat.token) },
  }));
  return { ...seat, room };
}

/** Devolve a sala, ou `null` quando o cliente já tem a versão atual. */
export async function readRoom(
  rawCode: string,
  knownVersion: number | null,
  store: RoomStore = getRoomStore(),
): Promise<Room | null> {
  const code = normalizeCode(rawCode);
  if (knownVersion !== null) {
    const version = await store.readVersion(code);
    if (version === null) throw new RoomError("Sala não encontrada.", 404);
    if (version === knownVersion) return null;
  }
  const stored = await store.read(code);
  if (!stored) throw new RoomError("Sala não encontrada.", 404);
  return stored.room;
}

export async function runRoomCommand(
  rawCode: string,
  token: string | null,
  body: unknown,
  store: RoomStore = getRoomStore(),
): Promise<Room> {
  const command = parseRoomCommand(body);
  if (!command) throw new RoomError("Comando inválido.");
  if (!token) throw new RoomError("Identificação ausente. Entre na sala novamente.", 401);
  return mutate(rawCode, store, (stored) => {
    const playerId = playerForToken(stored, token);
    if (!playerId) throw new RoomError("Identificação inválida. Entre na sala novamente.", 401);
    return { ...stored, room: runCommand(stored.room, playerId, command, secureRng, Date.now()) };
  });
}

async function mutate(
  rawCode: string,
  store: RoomStore,
  change: (stored: StoredRoom) => StoredRoom,
): Promise<Room> {
  const code = normalizeCode(rawCode);
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const stored = await store.read(code);
    if (!stored) throw new RoomError("Sala não encontrada.", 404);
    const next = change(stored);
    if (await store.replace(next, stored.room.version)) return next.room;
  }
  throw new RoomError("A sala está muito movimentada. Tente novamente.", 503);
}

function playerForToken(stored: StoredRoom, token: string): string | null {
  const hash = Buffer.from(hashToken(token), "hex");
  for (const [playerId, expected] of Object.entries(stored.tokens)) {
    const candidate = Buffer.from(expected, "hex");
    if (candidate.length === hash.length && timingSafeEqual(candidate, hash)) return playerId;
  }
  return null;
}

function newSeat(): Seat {
  return { playerId: randomBytes(6).toString("hex"), token: randomBytes(24).toString("base64url") };
}

function newCode(): string {
  return Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
