import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ArmazemUpstash, PREFIXO } from "../src/servidor/armazem";
import { entrar, excluirConta, obterPerfil, reativarConta, recuperar, registrar } from "../src/servidor/autenticacao";
import { acao, iniciarJogoOnline, obterJogo, prontidao } from "../src/servidor/api";
import { abrirRedisLocal, comandoRedis } from "./redisLocal";
import { ATIVIDADES_TREINO, CORES_CABELO, CORES_ROUPA, carregarSave, personagemAtivo } from "@idle-pu/motor";

let redis: Awaited<ReturnType<typeof abrirRedisLocal>>;
let banco: ArmazemUpstash;
const pedido = (token: string | null, corpo: unknown = {}) => ({ token, corpo, agora: 1_800_000_000_000, ip: "integracao" });
beforeAll(async () => { redis = await abrirRedisLocal(); banco = new ArmazemUpstash(redis.url, redis.token); }, 20000);
afterAll(async () => { await redis?.fechar(); }, 20000);

describe("persistência com Redis real e Lua", () => {
  it("sincroniza tutorial entre sessões, preserva após reinício e isola outra conta", async () => {
    const reg = await registrar(banco, pedido(null, { nome: "guia", senha: "senha-forte" }));
    const token = reg.corpo.token as string;
    let jogo = await iniciarJogoOnline(banco, pedido(token));
    let n = 0;
    for (const a of [{ tipo: "aceitarSorteio" }, { tipo: "definirNomeEAparencia", nome: "Guia", corCabelo: CORES_CABELO[0]!.id, corRoupa: CORES_ROUPA[0]!.id }, { tipo: "iniciarAtividade", atividadeId: ATIVIDADES_TREINO[0]!.id }, { tipo: "pularTutorial" }]) {
      jogo = await acao(banco, pedido(token, { idAcao: `tutorial-integracao-acao-${n++}`, revisao: jogo.corpo.revisao, acao: a }));
      expect(jogo.status).toBe(200);
    }
    const save = jogo.corpo.save as string;
    const lido = carregarSave(save);
    expect(lido.ok && personagemAtivo(lido.estado)?.tutorial).toEqual({ modo: "pulado", concluidos: ["sorteio", "treino"] });
    await redis.reiniciar(); banco = new ArmazemUpstash(redis.url, redis.token);
    const outraSessao = await entrar(banco, pedido(null, { nome: "guia", senha: "senha-forte" }));
    expect((await obterJogo(banco, pedido(outraSessao.corpo.token as string))).corpo.save).toBe(save);
    const outraConta = await registrar(banco, pedido(null, { nome: "guia_outra", senha: "senha-forte" }));
    expect((await obterJogo(banco, pedido(outraConta.corpo.token as string))).status).toBe(404);
  }, 20000);
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

  it("expira conta e save no Redis e remove ambos os prazos ao recuperar", async () => {
    const credenciais = { nome: "gestao", senha: "senha-forte", email: "jogador@example.test" };
    const gestao = (token: string | null, corpo: unknown = credenciais) => ({ ...pedido(token, corpo), ip: "gestao" });
    const registro = await registrar(banco, gestao(null));
    expect(registro.status).toBe(201);
    const token = registro.corpo.token as string;
    const id = (registro.corpo.conta as { id: string }).id;
    const original = await iniciarJogoOnline(banco, gestao(token, {}));
    expect(original.status).toBe(200);
    expect((await excluirConta(banco, gestao(token))).status).toBe(200);
    const chaves = ["conta:gestao", `save:${id}`];
    for (const chave of chaves) {
      const ttl = await comandoRedis(redis.porta, ["TTL", PREFIXO + chave]);
      expect(ttl).toBeGreaterThan(30 * 86_400 - 5);
    }
    expect((await reativarConta(banco, gestao(null))).status).toBe(200);
    for (const chave of chaves) expect(await comandoRedis(redis.porta, ["TTL", PREFIXO + chave])).toBe(-1);
    expect((await obterJogo(banco, gestao(token))).status).toBe(401);
    const entrada = await entrar(banco, gestao(null));
    const novoToken = entrada.corpo.token as string;
    expect((await obterPerfil(banco, gestao(novoToken))).corpo).toEqual({ email: "jogador@example.test" });
    expect((await obterJogo(banco, gestao(novoToken))).corpo.save).toBe(original.corpo.save);
  });
});
