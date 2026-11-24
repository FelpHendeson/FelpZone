/**
 * Habilidades do personagem (GDD §6.4, §12): maestria, evolução, slots e os
 * modificadores das passivas. Números em `CONFIG_HABILIDADES` [Calibrar].
 */
import { CATALOGO, obter } from "../dados";
import type { Habilidade } from "../dados/habilidades";
import type { Modificador } from "../modificadores";

export const CONFIG_HABILIDADES = Object.freeze({
  maestriaMaxima: 30,
  /** XP para ir da maestria M a M+1 = round(xpBase × M^xpExpoente). */
  xpBase: 20,
  xpExpoente: 1.4,
  /** Cada nível de maestria acima do 1 soma +2% ao efeito. */
  bonusPorMaestria: 0.02,
  /** Estágios de evolução: II na maestria 10, III na 25. */
  estagios: [
    { maestria: 25, estagio: 3, fator: 1.5 },
    { maestria: 10, estagio: 2, fator: 1.25 },
  ],
  /** XP de maestria por uso: ativa disparada / passiva em ação (ciclo ou abate). */
  xpPorUsoAtiva: 2,
  xpPorUsoPassiva: 1,
  slotsAtivas: 5,
  slotsPassivasBase: 3,
  /** +1 slot de passiva a cada N níveis do personagem. */
  niveisPorSlotPassiva: 10,
  /** Nível do personagem para escolher o ramo do core. */
  nivelRamo: 10,
});

export interface ProgressoHabilidade {
  readonly maestria: number;
  readonly xp: number;
}

export type Habilidades = Readonly<Record<string, ProgressoHabilidade>>;

/** O que o personagem sabe e o que tem equipado. */
export interface BaseHabilidades {
  readonly nivel: number;
  readonly habilidades: Habilidades;
  readonly ativasEquipadas: readonly string[];
  readonly passivasEquipadas: readonly string[];
}

export function xpParaProximaMaestria(maestria: number): number {
  const c = CONFIG_HABILIDADES;
  if (maestria >= c.maestriaMaxima) return 0;
  return Math.round(c.xpBase * maestria ** c.xpExpoente);
}

/** Estágio de evolução (1, 2 ou 3) pela maestria. */
export function estagio(maestria: number): 1 | 2 | 3 {
  for (const e of CONFIG_HABILIDADES.estagios) if (maestria >= e.maestria) return e.estagio as 2 | 3;
  return 1;
}

const ROMANO = ["", "I", "II", "III"] as const;

/** Nome com o estágio (ex.: "Punho em Brasa II"). */
export function nomeComEstagio(h: Habilidade, maestria: number): string {
  const e = estagio(maestria);
  return e === 1 ? h.nome : `${h.nome} ${ROMANO[e]}`;
}

/** Multiplicador do efeito pela maestria e pela evolução. */
export function fatorMaestria(maestria: number): number {
  const c = CONFIG_HABILIDADES;
  const e = c.estagios.find((x) => maestria >= x.maestria);
  return (1 + c.bonusPorMaestria * (maestria - 1)) * (e ? e.fator : 1);
}

/** Slots de passiva: base + 1 a cada 10 níveis + bônus de habilidades conhecidas (Folha em Branco). */
export function slotsPassivas(p: Pick<BaseHabilidades, "nivel" | "habilidades">): number {
  const c = CONFIG_HABILIDADES;
  let extra = 0;
  for (const id of Object.keys(p.habilidades)) {
    for (const m of CATALOGO.habilidades.get(id)?.passiva?.modificadores ?? []) if (m.alvo === "slots-passivas") extra += m.valor;
  }
  return c.slotsPassivasBase + Math.floor(p.nivel / c.niveisPorSlotPassiva) + extra;
}

/** Modificadores de uma passiva na maestria dada (sem a condição de aura). */
export function modificadoresDaPassiva(h: Habilidade, maestria: number): Modificador[] {
  const f = fatorMaestria(maestria);
  return (h.passiva?.modificadores ?? []).map((m) => ({ alvo: m.alvo, operacao: m.operacao, valor: m.valor * f, origem: { tipo: "habilidade" as const, id: h.id } }));
}

/**
 * Modificadores das passivas equipadas. Auras só entram quando `vida` (fração)
 * está abaixo do limite; sem `vida`, auras ficam de fora.
 */
export function modificadoresDeHabilidades(p: Partial<BaseHabilidades>, vida?: number): Modificador[] {
  const lista: Modificador[] = [];
  for (const id of p.passivasEquipadas ?? []) {
    const h = obter(CATALOGO.habilidades, id);
    const aura = h.passiva?.auraVidaAbaixo;
    if (aura !== undefined && (vida === undefined || vida >= aura)) continue;
    lista.push(...modificadoresDaPassiva(h, p.habilidades?.[id]?.maestria ?? 1));
  }
  return lista;
}

/** Aplica XP de maestria (com o modificador `xp-maestria`); devolve quantos níveis subiu. Altera `mapa`. */
export function ganharMaestria(mapa: Record<string, ProgressoHabilidade>, id: string, xp: number): number {
  const atual = mapa[id];
  if (!atual || atual.maestria >= CONFIG_HABILIDADES.maestriaMaxima || xp <= 0) return 0;
  let m = atual.maestria;
  let x = atual.xp + xp;
  let subiu = 0;
  while (m < CONFIG_HABILIDADES.maestriaMaxima && x >= xpParaProximaMaestria(m)) {
    x -= xpParaProximaMaestria(m);
    m++;
    subiu++;
  }
  if (m >= CONFIG_HABILIDADES.maestriaMaxima) x = 0;
  mapa[id] = { maestria: m, xp: x };
  return subiu;
}

/** Técnicas que o core ensina de saída (as escritas na F1). */
export function tecnicasDoCore(coreId: string): Habilidade[] {
  return obter(CATALOGO.cores, coreId).tecnicas.map((t) => obter(CATALOGO.habilidades, t.id));
}

/**
 * Maestria por uso das passivas equipadas cujo escopo está em `escopos`.
 * Soma em `acumulado` os níveis ganhos; devolve `true` se algum subiu.
 */
export function praticarPassivas(
  mapa: Record<string, ProgressoHabilidade>,
  passivas: readonly string[],
  escopos: readonly string[],
  multiplicadorXp: number,
  acumulado: Record<string, number>,
): boolean {
  let subiu = false;
  for (const id of passivas) {
    const h = CATALOGO.habilidades.get(id);
    if (!h || h.pendente || !escopos.includes(h.escopo)) continue;
    const n = ganharMaestria(mapa, id, CONFIG_HABILIDADES.xpPorUsoPassiva * multiplicadorXp);
    if (n > 0) {
      acumulado[id] = (acumulado[id] ?? 0) + n;
      subiu = true;
    }
  }
  return subiu;
}
