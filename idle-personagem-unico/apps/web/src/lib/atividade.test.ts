import { resumoVazio } from "@idle-pu/motor";
import { describe, expect, it } from "vitest";
import { formatarDuracao, nomeLocal, nomeSubarea, resumoRelevante } from "./atividade";

const resumo = (ciclos: number, simuladoMs: number) => ({ ...resumoVazio("meditacao", 1), ciclos, simuladoMs, decorridoMs: simuladoMs });

describe("atividade na web", () => {
  it("resumo só aparece com ciclo completo e ao menos 1 min fora", () => {
    expect(resumoRelevante(resumo(0, 3_600_000))).toBe(false);
    expect(resumoRelevante(resumo(2, 59_000))).toBe(false);
    expect(resumoRelevante(resumo(2, 120_000))).toBe(true);
    // Combate não tem ciclos: abates, recuos, morte ou saída do Limiar bastam.
    expect(resumoRelevante({ ...resumo(0, 120_000), abates: { "lobo-cinzento": 3 } })).toBe(true);
    expect(resumoRelevante({ ...resumo(0, 120_000), mortes: 1 })).toBe(true);
    expect(resumoRelevante({ ...resumo(0, 120_000), saidasDoLimiar: 1 })).toBe(true);
  });

  it("formata durações e nomes de lugar", () => {
    expect(formatarDuracao(30_000)).toBe("30 s");
    expect(formatarDuracao(95_000)).toBe("1 min 35 s");
    expect(formatarDuracao(12 * 3_600_000)).toBe("12 h 00 min");
    expect(nomeLocal("bosque-raso")).toBe("Bosque Raso");
    expect(nomeSubarea("pedravau", "campo-de-treino")).toBe("Campo de Treino");
  });
});
