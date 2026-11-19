// Contas sem e-mail: apelido e senha. Senha só como hash scrypt com sal;
// sessão como token aleatório, com só o hash dele guardado no servidor.
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { ErroHttp, PREFIXO, type Banco } from './banco.js';
import { sairDoMundo } from './mundo.js';

export const SESSAO_SEGUNDOS = 60 * 60 * 24 * 60;
const TENTATIVAS_MAXIMAS = 10;
const JANELA_TENTATIVAS = 15 * 60;
/** Por endereço: muitas senhas erradas em apelidos diferentes, ou muitas contas novas. */
const TENTATIVAS_POR_IP = 50;
const CONTAS_POR_IP = 5;
const JANELA_CONTAS = 60 * 60;
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
  tentativas: (id: string, ip: string) => `${PREFIXO}tentativas:${id}:${ip}`,
  tentativasIp: (ip: string) => `${PREFIXO}tentativas-ip:${ip}`,
  contasIp: (ip: string) => `${PREFIXO}contas-ip:${ip}`,
};

/** Sessão: aponta para a conta e para o momento em que ela foi criada. */
const SEPARADOR_SESSAO = '|';
/** Contas criadas depois disto sempre têm sessões com data (as antigas continuam valendo até expirar). */
const CONTAS_COM_DATA_NA_SESSAO = Date.UTC(2026, 10, 20);

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

/**
 * A sessão guarda também `criadaEm` da conta: se a conta for excluída e outra
 * pessoa criar o mesmo apelido, as sessões antigas não valem na conta nova.
 */
async function abrirSessao(banco: Banco, id: string, criadaEm: number): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await banco.set(chaves.sessao(hashToken(token)), `${id}${SEPARADOR_SESSAO}${criadaEm}`, { segundos: SESSAO_SEGUNDOS });
  return token;
}

export async function criarConta(banco: Banco, apelido: unknown, senha: unknown, ip = 'local') {
  const dados = validar(apelido, senha);
  if ((await banco.incr(chaves.contasIp(ip), JANELA_CONTAS)) > CONTAS_POR_IP) {
    throw new ErroHttp(429, 'Muitas contas criadas daqui. Tente de novo mais tarde.');
  }
  const id = normalizarApelido(dados.apelido);
  const conta: Conta = { apelido: dados.apelido, senha: await hashSenha(dados.senha), criadaEm: Date.now() };
  const criou = await banco.set(chaves.conta(id), JSON.stringify(conta), { soSeNovo: true });
  if (!criou) throw new ErroHttp(409, 'Esse apelido já está em uso.');
  return { apelido: conta.apelido, token: await abrirSessao(banco, id, conta.criadaEm) };
}

/**
 * O limite de senhas erradas vale por apelido e endereço: quem erra a senha de
 * outra pessoa não bloqueia o dono, que entra de outro endereço.
 */
export async function entrar(banco: Banco, apelido: unknown, senha: unknown, ip = 'local') {
  if (typeof apelido !== 'string' || typeof senha !== 'string') throw new ErroHttp(400, 'Informe apelido e senha.');
  const id = normalizarApelido(apelido);
  const porIp = await banco.incr(chaves.tentativasIp(ip), JANELA_TENTATIVAS);
  const porConta = await banco.incr(chaves.tentativas(id, ip), JANELA_TENTATIVAS);
  if (porIp > TENTATIVAS_POR_IP || porConta > TENTATIVAS_MAXIMAS) {
    throw new ErroHttp(429, 'Muitas tentativas. Espere 15 minutos e tente de novo.');
  }
  const texto = await banco.get(chaves.conta(id));
  const conta = texto ? (JSON.parse(texto) as Conta) : null;
  if (!conta || !(await conferirSenha(senha, conta.senha))) throw new ErroHttp(401, 'Apelido ou senha incorretos.');
  await banco.del(chaves.tentativas(id, ip));
  return { apelido: conta.apelido, token: await abrirSessao(banco, id, conta.criadaEm) };
}

/** Conta da sessão, ou null se o token for inválido ou tiver expirado. */
export async function contaDaSessao(banco: Banco, token: string | null): Promise<{ id: string; apelido: string } | null> {
  if (!token) return null;
  const valor = await banco.get(chaves.sessao(hashToken(token)));
  if (!valor) return null;
  const [id, criadaEm] = valor.split(SEPARADOR_SESSAO);
  const texto = await banco.get(chaves.conta(id));
  if (!texto) return null;
  const conta = JSON.parse(texto) as Conta;
  // Sessão de uma conta excluída: o apelido pode ter sido criado de novo por outra pessoa.
  // Sessões antigas, sem a data, só valem para contas criadas antes desta regra.
  if (criadaEm === undefined ? conta.criadaEm > CONTAS_COM_DATA_NA_SESSAO : Number(criadaEm) !== conta.criadaEm) return null;
  return { id, apelido: conta.apelido };
}

export async function sair(banco: Banco, token: string | null): Promise<void> {
  if (token) await banco.del(chaves.sessao(hashToken(token)));
}

/** Exclui a conta de vez (pede a senha de novo): dados, save e presença pública. */
export async function excluirConta(banco: Banco, token: string | null, senha: unknown): Promise<void> {
  const conta = await contaDaSessao(banco, token);
  if (!conta) throw new ErroHttp(401, 'Entre na conta para excluí-la.');
  const texto = await banco.get(chaves.conta(conta.id));
  if (typeof senha !== 'string' || !texto || !(await conferirSenha(senha, (JSON.parse(texto) as Conta).senha))) {
    throw new ErroHttp(401, 'Senha incorreta.');
  }
  await sairDoMundo(banco, conta.id);
  await banco.del(chaves.save(conta.id));
  await banco.del(chaves.conta(conta.id));
  await sair(banco, token);
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
  if (new TextEncoder().encode(texto).length > TAMANHO_MAXIMO_SAVE) throw new ErroHttp(413, 'Save grande demais.');
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
