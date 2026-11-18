import { noDaArvore } from './dados/arvores';
import { HABILIDADES } from './dados/habilidades';
import { BASES, CONJUNTOS, DADOS_RARIDADE } from './dados/itens';
import { PERSONAGENS, STATS, VALOR_PONTO } from './dados/personagens';
import type { Elemento, Estado, Habilidade, Heroi, Item, Mod, Stat, Stats } from './tipos';

export interface Agregado {
  stat: Stats;
  danoCausado: number;
  danoRecebido: number;
  elemento: Partial<Record<Elemento, number>>;
  critico: number;
  danoCritico: number;
  rouboVida: number;
  regen: number;
  recarga: number;
  ameaca: number;
  espinhos: number;
  cura: number;
  xp: number;
  ouro: number;
  saque: number;
}

export const statsZerados = (): Stats => ({ vida: 0, atq: 0, def: 0, vel: 0, atqM: 0, defM: 0, velM: 0 });

export function agregadoVazio(): Agregado {
  return {
    stat: statsZerados(),
    danoCausado: 0,
    danoRecebido: 0,
    elemento: {},
    critico: 0,
    danoCritico: 0,
    rouboVida: 0,
    regen: 0,
    recarga: 0,
    ameaca: 0,
    espinhos: 0,
    cura: 0,
    xp: 0,
    ouro: 0,
    saque: 0,
  };
}

export function somarMods(ag: Agregado, mods: readonly Mod[], fator = 1): Agregado {
  for (const m of mods) {
    if (m.tipo === 'stat') ag.stat[m.stat] += m.pct * fator;
    else if (m.tipo === 'elemento') ag.elemento[m.elemento] = (ag.elemento[m.elemento] ?? 0) + m.pct * fator;
    else ag[m.tipo] += m.pct * fator;
  }
  return ag;
}

export function copiarAgregado(a: Agregado): Agregado {
  return { ...a, stat: { ...a.stat }, elemento: { ...a.elemento } };
}

/** Definição de uma habilidade: fixa ou criada no Jardim. */
export function habilidade(e: Estado, id: string): Habilidade | undefined {
  return HABILIDADES[id] ?? e.criadas[id];
}

/* ---------- Itens ---------- */

export function fatorNivelItem(nivel: number): number {
  return 1 + 0.13 * (nivel - 1);
}

/** Atributos fixos que o item dá (afixos são percentuais e vão em `modsDoItem`). */
export function statsDoItem(item: Item): Partial<Stats> {
  const base = BASES[item.base];
  if (!base) return {};
  const fator = fatorNivelItem(item.nivel) * DADOS_RARIDADE[item.raridade].mult * (1 + 0.08 * item.melhoria) * (item.conjunto ? 1.1 : 1);
  const r: Partial<Stats> = {};
  for (const [s, v] of Object.entries(base.stats) as [Stat, number][]) r[s] = Math.round(v * fator * 10) / 10;
  return r;
}

export function modsDoItem(item: Item): Mod[] {
  const base = BASES[item.base];
  const mods: Mod[] = item.afixos.map((a) => ({ tipo: 'stat', stat: a.stat, pct: a.pct }));
  if (base?.mods) {
    // Relíquias: a raridade e as melhorias fortalecem as passivas.
    const forca = DADOS_RARIDADE[item.raridade].mult * (1 + 0.05 * item.melhoria);
    for (const m of base.mods) mods.push({ ...m, pct: Math.round(m.pct * forca * 10) / 10 } as Mod);
  }
  return mods;
}

/** Peças de cada conjunto que o herói está usando. */
export function pecasDeConjunto(h: Heroi): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const item of Object.values(h.equipamento)) {
    if (item?.conjunto) contagem[item.conjunto] = (contagem[item.conjunto] ?? 0) + 1;
  }
  return contagem;
}

/* ---------- Heróis ---------- */

