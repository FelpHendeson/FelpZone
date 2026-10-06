// Armazenamento das salas. Em produção usa Redis (Upstash, plano gratuito);
// sem as variáveis de ambiente, cai para memória — só no desenvolvimento.

import { Redis } from "@upstash/redis";
import { RoomError, nextAutoplayAt, type Room } from "@/rooms/room";

export interface StoredRoom {
  room: Room;
  /** playerId -> hash SHA-256 do token secreto do jogador. */
  tokens: Record<string, string>;
}

/** Resumo barato da sala, lido em toda consulta periódica. */
export interface RoomMeta {
  version: number;
  /** A partir de quando uma consulta deve fazer a vez andar sozinha (robô ou ausência). */
  autoplayAt: number | null;
}

export interface RoomStore {
  readonly kind: "memory" | "redis";
  read(code: string): Promise<StoredRoom | null>;
  readMeta(code: string): Promise<RoomMeta | null>;
  /** Cria a sala somente se o código estiver livre. */
  create(stored: StoredRoom): Promise<boolean>;
  /** Substitui a sala somente se ninguém a alterou desde `expectedVersion`. */
  replace(stored: StoredRoom, expectedVersion: number): Promise<boolean>;
  /** Conta uma ocorrência na janela; devolve `false` quando passou do limite. */
  hit(key: string, limit: number, windowSeconds: number): Promise<boolean>;
}

/** Salas somem depois de dois dias sem nenhuma alteração. */
const ROOM_TTL_SECONDS = 60 * 60 * 48;
/** Prefixo versionado: salas do formato anterior deixam de ser lidas em vez de quebrar. */
const PREFIX = "mesa:v2";

export function createMemoryStore(): RoomStore {
  const rooms = new Map<string, { json: string; expiresAt: number }>();
  const counters = new Map<string, { count: number; resetAt: number }>();
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
    async readMeta(code) {
      const entry = live(code);
      return entry ? metaOf((JSON.parse(entry.json) as StoredRoom).room) : null;
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
    async hit(key, limit, windowSeconds) {
      const now = Date.now();
      const current = counters.get(key);
      if (!current || current.resetAt <= now) {
        counters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
        return true;
      }
      current.count += 1;
      return current.count <= limit;
    },
  };
}

const CREATE_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
return 1`;

const REPLACE_SCRIPT = `
local current = redis.call('GET', KEYS[2])
if not current or string.match(current, '^%d+') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[4])
redis.call('SET', KEYS[2], ARGV[3], 'EX', ARGV[4])
return 1`;

const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count`;

export function createRedisStore(redis: Redis): RoomStore {
  const keys = (code: string) => [`${PREFIX}:sala:${code}`, `${PREFIX}:sala:${code}:v`];
  return {
    kind: "redis",
    async read(code) {
      const json = await redis.get<string>(keys(code)[0]);
      return json ? (JSON.parse(json) as StoredRoom) : null;
    },
    async readMeta(code) {
      const meta = await redis.get<string>(keys(code)[1]);
      return meta ? parseMeta(meta) : null;
    },
    async create(stored) {
      const result = await redis.eval(CREATE_SCRIPT, keys(stored.room.code), [
        JSON.stringify(stored),
        encodeMeta(stored.room),
        String(ROOM_TTL_SECONDS),
      ]);
      return Number(result) === 1;
    },
    async replace(stored, expectedVersion) {
      const result = await redis.eval(REPLACE_SCRIPT, keys(stored.room.code), [
        String(expectedVersion),
        JSON.stringify(stored),
        encodeMeta(stored.room),
        String(ROOM_TTL_SECONDS),
      ]);
      return Number(result) === 1;
    },
    async hit(key, limit, windowSeconds) {
      const count = await redis.eval(HIT_SCRIPT, [`${PREFIX}:limite:${key}`], [String(windowSeconds)]);
      return Number(count) <= limit;
    },
  };
}

function metaOf(room: Room): RoomMeta {
  return { version: room.version, autoplayAt: nextAutoplayAt(room) };
}

/** Grava "versão" ou "versão:momento-da-jogada-automática" na chave curta da sala. */
function encodeMeta(room: Room): string {
  const meta = metaOf(room);
  return meta.autoplayAt === null ? String(meta.version) : `${meta.version}:${meta.autoplayAt}`;
}

function parseMeta(value: string): RoomMeta {
  const [version, autoplayAt] = value.split(":");
  return { version: Number(version), autoplayAt: autoplayAt ? Number(autoplayAt) : null };
}

const globalForStore = globalThis as typeof globalThis & { __mesaRoomStore?: RoomStore };

export function getRoomStore(): RoomStore {
  if (globalForStore.__mesaRoomStore) return globalForStore.__mesaRoomStore;
  // A integração Upstash da Vercel pode expor qualquer um dos dois pares.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!(url && token) && process.env.VERCEL) {
    // Em produção, memória isolada por instância faria salas "sumirem": melhor falhar claro.
    console.error("[mesa-online] Redis não configurado em produção.");
    throw new RoomError("O servidor está sem banco de dados configurado. Avise quem cuida do site.", 503);
  }
  const store =
    url && token
      ? createRedisStore(new Redis({ url, token, automaticDeserialization: false }))
      : createMemoryStore();
  globalForStore.__mesaRoomStore = store;
  return store;
}
