import { CATALOGO, type Personagem } from "@idle-pu/motor";
import { describe, expect, it } from "vitest";
import { ABAS } from "./abas";
import { destinoDaAtividade } from "./navegacao";

const parado = { limiar: null, viagem: null, atividade: null };

describe("atalhos da jornada", () => {
  it("abre treino quando o personagem está ocioso", () => {
    expect(destinoDaAtividade(parado)).toEqual({ aba: "atividades", sub: 0 });
  });
  it("todas as atividades do catálogo têm destino válido e preservam o estado", () => {
    for (const atividade of CATALOGO.atividades.values()) {
      const p = { ...parado, atividade: { id: atividade.id, progressoMs: 500 } };
      const antes = structuredClone(p);
      const destino = destinoDaAtividade(p);
      const aba = ABAS.find((a) => a.id === destino.aba);
      expect(aba?.subAbas[destino.sub]).toBeTruthy();
      expect(p).toEqual(antes);
      expect(aba?.subAbas[destino.sub]).toBe(({ treino: "Treino", coleta: "Coleta", producao: "Produção", aprendizado: "Aprendizado", cuidado: "Pets", combate: "Áreas" })[atividade.tipo]);
    }
  });
  it("prioriza a viagem enquanto a atividade ainda aguarda chegada", () => {
    const viagem = { origemLocalId: "pedravau", destinoLocalId: "bosque-raso", destinoSubareaId: "clareira", totalMs: 10_000, restanteMs: 5_000 };
    expect(destinoDaAtividade({ ...parado, viagem, atividade: { id: "meditacao", progressoMs: 0 } })).toEqual({ aba: "mapa", sub: 0 });
  });
  it("prioriza o Limiar mesmo se houver atividade ou viagem no estado", () => {
    // O atalho só consulta a presença do estado de Limiar, não seu combate.
    const limiar = {} as NonNullable<Personagem["limiar"]>;
    expect(destinoDaAtividade({ ...parado, limiar, atividade: { id: "meditacao", progressoMs: 0 } })).toEqual({ aba: "combate", sub: 2 });
  });
});
