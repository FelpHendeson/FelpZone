import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { aplicarAcao, CORES_CABELO, CORES_ROUPA, criarEstadoInicial, serializarSave } from "@idle-pu/motor";
import { acao, enviarBuild, importar, iniciarJogoOnline, listarBuilds, obterJogo, registrar, sair, type Pedido } from "./api";
import { ArmazemMemoria, type Condicao, type Escrita } from "./armazem";
import { recuperar } from "./autenticacao";

const T0 = 1_800_000_000_000;
const pedido = (token: string, corpo: unknown = {}, agora = T0): Pedido => ({ token, corpo, agora, ip: "teste" });
const aceitar = { idAcao: "aceitar-sorteio-0001", revisao: 0, acao: { tipo: "aceitarSorteio" } };
async function conta(a: ArmazemMemoria) {
  const r = await registrar(a, pedido("", { nome: "ana", senha: "senha-forte" }));
  const token = r.corpo.token as string;
  const id = JSON.parse((await a.obter(`sessao:${createHash("sha256").update(token).digest("hex")}`))!).id as string;
  return { token, id, codigo: r.corpo.codigoRecuperacao as string };
}

describe("integridade do jogo online", () => {
  it("cria a semente no servidor e não permite sobrescrever com importação", async () => {
    const a = new ArmazemMemoria(() => T0);
    const { token } = await conta(a);
    const local = serializarSave(criarEstadoInicial("semente-escolhida", T0));
    const novo = await iniciarJogoOnline(a, pedido(token, { save: local, procedencia: "servidor" }));
    expect(novo.corpo.procedencia).toBe("servidor");
    expect(novo.corpo.save).not.toBe(local);
    expect((await importar(a, pedido(token, { save: local, substituir: true }))).status).toBe(409);
    expect((await iniciarJogoOnline(a, pedido(token))).corpo).toEqual(novo.corpo);
  });
  it("importações e saves legados nunca ganham procedência competitiva", async () => {
    const a = new ArmazemMemoria(() => T0);
    const { token, id } = await conta(a);
    let estado = criarEstadoInicial("local", T0);
    for (const acao of [{ tipo: "iniciarSorteio" }, { tipo: "aceitarSorteio" }, { tipo: "definirNomeEAparencia", nome: "Ana", corCabelo: CORES_CABELO[0]!.id, corRoupa: CORES_ROUPA[0]!.id }]) {
      const r = aplicarAcao(estado, acao, T0);
      if (!r.ok) throw new Error(r.erro.codigo);
      estado = r.estado;
    }
    const local = serializarSave(estado);
    expect((await importar(a, pedido(token, { save: local, procedencia: "servidor" }))).corpo.procedencia).toBe("importado");
    expect((await enviarBuild(a, pedido(token))).status).toBe(403);
    await a.gravar(`save:${id}`, local); // formato F9 anterior ao envelope
    expect((await obterJogo(a, pedido(token))).corpo.procedencia).toBe("importado");
    await a.gravar("arena:builds", JSON.stringify([{ contaId: id, retrato: { nome: "legado" } }]));
    expect((await listarBuilds(a, pedido(token))).corpo.builds).toEqual([]);
  });
  it("devolve o mesmo resultado ao repetir uma ação, sem avançar o sorteio", async () => {
    const a = new ArmazemMemoria(() => T0);
    const { token, id } = await conta(a);
    await iniciarJogoOnline(a, pedido(token));
    const primeira = await acao(a, pedido(token, aceitar));
    const salvo = await a.obter(`save:${id}`);
    expect(primeira.status).toBe(200);
    expect(await acao(a, pedido(token, aceitar, T0 + 1000))).toEqual(primeira);
    expect(await a.obter(`save:${id}`)).toBe(salvo);
    expect((await acao(a, pedido(token, { ...aceitar, acao: { tipo: "rerolar" } }))).status).toBe(409);
  });
  it("recusa ações antigas mesmo depois de o recibo expirar", async () => {
    let agora = T0;
    const a = new ArmazemMemoria(() => agora);
    const { token } = await conta(a);
    await iniciarJogoOnline(a, pedido(token));
    expect((await acao(a, pedido(token, aceitar))).status).toBe(200);
    agora += 86401_000;
    const r = await acao(a, pedido(token, aceitar, agora));
    expect(r.corpo.erro).toMatchObject({ codigo: "estado_desatualizado" });
  });
  it("uma segunda sessão com revisão antiga não substitui o progresso", async () => {
    const a = new ArmazemMemoria(() => T0);
    const { token, id } = await conta(a);
    await iniciarJogoOnline(a, pedido(token));
    await acao(a, pedido(token, aceitar));
    const antes = await a.obter(`save:${id}`);
    expect((await acao(a, pedido(token, { ...aceitar, idAcao: "outra-sessao-00001", acao: { tipo: "rerolar" } }))).status).toBe(409);
    expect(await a.obter(`save:${id}`)).toBe(antes);
  });
});

