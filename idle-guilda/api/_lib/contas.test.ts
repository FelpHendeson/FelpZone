import { describe, expect, it } from 'vitest';
import { bancoEmMemoria, ErroHttp } from './banco.js';
import { contaDaSessao, criarConta, entrar, excluirConta, gravarSave, lerSave, normalizarApelido, sair, TAMANHO_MAXIMO_SAVE } from './contas.js';

async function erroDe(p: Promise<unknown>): Promise<ErroHttp> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErroHttp) return e;
    throw e;
  }
  throw new Error('Era esperado um erro.');
}

const saveValido = (salvoEm = 123) => JSON.stringify({ estado: { versao: 2 }, salvoEm });

describe('contas', () => {
  it('cria, abre sessão, sai e entra de novo', async () => {
    const banco = bancoEmMemoria();
    const { apelido, token } = await criarConta(banco, '  Aren  ', 'segredo1');
    expect(apelido).toBe('Aren');
    expect(await contaDaSessao(banco, token)).toEqual({ id: 'aren', apelido: 'Aren' });
    await sair(banco, token);
    expect(await contaDaSessao(banco, token)).toBeNull();
    const nova = await entrar(banco, 'ARËN', 'segredo1');
    expect(await contaDaSessao(banco, nova.token)).toEqual({ id: 'aren', apelido: 'Aren' });
  });

  it('apelido é único sem diferenciar maiúsculas e acentos', async () => {
    const banco = bancoEmMemoria();
    await criarConta(banco, 'João', 'segredo1');
    expect(normalizarApelido('JOAO')).toBe('joao');
    expect((await erroDe(criarConta(banco, 'JOAO', 'outra123'))).status).toBe(409);
  });

  it('valida apelido e senha', async () => {
    const banco = bancoEmMemoria();
    expect((await erroDe(criarConta(banco, 'ab', 'segredo1'))).status).toBe(400);
    expect((await erroDe(criarConta(banco, 'nome<script>', 'segredo1'))).status).toBe(400);
    expect((await erroDe(criarConta(banco, 'Aren', '123'))).status).toBe(400);
  });

  it('senha errada é recusada e muitas tentativas bloqueiam', async () => {
    const banco = bancoEmMemoria();
    await criarConta(banco, 'Aren', 'segredo1');
    expect((await erroDe(entrar(banco, 'Aren', 'errada1'))).status).toBe(401);
    expect((await erroDe(entrar(banco, 'Ninguem', 'segredo1'))).status).toBe(401);
    for (let i = 0; i < 9; i++) await erroDe(entrar(banco, 'Aren', 'errada1'));
    expect((await erroDe(entrar(banco, 'Aren', 'segredo1'))).status).toBe(429);
  });

  it('quem erra a senha de outra pessoa não bloqueia o dono, que entra de outro endereço', async () => {
    const banco = bancoEmMemoria();
    await criarConta(banco, 'Aren', 'segredo1', 'ip-dono');
    for (let i = 0; i < 12; i++) await erroDe(entrar(banco, 'Aren', 'errada1', 'ip-atacante'));
    expect((await erroDe(entrar(banco, 'Aren', 'segredo1', 'ip-atacante'))).status).toBe(429);
    const { token } = await entrar(banco, 'Aren', 'segredo1', 'ip-dono');
    expect(await contaDaSessao(banco, token)).toEqual({ id: 'aren', apelido: 'Aren' });
  });

  it('um endereço não cria contas sem limite', async () => {
    const banco = bancoEmMemoria();
    for (let i = 0; i < 5; i++) await criarConta(banco, `Conta ${i}`, 'segredo1', 'ip-1');
    expect((await erroDe(criarConta(banco, 'Conta 5', 'segredo1', 'ip-1'))).status).toBe(429);
    await criarConta(banco, 'Conta 6', 'segredo1', 'ip-2');
  });

  it('excluir a conta invalida as sessões dos outros aparelhos, mesmo se o apelido for recriado', async () => {
    let agora = Date.UTC(2027, 0, 1);
    const banco = bancoEmMemoria(() => agora);
    const real = Date.now;
    Date.now = () => agora;
    try {
      const primeiro = await criarConta(banco, 'Fulano', 'segredo1');
      const segundo = await entrar(banco, 'Fulano', 'segredo1');
      await excluirConta(banco, primeiro.token, 'segredo1');
      expect(await contaDaSessao(banco, segundo.token)).toBeNull();
      agora += 1000;
      const outraPessoa = await criarConta(banco, 'fulano', 'outraSenha');
      expect(await contaDaSessao(banco, segundo.token)).toBeNull();
      expect(await contaDaSessao(banco, outraPessoa.token)).toEqual({ id: 'fulano', apelido: 'fulano' });
    } finally {
      Date.now = real;
    }
  });

  it('a sessão expira', async () => {
    let agora = 0;
    const banco = bancoEmMemoria(() => agora);
    const { token } = await criarConta(banco, 'Aren', 'segredo1');
    agora = 61 * 24 * 3600 * 1000;
    expect(await contaDaSessao(banco, token)).toBeNull();
    expect(await contaDaSessao(banco, 'token-falso')).toBeNull();
  });
});

describe('save na nuvem', () => {
  it('grava e lê o save da conta', async () => {
    const banco = bancoEmMemoria();
    expect(await lerSave(banco, 'aren')).toBeNull();
    await gravarSave(banco, 'aren', saveValido(999));
    const lido = await lerSave(banco, 'aren');
    expect(lido?.texto).toBe(saveValido(999));
    expect(lido?.salvoEm).toBe(999);
  });

  it('recusa saves inválidos ou grandes demais', async () => {
    const banco = bancoEmMemoria();
    expect((await erroDe(gravarSave(banco, 'aren', '{quebrado'))).status).toBe(400);
    expect((await erroDe(gravarSave(banco, 'aren', JSON.stringify({ salvoEm: 1 })))).status).toBe(400);
    expect((await erroDe(gravarSave(banco, 'aren', 'x'.repeat(TAMANHO_MAXIMO_SAVE + 1)))).status).toBe(413);
    // O limite é em bytes: acentos ocupam dois.
    const acentuado = JSON.stringify({ salvoEm: 1, estado: { versao: 3, texto: 'ã'.repeat(TAMANHO_MAXIMO_SAVE / 2) } });
    expect(acentuado.length).toBeLessThan(TAMANHO_MAXIMO_SAVE);
    expect((await erroDe(gravarSave(banco, 'aren', acentuado))).status).toBe(413);
  });
});
