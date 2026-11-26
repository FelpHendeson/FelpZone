import { describe, expect, it } from "vitest";
import { CATALOGO, CORES_CABELO, CORES_ROUPA, gerarMiniaturaSvg, gerarSpritePersonagemSvg } from "../src/index";

const base = { racaId: "humano", coreId: "andarilho", corCabeloId: "castanho", corRoupaId: "linho" };
describe("sprites modulares em pixel art", () => {
  it("gera retratos e duas poses distintos para todas as raças, deterministicamente", () => {
    const retratos = new Set<string>();
    const sprites = new Set<string>();
    for (const racaId of CATALOGO.racas.keys()) {
      const p = { ...base, racaId };
      const retrato = gerarMiniaturaSvg(p), sprite = gerarSpritePersonagemSvg(p);
      expect(gerarMiniaturaSvg(p)).toBe(retrato);
      expect(gerarSpritePersonagemSvg(p)).toBe(sprite);
      expect(sprite).toContain('viewBox="0 0 96 64"');
      expect(sprite).toContain('data-quadro="0"');
      expect(sprite).toContain('data-quadro="1"');
      expect(sprite).toContain(CATALOGO.racas.get(racaId)!.visual.pele);
      retratos.add(retrato); sprites.add(sprite);
    }
    expect(retratos.size).toBe(CATALOGO.racas.size);
    expect(sprites.size).toBe(CATALOGO.racas.size);
  });
  it("preserva todas as cores de aparência e diferencia os cores", () => {
    for (const cabelo of CORES_CABELO) for (const roupa of CORES_ROUPA) {
      const p = { ...base, corCabeloId: cabelo.id, corRoupaId: roupa.id };
      for (const svg of [gerarMiniaturaSvg(p), gerarSpritePersonagemSvg(p)]) {
        expect(svg).toContain(cabelo.hex); expect(svg).toContain(roupa.hex);
      }
    }
    const cores = [...CATALOGO.cores.keys()].map((coreId) => gerarMiniaturaSvg({ ...base, coreId }));
    expect(new Set(cores).size).toBe(CATALOGO.cores.size);
  });
  it("desenha apenas retângulos em grade inteira, sem curvas, scripts ou recursos remotos", () => {
    for (const racaId of CATALOGO.racas.keys()) for (const svg of [gerarMiniaturaSvg({ ...base, racaId }), gerarSpritePersonagemSvg({ ...base, racaId })]) {
      expect(svg).toContain('shape-rendering="crispEdges"');
      expect(svg).not.toMatch(/<path|<circle|<image|<script|<animate|undefined|NaN/);
      for (const numero of svg.matchAll(/(?:x|y|width|height)="(-?[\d.]+)"/g)) expect(Number.isInteger(Number(numero[1]))).toBe(true);
    }
  });
  it("rejeita IDs desconhecidos em vez de injetar texto no SVG", () => {
    for (const chave of ["racaId", "coreId", "corCabeloId", "corRoupaId"]) {
      const p = { ...base, [chave]: '"><script>alert(1)</script>' };
      expect(() => gerarMiniaturaSvg(p)).toThrow();
      expect(() => gerarSpritePersonagemSvg(p)).toThrow();
    }
  });
});
