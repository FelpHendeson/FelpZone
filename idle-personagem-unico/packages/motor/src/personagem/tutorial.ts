import { CATALOGO } from "../dados";
import type { Acao } from "../acoes";
import type { Personagem } from "./conta";

export const PASSOS_TUTORIAL = ["sorteio", "treino", "coleta", "venda", "equipamento", "combate", "guilda"] as const;
export type PassoTutorial = (typeof PASSOS_TUTORIAL)[number];
export interface EstadoTutorial {
  readonly modo: "ativo" | "pulado";
  readonly concluidos: readonly PassoTutorial[];
}
export function tutorialInicial(modo: EstadoTutorial["modo"] = "ativo"): EstadoTutorial {
  return { modo, concluidos: ["sorteio"] };
}
export function validarTutorial(v: unknown): EstadoTutorial | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const t = v as Record<string, unknown>;
  if (t.modo !== "ativo" && t.modo !== "pulado") return null;
  if (!Array.isArray(t.concluidos) || t.concluidos.length > PASSOS_TUTORIAL.length || !t.concluidos.includes("sorteio")) return null;
  if (t.concluidos.some((p) => !(PASSOS_TUTORIAL as readonly unknown[]).includes(p)) || new Set(t.concluidos).size !== t.concluidos.length) return null;
  return { modo: t.modo, concluidos: PASSOS_TUTORIAL.filter((p) => (t.concluidos as unknown[]).includes(p)) };
}

/** Só é chamado depois de uma ação bem-sucedida. Não concede prêmios nem consome RNG. */
export function registrarTutorial(antes: Personagem | undefined, depois: Personagem, acao: Acao): Personagem {
  if (!antes || antes.id !== depois.id) return depois;
  let passo: PassoTutorial | undefined;
  if (acao.tipo === "iniciarAtividade") {
    const tipo = CATALOGO.atividades.get(acao.atividadeId)?.tipo;
    if (tipo === "treino" || tipo === "coleta" || tipo === "combate") passo = tipo;
  } else if ((acao.tipo === "vender" || acao.tipo === "venderTudo") && depois.ouro > antes.ouro) passo = "venda";
  else if (acao.tipo === "equipar") passo = "equipamento";
  else if (acao.tipo === "aceitarMissao" && CATALOGO.missoes.get(acao.missaoId)?.tipo === "guilda") passo = "guilda";
  if (!passo || depois.tutorial.concluidos.includes(passo)) return depois;
  const concluidos = PASSOS_TUTORIAL.filter((p) => p === passo || depois.tutorial.concluidos.includes(p));
  return { ...depois, tutorial: { ...depois.tutorial, concluidos } };
}
