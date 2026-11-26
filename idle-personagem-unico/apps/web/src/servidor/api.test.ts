import { describe, expect, it } from "vitest";
import { aplicarAcao, carregarSave, CORES_CABELO, CORES_ROUPA, criarEstadoInicial, retratoDe, serializarSave, type EstadoJogo } from "@idle-pu/motor";
import { ArmazemMemoria, armazemDoAmbiente } from "./armazem";
import { acao, entrar, enviarBuild, importar, iniciarJogoOnline, LIMITES, listarBuilds, obterJogo, registrar, sair, saude, SEM_BANCO, type Pedido } from "./api";

const T0 = 1_800_000_000_000;
const pedido = (corpo: unknown, token: string | null = null, agora = T0, ip = "1.2.3.4"): Pedido => ({ corpo, token, ip, agora });

function jogoNovo(): EstadoJogo {
  let e = criarEstadoInicial("api", T0);
  for (const a of [{ tipo: "iniciarSorteio" }, { tipo: "aceitarSorteio" }, { tipo: "definirNomeEAparencia", nome: "Ana", corCabelo: CORES_CABELO[0]!.id, corRoupa: CORES_ROUPA[0]!.id }]) {
    const r = aplicarAcao(e, a, T0);
    if (!r.ok) throw new Error(r.erro.codigo);
    e = r.estado;
  }
  return e;
}

async function contaComJogo(a: ArmazemMemoria) {
  const r = await registrar(a, pedido({ nome: "Ana_01", senha: "senha-forte" }));
  const token = r.corpo.token as string;
  await importar(a, pedido({ save: serializarSave(jogoNovo()) }, token));
  return token;
}

describe("API sem banco", () => {
  it("saúde diz que não há banco e o resto responde 503", async () => {
    expect(saude(null).corpo).toMatchObject({ ok: true, banco: false });
    for (const f of [registrar, entrar, sair, obterJogo, acao, importar, enviarBuild, listarBuilds]) expect(await f(null, pedido({}))).toMatchObject(SEM_BANCO);
  });

  it("só usa banco com URL https e token", () => {
    expect(armazemDoAmbiente({})).toBeNull();
    expect(armazemDoAmbiente({ KV_REST_API_URL: "http://x", KV_REST_API_TOKEN: "t" })).toBeNull();
    expect(armazemDoAmbiente({ KV_REST_API_URL: "http://localhost.evil.com", KV_REST_API_TOKEN: "t" })).toBeNull();
    expect(armazemDoAmbiente({ KV_REST_API_URL: "http://127.0.0.1:8079", KV_REST_API_TOKEN: "t" })).not.toBeNull();
    expect(armazemDoAmbiente({ UPSTASH_REDIS_REST_URL: "https://x.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" })).not.toBeNull();
  });
});

describe("conta", () => {
  it("registra, recusa nome repetido, entra, sai", async () => {
    const a = new ArmazemMemoria(() => T0);
    const r = await registrar(a, pedido({ nome: "  Ana_01 ", senha: "senha-forte" }));
    expect(r.status).toBe(201);
    expect(r.corpo.conta).toMatchObject({ nome: "ana_01" });
    expect((await registrar(a, pedido({ nome: "ana_01", senha: "outra-senha" }))).status).toBe(409);
    expect((await registrar(a, pedido({ nome: "a", senha: "senha-forte" }))).status).toBe(400);
    expect((await registrar(a, pedido({ nome: "bia", senha: "curta" }))).status).toBe(400);
    expect((await entrar(a, pedido({ nome: "ana_01", senha: "errada!!" }))).status).toBe(401);
    expect((await entrar(a, pedido({ nome: "ninguem", senha: "senha-forte" }))).status).toBe(401);
    const e = await entrar(a, pedido({ nome: "ANA_01", senha: "senha-forte" }));
    expect(e.status).toBe(200);
    const token = e.corpo.token as string;
    expect((await obterJogo(a, pedido(null, token))).status).toBe(404);
    await sair(a, pedido(null, token));
    expect((await obterJogo(a, pedido(null, token))).status).toBe(401);
  });

  it("guarda só o hash da senha e do token", async () => {
    const a = new ArmazemMemoria(() => T0);
    const r = await registrar(a, pedido({ nome: "ana", senha: "senha-forte" }));
    const bruto = (await a.obter("conta:ana"))!;
    expect(bruto).not.toContain("senha-forte");
    expect(await a.obter(`sessao:${r.corpo.token as string}`)).toBeNull();
  });

  it("limita tentativas de entrada por IP", async () => {
    const a = new ArmazemMemoria(() => T0);
    let ultimo = 0;
    for (let i = 0; i <= LIMITES.tentativasDeEntradaPorJanela; i++) ultimo = (await entrar(a, pedido({ nome: "ana", senha: "senha-forte" }))).status;
    expect(ultimo).toBe(429);
    expect((await entrar(a, pedido({ nome: "ana", senha: "senha-forte" }, null, T0, "9.9.9.9"))).status).toBe(401);
  });
});

