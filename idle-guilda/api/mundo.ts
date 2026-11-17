// GET: ranking, mural e jogadores online. GET ?pulso=1: presença e aplausos
// recebidos (exige conta). POST { acao: 'aplaudir', alvo }.
import { ErroHttp, obterBanco } from './_lib/banco.js';
import { contaDaSessao } from './_lib/contas.js';
import { json, lerCorpo, lerToken, tratar } from './_lib/http.js';
import { aplaudir, lerMundo, pulso } from './_lib/mundo.js';

export function GET(req: Request): Promise<Response> {
  return tratar(async () => {
    const banco = obterBanco();
    const conta = await contaDaSessao(banco, lerToken(req));
    if (new URL(req.url).searchParams.has('pulso')) {
      if (!conta) throw new ErroHttp(401, 'Sem conta conectada.');
      return json(await pulso(banco, conta.id));
    }
    return json({ ...(await lerMundo(banco, conta?.id ?? null)), eu: conta?.id ?? null });
  });
}

export function POST(req: Request): Promise<Response> {
  return tratar(async () => {
    const banco = obterBanco();
    const conta = await contaDaSessao(banco, lerToken(req));
    if (!conta) throw new ErroHttp(401, 'Entre numa conta para aplaudir.');
    const corpo = await lerCorpo(req);
    if (corpo.acao !== 'aplaudir') throw new ErroHttp(400, 'Ação desconhecida.');
    return json(await aplaudir(banco, conta.id, corpo.alvo));
  });
}
