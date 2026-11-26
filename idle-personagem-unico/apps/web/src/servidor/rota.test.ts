import { describe, expect, it, vi } from "vitest";
import { responder } from "./rota";
import { LIMITES } from "./api";

describe("limite do corpo HTTP", () => {
  it("limita bytes UTF-8 reais, mesmo sem content-length", async () => {
    const regra = vi.fn(() => ({ status: 200, corpo: {} }));
    const req = new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ texto: "á".repeat(LIMITES.corpoBytes / 2) }) });
    const r = await responder(req, regra);
    expect(r.status).toBe(413);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(regra).not.toHaveBeenCalled();
  });
  it("cancela a leitura ao ultrapassar o limite em streaming", async () => {
    const cancelar = vi.fn();
    const stream = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(LIMITES.corpoBytes + 1)); }, cancel: cancelar });
    const req = new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
    expect((await responder(req, () => ({ status: 200, corpo: {} }))).status).toBe(413);
    expect(cancelar).toHaveBeenCalledOnce();
  });
  it("rejeita JSON inválido com no-store e encaminha JSON válido", async () => {
    const regra = vi.fn(() => ({ status: 200, corpo: { ok: true } }));
    expect((await responder(new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }), regra)).status).toBe(400);
    const r = await responder(new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: '{"acao":1}' }), regra);
    expect(r.status).toBe(200);
    expect(regra.mock.calls[0]).toBeDefined();
  });
});
