import { CATALOGO, type Personagem, type StatusId } from "@idle-pu/motor";
import { animacaoDoPersonagem, type SequenciaPersonagem } from "./animacaoPersonagem";

const TREINO = {
  vigor: "corrida", forca: "pedras", resistencia: "impacto", agilidade: "obstaculos",
  intelecto: "tomos", espirito: "meditacao", percepcao: "vigilia", sorte: "dados",
} as const satisfies Record<StatusId, string>;

const GESTOS = {
  corrida: "caminhada", pedras: "trabalho", impacto: "ataque", obstaculos: "caminhada",
  tomos: "trabalho", meditacao: "repouso", vigilia: "repouso", dados: "trabalho",
  lenhador: "ataque", mineracao: "ataque", pesca: "trabalho", agricultura: "trabalho",
  forja: "ataque", alquimia: "trabalho", culinaria: "trabalho", pratica: "trabalho",
  alimentar: "trabalho", descansar: "repouso", treinar: "caminhada",
} as const satisfies Record<string, SequenciaPersonagem>;

export type GestoAtividade = keyof typeof GESTOS;

export interface VisualAtividade {
  readonly sequencia: SequenciaPersonagem;
  readonly gesto?: GestoAtividade;
  readonly cadencia?: number;
  readonly variante?: number;
}

/** As folhas de corpo preservam a raça e a paleta. O gesto define a coreografia e os objetos da tarefa. */
export function visualDaAtividade(p: Pick<Personagem, "atividade" | "viagem" | "limiar">): VisualAtividade {
  const atividade = p.atividade && CATALOGO.atividades.get(p.atividade.id);
  if (p.viagem || p.limiar || !atividade || atividade.tipo === "combate") {
    return { sequencia: animacaoDoPersonagem(p) };
  }
  if (atividade.tipo === "treino") {
    const gesto = TREINO[atividade.status];
    const cadencia = gesto === "corrida" ? 1.7 : gesto === "obstaculos" ? 1.15 : 1;
    return { gesto, cadencia, variante: atividade.nivel, sequencia: GESTOS[gesto] };
  }
  const gesto = atividade.tipo === "coleta" || atividade.tipo === "producao" ? atividade.oficio
    : atividade.tipo === "cuidado" ? atividade.cuidado : "pratica";
  const variante = atividade.tipo === "coleta" ? atividade.tier : atividade.tipo === "producao" ? (atividade.nivelMinimo < 10 ? 1 : atividade.nivelMinimo < 20 ? 2 : 3) : 1;
  return { gesto, variante, sequencia: GESTOS[gesto] };
}
