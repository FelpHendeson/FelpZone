/**
 * Atividades em ciclos, viagem e avanço do tempo (GDD §6, §8; ARQUITETURA §3.1).
 *
 * O avanço é por ciclos, não por passos de 0,5 s. Primeiro consome a viagem
 * em andamento (se houver); depois aplica ciclos completos da atividade. O que
 * sobra de um ciclo fica em `progressoMs` (inteiro). Sorteios da coleta usam o
 * RNG do save, um ciclo de cada vez: avançar 3 h de uma vez dá o mesmo estado
 * que três avanços de 1 h.
 */
import { CATALOGO, obter, STATUS, type StatusId } from "../dados";
import type { Atividade } from "../dados";
import type { AtividadeColeta, OficioId } from "../dados/coleta";
import type { Modificador } from "../modificadores";
import type { Personagem, ProgressoOficio } from "../personagem/conta";
import { adicionarItens, capacidadeMochila } from "../personagem/mochila";
import {
  CONFIG_OFICIOS,
  CONFIG_PROGRESSAO,
  faixaStatus,
  fator,
  ganhoDeTreino,
  modificadoresDoPersonagem,
  valorEfetivo,
  xpParaProximoNivel,
  xpParaProximoNivelOficio,
  type ConfigProgressao,
} from "../personagem/progressao";
import { viagemBaseMs as baseViagem } from "../dados/mapa";
import { resumirModificadores } from "../modificadores";
import { Rng } from "../rng";
import type { EstadoJogo } from "../save";
import { LIMITE_OFFLINE_MS } from "../tempo";

/** Velocidade vinda de status: Agilidade acelera atividades físicas (coleta) [Calibrar]. */
export const BONUS_AGILIDADE_POR_PONTO = 0.01;
/** Percepção e Sorte aumentam achados raros [Calibrar]. */
export const BONUS_RARO_POR_PONTO = 0.01;

/** Nível efetivo do ofício: nível + bônus somados (`oficio.<id>.nivel`). */
export function nivelEfetivoOficio(p: Pick<Personagem, "oficios">, oficio: OficioId, mods: readonly Modificador[]): number {
  return p.oficios[oficio].nivel + resumirModificadores(mods, `oficio.${oficio}.nivel`).somar;
}

/** Fator de velocidade do ciclo: modificadores × ferramenta × Agilidade (só coleta). */
function fatorVelocidade(p: Personagem, atividade: Atividade, mods: readonly Modificador[]): number {
  let f = fator(mods, "velocidade-atividade");
  if (atividade.tipo === "coleta") {
    f *= obter(CATALOGO.ferramentas, p.ferramentas[atividade.oficio]).velocidade;
    f *= 1 + BONUS_AGILIDADE_POR_PONTO * valorEfetivo(p.status.agilidade, "agilidade", mods);
  }
  return f;
}

/** Duração do ciclo, em ms inteiros: base ÷ velocidade, com mínimo. */
export function duracaoCicloMs(p: Personagem, atividade: Atividade, mods: readonly Modificador[], config: ConfigProgressao = CONFIG_PROGRESSAO): number {
  return Math.max(config.cicloMinimoMs, Math.round(atividade.cicloBaseMs / fatorVelocidade(p, atividade, mods)));
}

/** XP do personagem por ciclo, com `xp-personagem`. */
export function xpDoCiclo(atividade: Atividade, mods: readonly Modificador[]): number {
  return atividade.xpPorCiclo * fator(mods, "xp-personagem");
}

/** Quantidade média de itens por ciclo de coleta. */
export function rendimentoMedio(p: Personagem, a: AtividadeColeta, mods: readonly Modificador[]): number {
  return a.rendimentoBase * obter(CATALOGO.ferramentas, p.ferramentas[a.oficio]).eficiencia * fator(mods, `oficio.${a.oficio}.rendimento`);
}

/** Chance de achado raro por ciclo de coleta. */
export function chanceRaro(p: Personagem, a: AtividadeColeta, mods: readonly Modificador[]): number {
  const pontos = valorEfetivo(p.status.percepcao, "percepcao", mods) + valorEfetivo(p.status.sorte, "sorte", mods);
  return Math.min(1, a.raro.chanceBase * (1 + BONUS_RARO_POR_PONTO * pontos) * fator(mods, "chance-raro"));
}

