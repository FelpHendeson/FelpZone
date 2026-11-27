import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const p = { racaId: "humano", coreId: "andarilho", corCabeloId: "preto", corRoupaId: "linho" };
let pedidos: string[], falhar: boolean;
beforeEach(() => {
  vi.resetModules(); pedidos = []; falhar = false;
  vi.stubGlobal("Image", class {
    naturalWidth = 1024; naturalHeight = 1024; onload?: () => void; onerror?: () => void;
    set src(url: string) { pedidos.push(url); queueMicrotask(() => { if (falhar) this.onerror?.(); else this.onload?.(); }); }
  });
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ({
    drawImage: vi.fn(), getImageData: () => ({ data: new Uint8ClampedArray(256 * 256 * 4) }), putImageData: vi.fn(),
  }) }) });
});
afterEach(() => vi.unstubAllGlobals());

describe("carregamento das animações", () => {
  it("deduplica pedidos simultâneos e reutiliza a folha entre sequências", async () => {
    const { obterAnimacao } = await import("./renderAnimacao");
    const [a, b] = await Promise.all([obterAnimacao(p, "repouso"), obterAnimacao(p, "repouso")]);
    expect(a).toBe(b); expect([a.width, a.height]).toEqual([1024, 256]);
    expect(await obterAnimacao(p, "caminhada")).not.toBe(a);
    expect(pedidos).toEqual(["/arte/animacoes-v1/humano.webp"]);
  });
  it("falha não envenena o cache e permite tentar novamente", async () => {
    const { obterAnimacao } = await import("./renderAnimacao");
    falhar = true;
    await expect(obterAnimacao(p, "repouso")).rejects.toThrow("indisponível");
    falhar = false;
    await expect(obterAnimacao(p, "repouso")).resolves.toBeDefined();
    expect(pedidos).toHaveLength(2);
  });
  it("raças e paletas não compartilham linhas personalizadas", async () => {
    const { obterAnimacao } = await import("./renderAnimacao");
    const humano = await obterAnimacao(p, "repouso");
    expect(await obterAnimacao({ ...p, racaId: "elfo" }, "repouso")).not.toBe(humano);
    expect(await obterAnimacao({ ...p, corRoupaId: "carmesim" }, "repouso")).not.toBe(humano);
    expect(await obterAnimacao(p, "repouso")).toBe(humano);
    expect(pedidos).toHaveLength(2);
  });
  it("limita folhas e linhas, descartando as menos usadas", async () => {
    const { obterAnimacao } = await import("./renderAnimacao");
    const primeira = await obterAnimacao(p, "repouso");
    for (const racaId of ["anao", "elfo", "orc", "lobisomem"]) {
      await obterAnimacao({ ...p, racaId }, "repouso"); await obterAnimacao({ ...p, racaId }, "caminhada");
    }
    expect(await obterAnimacao(p, "repouso")).not.toBe(primeira);
    expect(pedidos.filter(url => url.includes("humano"))).toHaveLength(2);
  });
});
