/** Comunicação com as funções /api: conta e save na nuvem. */

export interface SaveRemoto {
  texto: string;
  salvoEm: number;
  recebidoEm: number;
}

export class ErroNuvem extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown, keepalive = false): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(caminho, {
      method: metodo,
      headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      credentials: 'same-origin',
      keepalive,
    });
  } catch {
    throw new ErroNuvem('Sem conexão com o servidor.', 0);
  }
  const dados = (await resposta.json().catch(() => ({}))) as T & { erro?: string };
  if (!resposta.ok) throw new ErroNuvem(dados.erro ?? 'O servidor não respondeu como esperado.', resposta.status);
  return dados;
}

/** null = contas indisponíveis (sem servidor ou sem banco). */
export async function consultarConta(): Promise<{ apelido: string | null } | null> {
  try {
    return await chamar<{ apelido: string | null }>('GET', '/api/conta');
  } catch {
    return null;
  }
}

export async function acessarConta(acao: 'criar' | 'entrar', apelido: string, senha: string): Promise<string> {
  const r = await chamar<{ apelido: string }>('POST', '/api/conta', { acao, apelido, senha });
  return r.apelido;
}

export async function excluirConta(senha: string): Promise<void> {
  await chamar('POST', '/api/conta', { acao: 'excluir', senha });
}

export async function sairDaConta(): Promise<void> {
  await chamar('POST', '/api/conta', { acao: 'sair' });
}

export async function baixarSave(): Promise<SaveRemoto | null> {
  return (await chamar<{ save: SaveRemoto | null }>('GET', '/api/save')).save;
}

/** Margem abaixo dos 64 KiB que o fetch com keepalive aceita. */
const LIMITE_KEEPALIVE = 60_000;

export async function enviarSave(texto: string, aoSair = false): Promise<SaveRemoto> {
  // keepalive deixa o envio terminar mesmo se a aba for fechada, mas os navegadores
  // recusam corpos acima de 64 KiB nesse modo: saves grandes vão pelo envio normal.
  const corpo = { texto };
  const pequeno = new TextEncoder().encode(JSON.stringify(corpo)).length < LIMITE_KEEPALIVE;
  const r = await chamar<{ salvoEm: number; recebidoEm: number }>('PUT', '/api/save', corpo, aoSair && pequeno);
  return { texto, ...r };
}

export interface HeroiPublico {
  nome: string;
  classe: string;
  nivel: number;
  arma: string;
}

export interface PerfilPublico {
  id: string;
  apelido: string;
  renome: number;
  nivel: number;
  herois: HeroiPublico[];
  zona: string;
  objetivo: number;
  aplausos: number;
  atualizadoEm: number;
  posicao?: number;
}

export interface Mundo {
  online: number;
  ranking: (PerfilPublico & { posicao: number })[];
  minhaPosicao: number | null;
  meuPerfil: PerfilPublico | null;
  mural: { t: number; id: string; apelido: string; texto: string }[];
  eu: string | null;
}

export function lerMundo(): Promise<Mundo> {
  return chamar<Mundo>('GET', '/api/mundo');
}

/** Presença a cada minuto; devolve quantos aplausos chegaram desde o último pulso. */
export async function pulso(): Promise<number> {
  return (await chamar<{ presentes: number }>('GET', '/api/mundo?pulso=1')).presentes;
}

export async function aplaudir(alvo: string): Promise<number> {
  return (await chamar<{ restantes: number }>('POST', '/api/mundo', { acao: 'aplaudir', alvo })).restantes;
}
