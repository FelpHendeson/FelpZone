import { randomBytes, randomUUID, createHash, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Armazem, Condicao, Escrita } from "./armazem";
import { erro, LIMITES, limitar, obj, SEM_BANCO, type Pedido, type Resposta } from "./contrato";

const scrypt = promisify(scryptCb) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;
export const hashToken = (v: string) => createHash("sha256").update(v).digest("hex");
interface Conta {
  readonly id: string;
  readonly nome: string;
  readonly sal: string;
  readonly hash: string;
  readonly criadaEm: number;
  readonly recuperacaoHash?: string;
  readonly email?: string;
  readonly excluidaAte?: number;
}
const PRAZO_REATIVACAO_SEGUNDOS = 30 * 24 * 60 * 60;
interface SessaoServidor { readonly id: string; readonly nome: string; readonly credencial: string }
export interface Identidade {
  readonly id: string;
  readonly nome: string | null;
  readonly guardas: Condicao[];
  readonly conta: Conta | null;
  readonly brutoConta: string | null;
}
export function validarNomeConta(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const nome = v.trim().toLowerCase();
  return /^[a-z0-9_-]{3,20}$/.test(nome) ? nome : null;
}
const senhaValida = (v: unknown): v is string => typeof v === "string" && v.length >= 8 && v.length <= 128;
function emailDoPedido(v: unknown): string | null | undefined {
  if (v == null || v === "") return null;
  if (typeof v !== "string" || v.length > 254) return undefined;
  const email = v.trim();
  return email === "" ? null : /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email) ? email : undefined;
}
const emailInvalido = () => erro(400, "email_invalido", "Informe um endereço de e-mail válido.");
const publico = (c: Pick<Conta, "id" | "nome">) => ({ id: c.id, nome: c.nome });
const novaRecuperacao = () => randomBytes(20).toString("hex").match(/.{1,8}/g)!.join("-");
const normalizarCodigo = (v: string) => v.trim().toLowerCase().replaceAll("-", "");
const codigoHash = (v: string) => hashToken(normalizarCodigo(v));
const iguais = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const conflito = () => erro(409, "conta_alterada", "A conta mudou durante a operação. Tente novamente.");
async function conferirSenha(c: Conta, senha: string) {
  const hash = (await scrypt(senha, Buffer.from(c.sal, "hex"), 64)).toString("hex");
  return iguais(hash, c.hash);
}
async function limiteEntrada(a: Armazem, p: Pedido) {
  return limitar(a, `entrada:${p.ip}`, LIMITES.tentativasDeEntradaPorJanela, p.agora);
}
const excesso = () => erro(429, "muitas_tentativas", "Muitas tentativas. Espere um minuto.");

/** A sessão nova aponta à credencial vigente; trocar a senha revoga todas as anteriores. */
export async function autenticar(a: Armazem, p: Pedido): Promise<Identidade | null> {
  if (!p.token || p.token.length > 200) return null;
  const chave = `sessao:${hashToken(p.token)}`;
  const bruto = await a.obter(chave);
  if (!bruto) return null;
  if (!bruto.startsWith("{")) {
    if (await a.obter(`revogado:${bruto}`) !== null) return null;
    if (p.contaEsperada && p.contaEsperada !== bruto) return null;
    return { id: bruto, nome: null, conta: null, brutoConta: null, guardas: [{ chave, valor: bruto }, { chave: `revogado:${bruto}`, valor: null }] };
  }
  const s = JSON.parse(bruto) as SessaoServidor;
  if (p.contaEsperada && p.contaEsperada !== s.id) return null;
  const brutoConta = await a.obter(`conta:${s.nome}`);
  if (!brutoConta) return null;
  const conta = JSON.parse(brutoConta) as Conta;
  if (conta.id !== s.id || conta.hash !== s.credencial || conta.excluidaAte !== undefined) return null;
  return { id: s.id, nome: s.nome, conta, brutoConta, guardas: [{ chave, valor: bruto }, { chave: `conta:${s.nome}`, valor: brutoConta }] };
}

