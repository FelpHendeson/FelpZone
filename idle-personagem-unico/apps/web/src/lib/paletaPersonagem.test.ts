import { describe, expect, it } from "vitest";
import { CATALOGO, CORES_CABELO, CORES_ROUPA } from "@idle-pu/motor";
import { aplicarPaleta, coresDoPersonagem, RECORTES_RETRATO } from "./paletaPersonagem";

const p = { racaId: "humano", coreId: "andarilho", corCabeloId: "preto", corRoupaId: "linho" };
function quadro() {
  const pixels = new Uint8ClampedArray(4 * 4 * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set([224, 180, 143, 255], i);
  pixels.set([191, 48, 191, 128], 0); // cabelo
  pixels.set([32, 184, 200, 255], 48); // tecido na parte inferior
  pixels.set([10, 20, 30, 0], 60);
  return pixels;
}
describe("aparência raster personalizada", () => {
  it("troca cabelo/tecido preservando pele, alpha e o buffer original", () => {
    const base = quadro(), antes = new Uint8ClampedArray(base);
    const a = aplicarPaleta(base, 4, "#1b1a1f", "#d8cbb0");
    expect(a.slice(0, 3)).not.toEqual(base.slice(0, 3));
    expect(a.slice(48, 51)).not.toEqual(base.slice(48, 51));
    expect(a.slice(4, 48)).toEqual(base.slice(4, 48));
    expect(a.slice(60)).toEqual(base.slice(60));
    for (let i = 3; i < base.length; i += 4) expect(a[i]).toBe(base[i]);
    expect(base).toEqual(antes);
    expect(aplicarPaleta(base, 4, "#1b1a1f", "#d8cbb0")).toEqual(a);
  });
  it("paletas claras e escuras preservam variações de sombra e luz", () => {
    const base = new Uint8ClampedArray([80, 16, 80, 255, 191, 48, 191, 255, 240, 130, 240, 255]);
    for (const cabelo of CORES_CABELO) {
      const a = aplicarPaleta(base, 3, cabelo.hex, "#d8cbb0");
      const brilho = (i: number) => a[i]! + a[i + 1]! + a[i + 2]!;
      expect(brilho(0)).toBeLessThan(brilho(4)); expect(brilho(4)).toBeLessThan(brilho(8));
    }
  });
  it("todas as escolhas de cabelo e roupa produzem variantes distintas", () => {
    const base = quadro(), variantes = new Set<string>();
    for (const cabelo of CORES_CABELO) for (const roupa of CORES_ROUPA) variantes.add([...aplicarPaleta(base, 4, cabelo.hex, roupa.hex)].join(","));
    expect(variantes.size).toBe(CORES_CABELO.length * CORES_ROUPA.length);
  });
  it("não aplica tecido no rosto/olhos e preserva asas do silfo", () => {
    const base = new Uint8ClampedArray(10 * 10 * 4);
    base.set([32, 184, 200, 255], (2 * 10 + 5) * 4);
    base.set([50, 110, 190, 255], (6 * 10 + 1) * 4);
    base.set([32, 184, 200, 255], (6 * 10 + 5) * 4);
    const a = aplicarPaleta(base, 10, "#1b1a1f", "#8f2430", "silfo");
    expect(a.slice(100, 104)).toEqual(base.slice(100, 104));
    expect(a.slice(244, 248)).toEqual(base.slice(244, 248));
    expect(a.slice(260, 264)).not.toEqual(base.slice(260, 264));
  });
  it("cobre oito raças e rejeita IDs/cores/buffers inválidos", () => {
    expect(Object.keys(RECORTES_RETRATO).sort()).toEqual([...CATALOGO.racas.keys()].sort());
    for (const q of Object.values(RECORTES_RETRATO)) { expect(q.x + q.lado).toBeLessThanOrEqual(1); expect(q.y + q.lado).toBeLessThanOrEqual(1); }
    for (const chave of ["racaId", "coreId", "corCabeloId", "corRoupaId"]) expect(() => coresDoPersonagem({ ...p, [chave]: "inexistente" })).toThrow();
    expect(() => aplicarPaleta(quadro(), 3, "#000000", "#ffffff")).toThrow();
    expect(() => aplicarPaleta(quadro(), 4, "invalid", "#ffffff")).toThrow();
  });
});