describe("jogo", () => {
  it("importa o save do aparelho e não sobrescreve sem confirmar", async () => {
    const a = new ArmazemMemoria(() => T0);
    const token = await contaComJogo(a);
    const outro = serializarSave(jogoNovo());
    expect((await importar(a, pedido({ save: outro }, token))).status).toBe(409);
    expect((await importar(a, pedido({ save: outro, substituir: true }, token))).status).toBe(409);
    expect((await importar(a, pedido({ save: "{}" }, token))).status).toBe(400);
  });

  it("não aceita relógio do save no futuro", async () => {
    const a = new ArmazemMemoria(() => T0);
    const r = await registrar(a, pedido({ nome: "ana", senha: "senha-forte" }));
    const futuro = { ...jogoNovo(), ultimoTick: T0 + 10 * 3_600_000 };
    const i = await importar(a, pedido({ save: serializarSave(futuro) }, r.corpo.token as string));
    const c = carregarSave(i.corpo.save as string);
    expect(c.ok && c.estado.ultimoTick).toBe(T0);
  });

  it("o servidor aplica as ações com o relógio dele e avança o tempo", async () => {
    const a = new ArmazemMemoria(() => T0);
    const token = await contaComJogo(a);
    const r = await acao(a, pedido({ idAcao: "acao-coleta-0000001", revisao: 0, acao: { tipo: "iniciarAtividade", atividadeId: "colher-trigo" } }, token, T0 + 1_000));
    expect(r.status).toBe(200);
    expect((await acao(a, pedido({ acao: { tipo: "inventada" } }, token))).status).toBe(422);
    const j = await obterJogo(a, pedido(null, token, T0 + 3_600_000));
    const c = carregarSave(j.corpo.save as string);
    expect(c.ok && (c.estado.conta.personagens[0]!.mochila["trigo"] ?? 0)).toBeGreaterThan(0);
  });

  it("uma ação por vez por conta", async () => {
    const a = new ArmazemMemoria(() => T0);
    const token = await contaComJogo(a);
    const contaId = JSON.parse((await a.obter(`sessao:${(await import("node:crypto")).createHash("sha256").update(token).digest("hex")}`))!).id as string;
    await a.gravar(`trava:${contaId}`, "1", 10);
    expect((await acao(a, pedido({ acao: { tipo: "pararAtividade" } }, token))).status).toBe(409);
  });
});

describe("Arena (builds)", () => {
  it("registra o build gerado do save do servidor (não do aparelho) e lista sem dizer de quem é", async () => {
    const a = new ArmazemMemoria(() => T0);
    const registro = await registrar(a, pedido({ nome: "ana", senha: "senha-forte" }));
    const token = registro.corpo.token as string;
    await iniciarJogoOnline(a, pedido({}, token));
    await acao(a, pedido({ idAcao: "aceitar-0000000001", revisao: 0, acao: { tipo: "aceitarSorteio" } }, token));
    const nomeado = await acao(a, pedido({ idAcao: "nomear-00000000001", revisao: 1, acao: { tipo: "definirNomeEAparencia", nome: "Ana", corCabelo: CORES_CABELO[0]!.id, corRoupa: CORES_ROUPA[0]!.id } }, token));
    const jogo = carregarSave(nomeado.corpo.save as string);
    if (!jogo.ok) throw new Error("save inválido");
    const esperado = retratoDe(jogo.estado.conta.personagens[0]!);
    // O que o aparelho manda é ignorado.
    expect((await enviarBuild(a, pedido({ retrato: { ...esperado, nivel: 50 } }, token))).status).toBe(200);
    expect((await enviarBuild(a, pedido({}, token))).status).toBe(200);
    const l = await listarBuilds(a, pedido(null));
    expect(l.corpo.builds).toEqual([esperado]);
    expect(JSON.stringify(l.corpo)).not.toContain("contaId");
    expect((await enviarBuild(a, pedido({}, null))).status).toBe(401);
    const semJogo = await registrar(a, pedido({ nome: "vazia", senha: "senha-forte" }));
    expect((await enviarBuild(a, pedido({}, semJogo.corpo.token as string))).status).toBe(404);
  });

});