async function emitirSessao(a: Armazem, conta: Conta, guardas: Condicao[], status = 200, extras: Record<string, unknown> = {}): Promise<Resposta> {
  const token = randomBytes(32).toString("base64url");
  const chave = `sessao:${hashToken(token)}`;
  const gravou = await a.compararEGravar([...guardas, { chave, valor: null }], [{ chave, valor: JSON.stringify({ id: conta.id, nome: conta.nome, credencial: conta.hash }), ttlSegundos: LIMITES.sessaoSegundos }]);
  return gravou ? { status, corpo: { token, conta: publico(conta), ...extras }, tokenSessao: token } : conflito();
}

export async function registrar(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (!await limiteEntrada(a, p)) return excesso();
  const c = obj(p.corpo);
  const nome = validarNomeConta(c?.nome);
  if (!nome) return erro(400, "nome_invalido", "Nome de conta: 3 a 20 letras minúsculas, números, _ ou -.");
  if (!senhaValida(c?.senha)) return erro(400, "senha_invalida", "A senha precisa de 8 a 128 caracteres.");
  const email = emailDoPedido(c.email);
  if (email === undefined) return emailInvalido();
  const sal = randomBytes(16);
  const codigoRecuperacao = novaRecuperacao();
  const conta: Conta = { id: randomUUID(), nome, sal: sal.toString("hex"), hash: (await scrypt(c.senha, sal, 64)).toString("hex"), criadaEm: p.agora, recuperacaoHash: codigoHash(codigoRecuperacao), ...(email ? { email } : {}) };
  if (!await a.gravarSeNovo(`conta:${nome}`, JSON.stringify(conta))) return erro(409, "nome_em_uso", "Esse nome de conta já existe.");
  return emitirSessao(a, conta, [{ chave: `conta:${nome}`, valor: JSON.stringify(conta) }], 201, { codigoRecuperacao });
}
export async function entrar(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (!await limiteEntrada(a, p)) return excesso();
  const c = obj(p.corpo);
  const nome = validarNomeConta(c?.nome);
  const recusa = erro(401, "credenciais_invalidas", "Nome de conta ou senha incorretos.");
  if (!nome || !senhaValida(c?.senha)) return recusa;
  const bruto = await a.obter(`conta:${nome}`);
  if (!bruto) return recusa;
  const conta = JSON.parse(bruto) as Conta;
  if (!await conferirSenha(conta, c.senha)) return recusa;
  if (conta.excluidaAte !== undefined) return erro(403, "conta_excluida", "A conta está com exclusão agendada. Use Recuperar conta excluída para reativá-la.");
  return emitirSessao(a, conta, [{ chave: `conta:${nome}`, valor: bruto }]);
}
export async function sessaoAtual(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  const identidade = await autenticar(a, p);
  if (!identidade || !identidade.conta) return erro(401, "sem_sessao", "Entre na conta para continuar.");
  return { status: 200, corpo: { conta: publico(identidade.conta), recuperacaoAtiva: !!identidade.conta.recuperacaoHash } };
}
export async function migrarSessao(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  const identidade = await autenticar(a, p);
  if (!identidade) return erro(401, "sem_sessao", "Entre na conta novamente.");
  const nome = identidade.nome ?? validarNomeConta(obj(p.corpo)?.nome);
  if (!nome) return erro(400, "nome_invalido", "Informe a conta da sessão anterior.");
  const bruto = await a.obter(`conta:${nome}`);
  if (!bruto) return erro(401, "sem_sessao", "Entre na conta novamente.");
  const conta = JSON.parse(bruto) as Conta;
  if (conta.id !== identidade.id || conta.excluidaAte !== undefined) return erro(401, "sem_sessao", "Entre na conta novamente.");
  const r = await emitirSessao(a, conta, [...identidade.guardas, { chave: `conta:${nome}`, valor: bruto }]);
  // A revogação não pode apagar a sessão que acabou de ser criada.
  if (r.status === 200 && p.token) await a.apagar(`sessao:${hashToken(p.token)}`);
  return r;
}
export async function sair(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return { ...SEM_BANCO, encerrarSessao: true };
  const identidade = await autenticar(a, p);
  if (p.contaEsperada && !identidade) return erro(401, "sem_sessao", "Esta sessão já foi encerrada ou pertence a outra conta.");
  if (identidade && p.token) await a.apagar(`sessao:${hashToken(p.token)}`);
  return { status: 200, corpo: { ok: true }, encerrarSessao: true };
}

