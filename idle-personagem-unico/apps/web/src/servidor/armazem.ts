/**
 * Armazenamento da conta no servidor (F9). Interface mínima de chave-valor,
 * com uma implementação para o Redis da Upstash (REST, sem dependência) e
 * outra em memória para os testes. Sem variáveis de ambiente, não há banco e a
 * API responde 503: o jogo segue em modo local.
 */

export interface Armazem {
  obter(chave: string): Promise<string | null>;
  gravar(chave: string, valor: string, ttlSegundos?: number): Promise<void>;
  /** Grava só se a chave não existir; devolve se gravou. */
  gravarSeNovo(chave: string, valor: string, ttlSegundos?: number): Promise<boolean>;
  apagar(chave: string): Promise<void>;
  /** Incrementa um contador (criado com TTL); devolve o novo valor. */
  incrementar(chave: string, ttlSegundos: number): Promise<number>;
}

/** Prefixo próprio, para poder dividir um banco com outros projetos. */
export const PREFIXO = "idle-pu:";

export class ArmazemMemoria implements Armazem {
  private readonly dados = new Map<string, { valor: string; expiraEm: number | null }>();
  constructor(private readonly relogio: () => number = () => Date.now()) {}
  private vivo(chave: string) {
    const x = this.dados.get(chave);
    if (x && x.expiraEm !== null && x.expiraEm <= this.relogio()) {
      this.dados.delete(chave);
      return undefined;
    }
    return x;
  }
  async obter(chave: string) {
    return this.vivo(chave)?.valor ?? null;
  }
  async gravar(chave: string, valor: string, ttl?: number) {
    this.dados.set(chave, { valor, expiraEm: ttl ? this.relogio() + ttl * 1000 : null });
  }
  async gravarSeNovo(chave: string, valor: string, ttl?: number) {
    if (this.vivo(chave)) return false;
    await this.gravar(chave, valor, ttl);
    return true;
  }
  async apagar(chave: string) {
    this.dados.delete(chave);
  }
  async incrementar(chave: string, ttl: number) {
    const x = this.vivo(chave);
    const n = (x ? Number(x.valor) : 0) + 1;
    this.dados.set(chave, { valor: String(n), expiraEm: x?.expiraEm ?? this.relogio() + ttl * 1000 });
    return n;
  }
}

/** Redis da Upstash pela API REST (`POST /` com o comando em JSON). */
export class ArmazemUpstash implements Armazem {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}
  private async comando(args: (string | number)[]): Promise<unknown> {
    const r = await fetch(this.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Banco respondeu ${r.status}.`);
    const corpo = (await r.json()) as { result?: unknown; error?: string };
    if (corpo.error) throw new Error("Erro do banco.");
    return corpo.result ?? null;
  }
  async obter(chave: string) {
    const v = await this.comando(["GET", PREFIXO + chave]);
    return typeof v === "string" ? v : null;
  }
  async gravar(chave: string, valor: string, ttl?: number) {
    await this.comando(ttl ? ["SET", PREFIXO + chave, valor, "EX", ttl] : ["SET", PREFIXO + chave, valor]);
  }
  async gravarSeNovo(chave: string, valor: string, ttl?: number) {
    const v = await this.comando(ttl ? ["SET", PREFIXO + chave, valor, "NX", "EX", ttl] : ["SET", PREFIXO + chave, valor, "NX"]);
    return v === "OK";
  }
  async apagar(chave: string) {
    await this.comando(["DEL", PREFIXO + chave]);
  }
  async incrementar(chave: string, ttl: number) {
    const n = Number(await this.comando(["INCR", PREFIXO + chave]));
    if (n === 1) await this.comando(["EXPIRE", PREFIXO + chave, ttl]);
    return n;
  }
}

/**
 * Banco configurado pelas variáveis da Upstash (`KV_REST_API_URL`/`KV_REST_API_TOKEN`,
 * como cria a integração da Vercel, ou `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`).
 * Sem elas, `null`.
 */
export function armazemDoAmbiente(env: Record<string, string | undefined> = process.env): Armazem | null {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  // https sempre; http só no próprio computador (para testar com um Redis local).
  if (!url || !token || !/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(url)) return null;
  return new ArmazemUpstash(url, token);
}