/** Duração da viagem entre locais, com `duracao-viagem` e, entre locais naturais, `duracao-viagem-natural`. */
export function duracaoViagemMs(origemId: string, destinoId: string, mods: readonly Modificador[]): number {
  const base = CATALOGO.locais.has(origemId) && CATALOGO.locais.has(destinoId) ? baseViagem(origemId, destinoId) : 0;
  if (base === 0) return 0;
  const naturais = obter(CATALOGO.locais, origemId).natural && obter(CATALOGO.locais, destinoId).natural;
  const f = fator(mods, "duracao-viagem") * (naturais ? fator(mods, "duracao-viagem-natural") : 1);
  return Math.max(1_000, Math.round(base * f));
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
  readonly itens: Readonly<Record<string, number>>;
  readonly itensPerdidos: number;
  readonly xpOficios: Readonly<Partial<Record<OficioId, number>>>;
  readonly niveisOficio: Readonly<Partial<Record<OficioId, number>>>;
  /** Local onde uma viagem terminou neste avanço. */
  readonly chegouEm: string | null;
}

/** Avança `ms` de um personagem (sem limite: quem chama limita). Usa e avança o `rng`. */
export function avancarPersonagem(p: Personagem, ms: number, rng: Rng, config: ConfigProgressao = CONFIG_PROGRESSAO): ResultadoCiclos {
  const ganhos = ganhosZerados();
  const itens: Record<string, number> = {};
  const xpOficios: Partial<Record<OficioId, number>> = {};
  const niveisOficio: Partial<Record<OficioId, number>> = {};
  const vazio = (personagem: Personagem, chegouEm: string | null): ResultadoCiclos => ({
    personagem,
    ciclos: 0,
    ganhos,
    xp: 0,
    niveisGanhos: 0,
    itens,
    itensPerdidos: 0,
    xpOficios,
    niveisOficio,
    chegouEm,
  });
  let restante = Math.max(0, Math.floor(ms));
  let atual = p;
  let chegouEm: string | null = null;

  // 1. Viagem.
  if (atual.viagem && restante > 0) {
    const usado = Math.min(restante, atual.viagem.restanteMs);
    restante -= usado;
    if (usado === atual.viagem.restanteMs) {
      chegouEm = atual.viagem.destinoLocalId;
      atual = { ...atual, localId: atual.viagem.destinoLocalId, subareaId: atual.viagem.destinoSubareaId, viagem: null };
    } else {
      atual = { ...atual, viagem: { ...atual.viagem, restanteMs: atual.viagem.restanteMs - usado } };
    }
  }
  if (!atual.atividade || atual.viagem || restante <= 0) return vazio(atual, chegouEm);

  // 2. Ciclos.
  const atividade = obter(CATALOGO.atividades, atual.atividade.id);
  const status = { ...atual.status } as Record<StatusId, number>;
  const oficios = { ...atual.oficios } as Record<OficioId, ProgressoOficio>;
  let mochila = atual.mochila;
  let nivel = atual.nivel;
  let xp = atual.xp;
  let progresso = atual.atividade.progressoMs + restante;
  let ciclos = 0;
  let xpTotal = 0;
  let perdidos = 0;

  // Valores que só mudam quando o nível sobe.
  let mods: Modificador[] = [];
  let duracao = 0;
  let capacidade = 0;
  let rendimento = 0;
  let chance = 0;
  const recalcular = () => {
    mods = modificadoresDoPersonagem(atual, nivel);
    const comStatus = { ...atual, status };
    duracao = duracaoCicloMs(comStatus, atividade, mods, config);
    capacidade = capacidadeMochila(status.forca, mods);
    if (atividade.tipo === "coleta") {
      rendimento = rendimentoMedio(comStatus, atividade, mods);
      chance = chanceRaro(comStatus, atividade, mods);
    }
  };
  recalcular();

  while (progresso >= duracao) {
    progresso -= duracao;
    ciclos++;
    if (atividade.tipo === "treino") {
      const s = atividade.status;
      const g = ganhoDeTreino(atual.racaId, s, status[s], nivel, mods, config);
      status[s] += g;
      ganhos[s] += g;
    } else {
      // Quantidade: parte inteira garantida + fração sorteada; depois o achado raro.
      const inteiro = Math.floor(rendimento);
      const q = inteiro + (rng.flutuante() < rendimento - inteiro ? 1 : 0);
      const achou = rng.flutuante() < chance;
      for (const [itemId, quantidade] of [[atividade.itemId, q], [atividade.raro.itemId, achou ? 1 : 0]] as const) {
        const r = adicionarItens(mochila, itemId, quantidade, capacidade);
        mochila = r.mochila;
        perdidos += r.perdidos;
        if (r.aceitos > 0) itens[itemId] = (itens[itemId] ?? 0) + r.aceitos;
      }
      // XP do ofício.
      const o = atividade.oficio;
      const of = oficios[o];
      if (of.nivel < CONFIG_OFICIOS.nivelMaximo) {
        const ganhoXp = atividade.xpOficio * fator(mods, `oficio.${o}.xp`);
        let nivelO = of.nivel;
        let xpO = of.xp + ganhoXp;
        xpOficios[o] = (xpOficios[o] ?? 0) + ganhoXp;
        while (nivelO < CONFIG_OFICIOS.nivelMaximo && xpO >= xpParaProximoNivelOficio(nivelO)) {
          xpO -= xpParaProximoNivelOficio(nivelO);
          nivelO++;
          niveisOficio[o] = (niveisOficio[o] ?? 0) + 1;
        }
        if (nivelO >= CONFIG_OFICIOS.nivelMaximo) xpO = 0;
        oficios[o] = { nivel: nivelO, xp: xpO };
      }
    }
    // XP do personagem.
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
        const novosMods = modificadoresDoPersonagem(atual, nivel);
        // Quem estava abaixo do novo piso sobe até ele; nada passa do teto.
        for (const st of STATUS) {
          const f = faixaStatus(atual.racaId, st, nivel, novosMods, config);
          const novo = Math.min(f.teto, Math.max(f.piso, status[st]));
          ganhos[st] += novo - status[st];
          status[st] = novo;
        }
        recalcular();
      }
    }
  }

  return {
    personagem: { ...atual, nivel, xp, status, oficios, mochila, atividade: { id: atividade.id, progressoMs: progresso } },
    ciclos,
    ganhos,
    xp: xpTotal,
    niveisGanhos: nivel - p.nivel,
    itens,
    itensPerdidos: perdidos,
    xpOficios,
    niveisOficio,
    chegouEm,
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
  readonly itens: Readonly<Record<string, number>>;
  readonly itensPerdidos: number;
  readonly xpOficios: Readonly<Partial<Record<OficioId, number>>>;
  readonly niveisOficio: Readonly<Partial<Record<OficioId, number>>>;
  readonly chegouEm: string | null;
}

