// Armazenamento das contas, sessões, presença e praça. Mesmo esquema das
// salas: Redis (Upstash) em produção, memória no desenvolvimento e nos testes.
// Cada atualização do menu é UM comando (script Lua), para caber no plano gratuito.

import { Redis } from "@upstash/redis";
import { RoomError } from "@/rooms/room";

const PREFIX = "mesa:v2";
export const keys = {
  account: (id: string) => `${PREFIX}:conta:${id}`,
  email: (email: string) => `${PREFIX}:email:${email}`,
  nickname: (key: string) => `${PREFIX}:apelido:${key}`,
  session: (hash: string) => `${PREFIX}:sessao:${hash}`,
  card: (id: string) => `${PREFIX}:cartao:${id}`,
  where: (id: string) => `${PREFIX}:onde:${id}`,
  inbox: (id: string) => `${PREFIX}:avisos:${id}`,
  group: (id: string) => `${PREFIX}:grupo:${id}`,
  groupCode: (code: string) => `${PREFIX}:grupo-codigo:${code}`,
  groupChat: (id: string) => `${PREFIX}:grupo:${id}:conversa`,
  push: (id: string) => `${PREFIX}:push:${id}`,
  online: `${PREFIX}:online`,
};

export interface PlazaSnapshot {
  /** Para cada pessoa online: [cartão, onde está] (JSON). */
  online: [string | null, string | null][];
  /** Mensagens da conversa pedida, da mais nova para a mais velha (JSON). */
  chat: string[];
  /** Avisos recebidos (JSON), já retirados da caixa. */
  inbox: string[];
}

export interface Kv {
  readonly kind: "memory" | "redis";
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  /** Grava só se a chave não existir. */
  setNx(key: string, value: string, ttlSeconds?: number): Promise<boolean>;
  del(key: string): Promise<void>;
  /** Grava o documento só se a versão atual for `expected` (0 = ainda não existe). */
  writeDoc(key: string, json: string, expected: number, next: number): Promise<boolean>;
  /** Insere no começo de uma lista, mantendo no máximo `max` itens. */
  push(key: string, value: string, max: number, ttlSeconds?: number): Promise<void>;
  hit(key: string, limit: number, windowSeconds: number): Promise<boolean>;
  /**
   * Atualização do menu: marca presença (com onde a pessoa está), limpa quem
   * sumiu e devolve quem está online, a conversa pedida e os avisos.
   */
  plaza(input: {
    userId: string | null;
    where: string | null;
    now: number;
    windowMs: number;
    takeInbox: boolean;
    chatKey: string | null;
  }): Promise<PlazaSnapshot>;
}

const WHERE_TTL_SECONDS = 120;
const INBOX_MAX = 20;
const CHAT_MAX = 50;

