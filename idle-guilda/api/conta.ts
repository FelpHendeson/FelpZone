// GET: quem está conectado. POST { acao: 'criar' | 'entrar' | 'sair', apelido, senha }.
import { ErroHttp, obterBanco } from './_lib/banco.js';
import { contaDaSessao, criarConta, entrar, sair } from './_lib/contas.js';
import { cookieSessao, json, lerCorpo, lerToken, tratar } from './_lib/http.js';

export function GET(req: Request): Promise<Response> {
  return tratar(async () => {
    const conta = await contaDaSessao(obterBanco(), lerToken(req));
    return json({ apelido: conta?.apelido ?? null });
  });
}

export function POST(req: Request): Promise<Response> {
  return tratar(async () => {
    const banco = obterBanco();
    const corpo = await lerCorpo(req);
    if (corpo.acao === 'sair') {
      await sair(banco, lerToken(req));
      return json({ apelido: null }, 200, cookieSessao(null));
    }
    if (corpo.acao !== 'criar' && corpo.acao !== 'entrar') throw new ErroHttp(400, 'Ação desconhecida.');
    const r = corpo.acao === 'criar' ? await criarConta(banco, corpo.apelido, corpo.senha) : await entrar(banco, corpo.apelido, corpo.senha);
    return json({ apelido: r.apelido }, 200, cookieSessao(r.token));
  });
}