/** Suspende somente o commit para reproduzir uma operação que ultrapassou sua lease. */
class ArmazemAdiado extends ArmazemMemoria {
  suspender = false;
  liberar: (() => void) | null = null;
  chegou: (() => void) | null = null;
  override async compararEGravar(condicoes: readonly Condicao[], escritas: readonly Escrita[]) {
    if (this.suspender) {
      this.suspender = false;
      await new Promise<void>((resolve) => { this.liberar = resolve; this.chegou?.(); });
    }
    return super.compararEGravar(condicoes, escritas);
  }
}

describe("commit atômico e expiração de trava", () => {
  it("o escritor antigo não sobrescreve o novo nem apaga a trava de outro dono", async () => {
    let agora = T0;
    const a = new ArmazemAdiado(() => agora);
    const { token, id } = await conta(a);
    await iniciarJogoOnline(a, pedido(token));
    a.suspender = true;
    const chegou = new Promise<void>((resolve) => { a.chegou = resolve; });
    const antiga = acao(a, pedido(token, aceitar));
    await chegou;
    agora += 11000;
    const nova = await acao(a, pedido(token, { ...aceitar, idAcao: "nova-operacao-00001", acao: { tipo: "rerolar" } }, agora));
    expect(nova.status).toBe(200);
    const salvo = await a.obter(`save:${id}`);
    await a.gravar(`trava:${id}`, "terceiro-dono", 10);
    a.liberar!();
    expect((await antiga).status).toBe(409);
    expect(await a.obter(`save:${id}`)).toBe(salvo);
    expect(await a.obter(`trava:${id}`)).toBe("terceiro-dono");
  });
  it("logout durante o processamento impede a gravação pendente", async () => {
    const a = new ArmazemAdiado(() => T0);
    const { token, id } = await conta(a);
    await iniciarJogoOnline(a, pedido(token));
    const salvo = await a.obter(`save:${id}`);
    a.suspender = true;
    const chegou = new Promise<void>((resolve) => { a.chegou = resolve; });
    const pendente = acao(a, pedido(token, aceitar));
    await chegou;
    await sair(a, pedido(token));
    a.liberar!();
    expect((await pendente).status).toBe(409);
    expect(await a.obter(`save:${id}`)).toBe(salvo);
  });
  it("recuperação de senha também impede o commit de uma sessão antiga em andamento", async () => {
    const a = new ArmazemAdiado(() => T0);
    const { token, id, codigo } = await conta(a);
    await iniciarJogoOnline(a, pedido(token));
    const salvo = await a.obter(`save:${id}`);
    a.suspender = true;
    const chegou = new Promise<void>((resolve) => { a.chegou = resolve; });
    const pendente = acao(a, pedido(token, aceitar));
    await chegou;
    expect((await recuperar(a, pedido("", { nome: "ana", codigo, senhaNova: "senha-nova" }))).status).toBe(200);
    a.liberar!();
    expect((await pendente).status).toBe(409);
    expect(await a.obter(`save:${id}`)).toBe(salvo);
    expect((await obterJogo(a, pedido(token))).status).toBe(401);
  });
  it("um CAS recusado não grava nem parte do estado nem o recibo", async () => {
    const a = new ArmazemMemoria(() => T0);
    await a.gravar("save", "original");
    expect(await a.compararEGravar([{ chave: "save", valor: "antigo" }], [{ chave: "save", valor: "novo" }, { chave: "recibo", valor: "ok" }])).toBe(false);
    expect(await a.obter("save")).toBe("original");
    expect(await a.obter("recibo")).toBeNull();
  });
});
