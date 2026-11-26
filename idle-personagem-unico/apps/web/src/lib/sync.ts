/**
 * Cliente da API `/api/v1` (F9). Sem conta, o jogo é local. Com conta, o
 * servidor é a autoridade: as ações vão para ele e o estado volta dele.
 */
import { carregarSave, type Acao, type EstadoJogo } from "@idle-pu/motor";

export const CHAVE_SESSAO = "idle-pu:sessao";
export const CHAVE_SAIDA = "idle-pu:saida-pendente";

export interface Sessao {
  /** Somente leitura de sessões legadas ou clientes bearer; a web nova usa HttpOnly. */
  readonly token?: string;
  readonly id?: string;
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
    return v && typeof v.nome === "string" && /^[a-z0-9_-]{3,20}$/.test(v.nome) && (typeof v.id === "string" || typeof v.token === "string" || v.cacheSeparado === true) ? { nome: v.nome, ...(typeof v.token === "string" ? { token: v.token } : {}), ...(typeof v.id === "string" ? { id: v.id } : {}), ...(v.cacheSeparado === true ? { cacheSeparado: true } : {}) } : null;
  } catch {
    return null;
  }
}

export function gravarSessao(armazenamento: Pick<Storage, "setItem" | "removeItem">, s: Sessao | null): void {
  if (s) {
    armazenamento.setItem(CHAVE_SESSAO, JSON.stringify({ id: s.id, nome: s.nome, cacheSeparado: true }));
    armazenamento.removeItem(CHAVE_SAIDA);
  }
  else armazenamento.removeItem(CHAVE_SESSAO);
}

export async function chamarApi(caminho: string, opcoes: { metodo?: "GET" | "POST"; corpo?: unknown; token?: string | null | undefined; contaId?: string | undefined } = {}, buscar: typeof fetch = fetch): Promise<RespostaApi> {
  let r: Response;
  try {
    const executar = () => buscar(`/api/v1/${caminho}`, {
      method: opcoes.metodo ?? "GET",
      signal: AbortSignal.timeout(15_000),
      credentials: "same-origin",
      headers: { "x-idle-web": "1", ...(opcoes.corpo !== undefined ? { "content-type": "application/json" } : {}), ...(opcoes.token ? { authorization: `Bearer ${opcoes.token}` } : {}), ...(opcoes.contaId ? { "x-idle-conta": opcoes.contaId } : {}) },
      ...(opcoes.corpo !== undefined ? { body: JSON.stringify(opcoes.corpo) } : {}),
    });
    // Set-Cookie é aplicado antes de fetch resolver. Serializar auth evita respostas
    // de login/logout fora de ordem também entre abas do mesmo navegador.
    r = caminho.startsWith("auth/") && opcoes.metodo === "POST" && typeof navigator !== "undefined" && navigator.locks
      ? await navigator.locks.request("idle-pu-autenticacao", executar) : await executar();
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
  return chamarApi("jogo/acao", { metodo: "POST", corpo: pedido, token: sessao.token, contaId: sessao.id }, buscar);
}

export function sessaoDaResposta(corpo: Record<string, unknown>): Sessao | null {
  const conta = corpo.conta as { id?: unknown; nome?: unknown } | null;
  return conta && typeof conta.id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(conta.id) && typeof conta.nome === "string" && /^[a-z0-9_-]{3,20}$/.test(conta.nome)
    ? { id: conta.id, nome: conta.nome, cacheSeparado: true } : null;
}

/** Descobre o cookie no servidor, migra bearer antigo e guarda apenas identidade pública. */
export async function restaurarSessao(armazenamento: Pick<Storage, "getItem" | "setItem" | "removeItem">, buscar: typeof fetch = fetch): Promise<Sessao | null> {
  if (armazenamento.getItem(CHAVE_SAIDA)) { await concluirSaida(armazenamento, buscar); return null; }
  const antes = armazenamento.getItem(CHAVE_SESSAO);
  const antiga = lerSessao(armazenamento);
  let r = await chamarApi("auth/sessao", {}, buscar);
  if (!r.ok && r.status === 401 && antiga?.token) r = await chamarApi("auth/migrar", { metodo: "POST", corpo: { nome: antiga.nome }, token: antiga.token }, buscar);
  if (armazenamento.getItem(CHAVE_SESSAO) !== antes) return lerSessao(armazenamento);
  const atual = r.ok ? sessaoDaResposta(r.corpo) : null;
  if (atual) { gravarSessao(armazenamento, atual); return atual; }
  // Uma conta sem confirmação não vira convidado. O cache permanece isolado e só para leitura.
  if (antiga) {
    const expirada: Sessao = { nome: antiga.nome, ...(antiga.id ? { id: antiga.id } : {}), cacheSeparado: true };
    gravarSessao(armazenamento, expirada);
    return expirada;
  }
  return null;
}

/** O marcador não contém segredo e impede restaurar um cookie após logout offline. */
export async function concluirSaida(armazenamento: Pick<Storage, "getItem" | "removeItem">, buscar: typeof fetch = fetch): Promise<boolean> {
  const bruto = armazenamento.getItem(CHAVE_SAIDA);
  if (!bruto) return true;
  let id: string | undefined;
  try { const v = JSON.parse(bruto) as { id?: unknown }; if (typeof v.id === "string") id = v.id; } catch { /* Ainda encerra o cookie. */ }
  const r = await chamarApi("auth/sair", { metodo: "POST", corpo: {}, contaId: id }, buscar);
  if (!r.ok && r.status !== 401) return false;
  if (armazenamento.getItem(CHAVE_SAIDA) === bruto) armazenamento.removeItem(CHAVE_SAIDA);
  return true;
}
export async function sairDaConta(armazenamento: Pick<Storage, "getItem" | "setItem" | "removeItem">, sessao: Sessao | null, buscar: typeof fetch = fetch): Promise<boolean> {
  armazenamento.setItem(CHAVE_SAIDA, JSON.stringify({ id: sessao?.id, operacao: crypto.randomUUID() }));
  gravarSessao(armazenamento, null);
  return concluirSaida(armazenamento, buscar);
}
