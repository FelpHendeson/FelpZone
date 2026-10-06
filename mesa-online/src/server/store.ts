// Armazenamento das salas. Em produção usa Redis (Upstash, plano gratuito);
// sem as variáveis de ambiente, cai para memória — suficiente para `npm run dev`.

import { Redis } from "@upstash/redis";
import type { Room } from "@/rooms/room";

export interface StoredRoom {
  room: Room;
  /** playerId -> hash SHA-256 do token secreto do jogador. */
  tokens: Record<string, string>;
}

export interface RoomStore {
  readonly kind: "memory" | "redis";
  read(code: string): Promise<StoredRoom | null>;
  readVersion(code: string): Promise<number | null>;
  /** Cria a sala somente se o código estiver livre. */
  create(stored: StoredRoom): Promise<boolean>;
  /** Substitui a sala somente se ninguém a alterou desde `expectedVersion`. */
  replace(stored: StoredRoom, expectedVersion: number): Promise<boolean>;
}

/** Salas somem depois de dois dias sem nenhuma alteração. */
const ROOM_TTL_SECONDS = 60 * 60 * 48;

export function createMemoryStore(): RoomStore {
  const rooms = new Map<string, { json: string; expiresAt: number }>();
  const live = (code: string) => {
    const entry = rooms.get(code);
    if (entry && entry.expiresAt < Date.now()) rooms.delete(code);
    return rooms.get(code) ?? null;
  };
  const save = (stored: StoredRoom) =>
    rooms.set(stored.room.code, { json: JSON.stringify(stored), expiresAt: Date.now() + ROOM_TTL_SECONDS * 1000 });

  return {
    kind: "memory",
    async read(code) {
      const entry = live(code);
      return entry ? (JSON.parse(entry.json) as StoredRoom) : null;
    },
    async readVersion(code) {
      const entry = live(code);
      return entry ? (JSON.parse(entry.json) as StoredRoom).room.version : null;
    },
    async create(stored) {
      if (live(stored.room.code)) return false;
      save(stored);
      return true;
    },
    async replace(stored, expectedVersion) {
      const entry = live(stored.room.code);
      if (!entry || (JSON.parse(entry.json) as StoredRoom).room.version !== expectedVersion) return false;
      save(stored);
      return true;
    },
  };
}

const CREATE_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
return 1`;

const REPLACE_SCRIPT = `
if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[4])
redis.call('SET', KEYS[2], ARGV[3], 'EX', ARGV[4])
return 1`;

export function createRedisStore(redis: Redis): RoomStore {
  const keys = (code: string) => [`mesa:sala:${code}`, `mesa:sala:${code}:v`];
  return {
    kind: "redis",
    async read(code) {
      const json = await redis.get<string>(keys(code)[0]);
      return json ? (JSON.parse(json) as StoredRoom) : null;
    },
    async readVersion(code) {
      const version = await redis.get<string>(keys(code)[1]);
      return version ? Number(version) : null;
    },
    async create(stored) {
      const result = await redis.eval(CREATE_SCRIPT, keys(stored.room.code), [
        JSON.stringify(stored),
        String(stored.room.version),
        String(ROOM_TTL_SECONDS),
      ]);
      return Number(result) === 1;
    },
    async replace(stored, expectedVersion) {
      const result = await redis.eval(REPLACE_SCRIPT, keys(stored.room.code), [
        String(expectedVersion),
        JSON.stringify(stored),
        String(stored.room.version),
        String(ROOM_TTL_SECONDS),
      ]);
      return Number(result) === 1;
    },
  };
}

const globalForStore = globalThis as typeof globalThis & { __mesaRoomStore?: RoomStore };

export function getRoomStore(): RoomStore {
  if (globalForStore.__mesaRoomStore) return globalForStore.__mesaRoomStore;
  // A integração Upstash da Vercel pode expor qualquer um dos dois pares.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  const store =
    url && token
      ? createRedisStore(new Redis({ url, token, automaticDeserialization: false }))
      : createMemoryStore();
  if (store.kind === "memory" && process.env.VERCEL) {
    console.warn("[mesa-online] Redis não configurado: salas em memória não funcionam entre instâncias.");
  }
  globalForStore.__mesaRoomStore = store;
  return store;
}
