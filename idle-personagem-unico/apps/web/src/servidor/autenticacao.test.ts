import { describe, expect, it } from "vitest";
import { ArmazemMemoria } from "./armazem";
import { entrar, excluirConta, gerarRecuperacao, hashToken, migrarSessao, obterPerfil, reativarConta, recuperar, registrar, salvarPerfil, sessaoAtual, sair } from "./autenticacao";
import { iniciarJogoOnline, obterJogo, prontidao, saude } from "./api";
import { responder } from "./rota";
import type { Pedido } from "./contrato";

const T0 = 1_800_000_000_000;
const pedido = (corpo: unknown, token: string | null = null): Pedido => ({ corpo, token, agora: T0, ip: "auth-test" });
async function conta(a: ArmazemMemoria, nome = "ana") {
  const r = await registrar(a, pedido({ nome, senha: "senha-forte" }));
  return { token: r.corpo.token as string, codigo: r.corpo.codigoRecuperacao as string, id: (r.corpo.conta as { id: string }).id };
}
const post = (path: string, corpo: unknown, cookie?: string, id?: string, origin = "https://jogo.test") => new Request(`https://jogo.test/api/v1/${path}`, {
  method: "POST", headers: { "content-type": "application/json", "x-idle-web": "1", origin, ...(cookie ? { cookie } : {}), ...(id ? { "x-idle-conta": id } : {}) }, body: JSON.stringify(corpo),
});

describe("gestão de conta", () => {
  it("guarda e remove e-mail no perfil privado vinculado à conta", async () => {
    const a = new ArmazemMemoria(() => T0);
    const r = await registrar(a, pedido({ nome: "ana", senha: "senha-forte", email: "ana@example.test" }));
    const token = r.corpo.token as string;
    expect(r.corpo.conta).not.toHaveProperty("email");
    expect((await obterPerfil(a, pedido({}, token))).corpo).toEqual({ email: "ana@example.test" });
    expect((await obterPerfil(a, { ...pedido({}, token), contaEsperada: "outra" })).status).toBe(401);
    expect((await salvarPerfil(a, pedido({ email: "inválido" }, token))).status).toBe(400);
    expect((await salvarPerfil(a, pedido({ email: "" }, token))).corpo).toEqual({ email: null });
  });

  it("revoga sessões e build, reativa o mesmo save e expira a conta excluída definitivamente", async () => {
    let agora = T0;
    const a = new ArmazemMemoria(() => agora);
    const c = await conta(a);
    const credenciais = { nome: "ana", senha: "senha-forte" };
    await iniciarJogoOnline(a, pedido({}, c.token));
    await a.gravar("arena:builds", JSON.stringify([{ contaId: c.id }, { contaId: "outra" }]));
    const salvo = await a.obter(`save:${c.id}`);
    expect((await excluirConta(a, pedido({ senha: "errada!" }, c.token))).status).toBe(401);
    const excluida = await excluirConta(a, pedido(credenciais, c.token));
    expect(excluida).toMatchObject({ status: 200, encerrarSessao: true });
    expect(await a.obter("arena:builds")).toBe(JSON.stringify([{ contaId: "outra" }]));
    expect((await obterJogo(a, pedido({}, c.token))).status).toBe(401);
    expect((await entrar(a, pedido(credenciais))).status).toBe(403);
    expect((await reativarConta(a, pedido(credenciais))).status).toBe(200);
    expect(await a.obter(`save:${c.id}`)).toBe(salvo);
    expect((await obterJogo(a, pedido({}, c.token))).status).toBe(401);
    const nova = await entrar(a, pedido(credenciais));
    expect((await excluirConta(a, pedido(credenciais, nova.corpo.token as string))).status).toBe(200);
    agora = Number(excluida.corpo.excluidaAte);
    expect((await reativarConta(a, { ...pedido(credenciais), agora })).status).toBe(401);
    expect(await a.obter("conta:ana")).toBeNull();
    expect(await a.obter(`save:${c.id}`)).toBeNull();
  });
});

