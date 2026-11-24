/**
 * Atividades em ciclos e avanço do tempo (GDD §6, ARQUITETURA §3.1).
 *
 * O avanço é por ciclos, não por passos de 0,5 s: cada ciclo completo aplica
 * o ganho de status e o XP; o que sobra de um ciclo incompleto fica em
 * `progressoMs` (inteiro). Como os ciclos são aplicados sempre na mesma ordem,
 * avançar 3 h de uma vez dá o mesmo estado que três avanços de 1 h.
 */
import { CATALOGO, obter, STATUS, type StatusId } from "../dados";
import type { AtividadeTreino } from "../dados/status";
import type { Personagem } from "../personagem/conta";
import {
  CONFIG_PROGRESSAO,
  faixaStatus,
  fator,
  ganhoDeTreino,
  modificadoresDoPersonagem,
  xpParaProximoNivel,
  type ConfigProgressao,
} from "../personagem/progressao";
import type { Modificador } from "../modificadores";
import type { EstadoJogo } from "../save";
import { LIMITE_OFFLINE_MS } from "../tempo";

/** Duração do ciclo, em ms inteiros: base ÷ velocidade, com mínimo. */
export function duracaoCicloMs(atividade: AtividadeTreino, mods: readonly Modificador[], config: ConfigProgressao = CONFIG_PROGRESSAO): number {
  return Math.max(config.cicloMinimoMs, Math.round(atividade.cicloBaseMs / fator(mods, "velocidade-atividade")));
}

/** XP de um ciclo, com o modificador `xp-personagem`. */
export function xpDoCiclo(atividade: AtividadeTreino, mods: readonly Modificador[]): number {
  return atividade.xpPorCiclo * fator(mods, "xp-personagem");
}

export function ganhosZerados(): Record<StatusId, number> {
  const r = {} as Record<StatusId, number>;
  for (const s of STATUS) r[s] = 0;
  return r;
}

export interface ResultadoCiclos {
  readonly personagem: Personagem;
  readonly ciclos: number;
  readonly ganhos: Readonly<Record<StatusId, number>>;
  readonly xp: number;
  readonly niveisGanhos: number;
}

/** Avança `ms` de atividade de um personagem (sem limite: quem chama limita). */
export function avancarPersonagem(p: Personagem, ms: number, config: ConfigProgressao = CONFIG_PROGRESSAO): ResultadoCiclos {
  const ganhos = ganhosZerados();
  if (!p.atividade || ms <= 0) return { personagem: p, ciclos: 0, ganhos, xp: 0, niveisGanhos: 0 };
  const atividade = obter(CATALOGO.atividades, p.atividade.id);
  const status = { ...p.status } as Record<StatusId, number>;
  let nivel = p.nivel;
  let xp = p.xp;
  let progresso = p.atividade.progressoMs + Math.floor(ms);
  let mods = modificadoresDoPersonagem(p, nivel);
  let duracao = duracaoCicloMs(atividade, mods, config);
  let ciclos = 0;
  let xpTotal = 0;
  const s = atividade.status;

  while (progresso >= duracao) {
    progresso -= duracao;
    ciclos++;
    const g = ganhoDeTreino(p.racaId, s, status[s], nivel, mods, config);
    status[s] += g;
    ganhos[s] += g;
    if (nivel < config.nivelMaximo) {
      const ganhoXp = xpDoCiclo(atividade, mods);
      xp += ganhoXp;
      xpTotal += ganhoXp;
      let subiu = false;
      while (nivel < config.nivelMaximo && xp >= xpParaProximoNivel(nivel, config)) {
        xp -= xpParaProximoNivel(nivel, config);
        nivel++;
        subiu = true;
      }
      if (nivel >= config.nivelMaximo) xp = 0;
      if (subiu) {
        mods = modificadoresDoPersonagem(p, nivel);
        // Quem estava abaixo do novo piso sobe até ele; nada passa do teto.
        for (const st of STATUS) {
          const f = faixaStatus(p.racaId, st, nivel, mods, config);
          const novo = Math.min(f.teto, Math.max(f.piso, status[st]));
          ganhos[st] += novo - status[st];
          status[st] = novo;
        }
        duracao = duracaoCicloMs(atividade, mods, config);
      }
    }
  }

  return {
    personagem: { ...p, nivel, xp, status, atividade: { id: atividade.id, progressoMs: progresso } },
    ciclos,
    ganhos,
    xp: xpTotal,
    niveisGanhos: nivel - p.nivel,
  };
}

/** O que aconteceu num avanço de tempo (para "Enquanto você estava fora"). */
export interface ResumoAvanco {
  /** Tempo real desde o último avanço (0 se o relógio voltou). */
  readonly decorridoMs: number;
  /** Tempo efetivamente simulado (no máximo 12 h). */
  readonly simuladoMs: number;
  readonly limitado: boolean;
  readonly atividadeId: string | null;
  readonly ciclos: number;
  readonly ganhos: Readonly<Record<StatusId, number>>;
  readonly xp: number;
  readonly nivelInicial: number;
  readonly nivelFinal: number;
}

/**
 * Avança o jogo até `agora`. Só o personagem ativo trabalha (GDD §4.1).
 * O limite de 12 h corta o excesso; relógio que voltou não dá ganho e não
 * recua `ultimoTick` (para não contar o mesmo tempo duas vezes).
 */
export function avancar(estado: EstadoJogo, agora: number, config: ConfigProgressao = CONFIG_PROGRESSAO): { estado: EstadoJogo; resumo: ResumoAvanco } {
  const ativo = estado.conta.personagens.find((p) => p.id === estado.conta.personagemAtivoId) ?? null;
  const decorrido = Number.isSafeInteger(agora) ? Math.max(0, agora - estado.ultimoTick) : 0;
  const simulado = Math.min(decorrido, LIMITE_OFFLINE_MS);
  const vazio: ResumoAvanco = {
    decorridoMs: decorrido,
    simuladoMs: simulado,
    limitado: decorrido > LIMITE_OFFLINE_MS,
    atividadeId: ativo?.atividade?.id ?? null,
    ciclos: 0,
    ganhos: ganhosZerados(),
    xp: 0,
    nivelInicial: ativo?.nivel ?? 0,
    nivelFinal: ativo?.nivel ?? 0,
  };
  if (decorrido === 0) return { estado, resumo: vazio };
  const novoTick = estado.ultimoTick + decorrido;
  if (!ativo) return { estado: { ...estado, ultimoTick: novoTick }, resumo: vazio };
  const r = avancarPersonagem(ativo, simulado, config);
  return {
    estado: {
      ...estado,
      ultimoTick: novoTick,
      conta: { ...estado.conta, personagens: estado.conta.personagens.map((p) => (p.id === ativo.id ? r.personagem : p)) },
    },
    resumo: { ...vazio, ciclos: r.ciclos, ganhos: r.ganhos, xp: r.xp, nivelFinal: r.personagem.nivel },
  };
}