/** Atributos sem porcentagens: base, crescimento, pontos e equipamento. */
export function statsFixos(h: Heroi): Stats {
  const p = PERSONAGENS[h.id];
  const r = statsZerados();
  for (const s of STATS) r[s] = p.base[s] + p.crescimento[s] * (h.nivel - 1) + h.pontos[s] * VALOR_PONTO[s];
  for (const item of Object.values(h.equipamento)) {
    if (!item) continue;
    for (const [s, v] of Object.entries(statsDoItem(item)) as [Stat, number][]) r[s] += v;
  }
  return r;
}

/** Passivas equipadas do herói (inclui as auras dele). */
export function passivasEquipadas(e: Estado, h: Heroi): Habilidade[] {
  return h.equipadas.map((id) => habilidade(e, id)).filter((x): x is Habilidade => !!x && x.tipo === 'passiva');
}

/** Modificadores permanentes do próprio herói (sem auras de aliados e sem buffs). */
export function modsProprios(e: Estado, h: Heroi): Agregado {
  const ag = agregadoVazio();
  for (const id of h.nos) {
    const no = noDaArvore(h.id, id);
    if (no?.mods) somarMods(ag, no.mods);
  }
  for (const hab of passivasEquipadas(e, h)) {
    if (!hab.aura && hab.mods) somarMods(ag, hab.mods, potenciaHabilidade(h, hab.id));
  }
  for (const item of Object.values(h.equipamento)) if (item) somarMods(ag, modsDoItem(item));
  for (const [conj, pecas] of Object.entries(pecasDeConjunto(h))) {
    for (const b of CONJUNTOS[conj]?.bonus ?? []) if (pecas >= b.pecas) somarMods(ag, b.mods);
  }
  return ag;
}

/** Auras: passivas de party equipadas por quem está em batalha. */
export function modsDeAura(e: Estado, party: Heroi[]): Mod[] {
  const mods: Mod[] = [];
  for (const h of party) {
    for (const hab of passivasEquipadas(e, h)) {
      if (hab.aura && hab.mods) {
        const p = potenciaHabilidade(h, hab.id);
        for (const m of hab.mods) mods.push({ ...m, pct: m.pct * p } as Mod);
      }
    }
  }
  return mods;
}

export function aplicarPorcentagens(fixos: Stats, ag: Agregado): Stats {
  const r = statsZerados();
  for (const s of STATS) r[s] = Math.max(0, fixos[s] * (1 + ag.stat[s] / 100));
  return r;
}

/** Atributos finais fora de combate (com auras da party em batalha), para a ficha. */
export function statsDoHeroi(e: Estado, h: Heroi): { stats: Stats; mods: Agregado } {
  const party = e.herois.filter((x) => x.atividade.tipo === 'batalha');
  const mods = modsProprios(e, h);
  if (h.atividade.tipo === 'batalha') somarMods(mods, modsDeAura(e, party));
  return { stats: aplicarPorcentagens(statsFixos(h), mods), mods };
}

/* ---------- Habilidades ---------- */

export function nivelHabilidade(h: Heroi, id: string): number {
  return h.habilidades.find((x) => x.id === id)?.nivel ?? 1;
}

/** Cada nível da habilidade soma 6% de potência. */
export function potenciaHabilidade(h: Heroi, id: string): number {
  return 1 + 0.06 * (nivelHabilidade(h, id) - 1);
}

export const XP_HABILIDADE = (nivel: number) => 6 + nivel * 4;
export const NIVEL_MAXIMO_HABILIDADE = 10;

/** Recarga efetiva: velocidade da escola, nível da habilidade e reduções. */
export function recargaEfetiva(hab: Habilidade, stats: Stats, mods: Agregado, nivel: number): number {
  const vel = hab.escola === 'fisica' ? stats.vel : stats.velM;
  const reducao = Math.min(50, mods.recarga + 2 * (nivel - 1));
  return Math.max(1, hab.recarga * (40 / (40 + vel)) * (1 - reducao / 100) * 1.6);
}

/** Segundos entre ataques básicos. */
export function intervaloAtaque(vel: number): number {
  return Math.max(0.35, 2 * (30 / (30 + vel)));
}
