/**
 * Regras da API `/api/v1` (F9), separadas das rotas do Next para serem
 * testáveis. O servidor é a autoridade quando há conta: aplica as ações no
 * mesmo motor do cliente, com o relógio dele, e guarda o estado.
 */
import { randomBytes, scrypt as scryptCb, createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { aplicarAcao, avancar, carregarSave, serializarSave, VERSAO_SAVE_ATUAL, type EstadoJogo } from "@idle-pu/motor";
import type { Armazem } from "./armazem";

const scrypt = promisify(scryptCb) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;

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
}

export interface Resposta {
  readonly status: number;
  readonly corpo: Record<string, unknown>;
}

const erro = (status: number, codigo: string, mensagem: string): Resposta => ({ status, corpo: { erro: { codigo, mensagem } } });
export const SEM_BANCO = erro(503, "sem_banco", "A sincronização ainda não está ativa neste servidor. O jogo continua salvo neste aparelho.");

interface RegistroConta {
  readonly id: string;
  readonly nome: string;
  readonly sal: string;
  readonly hash: string;
  readonly criadaEm: number;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const obj = (v: unknown): Record<string, unknown> | null => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** Nome de conta: 3 a 20 letras minúsculas, números, _ ou -. */
export function validarNomeConta(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const nome = v.trim().toLowerCase();
  return /^[a-z0-9_-]{3,20}$/.test(nome) ? nome : null;
}
const senhaValida = (v: unknown): v is string => typeof v === "string" && v.length >= 8 && v.length <= 128;

async function derivar(senha: string, sal: Buffer): Promise<Buffer> {
  return scrypt(senha, sal, 64);
}

async function limitar(a: Armazem, chave: string, maximo: number, agora: number): Promise<boolean> {
  const janela = Math.floor(agora / (LIMITES.janelaSegundos * 1000));
  const n = await a.incrementar(`rl:${chave}:${janela}`, LIMITES.janelaSegundos * 2);
  return n <= maximo;
}

async function criarSessao(a: Armazem, contaId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await a.gravar(`sessao:${hashToken(token)}`, contaId, LIMITES.sessaoSegundos);
  return token;
}

async function contaDoToken(a: Armazem, token: string | null): Promise<string | null> {
  if (!token || token.length > 200) return null;
  return a.obter(`sessao:${hashToken(token)}`);
}

export function saude(a: Armazem | null): Resposta {
  return { status: 200, corpo: { ok: true, banco: a !== null, versaoSave: VERSAO_SAVE_ATUAL } };
}

export async function registrar(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (!(await limitar(a, `entrada:${p.ip}`, LIMITES.tentativasDeEntradaPorJanela, p.agora))) return erro(429, "muitas_tentativas", "Muitas tentativas. Espere um minuto.");
  const c = obj(p.corpo);
  const nome = validarNomeConta(c?.nome);
  if (!nome) return erro(400, "nome_invalido", "Nome de conta: 3 a 20 letras minúsculas, números, _ ou -.");
  const senha = c?.senha;
  if (!senhaValida(senha)) return erro(400, "senha_invalida", "A senha precisa de 8 a 128 caracteres.");
  const sal = randomBytes(16);
  const registro: RegistroConta = { id: randomUUID(), nome, sal: sal.toString("hex"), hash: (await derivar(senha, sal)).toString("hex"), criadaEm: p.agora };
  if (!(await a.gravarSeNovo(`conta:${nome}`, JSON.stringify(registro)))) return erro(409, "nome_em_uso", "Esse nome de conta já existe.");
  return { status: 201, corpo: { token: await criarSessao(a, registro.id), conta: { nome } } };
}

export async function entrar(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (!(await limitar(a, `entrada:${p.ip}`, LIMITES.tentativasDeEntradaPorJanela, p.agora))) return erro(429, "muitas_tentativas", "Muitas tentativas. Espere um minuto.");
  const c = obj(p.corpo);
  const nome = validarNomeConta(c?.nome);
  const recusa = erro(401, "credenciais_invalidas", "Nome de conta ou senha incorretos.");
  const senha = c?.senha;
  if (!nome || !senhaValida(senha)) return recusa;
  const bruto = await a.obter(`conta:${nome}`);
  if (!bruto) return recusa;
  const registro = JSON.parse(bruto) as RegistroConta;
  const esperado = Buffer.from(registro.hash, "hex");
  const obtido = await derivar(senha, Buffer.from(registro.sal, "hex"));
  if (esperado.length !== obtido.length || !timingSafeEqual(esperado, obtido)) return recusa;
  return { status: 200, corpo: { token: await criarSessao(a, registro.id), conta: { nome } } };
}

export async function sair(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (p.token) await a.apagar(`sessao:${hashToken(p.token)}`);
  return { status: 200, corpo: { ok: true } };
}

/** Executa `fazer` com a conta autenticada e travada (uma escrita por vez). */
async function comConta(a: Armazem | null, p: Pedido, fazer: (contaId: string) => Promise<Resposta>): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (!(await limitar(a, `ip:${p.ip}`, LIMITES.pedidosPorJanela, p.agora))) return erro(429, "muitos_pedidos", "Muitos pedidos. Espere um pouco.");
  const contaId = await contaDoToken(a, p.token);
  if (!contaId) return erro(401, "sem_sessao", "Entre na conta de novo.");
  if (!(await a.gravarSeNovo(`trava:${contaId}`, "1", LIMITES.travaSegundos))) return erro(409, "ocupado", "Outra ação desta conta está em andamento. Tente de novo.");
  try {
    return await fazer(contaId);
  } finally {
    await a.apagar(`trava:${contaId}`);
  }
}

