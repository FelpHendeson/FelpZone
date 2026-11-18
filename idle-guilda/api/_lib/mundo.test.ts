import { describe, expect, it } from 'vitest';
import { criarHeroi, novoJogo } from '../../src/motor/jogo';
import { gerarItem } from '../../src/motor/itens';
import { OBJETIVOS } from '../../src/motor/objetivos';
import { serializar } from '../../src/motor/save';
import type { Estado } from '../../src/motor/tipos';
import { bancoEmMemoria, ErroHttp } from './banco.js';
import { criarConta, excluirConta, gravarSave } from './contas.js';
import { acontecimentos, aplaudir, APLAUSOS_POR_DIA, atualizarMundo, lerMundo, perfilDoSave, pulso, TOTAL_OBJETIVOS } from './mundo.js';

async function erroDe(p: Promise<unknown>): Promise<ErroHttp> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErroHttp) return e;
    throw e;
  }
  throw new Error('Era esperado um erro.');
}

function jogo(nivel = 1, ajuste: (e: Estado) => void = () => {}): string {
  const e = novoJogo(1);
  e.herois[0].nivel = nivel;
  ajuste(e);
  return serializar(e, 1000);
}

describe('perfil e mural', () => {
  it('o total de capítulos do servidor bate com o do jogo', () => {
    expect(TOTAL_OBJETIVOS).toBe(OBJETIVOS.length);
  });

  it('o perfil sai do save, com renome calculado', () => {
    const p = perfilDoSave('aren', 'Aren', jogo(7, (e) => (e.estatisticas.abates = 250)), 0, 5);
    expect(p.nivel).toBe(7);
    expect(p.herois).toEqual([{ nome: 'leao', classe: 'leao', nivel: 7, arma: '' }]);
    expect(p.zona).toBe('patio');
    expect(p.renome).toBe(7 * 10 + 0 * 25 + 2);
  });

  it('acontecimentos marcantes vão para o mural', () => {
    const antes = perfilDoSave('a', 'A', jogo(4), 0, 1);
    const depois = perfilDoSave(
      'a',
      'A',
      jogo(11, (e) => {
        e.herois.push(criarHeroi('cyrus', 9));
        e.batalha.mapa = 'bosque';
        e.inventario.push(gerarItem(e, { nivel: 10, raridade: 'lendario' }));
        e.estatisticas.chefes = 12;
      }),
      0,
      2,
    );
    expect(acontecimentos(null, antes)).toEqual(['partiu em aventura para espalhar o nome LionHearth.']);
    expect(acontecimentos(antes, depois)).toEqual([
      'chegou ao nível 5!',
      'chegou ao nível 10!',
      'recrutou Cyrus Viper, o mago do raio.',
      'levou a party para o Bosque Suspenso.',
      'conseguiu um item lendário!',
      'derrotou 10 chefes.',
    ]);
    expect(acontecimentos(depois, depois)).toEqual([]);
  });

  it('ranking ordena por renome e mostra quem está online', async () => {
    const banco = bancoEmMemoria();
    await atualizarMundo(banco, 'a', 'Ana', jogo(3), 1000);
    await atualizarMundo(banco, 'b', 'Bia', jogo(9), 1000);
    await atualizarMundo(banco, 'a', 'Ana', jogo(5), 2000);
    const m = await lerMundo(banco, 'a', 3000);
    expect(m.ranking.map((p) => [p.apelido, p.posicao])).toEqual([
      ['Bia', 1],
      ['Ana', 2],
    ]);
    expect(m.minhaPosicao).toBe(2);
    expect(m.online).toBe(1);
    expect(m.mural.map((i) => `${i.apelido} ${i.texto}`)).toEqual([
      'Ana chegou ao nível 5!',
      'Bia partiu em aventura para espalhar o nome LionHearth.',
      'Ana partiu em aventura para espalhar o nome LionHearth.',
    ]);
    expect((await lerMundo(banco, null, 3000 + 6 * 60 * 1000)).online).toBe(0);
  });
});

describe('aplausos', () => {
  it('chegam ao alvo no próximo pulso, uma vez por dia e com limite diário', async () => {
    const banco = bancoEmMemoria();
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) await atualizarMundo(banco, id, id.toUpperCase(), jogo(), 0);
    expect((await aplaudir(banco, 'a', 'b', 0)).restantes).toBe(APLAUSOS_POR_DIA - 1);
    expect((await erroDe(aplaudir(banco, 'a', 'b', 0))).status).toBe(409);
    expect((await erroDe(aplaudir(banco, 'a', 'a', 0))).status).toBe(400);
    expect((await erroDe(aplaudir(banco, 'a', 'zz', 0))).status).toBe(404);
    for (const alvo of ['c', 'd', 'e', 'f']) await aplaudir(banco, 'a', alvo, 0);
    expect((await erroDe(aplaudir(banco, 'a', 'g', 0))).status).toBe(429);
    expect(await pulso(banco, 'b', 0)).toEqual({ presentes: 1 });
    expect(await pulso(banco, 'b', 0)).toEqual({ presentes: 0 });
    expect((await lerMundo(banco, null, 0)).ranking.find((p) => p.id === 'b')?.aplausos).toBe(1);
    expect((await aplaudir(banco, 'a', 'b', 86_400_000)).restantes).toBe(APLAUSOS_POR_DIA - 1);
  });
});

describe('excluir conta', () => {
  it('pede a senha e apaga conta, save, ranking e mural', async () => {
    const banco = bancoEmMemoria();
    const { token } = await criarConta(banco, 'Aren', 'segredo1');
    await gravarSave(banco, 'aren', jogo());
    await atualizarMundo(banco, 'aren', 'Aren', jogo());
    await atualizarMundo(banco, 'bia', 'Bia', jogo());
    expect((await erroDe(excluirConta(banco, token, 'errada1'))).status).toBe(401);
    await excluirConta(banco, token, 'segredo1');
    const m = await lerMundo(banco, null);
    expect(m.ranking.map((p) => p.id)).toEqual(['bia']);
    expect(m.mural.every((i) => i.id !== 'aren')).toBe(true);
    expect(await banco.get('idle-guilda:save:aren')).toBeNull();
  });
});
