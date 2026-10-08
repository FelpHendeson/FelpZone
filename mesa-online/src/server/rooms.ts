// Casos de uso das salas: ligam o modelo puro ao armazenamento e à identidade.
// Tudo que sai daqui para o navegador passa por `publicRoom`.

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { Rng } from "@/games/magnata/engine";
import { isGameId } from "@/games/registry";
import { publicRoom, type PublicRoom } from "@/rooms/public";
import {
  RoomError,
  type Room,
  createRoom,
  joinRoom,
  normalizeName,
  parseRoomCommand,
  rememberCommand,
  runCommand,
  stepAutoplay,
} from "@/rooms/room";
import { holdStakes, identityFor, releaseStakes, settleResult } from "./accounts";
import { getKv, type Kv } from "./kv";
import { notifyTurn } from "./push";
import { getRoomStore, type RoomStore, type StoredRoom } from "./store";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const MAX_WRITE_ATTEMPTS = 6;

/** Limites de frequência (seção 3.5 da especificação). */
const LIMITS = {
  create: { limit: 12, window: 600 },
  join: { limit: 30, window: 600 },
  command: { limit: 90, window: 60 },
  chat: { limit: 15, window: 60 },
} as const;
const TOO_MANY = "Muitas ações em pouco tempo. Aguarde alguns segundos.";

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
  input: { name: unknown; gameId?: unknown; avatar?: unknown; options?: unknown; ip?: string | null; session?: string | null },
  store: RoomStore = getRoomStore(),
  kv: Kv = getKv(),
): Promise<Seat & { room: PublicRoom }> {
  const gameId = input.gameId ?? "magnata";
  if (!isGameId(gameId)) throw new RoomError("Jogo desconhecido.");
  const identity = await identityFor(input.session ?? null, { kv, store });
  const hostName = identity ? identity.nickname : normalizeName(input.name);
  await limit(store, `criar:${input.ip ?? "?"}`, LIMITS.create);
  const seat = newSeat();
  const options = typeof input.options === "object" && input.options !== null ? (input.options as Record<string, unknown>) : {};
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const room = createRoom({
      code: newCode(),
      gameId,
      hostId: seat.playerId,
      hostName,
      hostAvatar: input.avatar,
      identity,
      options,
      now: Date.now(),
    });
    if (await store.create({ room, tokens: { [seat.playerId]: hashToken(seat.token) } })) {
      return { ...seat, room: publicRoom(room, seat.playerId) };
    }
  }
  throw new RoomError("Não foi possível criar a sala. Tente novamente.", 503);
}

export async function joinRoomAs(
  rawCode: string,
  input: { name: unknown; avatar?: unknown; ip?: string | null; session?: string | null },
  store: RoomStore = getRoomStore(),
  kv: Kv = getKv(),
): Promise<Seat & { room: PublicRoom }> {
  await limit(store, `entrar:${input.ip ?? "?"}`, LIMITS.join);
  const identity = await identityFor(input.session ?? null, { kv, store });
  const seat = newSeat();
  const stored = await mutate(rawCode, store, (current) => ({
    room: joinRoom(current.room, seat.playerId, input.name, input.avatar, Date.now(), identity),
    tokens: { ...current.tokens, [seat.playerId]: hashToken(seat.token) },
  }));
  return { ...seat, room: publicRoom(stored.room, seat.playerId) };
}

/**
 * Devolve a sala, ou `null` quando o cliente já tem a versão atual. Como a
 * Vercel não mantém processos rodando, é a consulta periódica de quem está na
 * mesa que faz os robôs (e o piloto automático de quem saiu) jogarem, uma
 * jogada por vez.
 */
export async function readRoom(
  rawCode: string,
  knownVersion: number | null,
  store: RoomStore = getRoomStore(),
  now = Date.now(),
  token: string | null = null,
  kv: Kv = getKv(),
): Promise<PublicRoom | null> {
  const code = normalizeCode(rawCode);
  if (knownVersion !== null) {
    const meta = await store.readMeta(code);
    if (!meta) throw new RoomError("Sala não encontrada.", 404);
    const autoplayDue = meta.autoplayAt !== null && now >= meta.autoplayAt;
    if (meta.version === knownVersion && !autoplayDue) return null;
  }
  let stored = await store.read(code);
  if (!stored) throw new RoomError("Sala não encontrada.", 404);
  const advanced = stepAutoplay(stored.room, secureRng, now);
  if (advanced) {
    const next = { ...stored, room: advanced };
    // Se outra consulta já fez a jogada, basta devolver o estado mais novo.
    if (await store.replace(next, stored.room.version)) {
      await afterWrite(stored.room, next.room, store, kv);
      stored = next;
    } else {
      stored = (await store.read(code)) ?? stored;
    }
  }
  if (knownVersion !== null && stored.room.version === knownVersion) return null;
  return publicRoom(stored.room, token ? playerForToken(stored, token) : null);
}

