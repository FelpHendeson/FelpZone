import { ErroHttp } from './banco.js';
import { SESSAO_SEGUNDOS } from './contas.js';

const COOKIE = 'ig_sessao';

export function json(corpo: unknown, status = 200, cabecalhos: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cabecalhos },
  });
}

export function lerToken(req: Request): string | null {
  for (const parte of (req.headers.get('cookie') ?? '').split(';')) {
    const [nome, ...resto] = parte.trim().split('=');
    if (nome === COOKIE) return decodeURIComponent(resto.join('='));
  }
  return null;
}

/** Cookie da sessão: só o servidor lê (httpOnly) e, em produção, só por HTTPS. */
export function cookieSessao(token: string | null): Record<string, string> {
  const seguro = process.env.VERCEL ? '; Secure' : '';
  const valor = token
    ? `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSAO_SEGUNDOS}${seguro}`
    : `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${seguro}`;
  return { 'Set-Cookie': valor };
}

/** Endereço de quem chamou (na Vercel, o primeiro de x-forwarded-for). */
export function lerIp(req: Request): string {
  const encaminhado = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (encaminhado || req.headers.get('x-real-ip') || 'local').slice(0, 64);
}

export async function lerCorpo(req: Request): Promise<Record<string, unknown>> {
  try {
    const corpo = await req.json();
    return typeof corpo === 'object' && corpo !== null ? (corpo as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Converte erros conhecidos em JSON e esconde os inesperados. */
export async function tratar(executar: () => Promise<Response>): Promise<Response> {
  try {
    return await executar();
  } catch (erro) {
    if (erro instanceof ErroHttp) return json({ erro: erro.message }, erro.status);
    console.error(erro);
    return json({ erro: 'Erro inesperado no servidor.' }, 500);
  }
}
