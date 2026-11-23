import { describe, expect, it } from "vitest";
import { Rng, estadoDaSemente, ehEstadoRng } from "../src/index";

function sequencia(rng: Rng, n: number): number[] {
  return Array.from({ length: n }, () => rng.proximoUint32());
}

describe("rng", () => {
  it("mesma semente gera a mesma sequência", () => {
    expect(sequencia(Rng.daSemente("abc"), 50)).toEqual(sequencia(Rng.daSemente("abc"), 50));
    expect(sequencia(Rng.daSemente(42), 50)).toEqual(sequencia(Rng.daSemente(42), 50));
  });

  it("sementes diferentes geram sequências diferentes", () => {
    expect(sequencia(Rng.daSemente("abc"), 10)).not.toEqual(sequencia(Rng.daSemente("abd"), 10));
    expect(sequencia(Rng.daSemente(1), 10)).not.toEqual(sequencia(Rng.daSemente(2), 10));
  });

  it("sequência fixa de referência (protege saves contra mudança no algoritmo)", () => {
    // Se estes valores mudarem, saves antigos passam a sortear diferente.
    expect(sequencia(Rng.daSemente("felpzone"), 5)).toEqual([3610793192, 3257411200, 1815018483, 806729794, 807373750]);
    expect(sequencia(Rng.daSemente(42), 3)).toEqual([853279530, 1920286840, 3588795744]);
  });

  it("o estado continua válido (uint32) depois de muitas saídas", () => {
    for (const semente of ["a", "b", "mem", "ok", "semente-teste", 0, 1, 123456789]) {
      const rng = Rng.daSemente(semente);
      for (let i = 0; i < 2_000; i++) {
        rng.proximoUint32();
        expect(ehEstadoRng(rng.estado())).toBe(true);
      }
    }
  });

  it("estado serializado retoma exatamente a sequência", () => {
    const rng = Rng.daSemente("retomar");
    sequencia(rng, 37);
    const salvo = JSON.parse(JSON.stringify(rng.estado())) as unknown;
    expect(ehEstadoRng(salvo)).toBe(true);
    const esperado = sequencia(rng, 100);
    const retomado = Rng.deEstado(salvo as ReturnType<Rng["estado"]>);
    expect(sequencia(retomado, 100)).toEqual(esperado);
  });

  it("estado() é uma cópia e não muda com o gerador", () => {
    const rng = Rng.daSemente(7);
    const antes = rng.estado();
    rng.proximoUint32();
    expect(rng.estado()).not.toEqual(antes);
    expect(Rng.deEstado(antes).proximoUint32()).toBe(Rng.daSemente(7).proximoUint32());
  });

  it("rejeita estado inválido", () => {
    expect(() => Rng.deEstado({ a: -1, b: 0, c: 0, d: 0 })).toThrow();
    expect(() => Rng.deEstado({ a: 1.5, b: 0, c: 0, d: 0 })).toThrow();
    expect(() => Rng.deEstado({ a: 2 ** 32, b: 0, c: 0, d: 0 })).toThrow();
    expect(ehEstadoRng([1, 2, 3, 4])).toBe(false);
    expect(ehEstadoRng(null)).toBe(false);
  });

  it("rejeita sementes inválidas", () => {
    expect(() => estadoDaSemente("")).toThrow();
    expect(() => estadoDaSemente("x".repeat(129))).toThrow();
    expect(() => estadoDaSemente(1.5)).toThrow();
    expect(() => estadoDaSemente(Number.NaN)).toThrow();
  });

  it("flutuante fica em [0, 1)", () => {
    const rng = Rng.daSemente("flutuante");
    for (let i = 0; i < 10_000; i++) {
      const x = rng.flutuante();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("inteiro respeita os limites inclusivos e cobre todos os valores", () => {
    const rng = Rng.daSemente("inteiro");
    const vistos = new Set<number>();
    for (let i = 0; i < 5_000; i++) {
      const x = rng.inteiro(-3, 3);
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(-3);
      expect(x).toBeLessThanOrEqual(3);
      vistos.add(x);
    }
    expect(vistos.size).toBe(7);
    expect(rng.inteiro(5, 5)).toBe(5);
    expect(() => rng.inteiro(3, 2)).toThrow();
    expect(() => rng.inteiro(0, 1.5)).toThrow();
  });

  it("escolha ponderada segue os pesos e ignora peso zero", () => {
    const rng = Rng.daSemente("ponderada");
    const contagem = { a: 0, b: 0, c: 0 };
    const n = 20_000;
    for (let i = 0; i < n; i++) {
      const v = rng.escolhaPonderada([
        { valor: "a" as const, peso: 1 },
        { valor: "b" as const, peso: 3 },
        { valor: "c" as const, peso: 0 },
      ]);
      contagem[v]++;
    }
    expect(contagem.c).toBe(0);
    expect(contagem.a / n).toBeGreaterThan(0.22);
    expect(contagem.a / n).toBeLessThan(0.28);
    expect(() => rng.escolhaPonderada([])).toThrow();
    expect(() => rng.escolhaPonderada([{ valor: 1, peso: 0 }])).toThrow();
    expect(() => rng.escolhaPonderada([{ valor: 1, peso: -1 }])).toThrow();
    expect(() => rng.escolhaPonderada([{ valor: 1, peso: Number.POSITIVE_INFINITY }])).toThrow();
  });

  it("escolha ponderada é determinística", () => {
    const opcoes = [
      { valor: 1, peso: 2 },
      { valor: 2, peso: 5 },
      { valor: 3, peso: 1 },
    ];
    const a = Rng.daSemente(99);
    const b = Rng.daSemente(99);
    for (let i = 0; i < 100; i++) expect(a.escolhaPonderada(opcoes)).toBe(b.escolhaPonderada(opcoes));
  });

  it("embaralhar é determinístico, preserva os itens e não altera a original", () => {
    const original = Array.from({ length: 20 }, (_, i) => i);
    const copiaOriginal = original.slice();
    const x = Rng.daSemente("shuffle").embaralhar(original);
    const y = Rng.daSemente("shuffle").embaralhar(original);
    expect(x).toEqual(y);
    expect(x).not.toEqual(original);
    expect([...x].sort((p, q) => p - q)).toEqual(original);
    expect(original).toEqual(copiaOriginal);
    expect(Rng.daSemente(1).embaralhar([])).toEqual([]);
  });
});
