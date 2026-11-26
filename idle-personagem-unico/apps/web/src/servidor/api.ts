/**
 * Regras da API `/api/v1` (F9), separadas das rotas do Next para serem
 * testáveis. O servidor é a autoridade quando há conta: aplica as ações no
 * mesmo motor do cliente, com o relógio dele, e guarda o estado.
 */
import { randomBytes, scrypt as scryptCb, createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { aplicarAcao, avancar, carregarSave, criarEstadoInicial, validarAcao, personagemAtivo, retratoDe, serializarSave, VERSAO_SAVE_ATUAL, type EstadoJogo, type Retrato } from "@idle-pu/motor";
import type { Armazem, Condicao, Escrita } from "./armazem";

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

/** A trava identifica o dono; toda escrita também verifica a sessão e o valor lido. */
async function comConta(a: Armazem | null, p: Pedido, fazer: (contaId: string, guardas: Condicao[]) => Promise<Resposta>): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (!(await limitar(a, `ip:${p.ip}`, LIMITES.pedidosPorJanela, p.agora))) return erro(429, "muitos_pedidos", "Muitos pedidos. Espere um pouco.");
  const contaId = await contaDoToken(a, p.token);
  if (!contaId) return erro(401, "sem_sessao", "Entre na conta de novo.");
  const chave = `trava:${contaId}`;
  const dono = randomUUID();
  if (!(await a.gravarSeNovo(chave, dono, LIMITES.travaSegundos))) return erro(409, "ocupado", "Outra ação desta conta está em andamento. Tente de novo.");
  try {
    return await fazer(contaId, [{ chave, valor: dono }, { chave: `sessao:${hashToken(p.token!)}`, valor: contaId }]);
  } finally {
    await a.apagarSeIgual(chave, dono);
  }
}

type Procedencia = "servidor" | "importado";
interface RegistroJogo {
  readonly formato: 1;
  readonly save: string;
  readonly revisao: number;
  readonly procedencia: Procedencia;
}
interface LeituraJogo extends RegistroJogo {
  readonly bruto: string;
  readonly estado: EstadoJogo;
}
const conflito = () => erro(409, "estado_desatualizado", "O jogo mudou em outra sessão. Sincronize antes de agir novamente.");

async function lerSave(a: Armazem, contaId: string): Promise<LeituraJogo | null> {
  const bruto = await a.obter(`save:${contaId}`);
  if (bruto === null) return null;
  const dados = obj(JSON.parse(bruto));
  let registro: RegistroJogo;
  if (dados?.formato === 1) {
    if (typeof dados.save !== "string" || !Number.isSafeInteger(dados.revisao) || (dados.revisao as number) < 0 || (dados.procedencia !== "servidor" && dados.procedencia !== "importado")) throw new Error("Registro inválido.");
    registro = { formato: 1, save: dados.save, revisao: dados.revisao as number, procedencia: dados.procedencia };
  } else {
    // Saves anteriores não têm prova de procedência. Preservá-los sem conceder confiança.
    registro = { formato: 1, save: bruto, revisao: 0, procedencia: "importado" };
  }
  const r = carregarSave(registro.save);
  if (!r.ok) throw new Error(`Save da conta inválido: ${r.erro.codigo}`);
  return { ...registro, bruto, estado: r.estado };
}

function respostaDoJogo(registro: RegistroJogo, extras: Record<string, unknown> = {}): Resposta {
  return { status: 200, corpo: { save: registro.save, revisao: registro.revisao, procedencia: registro.procedencia, ...extras } };
}
async function confirmar(a: Armazem, contaId: string, guardas: Condicao[], anterior: LeituraJogo | null, registro: RegistroJogo, extras: Escrita[] = []): Promise<boolean> {
  return a.compararEGravar([...guardas, { chave: `save:${contaId}`, valor: anterior?.bruto ?? null }], [{ chave: `save:${contaId}`, valor: JSON.stringify(registro) }, ...extras]);
}

/** Início online com semente e sorteio criados exclusivamente pelo servidor. */
export function iniciarJogoOnline(a: Armazem | null, p: Pedido): Promise<Resposta> {
  return comConta(a, p, async (contaId, guardas) => {
    const existente = await lerSave(a!, contaId);
    if (existente) return respostaDoJogo(existente);
    const r = aplicarAcao(criarEstadoInicial(randomBytes(16).toString("hex"), p.agora), { tipo: "iniciarSorteio" }, p.agora);
    if (!r.ok) throw new Error("Não foi possível iniciar o jogo.");
    const registro: RegistroJogo = { formato: 1, save: serializarSave(r.estado), revisao: 0, procedencia: "servidor" };
    return (await confirmar(a!, contaId, guardas, null, registro)) ? respostaDoJogo(registro) : conflito();
  });
}

export function obterJogo(a: Armazem | null, p: Pedido): Promise<Resposta> {
  return comConta(a, p, async (contaId, guardas) => {
    const anterior = await lerSave(a!, contaId);
    if (!anterior) return erro(404, "sem_save", "Escolha iniciar um jogo online ou importar seu jogo local.");
    const r = avancar(anterior.estado, p.agora);
    const save = serializarSave(r.estado);
    const registro: RegistroJogo = { formato: 1, save, revisao: anterior.revisao + (save !== anterior.save ? 1 : 0), procedencia: anterior.procedencia };
    return (await confirmar(a!, contaId, guardas, anterior, registro)) ? respostaDoJogo(registro, { resumo: r.resumo }) : conflito();
  });
}