export function createMemoryKv(): Kv {
  const values = new Map<string, { value: string; expiresAt: number | null }>();
  const lists = new Map<string, string[]>();
  const online = new Map<string, number>();
  const counters = new Map<string, { count: number; resetAt: number }>();
  const read = (key: string) => {
    const entry = values.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt < Date.now()) values.delete(key);
    return values.get(key)?.value ?? null;
  };
  const write = (key: string, value: string, ttl?: number) =>
    values.set(key, { value, expiresAt: ttl ? Date.now() + ttl * 1000 : null });

  return {
    kind: "memory",
    async get(key) {
      return read(key);
    },
    async set(key, value, ttl) {
      write(key, value, ttl);
    },
    async setNx(key, value, ttl) {
      if (read(key) !== null) return false;
      write(key, value, ttl);
      return true;
    },
    async del(key) {
      values.delete(key);
      lists.delete(key);
    },
    async writeDoc(key, json, expected, next) {
      const current = Number(read(`${key}:v`) ?? 0);
      if (current !== expected) return false;
      write(key, json);
      write(`${key}:v`, String(next));
      return true;
    },
    async push(key, value, max) {
      lists.set(key, [value, ...(lists.get(key) ?? [])].slice(0, max));
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
    async plaza({ userId, where, now, windowMs, takeInbox, chatKey }) {
      if (userId) {
        online.set(userId, now);
        if (where !== null) write(keys.where(userId), where, WHERE_TTL_SECONDS);
      }
      for (const [id, seen] of online) if (seen < now - windowMs) online.delete(id);
      const ids = [...online.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
      let inbox: string[] = [];
      if (userId && takeInbox) {
        inbox = lists.get(keys.inbox(userId)) ?? [];
        lists.delete(keys.inbox(userId));
      }
      return {
        online: ids.map((id) => [read(keys.card(id)), read(keys.where(id))]),
        chat: chatKey ? (lists.get(chatKey) ?? []) : [],
        inbox,
      };
    },
  };
}

const WRITE_DOC_SCRIPT = `
local current = redis.call('GET', KEYS[2])
if (current or '0') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], ARGV[3])
return 1`;

const PUSH_SCRIPT = `
redis.call('LPUSH', KEYS[1], ARGV[1])
redis.call('LTRIM', KEYS[1], 0, tonumber(ARGV[2]) - 1)
if tonumber(ARGV[3]) > 0 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
return 1`;

const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count`;

// KEYS: [1] online, [2] conversa (ou vazia). ARGV: agora, janela, onde, retirar avisos, prefixo, validade do "onde", conta.
const PLAZA_SCRIPT = `
local uid = ARGV[7]
local now = tonumber(ARGV[1])
local since = now - tonumber(ARGV[2])
local prefix = ARGV[5]
if uid ~= '' then
  redis.call('ZADD', KEYS[1], now, uid)
  if ARGV[3] ~= '' then redis.call('SET', prefix .. ':onde:' .. uid, ARGV[3], 'EX', ARGV[6]) end
end
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', '(' .. since)
local ids = redis.call('ZREVRANGEBYSCORE', KEYS[1], '+inf', since)
local online = {}
for i, id in ipairs(ids) do
  local card = redis.call('GET', prefix .. ':cartao:' .. id)
  local where = redis.call('GET', prefix .. ':onde:' .. id)
  online[i] = { card or '', where or '' }
end
local chat = {}
if KEYS[2] ~= '' then chat = redis.call('LRANGE', KEYS[2], 0, ${CHAT_MAX - 1}) end
local inbox = {}
if uid ~= '' and ARGV[4] == '1' then
  local key = prefix .. ':avisos:' .. uid
  inbox = redis.call('LRANGE', key, 0, -1)
  redis.call('DEL', key)
end
return { online, chat, inbox }`;

export function createRedisKv(redis: Redis): Kv {
  return {
    kind: "redis",
    async get(key) {
      return (await redis.get<string>(key)) ?? null;
    },
    async set(key, value, ttl) {
      if (ttl) await redis.set(key, value, { ex: ttl });
      else await redis.set(key, value);
    },
    async setNx(key, value, ttl) {
      const result = ttl ? await redis.set(key, value, { nx: true, ex: ttl }) : await redis.set(key, value, { nx: true });
      return result === "OK";
    },
    async del(key) {
      await redis.del(key);
    },
    async writeDoc(key, json, expected, next) {
      const result = await redis.eval(WRITE_DOC_SCRIPT, [key, `${key}:v`], [String(expected), json, String(next)]);
      return Number(result) === 1;
    },
    async push(key, value, max, ttl) {
      await redis.eval(PUSH_SCRIPT, [key], [value, String(max), String(ttl ?? 0)]);
    },
    async hit(key, limit, windowSeconds) {
      const count = await redis.eval(HIT_SCRIPT, [`${PREFIX}:limite:${key}`], [String(windowSeconds)]);
      return Number(count) <= limit;
    },
    async plaza(input) {
      try {
        return await plazaByScript(redis, input);
      } catch (error) {
        // Se o servidor recusar o script (chaves não declaradas), faz o mesmo em passos.
        console.warn("[mesa-online] praça sem script:", error);
        return plazaBySteps(redis, input);
      }
    },
  };
}

type PlazaInput = Parameters<Kv["plaza"]>[0];

async function plazaByScript(redis: Redis, { userId, where, now, windowMs, takeInbox, chatKey }: PlazaInput): Promise<PlazaSnapshot> {
  const [online, chat, inbox] = (await redis.eval(
    PLAZA_SCRIPT,
    [keys.online, chatKey ?? ""],
    [String(now), String(windowMs), where ?? "", takeInbox ? "1" : "0", PREFIX, String(WHERE_TTL_SECONDS), userId ?? ""],
  )) as [[string, string][], string[], string[]];
  return {
    online: (online ?? []).map(([card, place]) => [card || null, place || null]),
    chat: chat ?? [],
    inbox: inbox ?? [],
  };
}

async function plazaBySteps(redis: Redis, { userId, where, now, windowMs, takeInbox, chatKey }: PlazaInput): Promise<PlazaSnapshot> {
  if (userId) {
    await redis.zadd(keys.online, { score: now, member: userId });
    if (where !== null) await redis.set(keys.where(userId), where, { ex: WHERE_TTL_SECONDS });
  }
  await redis.zremrangebyscore(keys.online, "-inf", `(${now - windowMs}`);
  const ids = (await redis.zrange<string[]>(keys.online, "+inf", now - windowMs, { byScore: true, rev: true })) ?? [];
  const cards = ids.length ? await redis.mget<(string | null)[]>(...ids.map(keys.card)) : [];
  const places = ids.length ? await redis.mget<(string | null)[]>(...ids.map(keys.where)) : [];
  const chat = chatKey ? ((await redis.lrange<string>(chatKey, 0, CHAT_MAX - 1)) ?? []) : [];
  let inbox: string[] = [];
  if (userId && takeInbox) {
    inbox = (await redis.lrange<string>(keys.inbox(userId), 0, -1)) ?? [];
    await redis.del(keys.inbox(userId));
  }
  return { online: ids.map((_, index) => [cards[index] ?? null, places[index] ?? null]), chat, inbox };
}

export { INBOX_MAX, CHAT_MAX };

const globalForKv = globalThis as typeof globalThis & { __mesaKv?: Kv };

export function getKv(): Kv {
  if (globalForKv.__mesaKv) return globalForKv.__mesaKv;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!(url && token) && process.env.VERCEL) {
    throw new RoomError("O servidor está sem banco de dados configurado. Avise quem cuida do site.", 503);
  }
  const kv = url && token ? createRedisKv(new Redis({ url, token, automaticDeserialization: false })) : createMemoryKv();
  globalForKv.__mesaKv = kv;
  return kv;
}
