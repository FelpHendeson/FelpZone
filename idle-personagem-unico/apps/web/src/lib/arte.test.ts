import { readFileSync } from "node:fs";
import { CATALOGO, type Personagem } from "@idle-pu/motor";
import { describe, expect, it } from "vitest";
import { cenaDoPersonagem, ORDEM_RACAS_ARTE, quadroRaca } from "./arte";

const parado = { localId: "pedravau", limiar: null, viagem: null, atividade: null };
describe("arte integrada", () => {
  it("cobre todas as raças sem trocar posição no atlas", () => {
    expect([...ORDEM_RACAS_ARTE].sort()).toEqual([...CATALOGO.racas.keys()].sort());
    expect(quadroRaca("humano")).toEqual({ coluna: 0, linha: 0 });
    expect(quadroRaca("silfo")).toEqual({ coluna: 3, linha: 1 });
    expect(quadroRaca("inexistente")).toBeNull();
  });
  it("usa todos os locais e preserva a origem durante viagem", () => {
    const posicoes = new Set<string>();
    for (const localId of CATALOGO.locais.keys()) posicoes.add(cenaDoPersonagem({ ...parado, localId }).posicao);
    expect(posicoes.size).toBe(CATALOGO.locais.size);
    const viagem = { origemLocalId: "pedravau", destinoLocalId: "bosque-raso", destinoSubareaId: "orla", totalMs: 4000, restanteMs: 2000 };
    const p = { ...parado, viagem };
    expect(cenaDoPersonagem(p)).toMatchObject({ id: "pedravau", estado: "viagem" });
    expect(p.viagem.restanteMs).toBe(2000);
  });
  it("prioriza Limiar e distingue repouso, trabalho e combate", () => {
    expect(cenaDoPersonagem(parado).estado).toBe("repouso");
    for (const a of CATALOGO.atividades.values()) expect(cenaDoPersonagem({ ...parado, atividade: { id: a.id, progressoMs: 0 } }).estado).toBe(a.tipo === "combate" ? "combate" : "trabalho");
    expect(cenaDoPersonagem({ ...parado, limiar: {} as NonNullable<Personagem["limiar"]> })).toMatchObject({ id: "limiar", arquivo: "/arte/limiar-v1.webp", estado: "limiar" });
  });
  it("PNG locais têm proporção exata e atlas de raças tem canal alpha, dentro do limite do pacote", () => {
    for (const nome of ["racas-v1.png", "locais-v1.png", "limiar-v1.png"]) {
      const b = readFileSync(new URL(`../../public/arte/${nome}`, import.meta.url));
      expect(b.subarray(1, 4).toString()).toBe("PNG");
      expect(b.readUInt32BE(16)).toBe(2 * b.readUInt32BE(20));
      expect(b.length).toBeLessThan(3_000_000);
      if (nome === "racas-v1.png") expect(b[25]).toBe(6);
    }
  });
});
