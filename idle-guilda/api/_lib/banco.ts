/**
 * Armazenamento chave-valor mínimo. Em produção usa o Upstash Redis pela API
 * REST (sem dependências); localmente e nos testes, um mapa em memória.
 */
export interface Banco {
  get(chave: string): Promise<string | null>;
  /** Grava; com `soSeNovo`, só grava se a chave não existir e devolve se gravou. */
  set(chave: string, valor: string, op?: { segundos?: number; soSeNovo?: boolean }): Promise<boolean>;
  del(chave: string): Promise<void>;
  /** Incrementa um contador (que expira, se `segundos` for dado); devolve o novo valor. */
  incr(chave: string, segundos?: number): Promise<number>;
  /** Lê e apaga numa operação só. */
  getdel(chave: string): Promise<string | null>;
  mget(chaves: string[]): Promise<(string | null)[]>;
  /** Conjunto ordenado (ranking e presença). */
  zadd(chave: string, membro: string, nota: number): Promise<void>;
  zrem(chave: string, membro: string): Promise<void>;
  /** Membros do maior para o menor, de `inicio` a `fim` (inclusive). */
  zrevrange(chave: string, inicio: number, fim: number): Promise<string[]>;
  /** Posição (0 = primeiro) do maior para o menor, ou null. */
  zrevrank(chave: string, membro: string): Promise<number | null>;
  zcard(chave: string): Promise<number>;
  /** Remove membros com nota até `max` (inclusive). */
  zremAte(chave: string, max: number): Promise<void>;
  /** Lista: insere no começo e mantém só os `maximo` primeiros. */
  lpush(chave: string, valor: string, maximo: number): Promise<void>;
  lrange(chave: string, inicio: number, fim: number): Promise<string[]>;
  lrem(chave: string, valor: string): Promise<void>;
}

export class ErroHttp extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Todas as chaves do jogo ficam sob este prefixo, para conviver com outros projetos no mesmo banco. */
export const PREFIXO = 'idle-guilda:';

export function bancoEmMemoria(agora: () => number = Date.now): Banco {
  const dados = new Map<string, { valor: string; expira: number | null }>();
  const conjuntos = new Map<string, Map<string, number>>();
  const listas = new Map<string, string[]>();
  const conjunto = (chave: string) => conjuntos.get(chave) ?? conjuntos.set(chave, new Map()).get(chave)!;
  const ordenado = (chave: string) => [...conjunto(chave)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const ler = (chave: string) => {
    const item = dados.get(chave);
    if (item && item.expira !== null && item.expira <= agora()) {
      dados.delete(chave);
      return undefined;
    }
    return item;
  };
  return {
    async get(chave) {
      return ler(chave)?.valor ?? null;
    },
    async set(chave, valor, op = {}) {
      if (op.soSeNovo && ler(chave)) return false;
      dados.set(chave, { valor, expira: op.segundos ? agora() + op.segundos * 1000 : null });
      return true;
    },
    async del(chave) {
      dados.delete(chave);
    },
    async incr(chave, segundos) {
      const item = ler(chave);
      const valor = Number(item?.valor ?? 0) + 1;
      const expira = item ? item.expira : segundos ? agora() + segundos * 1000 : null;
      dados.set(chave, { valor: String(valor), expira });
      return valor;
    },
    async getdel(chave) {
      const valor = ler(chave)?.valor ?? null;
      dados.delete(chave);
      return valor;
    },
    async mget(chaves) {
      return chaves.map((c) => ler(c)?.valor ?? null);
    },
    async zadd(chave, membro, nota) {
      conjunto(chave).set(membro, nota);
    },
    async zrem(chave, membro) {
      conjunto(chave).delete(membro);
    },
    async zrevrange(chave, inicio, fim) {
      return ordenado(chave)
        .slice(inicio, fim + 1)
        .map(([m]) => m);
    },
    async zrevrank(chave, membro) {
      const i = ordenado(chave).findIndex(([m]) => m === membro);
      return i < 0 ? null : i;
    },
    async zcard(chave) {
      return conjunto(chave).size;
    },
    async zremAte(chave, max) {
      for (const [m, n] of conjunto(chave)) if (n <= max) conjunto(chave).delete(m);
    },
    async lpush(chave, valor, maximo) {
      listas.set(chave, [valor, ...(listas.get(chave) ?? [])].slice(0, maximo));
    },
    async lrange(chave, inicio, fim) {
      return (listas.get(chave) ?? []).slice(inicio, fim + 1);
    },
    async lrem(chave, valor) {
      listas.set(
        chave,
        (listas.get(chave) ?? []).filter((v) => v !== valor),
      );
    },
  };
}

function bancoUpstash(url: string, token: string): Banco {
  async function comando(...partes: (string | number)[]): Promise<unknown> {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(partes),
    });
    const corpo = (await resposta.json()) as { result?: unknown; error?: string };
    if (!resposta.ok || corpo.error) throw new Error(`Upstash: ${corpo.error ?? resposta.status}`);
    return corpo.result;
  }
  return {
    async get(chave) {
      const r = await comando('GET', chave);
      return typeof r === 'string' ? r : null;
    },
    async set(chave, valor, op = {}) {
      const partes: (string | number)[] = ['SET', chave, valor];
      if (op.segundos) partes.push('EX', op.segundos);
      if (op.soSeNovo) partes.push('NX');
      return (await comando(...partes)) === 'OK';
    },
    async del(chave) {
      await comando('DEL', chave);
    },
    async incr(chave, segundos) {
      const valor = Number(await comando('INCR', chave));
      if (valor === 1 && segundos) await comando('EXPIRE', chave, segundos);
      return valor;
    },
    async getdel(chave) {
      const r = await comando('GETDEL', chave);
      return typeof r === 'string' ? r : null;
    },
    async mget(chaves) {
      if (chaves.length === 0) return [];
      const r = (await comando('MGET', ...chaves)) as (string | null)[];
      return r.map((v) => (typeof v === 'string' ? v : null));
    },
    async zadd(chave, membro, nota) {
      await comando('ZADD', chave, nota, membro);
    },
    async zrem(chave, membro) {
      await comando('ZREM', chave, membro);
    },
    async zrevrange(chave, inicio, fim) {
      return ((await comando('ZRANGE', chave, inicio, fim, 'REV')) as string[]) ?? [];
    },
    async zrevrank(chave, membro) {
      const r = await comando('ZREVRANK', chave, membro);
      return typeof r === 'number' ? r : null;
    },
    async zcard(chave) {
      return Number(await comando('ZCARD', chave));
    },
    async zremAte(chave, max) {
      await comando('ZREMRANGEBYSCORE', chave, '-inf', max);
    },
    async lpush(chave, valor, maximo) {
      await comando('LPUSH', chave, valor);
      await comando('LTRIM', chave, 0, maximo - 1);
    },
    async lrange(chave, inicio, fim) {
      return ((await comando('LRANGE', chave, inicio, fim)) as string[]) ?? [];
    },
    async lrem(chave, valor) {
      await comando('LREM', chave, 0, valor);
    },
  };
}

const global = globalThis as typeof globalThis & { __idleGuildaBanco?: Banco };

export function obterBanco(): Banco {
  if (global.__idleGuildaBanco) return global.__idleGuildaBanco;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!(url && token) && process.env.VERCEL) {
    throw new ErroHttp(503, 'As contas estão desligadas: o servidor está sem banco de dados.');
  }
  global.__idleGuildaBanco = url && token ? bancoUpstash(url, token) : bancoEmMemoria();
  return global.__idleGuildaBanco;
}