/** Código com alta entropia, mostrado uma vez; requer a senha atual para gerar/rotacionar. */
export async function gerarRecuperacao(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (!await limiteEntrada(a, p)) return excesso();
  const identidade = await autenticar(a, p);
  if (!identidade?.conta) return erro(401, "sem_sessao", "Entre novamente para configurar a recuperação.");
  const senha = obj(p.corpo)?.senha;
  if (!senhaValida(senha) || !await conferirSenha(identidade.conta, senha)) return erro(401, "credenciais_invalidas", "Senha incorreta.");
  const codigoRecuperacao = novaRecuperacao();
  const conta = { ...identidade.conta, recuperacaoHash: codigoHash(codigoRecuperacao) };
  const ok = await a.compararEGravar(identidade.guardas, [{ chave: `conta:${conta.nome}`, valor: JSON.stringify(conta) }]);
  return ok ? { status: 200, corpo: { codigoRecuperacao } } : conflito();
}
export async function recuperar(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (!await limiteEntrada(a, p)) return excesso();
  const c = obj(p.corpo);
  const nome = validarNomeConta(c?.nome);
  const recusa = erro(401, "recuperacao_invalida", "Conta ou código de recuperação inválidos.");
  if (!nome || typeof c?.codigo !== "string" || c.codigo.length > 100) return recusa;
  if (!senhaValida(c.senhaNova)) return erro(400, "senha_invalida", "A nova senha precisa de 8 a 128 caracteres.");
  const bruto = await a.obter(`conta:${nome}`);
  if (!bruto) return recusa;
  const conta = JSON.parse(bruto) as Conta;
  if (!conta.recuperacaoHash || !iguais(conta.recuperacaoHash, codigoHash(c.codigo))) return recusa;
  const ttlSegundos = conta.excluidaAte === undefined ? undefined : Math.ceil((conta.excluidaAte - p.agora) / 1000);
  if (ttlSegundos !== undefined && ttlSegundos <= 0) return recusa;
  const sal = randomBytes(16);
  const codigoRecuperacao = novaRecuperacao();
  const nova: Conta = { ...conta, sal: sal.toString("hex"), hash: (await scrypt(c.senhaNova, sal, 64)).toString("hex"), recuperacaoHash: codigoHash(codigoRecuperacao) };
  const ok = await a.compararEGravar([{ chave: `conta:${nome}`, valor: bruto }], [
    { chave: `conta:${nome}`, valor: JSON.stringify(nova), ...(ttlSegundos === undefined ? {} : { ttlSegundos }) },
    { chave: `revogado:${conta.id}`, valor: String(p.agora), ttlSegundos: LIMITES.sessaoSegundos },
  ]);
  return ok ? { status: 200, corpo: { ok: true, codigoRecuperacao }, encerrarSessao: true } : recusa;
}

export async function obterPerfil(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  const identidade = await autenticar(a, p);
  if (!identidade?.conta) return erro(401, "sem_sessao", "Entre novamente para consultar seu perfil.");
  return { status: 200, corpo: { email: identidade.conta.email ?? null } };
}

