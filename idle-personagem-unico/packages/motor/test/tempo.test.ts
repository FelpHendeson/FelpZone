import { describe, expect, it } from "vitest";
import { LIMITE_OFFLINE_MS, MAX_PASSOS_OFFLINE, PASSO_MS, calcularPassos, criarRelogioManual } from "../src/index";

const T0 = 1_700_000_000_000;
const HORA = 60 * 60 * 1000;

describe("tempo", () => {
  it("constantes: passo de 0,5 s e limite de 12 h", () => {
    expect(PASSO_MS).toBe(500);
    expect(LIMITE_OFFLINE_MS).toBe(12 * HORA);
    expect(MAX_PASSOS_OFFLINE).toBe(86_400);
  });

  it("conta passos inteiros e guarda a fração que sobrou", () => {
    const r = calcularPassos(T0, T0 + 1_250);
    expect(r.passos).toBe(2);
    expect(r.limitado).toBe(false);
    expect(r.novaReferencia).toBe(T0 + 1_000);
    // A fração sobrante entra na próxima conta.
    expect(calcularPassos(r.novaReferencia, T0 + 1_500).passos).toBe(1);
  });

  it("exatamente 12 h não é cortado", () => {
    const r = calcularPassos(T0, T0 + 12 * HORA);
    expect(r.passos).toBe(MAX_PASSOS_OFFLINE);
    expect(r.limitado).toBe(false);
  });

  it("limita a 12 h e descarta o excesso", () => {
    const r = calcularPassos(T0, T0 + 30 * HORA + 250);
    expect(r.passos).toBe(MAX_PASSOS_OFFLINE);
    expect(r.limitado).toBe(true);
    expect(r.decorridoMs).toBe(30 * HORA + 250);
    expect(r.novaReferencia).toBe(T0 + 30 * HORA + 250);
  });

  it("relógio que voltou ou valores inválidos não geram passos", () => {
    expect(calcularPassos(T0, T0 - 5_000)).toMatchObject({ passos: 0, novaReferencia: T0 });
    expect(calcularPassos(T0, T0).passos).toBe(0);
    expect(calcularPassos(T0, Number.NaN).passos).toBe(0);
    expect(calcularPassos(Number.NaN, T0)).toMatchObject({ passos: 0, novaReferencia: T0 });
  });

  it("relógio manual é injetável", () => {
    const relogio = criarRelogioManual(T0);
    relogio.avancar(13 * HORA);
    expect(calcularPassos(T0, relogio.agora()).limitado).toBe(true);
    relogio.definir(T0 + PASSO_MS);
    expect(relogio.agora()).toBe(T0 + PASSO_MS);
  });
});
