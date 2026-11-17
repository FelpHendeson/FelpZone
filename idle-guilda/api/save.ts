// GET: save guardado na nuvem da conta conectada. PUT { texto }: substitui.
import { ErroHttp, obterBanco } from './_lib/banco.js';
import { contaDaSessao, gravarSave, lerSave } from './_lib/contas.js';
import { json, lerCorpo, lerToken, tratar } from './_lib/http.js';
import { atualizarMundo } from './_lib/mundo.js';

async function contaObrigatoria(req: Request) {
  const conta = await contaDaSessao(obterBanco(), lerToken(req));
  if (!conta) throw new ErroHttp(401, 'Entre na sua conta para usar o save na nuvem.');
  return conta;
}

export function GET(req: Request): Promise<Response> {
  return tratar(async () => {
    const conta = await contaObrigatoria(req);
    return json({ save: await lerSave(obterBanco(), conta.id) });
  });
}

export function PUT(req: Request): Promise<Response> {
  return tratar(async () => {
    const conta = await contaObrigatoria(req);
    const corpo = await lerCorpo(req);
    const banco = obterBanco();
    const registro = await gravarSave(banco, conta.id, corpo.texto);
    const perfil = await atualizarMundo(banco, conta.id, conta.apelido, registro.texto);
    return json({ salvoEm: registro.salvoEm, recebidoEm: registro.recebidoEm, renome: perfil.renome });
  });
}
