import { CATALOGO, type Personagem } from "@idle-pu/motor";

export interface DestinoJogo { readonly aba: string; readonly sub: number; }

/** Só escolhe a tela. Não aplica ações, não avança tempo e não altera o save. */
export function destinoDaAtividade(p: Pick<Personagem, "limiar" | "viagem" | "atividade">): DestinoJogo {
  if (p.limiar) return { aba: "combate", sub: 2 };
  if (p.viagem) return { aba: "mapa", sub: 0 };
  const tipo = p.atividade ? CATALOGO.atividades.get(p.atividade.id)?.tipo : undefined;
  switch (tipo) {
    case "combate": return { aba: "combate", sub: 0 };
    case "coleta": return { aba: "atividades", sub: 1 };
    case "producao": return { aba: "atividades", sub: 2 };
    case "aprendizado": return { aba: "atividades", sub: 3 };
    case "cuidado": return { aba: "atividades", sub: 4 };
    default: return { aba: "atividades", sub: 0 };
  }
}
