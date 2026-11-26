import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function ambiente(status = 200) {
  const eventos: Record<string, (e: Record<string, unknown>) => void> = {};
  const cache = { put: vi.fn(async () => {}), addAll: vi.fn(async () => {}) };
  const caches = { open: vi.fn(async () => cache), keys: vi.fn(async () => ["outro-app", "idle-pu-v1", "idle-pu-f13-1-v2", "idle-pu-f13-5-v1", "idle-pu-f13-6-v1"]), delete: vi.fn(async () => true), match: vi.fn(async () => undefined) };
  const fetch = vi.fn(async () => new Response("página", { status, headers: { "content-type": "text/html" } }));
  const self = { addEventListener: (nome: string, cb: (e: Record<string, unknown>) => void) => { eventos[nome] = cb; }, location: { origin: "https://jogo.test" }, clients: { claim: vi.fn(async () => {}) }, skipWaiting: vi.fn(async () => {}) };
  runInNewContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), { self, caches, fetch, URL, Response });
  return { eventos, caches, cache, fetch };
}
describe("cache PWA", () => {
  it("guarda arte local após carregar e não exige download de toda a galeria ao instalar", async () => {
    const a = ambiente();
    let resposta!: Promise<Response>;
    a.eventos.fetch!({ request: { method: "GET", url: "https://jogo.test/arte/racas-v1.png" }, respondWith: (p: Promise<Response>) => { resposta = p; } });
    expect((await resposta).status).toBe(200);
    expect(a.cache.put).toHaveBeenCalledOnce();
    let instalacao!: Promise<unknown>;
    a.eventos.install!({ waitUntil: (p: Promise<unknown>) => { instalacao = p; } });
    await instalacao;
    expect(JSON.stringify(a.cache.addAll.mock.calls)).not.toContain("/arte/");
  });
  it("preserva caches alheios e remove só versões antigas do jogo", async () => {
    const a = ambiente();
    let tarefa!: Promise<unknown>;
    a.eventos.activate!({ waitUntil: (p: Promise<unknown>) => { tarefa = p; } });
    await tarefa;
    expect(a.caches.delete.mock.calls).toEqual([["idle-pu-v1"], ["idle-pu-f13-1-v2"], ["idle-pu-f13-5-v1"]]);
  });
  it("não guarda navegação com resposta 500", async () => {
    const a = ambiente(500);
    let resposta!: Promise<Response>;
    a.eventos.fetch!({ request: { method: "GET", url: "https://jogo.test/", mode: "navigate" }, respondWith: (p: Promise<Response>) => { resposta = p; }, waitUntil: vi.fn() });
    expect((await resposta).status).toBe(500);
    expect(a.cache.put).not.toHaveBeenCalled();
  });
  it("guarda HTML válido e não intercepta a API autenticada", async () => {
    const a = ambiente();
    const tarefas: Promise<unknown>[] = [];
    let resposta!: Promise<Response>;
    a.eventos.fetch!({ request: { method: "GET", url: "https://jogo.test/", mode: "navigate" }, respondWith: (p: Promise<Response>) => { resposta = p; }, waitUntil: (p: Promise<unknown>) => tarefas.push(p) });
    await resposta;
    await Promise.all(tarefas);
    expect(a.cache.put).toHaveBeenCalledOnce();
    const interceptar = vi.fn();
    a.eventos.fetch!({ request: { method: "GET", url: "https://jogo.test/api/v1/jogo" }, respondWith: interceptar });
    expect(interceptar).not.toHaveBeenCalled();
  });
});
