/**
 * Armazenamento da conta no servidor (F9). Interface mínima de chave-valor,
 * com uma implementação para o Redis da Upstash (REST, sem dependência) e
 * outra em memória para os testes. Sem variáveis de ambiente, não há banco e a
 * API responde 503: o jogo segue em modo local.
 */

export interface Condicao { readonly chave: string; readonly valor: string | null }
export interface Escrita { readonly chave: string; readonly valor: string; readonly ttlSegundos?: number }

export interface Armazem {
  obter(chave: string): Promise<string | null>;
  gravar(chave: string, valor: string, ttlSegundos?: number): Promise<void>;
  /** Grava só se a chave não existir; devolve se gravou. */
  gravarSeNovo(chave: string, valor: string, ttlSegundos?: number): Promise<boolean>;
  apagar(chave: string): Promise<void>;
  /** Incrementa um contador (criado com TTL); devolve o novo valor. */
  incrementar(chave: string, ttlSegundos: number): Promise<number>;
  /** Compara todas as condições e grava tudo em uma operação atômica. */
  compararEGravar(condicoes: readonly Condicao[], escritas: readonly Escrita[]): Promise<boolean>;
  apagarSeIgual(chave: string, valor: string): Promise<void>;
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
  async compararEGravar(condicoes: readonly Condicao[], escritas: readonly Escrita[]) {
    if (!condicoes.every((c) => (this.vivo(c.chave)?.valor ?? null) === c.valor)) return false;
    for (const e of escritas) this.dados.set(e.chave, { valor: e.valor, expiraEm: e.ttlSegundos ? this.relogio() + e.ttlSegundos * 1000 : null });
    return true;
  }
  async apagarSeIgual(chave: string, valor: string) {
    if (this.vivo(chave)?.valor === valor) this.dados.delete(chave);
  }
}

// KEYS explícitas para o Redis; nenhuma chave é montada pelo script.
const COMPARAR_E_GRAVAR = `
local condicoes = cjson.decode(ARGV[1])
local escritas = cjson.decode(ARGV[2])
for i, c in ipairs(condicoes) do
  local atual = redis.call('GET', KEYS[i])
  if c.valor == cjson.null then
    if atual then return 0 end
  elseif atual ~= c.valor then return 0 end
end
for i, e in ipairs(escritas) do
  local chave = KEYS[#condicoes + i]
  if e.ttlSegundos then redis.call('SET', chave, e.valor, 'EX', e.ttlSegundos)
  else redis.call('SET', chave, e.valor) end
end
return 1`;

/** Redis da Upstash pela API REST (`POST /` com o comando em JSON). */
export class ArmazemUpstash implements Armazem {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}
  private async comando(args: (string | number)[]): Promise<unknown> {
    const r = await fetch(this.url, {
      method: "POST",
      signal: AbortSignal.timeout(8_000),
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
    return Number(await this.comando(["EVAL", "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n", 1, PREFIXO + chave, ttl]));
  }
  async compararEGravar(condicoes: readonly Condicao[], escritas: readonly Escrita[]) {
    const chaves = [...condicoes, ...escritas].map((c) => PREFIXO + c.chave);
    return Number(await this.comando(["EVAL", COMPARAR_E_GRAVAR, chaves.length, ...chaves, JSON.stringify(condicoes), JSON.stringify(escritas)])) === 1;
  }
  async apagarSeIgual(chave: string, valor: string) {
    await this.comando(["EVAL", "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end; return 0", 1, PREFIXO + chave, valor]);
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