describe("recuperação e identidade persistente", () => {
  it("guarda hashes e recupera sem alterar o jogo, revogando todas as sessões antigas", async () => {
    const a = new ArmazemMemoria(() => T0);
    const c = await conta(a);
    const segunda = await entrar(a, pedido({ nome: "ana", senha: "senha-forte" }));
    await iniciarJogoOnline(a, pedido({}, c.token));
    const salvo = await a.obter(`save:${c.id}`);
    const bruto = (await a.obter("conta:ana"))!;
    expect(bruto).not.toContain(c.codigo);
    expect(bruto).not.toContain("senha-forte");
    expect((await recuperar(a, pedido({ nome: "ana", codigo: "errado", senhaNova: "senha-nova" }))).status).toBe(401);
    const r = await recuperar(a, pedido({ nome: "ana", codigo: c.codigo, senhaNova: "senha-nova" }));
    expect(r.status).toBe(200);
    expect(r.corpo.codigoRecuperacao).not.toBe(c.codigo);
    expect(await a.obter(`save:${c.id}`)).toBe(salvo);
    for (const token of [c.token, segunda.corpo.token as string]) expect((await obterJogo(a, pedido({}, token))).status).toBe(401);
    expect((await recuperar(a, pedido({ nome: "ana", codigo: c.codigo, senhaNova: "outra-senha" }))).status).toBe(401);
    expect((await entrar(a, pedido({ nome: "ana", senha: "senha-forte" }))).status).toBe(401);
    const novo = await entrar(a, pedido({ nome: "ana", senha: "senha-nova" }));
    expect(novo.status).toBe(200);
    expect((await obterJogo(a, pedido({}, novo.corpo.token as string))).status).toBe(200);
  });
  it("o mesmo código não pode ser usado em duas recuperações concorrentes", async () => {
    const a = new ArmazemMemoria(() => T0);
    const c = await conta(a);
    const resultados = await Promise.all(["primeira-senha", "segunda-senha"].map((senhaNova) => recuperar(a, pedido({ nome: "ana", codigo: c.codigo, senhaNova }))));
    expect(resultados.map((r) => r.status).sort()).toEqual([200, 401]);
  });
  it("gerar código exige senha atual e invalida só o código anterior", async () => {
    const a = new ArmazemMemoria(() => T0);
    const c = await conta(a);
    expect((await gerarRecuperacao(a, pedido({ senha: "incorreta" }, c.token))).status).toBe(401);
    const r = await gerarRecuperacao(a, pedido({ senha: "senha-forte" }, c.token));
    expect(r.status).toBe(200);
    expect((await sessaoAtual(a, pedido({}, c.token))).status).toBe(200);
    expect((await recuperar(a, pedido({ nome: "ana", codigo: c.codigo, senhaNova: "nova-senha" }))).status).toBe(401);
  });
  it("migra a sessão F9 apenas para a conta correta e revoga o token anterior", async () => {
    const a = new ArmazemMemoria(() => T0);
    const c = await conta(a);
    await conta(a, "bia");
    await a.gravar(`sessao:${hashToken("token-legado")}`, c.id);
    expect((await migrarSessao(a, pedido({ nome: "bia" }, "token-legado"))).status).toBe(401);
    const r = await migrarSessao(a, pedido({ nome: "ana" }, "token-legado"));
    expect(r.status).toBe(200);
    expect(await a.obter(`sessao:${hashToken("token-legado")}`)).toBeNull();
    expect((await sessaoAtual(a, pedido({}, r.corpo.token as string))).corpo.conta).toMatchObject({ id: c.id, nome: "ana" });
  });
  it("recuperação revoga até tokens legados que não foram migrados", async () => {
    const a = new ArmazemMemoria(() => T0);
    const c = await conta(a);
    await a.gravar(`sessao:${hashToken("legado")}`, c.id);
    await recuperar(a, pedido({ nome: "ana", codigo: c.codigo, senhaNova: "nova-senha" }));
    expect((await obterJogo(a, pedido({}, "legado"))).status).toBe(401);
    expect((await migrarSessao(a, pedido({ nome: "ana" }, "legado"))).status).toBe(401);
  });
});

