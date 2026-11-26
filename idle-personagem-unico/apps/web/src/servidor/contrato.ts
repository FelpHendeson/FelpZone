export const LIMITES = Object.freeze({
  sessaoSegundos: 30 * 24 * 3600,
  travaSegundos: 10,
  janelaSegundos: 60,
  pedidosPorJanela: 120,
  tentativasDeEntradaPorJanela: 10,
  corpoBytes: 600 * 1024,
});

export interface Pedido {
  readonly corpo: unknown;
  readonly token: string | null;
  readonly ip: string;
  readonly agora: number;
  readonly contaEsperada?: string;
}
export interface Resposta {
  readonly status: number;
  readonly corpo: Record<string, unknown>;
  readonly tokenSessao?: string;
  readonly encerrarSessao?: boolean;
}
export const erro = (status: number, codigo: string, mensagem: string): Resposta => ({ status, corpo: { erro: { codigo, mensagem } } });
export const SEM_BANCO = erro(503, "sem_banco", "A sincronização ainda não está ativa neste servidor. O jogo local continua neste aparelho.");
export const obj = (v: unknown): Record<string, unknown> | null => typeof v === "object" && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : null;
export async function limitar(a: import("./armazem").Armazem, chave: string, maximo: number, agora: number): Promise<boolean> {
  const janela = Math.floor(agora / (LIMITES.janelaSegundos * 1000));
  return await a.incrementar(`rl:${chave}:${janela}`, LIMITES.janelaSegundos * 2) <= maximo;
}
