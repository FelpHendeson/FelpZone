import { describe, expect, it, vi } from "vitest";
import { criarArmazenamentoEmMemoria } from "@idle-pu/motor";
import { CHAVE_SESSAO, CHAVE_SAIDA, gravarSessao, lerSessao, restaurarSessao, sairDaConta } from "./sync";
import { chaveDaConta, migrarCacheDaConta } from "./persistencia";

function storage(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  return { getItem: (k: string) => dados.get(k) ?? null, setItem: (k: string, v: string) => { dados.set(k, v); }, removeItem: (k: string) => { dados.delete(k); } };
}
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });
describe("identidade pública sem credenciais no armazenamento", () => {
  it("nunca persiste token nem código de recuperação", () => {
    const arm = storage();
    gravarSessao(arm, { nome: "ana", id: "id-ana", token: "segredo" });
    expect(arm.getItem(CHAVE_SESSAO)).not.toContain("segredo");
    expect(lerSessao(arm)).toEqual({ nome: "ana", id: "id-ana", cacheSeparado: true });
  });
  it("migra o bearer legado e passa a usar só metadados públicos", async () => {
    const arm = storage({ [CHAVE_SESSAO]: JSON.stringify({ nome: "ana", token: "legado" }) });
    const buscar = vi.fn<typeof fetch>().mockResolvedValueOnce(resposta({}, 401)).mockResolvedValueOnce(resposta({ conta: { id: "id-ana", nome: "ana" } }));
    expect((await restaurarSessao(arm, buscar))?.id).toBe("id-ana");
    expect(buscar.mock.calls[1]?.[1]?.headers).toMatchObject({ authorization: "Bearer legado", "x-idle-web": "1" });
    expect(arm.getItem(CHAVE_SESSAO)).not.toContain("legado");
  });
  it("erro de sessão preserva a identidade expirada e não volta ao convidado", async () => {
    const arm = storage({ [CHAVE_SESSAO]: JSON.stringify({ nome: "ana", token: "expirado" }) });
    const buscar = vi.fn<typeof fetch>().mockResolvedValue(resposta({}, 401));
    expect((await restaurarSessao(arm, buscar))?.nome).toBe("ana");
    expect(lerSessao(arm)?.nome).toBe("ana");
    expect(arm.getItem(CHAVE_SESSAO)).not.toContain("expirado");
  });
  it("migra pedidos pendentes uma vez, sem reintroduzi-los após confirmação", async () => {
    const arm = criarArmazenamentoEmMemoria({ [chaveDaConta("ana")]: "cache", [`${chaveDaConta("ana")}:pendente`]: "pedido" });
    await migrarCacheDaConta(arm, "ana", "id-ana");
    expect(await arm.ler(`${chaveDaConta("id-ana")}:pendente`)).toBe("pedido");
    await arm.remover(`${chaveDaConta("id-ana")}:pendente`);
    await migrarCacheDaConta(arm, "ana", "id-ana");
    expect(await arm.ler(`${chaveDaConta("id-ana")}:pendente`)).toBeNull();
  });
  it("logout offline impede reconexão automática depois de recarregar", async () => {
    const arm = storage();
    gravarSessao(arm, { id: "id-ana", nome: "ana" });
    const semRede = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    expect(await sairDaConta(arm, { id: "id-ana", nome: "ana" }, semRede)).toBe(false);
    expect(arm.getItem(CHAVE_SESSAO)).toBeNull();
    expect(arm.getItem(CHAVE_SAIDA)).toBeTruthy();
    const voltou = vi.fn<typeof fetch>().mockResolvedValue(resposta({ ok: true }));
    expect(await restaurarSessao(arm, voltou)).toBeNull();
    expect(String(voltou.mock.calls[0]?.[0])).toContain("auth/sair");
    expect(voltou).toHaveBeenCalledOnce();
    expect(arm.getItem(CHAVE_SAIDA)).toBeNull();
  });
});
