import { describe, expect, it } from "vitest";
import { ATIVIDADES_TREINO, CATALOGO, type Personagem } from "@idle-pu/motor";
import { animacaoDoPersonagem, quadroNoTempo, SEQUENCIAS } from "./animacaoPersonagem";
import { visualDaAtividade } from "./animacaoAtividade";

const parado = { limiar: null, viagem: null, atividade: null };
describe("animação do estado confirmado", () => {
  it("repousa sem atividade e caminha somente em viagem", () => {
    expect(animacaoDoPersonagem(parado)).toBe("repouso");
    expect(animacaoDoPersonagem({ ...parado, viagem: {} as NonNullable<Personagem["viagem"]> })).toBe("caminhada");
  });
  it("cada treino tem um gesto próprio e a viagem prevalece até chegar", () => {
    const visuais = ATIVIDADES_TREINO.map((a) => visualDaAtividade({ ...parado, atividade: { id: a.id, progressoMs: 0 } }));
    expect(new Set(visuais.map((v) => v.gesto)).size).toBe(ATIVIDADES_TREINO.length);
    expect(visuais[0]).toMatchObject({ gesto: "corrida", sequencia: "caminhada", cadencia: 1.7 });
    expect(visuais[1]).toMatchObject({ gesto: "pedras" });
    expect(visualDaAtividade({ ...parado, atividade: { id: "corrida-de-folego", progressoMs: 0 }, viagem: {} as NonNullable<Personagem["viagem"]> })).toEqual({ sequencia: "caminhada" });
  });
  it("não inventa ataques durante busca, recuo ou recomposição", () => {
    for (const a of CATALOGO.atividades.values()) {
      for (const fase of ["procurando", "lutando", "recuando", "recompondo"] as const) {
        const combate = { fase } as NonNullable<NonNullable<Personagem["atividade"]>["combate"]>;
        const atividade = { id: a.id, progressoMs: 0, combate };
        const tranquilo = a.tipo === "aprendizado" || a.tipo === "cuidado" || ["meditacao", "estudo-de-tomos", "vigilia-na-torre"].includes(a.id);
        const esperado = a.tipo === "combate" ? fase === "lutando" ? "ataque" : "repouso" : tranquilo ? "repouso" : "trabalho";
        expect(animacaoDoPersonagem({ ...parado, atividade })).toBe(esperado);
      }
    }
  });
  it("Limiar tem precedência sobre viagem e atividade, sem mutar o estado", () => {
    const p = { ...parado, limiar: { combate: { fase: "recompondo" } } as NonNullable<Personagem["limiar"]>, viagem: {} as NonNullable<Personagem["viagem"]> };
    const antes = JSON.stringify(p);
    expect(animacaoDoPersonagem(p)).toBe("repouso");
    expect(animacaoDoPersonagem({ ...p, limiar: { ...p.limiar, combate: { ...p.limiar.combate, fase: "lutando" } } })).toBe("ataque");
    expect(JSON.stringify(p)).toBe(antes);
  });
  it("usa a cadência completa, inclui o piscar curto e retorna ao início", () => {
    for (const sequencia of Object.keys(SEQUENCIAS) as (keyof typeof SEQUENCIAS)[]) {
      const duracoes = SEQUENCIAS[sequencia].duracoes; let tempo = 0;
      expect(quadroNoTempo(sequencia, -10)).toBe(0);
      duracoes.forEach((duracao, i) => {
        expect(quadroNoTempo(sequencia, tempo)).toBe(i);
        expect(quadroNoTempo(sequencia, tempo + duracao - 1)).toBe(i);
        tempo += duracao;
      });
      expect(quadroNoTempo(sequencia, tempo)).toBe(0);
      expect(quadroNoTempo(sequencia, tempo * 400 + 1)).toBe(0);
    }
    expect(quadroNoTempo("repouso", 1300)).toBe(2);
    expect(quadroNoTempo("repouso", 1440)).toBe(3);
  });
});
