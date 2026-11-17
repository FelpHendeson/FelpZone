/**
 * Armazenamento chave-valor mínimo. Em produção usa o Upstash Redis pela API
 * REST (sem dependências); localmente e nos testes, um mapa em memória.
 */
export interface Banco {
  get(chave: string): Promise<string | null>;
  /** Grava; com `soSeNovo`, só grava se a chave não existir e devolve se gravou. */
  set(chave: string, valor: string, op?: { segundos?: number; soSeNovo?: boolean }): Promise<boolean>;
  del(chave: string): Promise<void>;
  /** Incrementa um contador que expira; devolve o novo valor. */
  incr(chave: string, segundos: number): Promise<number>;
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
      dados.set(chave, { valor: String(valor), expira: item?.expira ?? agora() + segundos * 1000 });
      return valor;
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
      if (valor === 1) await comando('EXPIRE', chave, segundos);
      return valor;
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
