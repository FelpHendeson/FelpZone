import { describe, expect, it } from "vitest";
import { comporModificadores, resumirModificadores, RESUMO_NEUTRO, type Modificador } from "../src/index";

const origem = { tipo: "equipamento", id: "teste" } as const;

describe("modificadores", () => {
  it("sem modificadores, o valor base não muda", () => {
    expect(comporModificadores(10, [], "forca")).toBe(10);
    expect(resumirModificadores([], "forca")).toEqual(RESUMO_NEUTRO);
  });

  it("compõe (base + somar) × (1 + percentual) × multiplicar, só do alvo pedido", () => {
    const mods: Modificador[] = [
      { alvo: "forca", operacao: "somar", valor: 5, origem },
      { alvo: "forca", operacao: "percentual", valor: 0.1, origem },
      { alvo: "forca", operacao: "percentual", valor: 0.1, origem },
      { alvo: "forca", operacao: "multiplicar", valor: 2, origem },
      { alvo: "agilidade", operacao: "somar", valor: 100, origem },
    ];
    expect(comporModificadores(10, mods, "forca")).toBeCloseTo(36);
    expect(comporModificadores(10, [...mods].reverse(), "forca")).toBeCloseTo(36);
  });

  it("rejeita valor não finito", () => {
    expect(() => comporModificadores(1, [{ alvo: "x", operacao: "somar", valor: Number.NaN, origem }], "x")).toThrow();
  });
});