/** Resumo sem nada acontecido (útil para a interface e testes). */
export function resumoVazio(atividadeId: string | null = null, nivel = 0): ResumoAvanco {
  return {
    decorridoMs: 0,
    simuladoMs: 0,
    limitado: false,
    atividadeId,
    ciclos: 0,
    ganhos: ganhosZerados(),
    xp: 0,
    nivelInicial: nivel,
    nivelFinal: nivel,
    itens: {},
    itensPerdidos: 0,
    xpOficios: {},
    niveisOficio: {},
    chegouEm: null,
  };
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
  const base: ResumoAvanco = {
    ...resumoVazio(ativo?.atividade?.id ?? null, ativo?.nivel ?? 0),
    decorridoMs: decorrido,
    simuladoMs: simulado,
    limitado: decorrido > LIMITE_OFFLINE_MS,
  };
  if (decorrido === 0) return { estado, resumo: base };
  const novoTick = estado.ultimoTick + decorrido;
  if (!ativo) return { estado: { ...estado, ultimoTick: novoTick }, resumo: base };
  const rng = Rng.deEstado(estado.rng);
  const r = avancarPersonagem(ativo, simulado, rng, config);
  return {
    estado: {
      ...estado,
      rng: rng.estado(),
      ultimoTick: novoTick,
      conta: { ...estado.conta, personagens: estado.conta.personagens.map((p) => (p.id === ativo.id ? r.personagem : p)) },
    },
    resumo: {
      ...base,
      ciclos: r.ciclos,
      ganhos: r.ganhos,
      xp: r.xp,
      nivelFinal: r.personagem.nivel,
      itens: r.itens,
      itensPerdidos: r.itensPerdidos,
      xpOficios: r.xpOficios,
      niveisOficio: r.niveisOficio,
      chegouEm: r.chegouEm,
    },
  };
}
