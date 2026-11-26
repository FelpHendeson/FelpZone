import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ArmazemUpstash } from "../src/servidor/armazem";
import { entrar, recuperar, registrar } from "../src/servidor/autenticacao";
import { acao, iniciarJogoOnline, obterJogo, prontidao } from "../src/servidor/api";
import { abrirRedisLocal } from "./redisLocal";

let redis: Awaited<ReturnType<typeof abrirRedisLocal>>;
let banco: ArmazemUpstash;
const pedido = (token: string | null, corpo: unknown = {}) => ({ token, corpo, agora: 1_800_000_000_000, ip: "integracao" });
beforeAll(async () => { redis = await abrirRedisLocal(); banco = new ArmazemUpstash(redis.url, redis.token); }, 20000);
afterAll(async () => { await redis?.fechar(); }, 20000);

describe("persistência com Redis real e Lua", () => {
  it("preserva conta, save e recibo após reinício, isolando identidades e revogando sessões", async () => {
    expect((await prontidao(banco)).status).toBe(200);
    const reg = await registrar(banco, pedido(null, { nome: "ana", senha: "senha-forte" }));
    expect(reg.status).toBe(201);
    const token = reg.corpo.token as string;
    const id = (reg.corpo.conta as { id: string }).id;
    await iniciarJogoOnline(banco, pedido(token));
    const acao1 = { idAcao: "primeira-acao-integracao", revisao: 0, acao: { tipo: "aceitarSorteio" } };
    const resultado = await acao(banco, pedido(token, acao1));
    expect(resultado.status).toBe(200);
    const salvo = await banco.obter(`save:${id}`);
    await redis.reiniciar();
    banco = new ArmazemUpstash(redis.url, redis.token);
    expect(await banco.obter(`save:${id}`)).toBe(salvo);
    expect(await acao(banco, pedido(token, acao1))).toEqual(resultado);
    const segundo = await entrar(banco, pedido(null, { nome: "ana", senha: "senha-forte" }));
    expect(segundo.status).toBe(200);
    const jogo = await obterJogo(banco, pedido(segundo.corpo.token as string));
    expect(jogo.corpo.save).toBe(resultado.corpo.save);
    const bia = await registrar(banco, pedido(null, { nome: "bia", senha: "outra-senha" }));
    expect((await obterJogo(banco, pedido(bia.corpo.token as string))).status).toBe(404);
    expect((await obterJogo(banco, { ...pedido(token), contaEsperada: (bia.corpo.conta as { id: string }).id })).status).toBe(401);
    const reset = await recuperar(banco, pedido(null, { nome: "ana", codigo: reg.corpo.codigoRecuperacao, senhaNova: "senha-nova" }));
    expect(reset.status).toBe(200);
    expect((await obterJogo(banco, pedido(token))).status).toBe(401);
    expect((await obterJogo(banco, pedido(segundo.corpo.token as string))).status).toBe(401);
    expect(await banco.obter(`save:${id}`)).not.toBeNull();
    const novo = await entrar(banco, pedido(null, { nome: "ana", senha: "senha-nova" }));
    expect(novo.status).toBe(200);
    expect((await obterJogo(banco, pedido(novo.corpo.token as string))).corpo.save).toBe(resultado.corpo.save);
  }, 20000);
  it("a comparação Lua não grava parcialmente nem libera trava de outro dono", async () => {
    await banco.gravar("teste:trava", "dono-atual", 10);
    await banco.gravar("teste:save", "antes");
    expect(await banco.compararEGravar([{ chave: "teste:trava", valor: "dono-anterior" }], [{ chave: "teste:save", valor: "depois" }, { chave: "teste:recibo", valor: "ok" }])).toBe(false);
    expect(await banco.obter("teste:save")).toBe("antes");
    expect(await banco.obter("teste:recibo")).toBeNull();
    await banco.apagarSeIgual("teste:trava", "dono-anterior");
    expect(await banco.obter("teste:trava")).toBe("dono-atual");
  });
});
