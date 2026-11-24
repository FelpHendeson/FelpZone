import { ganhosZerados, type ResumoAvanco } from "@idle-pu/motor";
import { describe, expect, it } from "vitest";
import { formatarDuracao, resumoRelevante } from "./atividade";

const resumo = (ciclos: number, simuladoMs: number): ResumoAvanco => ({
  decorridoMs: simuladoMs,
  simuladoMs,
  limitado: false,
  atividadeId: "meditacao",
  ciclos,
  ganhos: ganhosZerados(),
  xp: 0,
  nivelInicial: 1,
  nivelFinal: 1,
});

describe("atividade na web", () => {
  it("resumo só aparece com ciclo completo e ao menos 1 min fora", () => {
    expect(resumoRelevante(resumo(0, 3_600_000))).toBe(false);
    expect(resumoRelevante(resumo(2, 59_000))).toBe(false);
    expect(resumoRelevante(resumo(2, 120_000))).toBe(true);
  });

  it("formata durações", () => {
    expect(formatarDuracao(30_000)).toBe("30 s");
    expect(formatarDuracao(27_273)).toBe("27 s");
    expect(formatarDuracao(95_000)).toBe("1 min 35 s");
    expect(formatarDuracao(12 * 3_600_000)).toBe("12 h 00 min");
  });
});
