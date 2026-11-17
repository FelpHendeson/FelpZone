// Contas sem e-mail: apelido e senha. Senha só como hash scrypt com sal;
// sessão como token aleatório, com só o hash dele guardado no servidor.
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { ErroHttp, PREFIXO, type Banco } from './banco.js';

export const SESSAO_SEGUNDOS = 60 * 60 * 24 * 60;
const TENTATIVAS_MAXIMAS = 10;
const JANELA_TENTATIVAS = 15 * 60;
/** Um save tem poucos KB; o limite evita abuso do armazenamento. */
export const TAMANHO_MAXIMO_SAVE = 200_000;

interface Conta {
  apelido: string;
  senha: string;
  criadaEm: number;
}

export interface SaveNaNuvem {
  texto: string;
  /** Momento em que o jogo foi salvo no aparelho (informado pelo cliente). */
  salvoEm: number;
  /** Momento em que o servidor recebeu. */
  recebidoEm: number;
}

const chaves = {
  conta: (id: string) => `${PREFIXO}conta:${id}`,
  sessao: (hash: string) => `${PREFIXO}sessao:${hash}`,
  save: (id: string) => `${PREFIXO}save:${id}`,
  tentativas: (id: string) => `${PREFIXO}tentativas:${id}`,
};

/** Identificador da conta: sem diferenciar maiúsculas, acentos nem espaços extras. */
export function normalizarApelido(apelido: string): string {
  return apelido.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function validar(apelido: unknown, senha: unknown): { apelido: string; senha: string } {
  if (typeof apelido !== 'string' || typeof senha !== 'string') throw new ErroHttp(400, 'Informe apelido e senha.');
  const limpo = apelido.trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{N} _.-]{3,16}$/u.test(limpo)) {
    throw new ErroHttp(400, 'O apelido precisa ter de 3 a 16 letras, números, espaço, ponto, hífen ou _.');
  }
  if (senha.length < 6 || senha.length > 72) throw new ErroHttp(400, 'A senha precisa ter de 6 a 72 caracteres.');
  return { apelido: limpo, senha };
}

function scrypt(senha: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCallback(senha, sal, 32, { N: 16384, r: 8, p: 1 }, (erro, chave) => (erro ? reject(erro) : resolve(chave))),
  );
}

async function hashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  return `scrypt$${sal.toString('base64url')}$${(await scrypt(senha, sal)).toString('base64url')}`;
}

async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const [esquema, sal, hash] = guardado.split('$');
  if (esquema !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'base64url');
  const obtido = await scrypt(senha, Buffer.from(sal, 'base64url'));
  return obtido.length === esperado.length && timingSafeEqual(obtido, esperado);
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('base64url');

async function abrirSessao(banco: Banco, id: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await banco.set(chaves.sessao(hashToken(token)), id, { segundos: SESSAO_SEGUNDOS });
  return token;
}

export async function criarConta(banco: Banco, apelido: unknown, senha: unknown) {
  const dados = validar(apelido, senha);
  const id = normalizarApelido(dados.apelido);
  const conta: Conta = { apelido: dados.apelido, senha: await hashSenha(dados.senha), criadaEm: Date.now() };
  const criou = await banco.set(chaves.conta(id), JSON.stringify(conta), { soSeNovo: true });
  if (!criou) throw new ErroHttp(409, 'Esse apelido já está em uso.');
  return { apelido: conta.apelido, token: await abrirSessao(banco, id) };
}

export async function entrar(banco: Banco, apelido: unknown, senha: unknown) {
  if (typeof apelido !== 'string' || typeof senha !== 'string') throw new ErroHttp(400, 'Informe apelido e senha.');
  const id = normalizarApelido(apelido);
  if ((await banco.incr(chaves.tentativas(id), JANELA_TENTATIVAS)) > TENTATIVAS_MAXIMAS) {
    throw new ErroHttp(429, 'Muitas tentativas. Espere 15 minutos e tente de novo.');
  }
  const texto = await banco.get(chaves.conta(id));
  const conta = texto ? (JSON.parse(texto) as Conta) : null;
  if (!conta || !(await conferirSenha(senha, conta.senha))) throw new ErroHttp(401, 'Apelido ou senha incorretos.');
  await banco.del(chaves.tentativas(id));
  return { apelido: conta.apelido, token: await abrirSessao(banco, id) };
}

/** Conta da sessão, ou null se o token for inválido ou tiver expirado. */
export async function contaDaSessao(banco: Banco, token: string | null): Promise<{ id: string; apelido: string } | null> {
  if (!token) return null;
  const id = await banco.get(chaves.sessao(hashToken(token)));
  if (!id) return null;
  const texto = await banco.get(chaves.conta(id));
  return texto ? { id, apelido: (JSON.parse(texto) as Conta).apelido } : null;
}

export async function sair(banco: Banco, token: string | null): Promise<void> {
  if (token) await banco.del(chaves.sessao(hashToken(token)));
}

export async function lerSave(banco: Banco, id: string): Promise<SaveNaNuvem | null> {
  const texto = await banco.get(chaves.save(id));
  return texto ? (JSON.parse(texto) as SaveNaNuvem) : null;
}

/**
 * Guarda o save como veio do jogo. O servidor só confere o formato geral;
 * a validação completa acontece no jogo ao carregar.
 */
export async function gravarSave(banco: Banco, id: string, texto: unknown): Promise<SaveNaNuvem> {
  if (typeof texto !== 'string' || texto.length === 0) throw new ErroHttp(400, 'Save ausente.');
  if (texto.length > TAMANHO_MAXIMO_SAVE) throw new ErroHttp(413, 'Save grande demais.');
  let salvoEm: unknown;
  try {
    const dados = JSON.parse(texto) as { salvoEm?: unknown; estado?: { versao?: unknown } };
    salvoEm = dados.salvoEm;
    if (typeof dados.estado?.versao !== 'number') throw new Error();
  } catch {
    throw new ErroHttp(400, 'Save inválido.');
  }
  if (typeof salvoEm !== 'number' || !Number.isFinite(salvoEm)) throw new ErroHttp(400, 'Save inválido.');
  const registro: SaveNaNuvem = { texto, salvoEm, recebidoEm: Date.now() };
  await banco.set(chaves.save(id), JSON.stringify(registro));
  return registro;
}
