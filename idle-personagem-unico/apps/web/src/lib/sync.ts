/**
 * Cliente da API `/api/v1` (F9). Sem conta, o jogo é local. Com conta, o
 * servidor é a autoridade: as ações vão para ele e o estado volta dele.
 */
import { carregarSave, type Acao, type EstadoJogo } from "@idle-pu/motor";

export const CHAVE_SESSAO = "idle-pu:sessao";

export interface Sessao {
  readonly token: string;
  readonly nome: string;
  /** Marca sessões que já usam caches separados; antigas ficam em quarentena na migração. */
  readonly cacheSeparado?: true;
}

export type RespostaApi =
  | { readonly ok: true; readonly status: number; readonly corpo: Record<string, unknown> }
  | { readonly ok: false; readonly status: number; readonly codigo: string; readonly mensagem: string };

const SEM_REDE: RespostaApi = { ok: false, status: 0, codigo: "sem_rede", mensagem: "Sem conexão com o servidor." };

export function lerSessao(armazenamento: Pick<Storage, "getItem">): Sessao | null {
  try {
    const v = JSON.parse(armazenamento.getItem(CHAVE_SESSAO) ?? "null") as Partial<Sessao> | null;
    return v && typeof v.token === "string" && typeof v.nome === "string" ? { token: v.token, nome: v.nome, ...(v.cacheSeparado === true ? { cacheSeparado: true } : {}) } : null;
  } catch {
    return null;
  }
}

export function gravarSessao(armazenamento: Pick<Storage, "setItem" | "removeItem">, s: Sessao | null): void {
  if (s) armazenamento.setItem(CHAVE_SESSAO, JSON.stringify(s));
  else armazenamento.removeItem(CHAVE_SESSAO);
}

export async function chamarApi(caminho: string, opcoes: { metodo?: "GET" | "POST"; corpo?: unknown; token?: string | null } = {}, buscar: typeof fetch = fetch): Promise<RespostaApi> {
  let r: Response;
  try {
    r = await buscar(`/api/v1/${caminho}`, {
      method: opcoes.metodo ?? "GET",
      signal: AbortSignal.timeout(15_000),
      headers: { ...(opcoes.corpo !== undefined ? { "content-type": "application/json" } : {}), ...(opcoes.token ? { authorization: `Bearer ${opcoes.token}` } : {}) },
      ...(opcoes.corpo !== undefined ? { body: JSON.stringify(opcoes.corpo) } : {}),
    });
  } catch {
    return SEM_REDE;
  }
  let corpo: Record<string, unknown> = {};
  try {
    const lido: unknown = await r.json();
    if (typeof lido === "object" && lido !== null && !Array.isArray(lido)) corpo = lido as Record<string, unknown>;
  } catch {
    /* corpo vazio */
  }
  if (r.ok) return { ok: true, status: r.status, corpo };
  const e = (corpo.erro ?? {}) as { codigo?: string; mensagem?: string };
  return { ok: false, status: r.status, codigo: e.codigo ?? "erro", mensagem: e.mensagem ?? `Erro ${r.status}.` };
}

/** Lê o save que o servidor devolveu (valida como qualquer save não confiável). */
export function estadoDaResposta(corpo: Record<string, unknown>): EstadoJogo | null {
  if (typeof corpo.save !== "string") return null;
  const r = carregarSave(corpo.save);
  return r.ok ? r.estado : null;
}

export interface PedidoAcao { readonly idAcao: string; readonly revisao: number; readonly acao: Acao }

export function enviarAcao(sessao: Sessao, pedido: PedidoAcao, buscar?: typeof fetch): Promise<RespostaApi> {
  return chamarApi("jogo/acao", { metodo: "POST", corpo: pedido, token: sessao.token }, buscar);
}
