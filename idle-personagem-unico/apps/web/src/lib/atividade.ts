import {
  CATALOGO,
  duracaoCicloMs,
  ganhoDeTreino,
  modificadoresDoPersonagem,
  xpDoCiclo,
  type Personagem,
  type ResumoAvanco,
} from "@idle-pu/motor";

export interface Estimativa {
  readonly duracaoMs: number;
  /** Ganho do status por hora no valor atual (cai à medida que se aproxima do teto). */
  readonly ganhoPorHora: number;
  readonly xpPorHora: number;
}

/** Estimativa de uma atividade de treino para o personagem, no estado atual. */
export function estimarTreino(p: Personagem, atividadeId: string): Estimativa {
  const a = CATALOGO.atividades.get(atividadeId)!;
  const mods = modificadoresDoPersonagem(p, p.nivel);
  const duracaoMs = duracaoCicloMs(a, mods);
  const ciclosPorHora = 3_600_000 / duracaoMs;
  return {
    duracaoMs,
    ganhoPorHora: ganhoDeTreino(p.racaId, a.status, p.status[a.status], p.nivel, mods) * ciclosPorHora,
    xpPorHora: xpDoCiclo(a, mods) * ciclosPorHora,
  };
}

/** Mostra o resumo "Enquanto você estava fora" só se algo relevante aconteceu. */
export function resumoRelevante(r: ResumoAvanco): boolean {
  return r.ciclos > 0 && r.simuladoMs >= 60_000;
}

export function formatarDuracao(ms: number): string {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m.toString().padStart(2, "0")} min`;
  if (m > 0) return `${m} min ${s.toString().padStart(2, "0")} s`;
  return `${s} s`;
}

export function formatarNumero(x: number, casas = 1): string {
  return x.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