export async function runRoomCommand(
  rawCode: string,
  token: string | null,
  body: unknown,
  store: RoomStore = getRoomStore(),
  kv: Kv = getKv(),
): Promise<PublicRoom> {
  const command = parseRoomCommand(body);
  if (!command) throw new RoomError("Comando inválido.");
  if (!token) throw new RoomError("Identificação ausente. Entre na sala novamente.", 401);
  const commandId = parseCommandId(body);
  const tokenKey = hashToken(token).slice(0, 24);
  await limit(store, `comando:${tokenKey}`, LIMITS.command);
  if (command.kind === "chat") await limit(store, `chat:${tokenKey}`, LIMITS.chat);

  let playerId: string | null = null;
  const stored = await mutate(
    rawCode,
    store,
    (current) => {
      playerId = playerForToken(current, token);
      if (!playerId) throw new RoomError("Identificação inválida. Entre na sala novamente.", 401);
      let room = current.room;
      if (commandId) {
        const remembered = rememberCommand(room, commandId);
        // Reenvio de um comando já aplicado: devolve o estado atual sem repetir o efeito.
        if (!remembered) return null;
        room = remembered;
      }
      return { ...current, room: runCommand(room, playerId, command, secureRng, Date.now()) };
    },
    {
      // Partida começando: separa a entrada de cada conta antes de gravar.
      before: async (previous, next) => {
        if (next.room.match && next.room.match.id !== previous.room.match?.id) await holdStakes(next.room, { kv, store });
      },
      conflict: async (previous, next) => {
        if (next.room.match && next.room.match.id !== previous.room.match?.id) {
          await releaseStakes(next.room.match.id, accountIds(next.room), { kv, store });
        }
      },
      after: (previous, next) => afterWrite(previous.room, next.room, store, kv),
    },
  );
  return publicRoom(stored.room, playerId);
}

const accountIds = (room: Room) => room.players.filter((player) => player.userId).map((player) => player.userId!);

/**
 * Depois de gravar: avisa no celular quem passou a ter que jogar e, se a
 * partida acabou de terminar, paga o pote e conta vitórias (isso também é
 * refeito ao ler a conta).
 */
async function afterWrite(previous: Room, next: Room, store: RoomStore, kv: Kv) {
  notifyTurn(previous, next, { kv, store });
  if (next.status !== "finished" || previous.status === "finished") return;
  const result = next.results.at(-1);
  if (result) await settleResult(result, { kv, store }).catch((error) => console.error(error));
}

/**
 * Lê, aplica e grava com controle de versão, repetindo quando outra escrita
 * chega antes. `change` devolvendo `null` significa "nada a gravar".
 */
async function mutate(
  rawCode: string,
  store: RoomStore,
  change: (stored: StoredRoom) => StoredRoom | null,
  hooks: {
    before?: (previous: StoredRoom, next: StoredRoom) => Promise<void>;
    conflict?: (previous: StoredRoom, next: StoredRoom) => Promise<void>;
    after?: (previous: StoredRoom, next: StoredRoom) => Promise<void>;
  } = {},
): Promise<StoredRoom> {
  const code = normalizeCode(rawCode);
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const stored = await store.read(code);
    if (!stored) throw new RoomError("Sala não encontrada.", 404);
    const next = change(stored);
    if (!next) return stored;
    await hooks.before?.(stored, next);
    if (await store.replace(next, stored.room.version)) {
      await hooks.after?.(stored, next);
      return next;
    }
    await hooks.conflict?.(stored, next);
  }
  throw new RoomError("A sala está muito movimentada. Tente novamente.", 503);
}

async function limit(store: RoomStore, key: string, rule: { limit: number; window: number }) {
  if (!(await store.hit(key, rule.limit, rule.window))) throw new RoomError(TOO_MANY, 429);
}

function parseCommandId(body: unknown): string | null {
  const id = (body as { commandId?: unknown } | null)?.commandId;
  return typeof id === "string" && /^[\w-]{8,64}$/.test(id) ? id : null;
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