/** Recibo e novo save são gravados juntos. A revisão impede replay após expirar o recibo. */
export function acao(a: Armazem | null, p: Pedido): Promise<Resposta> {
  return comConta(a, p, async (contaId, guardas) => {
    const c = obj(p.corpo);
    const limpa = validarAcao(c?.acao);
    if (!limpa) return erro(422, "acao_invalida", "Ação inválida.");
    if (typeof c?.idAcao !== "string" || !/^[a-zA-Z0-9_-]{16,80}$/.test(c.idAcao) || !Number.isSafeInteger(c.revisao) || (c.revisao as number) < 0) return erro(400, "pedido_invalido", "Atualize o jogo: a ação precisa de identificação e revisão.");
    const chaveRecibo = `recibo:${contaId}:${c.idAcao}`;
    const hash = createHash("sha256").update(JSON.stringify({ acao: limpa, revisao: c.revisao })).digest("hex");
    const recebido = await a!.obter(chaveRecibo);
    if (recebido) {
      const recibo = JSON.parse(recebido) as { hash: string; resposta: Resposta };
      return recibo.hash === hash ? recibo.resposta : erro(409, "id_reutilizado", "Essa identificação já foi usada em outra ação.");
    }
    const anterior = await lerSave(a!, contaId);
    if (!anterior) return erro(404, "sem_save", "A conta ainda não tem jogo.");
    if (c.revisao !== anterior.revisao) return conflito();
    const r = aplicarAcao(anterior.estado, limpa, p.agora);
    const registro: RegistroJogo = { formato: 1, save: r.ok ? serializarSave(r.estado) : anterior.save, revisao: anterior.revisao + 1, procedencia: anterior.procedencia };
    // Até erros de domínio recebem recibo: repetir não pode virar uma ação bem-sucedida depois.
    const resposta = r.ok ? respostaDoJogo(registro, { resumo: r.resumo, ...(r.detalhe ? { detalhe: r.detalhe } : {}) }) : { status: 422, corpo: { erro: r.erro } };
    const gravou = await confirmar(a!, contaId, [...guardas, { chave: chaveRecibo, valor: null }], anterior, registro, [{ chave: chaveRecibo, valor: JSON.stringify({ hash, resposta }), ttlSegundos: 86400 }]);
    return gravou ? resposta : conflito();
  });
}

/** Importação é única, casual e nunca substitui um jogo existente. */
export function importar(a: Armazem | null, p: Pedido): Promise<Resposta> {
  return comConta(a, p, async (contaId, guardas) => {
    const c = obj(p.corpo);
    if (typeof c?.save !== "string") return erro(400, "save_ausente", "Envie o save.");
    const r = carregarSave(c.save);
    if (!r.ok) return erro(400, "save_invalido", r.erro.mensagem);
    if (await lerSave(a!, contaId)) return erro(409, "ja_tem_save", "A conta já tem um jogo e não pode ser substituída por um save local.");
    const estado: EstadoJogo = { ...r.estado, ultimoTick: Math.min(r.estado.ultimoTick, p.agora), criadoEm: Math.min(r.estado.criadoEm, p.agora) };
    const registro: RegistroJogo = { formato: 1, save: serializarSave(estado), revisao: 0, procedencia: "importado" };
    return (await confirmar(a!, contaId, guardas, null, registro)) ? respostaDoJogo(registro) : conflito();
  });
}

interface BuildRegistrada {
  readonly contaId: string;
  readonly retrato: Retrato;
  readonly em: number;
  readonly procedencia?: "servidor";
}
const MAX_BUILDS = 100;

export function enviarBuild(a: Armazem | null, p: Pedido): Promise<Resposta> {
  return comConta(a, p, async (contaId, guardas) => {
    const registro = await lerSave(a!, contaId);
    const ativo = registro ? personagemAtivo(registro.estado) : null;
    if (!registro || !ativo) return erro(404, "sem_save", "A conta ainda não tem personagem.");
    if (registro.procedencia !== "servidor") return erro(403, "save_importado", "Jogos importados podem jogar contra bots, mas não publicar builds competitivos.");
    const dono = randomUUID();
    if (!(await a!.gravarSeNovo("trava:arena", dono, LIMITES.travaSegundos))) return erro(409, "ocupado", "Tente de novo em instantes.");
    try {
      const bruto = await a!.obter("arena:builds");
      const atual = JSON.parse(bruto ?? "[]") as BuildRegistrada[];
      const build: BuildRegistrada = { contaId, retrato: retratoDe(ativo), em: p.agora, procedencia: "servidor" };
      const lista = [build, ...atual.filter((b) => b.contaId !== contaId && b.procedencia === "servidor")].slice(0, MAX_BUILDS);
      const gravou = await a!.compararEGravar([...guardas, { chave: "trava:arena", valor: dono }, { chave: `save:${contaId}`, valor: registro.bruto }, { chave: "arena:builds", valor: bruto }], [{ chave: "arena:builds", valor: JSON.stringify(lista) }]);
      return gravou ? { status: 200, corpo: { ok: true, total: lista.length } } : conflito();
    } finally {
      await a!.apagarSeIgual("trava:arena", dono);
    }
  });
}

export async function listarBuilds(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (!(await limitar(a, `ip:${p.ip}`, LIMITES.pedidosPorJanela, p.agora))) return erro(429, "muitos_pedidos", "Muitos pedidos. Espere um pouco.");
  const lista = JSON.parse((await a.obter("arena:builds")) ?? "[]") as BuildRegistrada[];
  return { status: 200, corpo: { builds: lista.filter((b) => b.procedencia === "servidor").slice(0, 50).map((b) => b.retrato) } };
}