export async function salvarPerfil(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (!await limitar(a, `ip:${p.ip}`, LIMITES.pedidosPorJanela, p.agora)) return excesso();
  const identidade = await autenticar(a, p);
  if (!identidade?.conta) return erro(401, "sem_sessao", "Entre novamente para editar seu perfil.");
  const pedido = obj(p.corpo);
  if (!pedido || !Object.hasOwn(pedido, "email")) return emailInvalido();
  const email = emailDoPedido(pedido.email);
  if (email === undefined) return emailInvalido();
  const { email: anterior, ...conta } = identidade.conta;
  if (email === (anterior ?? null)) return { status: 200, corpo: { email } };
  const atualizada = { ...conta, ...(email ? { email } : {}) };
  const ok = await a.compararEGravar(identidade.guardas, [{ chave: `conta:${conta.nome}`, valor: JSON.stringify(atualizada) }]);
  return ok ? { status: 200, corpo: { email } } : conflito();
}

/** Conta e save expiram no Redis. A mesma transação revoga legados e oculta a build. */
export async function excluirConta(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (!await limiteEntrada(a, p)) return excesso();
  const identidade = await autenticar(a, p);
  if (!identidade?.conta) return erro(401, "sem_sessao", "Entre novamente para excluir sua conta.");
  const senha = obj(p.corpo)?.senha;
  if (!senhaValida(senha) || !await conferirSenha(identidade.conta, senha)) return erro(401, "credenciais_invalidas", "Senha incorreta.");
  const { id, nome } = identidade.conta;
  const chaveSave = `save:${id}`;
  const chaveArena = "arena:builds";
  const [save, arena] = await Promise.all([a.obter(chaveSave), a.obter(chaveArena)]);
  const excluidaAte = p.agora + PRAZO_REATIVACAO_SEGUNDOS * 1000;
  const escritas: Escrita[] = [
    { chave: `conta:${nome}`, valor: JSON.stringify({ ...identidade.conta, excluidaAte }), ttlSegundos: PRAZO_REATIVACAO_SEGUNDOS },
    { chave: `revogado:${id}`, valor: String(p.agora), ttlSegundos: LIMITES.sessaoSegundos },
  ];
  if (save !== null) escritas.push({ chave: chaveSave, valor: save, ttlSegundos: PRAZO_REATIVACAO_SEGUNDOS });
  if (arena !== null) {
    const builds = JSON.parse(arena) as { contaId: string }[];
    if (builds.some((build) => build.contaId === id)) escritas.push({ chave: chaveArena, valor: JSON.stringify(builds.filter((build) => build.contaId !== id)) });
  }
  const ok = await a.compararEGravar([...identidade.guardas, { chave: chaveSave, valor: save }, { chave: chaveArena, valor: arena }], escritas);
  return ok ? { status: 200, corpo: { excluidaAte }, encerrarSessao: true } : conflito();
}

export async function reativarConta(a: Armazem | null, p: Pedido): Promise<Resposta> {
  if (!a) return SEM_BANCO;
  if (!await limiteEntrada(a, p)) return excesso();
  const c = obj(p.corpo);
  const nome = validarNomeConta(c?.nome);
  const recusa = erro(401, "reativacao_invalida", "Confira o nome e a senha. Só contas excluídas nos últimos 30 dias podem ser recuperadas.");
  if (!nome || !senhaValida(c?.senha)) return recusa;
  const chaveConta = `conta:${nome}`;
  const bruto = await a.obter(chaveConta);
  if (!bruto) return recusa;
  const { excluidaAte, ...conta } = JSON.parse(bruto) as Conta;
  if (excluidaAte === undefined || p.agora >= excluidaAte || !await conferirSenha(conta, c.senha)) return recusa;
  const sal = randomBytes(16);
  const reativada: Conta = { ...conta, sal: sal.toString("hex"), hash: (await scrypt(c.senha, sal, 64)).toString("hex") };
  const chaveSave = `save:${conta.id}`;
  const save = await a.obter(chaveSave);
  const escritas: Escrita[] = [{ chave: chaveConta, valor: JSON.stringify(reativada) }];
  if (save !== null) escritas.push({ chave: chaveSave, valor: save });
  const ok = await a.compararEGravar([{ chave: chaveConta, valor: bruto }, { chave: chaveSave, valor: save }], escritas);
  return ok ? { status: 200, corpo: { ok: true } } : conflito();
}
