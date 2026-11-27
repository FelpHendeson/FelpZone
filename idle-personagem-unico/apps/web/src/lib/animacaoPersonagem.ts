import { CATALOGO, type Personagem } from "@idle-pu/motor";

export const SEQUENCIAS = {
  repouso: { linha: 0, duracoes: [900, 400, 140, 600] },
  caminhada: { linha: 1, duracoes: [180, 140, 180, 140] },
  ataque: { linha: 2, duracoes: [500, 250, 160, 450] },
  trabalho: { linha: 3, duracoes: [450, 300, 300, 450] },
} as const;
export type SequenciaPersonagem = keyof typeof SEQUENCIAS;

/** Apresentação do estado recebido. Não avança o motor nem confirma golpes. */
export function animacaoDoPersonagem(p: Pick<Personagem, "limiar" | "viagem" | "atividade">): SequenciaPersonagem {
  if (p.limiar) return p.limiar.combate.fase === "lutando" ? "ataque" : "repouso";
  if (p.viagem) return "caminhada";
  const tipo = p.atividade ? CATALOGO.atividades.get(p.atividade.id)?.tipo : undefined;
  if (tipo === "combate") return p.atividade?.combate?.fase === "lutando" ? "ataque" : "repouso";
  if (!tipo || tipo === "aprendizado" || tipo === "cuidado") return "repouso";
  if (p.atividade && ["meditacao", "estudo-de-tomos", "vigilia-na-torre"].includes(p.atividade.id)) return "repouso";
  return "trabalho";
}

export function quadroNoTempo(sequencia: SequenciaPersonagem, tempoMs: number): number {
  const duracoes = SEQUENCIAS[sequencia].duracoes;
  const total = duracoes.reduce((a: number, b) => a + b, 0);
  let t = Math.max(0, tempoMs) % total;
  for (let i = 0; i < duracoes.length; i++) { if (t < duracoes[i]!) return i; t -= duracoes[i]!; }
  return 0;
}