async function lerSave(a: Armazem, contaId: string): Promise<EstadoJogo | null> {
  const bruto = await a.obter(`save:${contaId}`);
  if (!bruto) return null;
  const r = carregarSave(bruto);
  if (!r.ok) throw new Error(`Save da conta inválido: ${r.erro.codigo}`);
  return r.estado;
}

/** Estado atual da conta, avançado até agora pelo relógio do servidor. */
export function obterJogo(a: Armazem | null, p: Pedido): Promise<Resposta> {
  return comConta(a, p, async (contaId) => {
    const estado = await lerSave(a!, contaId);
    if (!estado) return erro(404, "sem_save", "A conta ainda não tem jogo. Envie o save deste aparelho.");
    const r = avancar(estado, p.agora);
    const save = serializarSave(r.estado);
    await a!.gravar(`save:${contaId}`, save);
    return { status: 200, corpo: { save, resumo: r.resumo } };
  });
}

/** Aplica uma ação no estado da conta (o servidor é a autoridade). */
export function acao(a: Armazem | null, p: Pedido): Promise<Resposta> {
  return comConta(a, p, async (contaId) => {
    const estado = await lerSave(a!, contaId);
    if (!estado) return erro(404, "sem_save", "A conta ainda não tem jogo.");
    const r = aplicarAcao(estado, obj(p.corpo)?.acao, p.agora);
    if (!r.ok) return { status: 422, corpo: { erro: r.erro } };
    const save = serializarSave(r.estado);
    await a!.gravar(`save:${contaId}`, save);
    return { status: 200, corpo: { save, resumo: r.resumo, ...(r.detalhe ? { detalhe: r.detalhe } : {}) } };
  });
}

/**
 * Envia o save deste aparelho para a conta (primeira sincronização). Só
 * substitui um save que já existe com `substituir: true`. O relógio do save é
 * limitado ao do servidor (não dá para "adiantar" o tempo).
 */
export function importar(a: Armazem | null, p: Pedido): Promise<Resposta> {
  return comConta(a, p, async (contaId) => {
    const c = obj(p.corpo);
    if (typeof c?.save !== "string") return erro(400, "save_ausente", "Envie o save.");
    const r = carregarSave(c.save);
    if (!r.ok) return erro(400, "save_invalido", r.erro.mensagem);
    const existe = (await a!.obter(`save:${contaId}`)) !== null;
    if (existe && c.substituir !== true) return erro(409, "ja_tem_save", "A conta já tem um jogo. Confirme para substituir.");
    const estado: EstadoJogo = { ...r.estado, ultimoTick: Math.min(r.estado.ultimoTick, p.agora), criadoEm: Math.min(r.estado.criadoEm, p.agora) };
    const save = serializarSave(estado);
    await a!.gravar(`save:${contaId}`, save);
    return { status: 200, corpo: { save } };
  });
}