describe("sessão web e CSRF", () => {
  it("usa cookie HttpOnly/Secure e não devolve o bearer no JSON da web", async () => {
    const a = new ArmazemMemoria(() => Date.now());
    const r = await responder(post("auth/registrar", { nome: "ana", senha: "senha-forte" }), registrar, a);
    expect(r.status).toBe(201);
    const cookie = r.headers.get("set-cookie")!;
    expect(cookie).toContain("__Host-idle-pu=");
    for (const atributo of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/"]) expect(cookie).toContain(atributo);
    expect(cookie).not.toContain("Domain=");
    const corpo = await r.json();
    expect(corpo.token).toBeUndefined();
    expect(corpo.conta.id).toBeTruthy();
    expect(corpo.codigoRecuperacao).toMatch(/^[0-9a-f-]{44}$/);
  });
  it("recusa origem diferente até no login e exige identidade nas ações com cookie", async () => {
    const a = new ArmazemMemoria(() => Date.now());
    expect((await responder(post("auth/entrar", {}, undefined, undefined, "https://outro.test"), entrar, a)).status).toBe(403);
    const r = await responder(post("auth/registrar", { nome: "ana", senha: "senha-forte" }), registrar, a);
    const cookie = r.headers.get("set-cookie")!.split(";")[0]!;
    const c = (await r.json()).conta;
    expect((await responder(post("jogo/iniciar", {}, cookie), iniciarJogoOnline, a)).status).toBe(409);
    expect((await responder(post("jogo/iniciar", {}, cookie, "outra-conta"), iniciarJogoOnline, a)).status).toBe(401);
    expect((await responder(post("jogo/iniciar", {}, cookie, c.id), iniciarJogoOnline, a)).status).toBe(200);
    expect((await responder(post("jogo/iniciar", {}, cookie, c.id, "https://outro.test"), iniciarJogoOnline, a)).status).toBe(403);
    const logout = await responder(post("auth/sair", {}, cookie, c.id), sair, a);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await responder(new Request("https://jogo.test/api/v1/jogo", { headers: { cookie, "x-idle-web": "1", "x-idle-conta": c.id } }), obterJogo, a)).status).toBe(401);
  });
  it("o cliente nativo continua recebendo bearer sem precisar de cookie", async () => {
    const r = await responder(new Request("https://jogo.test/api/v1/auth/registrar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nome: "ana", senha: "senha-forte" }) }), registrar, new ArmazemMemoria());
    expect((await r.json()).token).toBeTruthy();
    expect(r.headers.get("set-cookie")).toBeNull();
  });
  it("valida a origem pública quando o Next usa uma URL interna atrás do proxy", async () => {
    const req = new Request("http://localhost:3100/api/v1/auth/registrar", { method: "POST", headers: { host: "jogo.test", "x-forwarded-proto": "https", origin: "https://jogo.test", "x-idle-web": "1", "content-type": "application/json" }, body: JSON.stringify({ nome: "ana", senha: "senha-forte" }) });
    const r = await responder(req, registrar, new ArmazemMemoria());
    expect(r.status).toBe(201);
    expect(r.headers.get("set-cookie")).toContain("__Host-idle-pu=");
    expect(r.headers.get("set-cookie")).toContain("Secure");
  });
  it("readiness verifica o banco sem expor erro interno; liveness continua separada", async () => {
    class SemConexao extends ArmazemMemoria { override async testarConexao(): Promise<boolean> { throw new Error("token-secreto do provedor"); } }
    expect((await prontidao(new ArmazemMemoria())).status).toBe(200);
    expect((await prontidao(null)).status).toBe(503);
    const r = await prontidao(new SemConexao());
    expect(r.status).toBe(503);
    expect(JSON.stringify(r)).not.toContain("token-secreto");
    expect(saude(new SemConexao()).status).toBe(200);
  });
});
