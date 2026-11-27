import {
  CATALOGO,
  capacidadeMochila,
  chanceRaro,
  duracaoCicloMs,
  duracaoViagemMs,
  espacosUsados,
  ganhoDeTreino,
  modificadoresDoPersonagem,
  rendimentoMedio,
  statusDeCombate,
  type StatusDeCombate,
  xpDoCiclo,
  type AtividadeProducao,
  type Personagem,
  type ResumoAvanco,
  type Slot,
  type SlotItem,
} from "@idle-pu/motor";

export interface Estimativa {
  readonly duracaoMs: number;
  /** Treino: ganho do status por hora no valor atual (cai perto do teto). */
  readonly ganhoPorHora: number;
  readonly xpPorHora: number;
  /** Coleta: itens por hora, XP do ofício por hora e chance de achado raro por ciclo. */
  readonly itensPorHora: number;
  readonly xpOficioPorHora: number;
  readonly chanceRaro: number;
  /** Viagem até o local da atividade (0 se já está lá). */
  readonly viagemMs: number;
}

/** Estimativa de uma atividade para o personagem, no estado atual. */
export function estimarAtividade(p: Personagem, atividadeId: string): Estimativa {
  const a = CATALOGO.atividades.get(atividadeId)!;
  const mods = modificadoresDoPersonagem(p, p.nivel);
  if (a.tipo === "combate") {
    const viagemMs = p.localId === a.localId ? 0 : duracaoViagemMs(p.localId, a.localId, mods);
    return { duracaoMs: 0, ganhoPorHora: 0, xpPorHora: 0, itensPorHora: 0, xpOficioPorHora: 0, chanceRaro: 0, viagemMs };
  }
  const duracaoMs = duracaoCicloMs(p, a, mods);
  const ciclosPorHora = 3_600_000 / duracaoMs;
  const origem = p.localId;
  const viagemMs = origem === a.localId ? 0 : duracaoViagemMs(origem, a.localId, mods);
  if (a.tipo === "aprendizado") {
    return { duracaoMs, ganhoPorHora: 0, xpPorHora: xpDoCiclo(a, mods) * ciclosPorHora, itensPorHora: 0, xpOficioPorHora: 0, chanceRaro: 0, viagemMs };
  }
  if (a.tipo === "treino") {
    return {
      duracaoMs,
      ganhoPorHora: ganhoDeTreino(p.racaId, a.status, p.status[a.status], p.nivel, mods) * a.fatorDeGanho * ciclosPorHora,
      xpPorHora: xpDoCiclo(a, mods) * ciclosPorHora,
      itensPorHora: 0,
      xpOficioPorHora: 0,
      chanceRaro: 0,
      viagemMs,
    };
  }
  if (a.tipo === "cuidado") {
    return { duracaoMs, ganhoPorHora: 0, xpPorHora: xpDoCiclo(a, mods) * ciclosPorHora, itensPorHora: 0, xpOficioPorHora: 0, chanceRaro: 0, viagemMs };
  }
  if (a.tipo === "producao") {
    return {
      duracaoMs,
      ganhoPorHora: 0,
      xpPorHora: xpDoCiclo(a, mods) * ciclosPorHora,
      itensPorHora: a.saida.quantidade * ciclosPorHora,
      xpOficioPorHora: a.xpOficio * ciclosPorHora,
      chanceRaro: 0,
      viagemMs,
    };
  }
  return {
    duracaoMs,
    ganhoPorHora: 0,
    xpPorHora: xpDoCiclo(a, mods) * ciclosPorHora,
    itensPorHora: rendimentoMedio(p, a, mods) * ciclosPorHora,
    xpOficioPorHora: a.xpOficio * ciclosPorHora,
    chanceRaro: chanceRaro(p, a, mods),
    viagemMs,
  };
}

export function situacaoMochila(p: Personagem): { usados: number; capacidade: number; cheia: boolean } {
  const capacidade = capacidadeMochila(p.status.forca, modificadoresDoPersonagem(p, p.nivel));
  const usados = espacosUsados(p.mochila);
  return { usados, capacidade, cheia: usados >= capacidade };
}

/** Mostra o resumo "Enquanto você estava fora" só se algo relevante aconteceu. */
export function resumoRelevante(r: ResumoAvanco): boolean {
  const algo = r.ciclos > 0 || Object.keys(r.abates).length > 0 || r.mortes > 0 || r.recuos > 0 || r.saidasDoLimiar > 0 || r.domados.length > 0;
  return algo && r.simuladoMs >= 60_000;
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

export function nomeLocal(id: string): string {
  return CATALOGO.locais.get(id)?.nome ?? id;
}

export function nomeSubarea(localId: string, subareaId: string): string {
  return CATALOGO.locais.get(localId)?.subareas.find((s) => s.id === subareaId)?.nome ?? subareaId;
}

export function combateDe(p: Personagem): StatusDeCombate {
  return statusDeCombate(p.status, modificadoresDoPersonagem(p, p.nivel));
}

/** Quantos ciclos de produção os materiais na mochila pagam. */
export function ciclosPossiveis(p: Personagem, a: AtividadeProducao): number {
  return Math.min(...a.entradas.map((x) => Math.floor((p.mochila[x.itemId] ?? 0) / x.quantidade)));
}

/** Slot onde um item entra (acessórios: o primeiro livre). */
export function slotDoItem(p: Personagem, slot: SlotItem): Slot {
  if (slot !== "acessorio") return slot;
  return !p.equipados.acessorio1 ? "acessorio1" : !p.equipados.acessorio2 ? "acessorio2" : "acessorio1";
}
