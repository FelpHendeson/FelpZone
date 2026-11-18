import { bonusBestiario, MARCOS_BESTIARIO } from './dados/bestiario';
import { curvaInimigo, mapaPorId, MONSTROS, nivelDaOnda, ONDAS_POR_CHEFE, recompensaOuro, recompensaXp, type Mapa } from './dados/mapas';
import { PERSONAGENS, STATS } from './dados/personagens';
import { gerarItem, guardarItem, PESOS_CHEFE } from './itens';
import { ganharXp, registrar } from './progressao';
import { aleatorio, sortear } from './rng';
import {
  agregadoVazio,
  aplicarPorcentagens,
  copiarAgregado,
  habilidade,
  intervaloAtaque,
  modsDeAura,
  modsProprios,
  NIVEL_MAXIMO_HABILIDADE,
  potenciaHabilidade,
  recargaEfetiva,
  somarMods,
  statsFixos,
  statsZerados,
  XP_HABILIDADE,
  type Agregado,
} from './status';
import type { Combatente, Efeito, Elemento, Escola, Estado, Habilidade, Heroi, Inimigo, Mod, PersonagemId, Stats } from './tipos';

/** Cada passo da simulação vale meio segundo. */
export const DT = 0.5;
const RECUPERACAO_DESCANSO = 0.06;
const CHANCE_MATERIAL = 0.45;
const CHANCE_ITEM = 0.035;
const CHANCE_ESSENCIA = 0.003;

interface PerfilHeroi {
  h: Heroi;
  fixos: Stats;
  mods: Agregado;
}

/** Visão de um lutador num passo: atributos já com buffs e debuffs. */
interface Lutador {
  comb: Combatente;
  stats: Stats;
  ag: Agregado;
  nivel: number;
  chave: string;
  fraqueza: Elemento | null;
  resistencia: Elemento | null;
  heroi?: PerfilHeroi;
  inimigo?: Inimigo;
}

export interface Contexto {
  perfis: Map<PersonagemId, PerfilHeroi>;
}

export function party(e: Estado): Heroi[] {
  return e.herois.filter((h) => h.atividade.tipo === 'batalha');
}

/** Perfis permanentes dos heróis em batalha (recalculados ao subir de nível). */
export function criarContexto(e: Estado): Contexto {
  const ctx: Contexto = { perfis: new Map() };
  const membros = party(e);
  const auras = modsDeAura(e, membros);
  for (const h of membros) {
    ctx.perfis.set(h.id, { h, fixos: statsFixos(h), mods: somarMods(modsProprios(e, h), auras) });
  }
  return ctx;
}

function combatenteNovo(vida: number): Combatente {
  return { vida, escudo: 0, barra: 0, recargas: {}, buffs: [], dots: [], provocando: 0 };
}

function lutadorHeroi(p: PerfilHeroi, comb: Combatente): Lutador {
  const ag = copiarAgregado(p.mods);
  for (const b of comb.buffs) somarMods(ag, b.mods);
  return {
    comb,
    stats: aplicarPorcentagens(p.fixos, ag),
    ag,
    nivel: p.h.nivel,
    chave: `h:${p.h.id}`,
    fraqueza: null,
    resistencia: null,
    heroi: p,
  };
}

const cacheBase = new Map<string, Stats>();

export function statsBaseInimigo(monstro: string, nivel: number, chefe: boolean): Stats {
  const chave = `${monstro}:${nivel}:${chefe}`;
  const pronto = cacheBase.get(chave);
  if (pronto) return pronto;
  const curva = curvaInimigo(nivel);
  const m = MONSTROS[monstro];
  const r = statsZerados();
  for (const s of STATS) r[s] = curva[s] * (m.mult[s] ?? 1);
  if (chefe) {
    r.vida *= 7;
    r.atq *= 1.5;
    r.atqM *= 1.5;
    r.def *= 1.2;
    r.defM *= 1.2;
  }
  cacheBase.set(chave, r);
  return r;
}

function lutadorInimigo(i: Inimigo): Lutador {
  const ag = agregadoVazio();
  for (const b of i.buffs) somarMods(ag, b.mods);
  const m = MONSTROS[i.monstro];
  return {
    comb: i,
    stats: aplicarPorcentagens(statsBaseInimigo(i.monstro, i.nivel, i.chefe), ag),
    ag,
    nivel: i.nivel,
    chave: `i:${i.uid}`,
    fraqueza: m.fraqueza,
    resistencia: m.resistencia,
    inimigo: i,
  };
}

/* ---------- Dano, cura e escudos ---------- */

function visual(e: Estado, alvo: string, valor: number, tipo: 'dano' | 'cura' | 'escudo' | 'critico', elemento: Elemento) {
  e.batalha.visuais.push({ t: e.tempo, alvo, valor: Math.round(valor), tipo, elemento });
}

function causarDano(e: Estado, de: Lutador, alvo: Lutador, mult: number, escola: Escola, elemento: Elemento): number {
  if (alvo.comb.vida <= 0) return 0;
  const atk = escola === 'fisica' ? de.stats.atq : de.stats.atqM;
  const def = escola === 'fisica' ? alvo.stats.def : alvo.stats.defM;
  const k = 50 + 5 * de.nivel;
  let dano = atk * mult * (k / (k + def));
  dano *= 1 + (de.ag.elemento[elemento] ?? 0) / 100;
  if (elemento !== 'neutro' && alvo.fraqueza === elemento) dano *= 1.5;
  if (elemento !== 'neutro' && alvo.resistencia === elemento) dano *= 0.6;
  dano *= Math.max(0.1, 1 + de.ag.danoCausado / 100) * Math.max(0.1, 1 + alvo.ag.danoRecebido / 100);
  // Conhecer a espécie (bestiário) aumenta o dano dos heróis contra ela.
  if (de.heroi && alvo.inimigo) dano *= 1 + bonusBestiario(e, alvo.inimigo.monstro) / 100;
  const critico = aleatorio(e) * 100 < 5 + de.ag.critico;
  if (critico) dano *= 1.5 + de.ag.danoCritico / 100;
  dano = Math.max(1, dano);

  const absorvido = Math.min(alvo.comb.escudo, dano);
  alvo.comb.escudo -= absorvido;
  alvo.comb.vida = Math.max(0, alvo.comb.vida - (dano - absorvido));
  visual(e, alvo.chave, dano, critico ? 'critico' : 'dano', elemento);

  if (de.ag.rouboVida > 0 && de.comb.vida > 0) curar(de, de, (dano * de.ag.rouboVida) / 100);
  if (alvo.ag.espinhos > 0 && de.comb.vida > 0) {
    de.comb.vida = Math.max(0, de.comb.vida - (dano * alvo.ag.espinhos) / 100);
  }
  return dano;
}

function curar(de: Lutador, alvo: Lutador, valor: number): number {
  if (alvo.comb.vida <= 0) return 0;
  const antes = alvo.comb.vida;
  alvo.comb.vida = Math.min(alvo.stats.vida, alvo.comb.vida + valor * (1 + de.ag.cura / 100));
  return alvo.comb.vida - antes;
}

function adicionarBuff(comb: Combatente, id: string, mods: Mod[], duracao: number) {
  const existente = comb.buffs.find((b) => b.id === id);
  if (existente) {
    existente.mods = mods;
    existente.restante = duracao;
  } else comb.buffs.push({ id, mods, restante: duracao });
}

const escalar = (mods: Mod[], fator: number): Mod[] => mods.map((m) => ({ ...m, pct: m.pct * fator }) as Mod);

/* ---------- Habilidades dos heróis ---------- */

function vivos(lista: Lutador[]) {
  return lista.filter((l) => l.comb.vida > 0);
}

function deveLancar(hab: Habilidade, eu: Lutador, aliados: Lutador[], inimigos: Lutador[]): boolean {
  if (vivos(inimigos).length === 0) return false;
  if (hab.tipo === 'transformacao') return !eu.comb.buffs.some((b) => b.id === `transf:${hab.id}`);
  const tem = (t: Efeito['tipo']) => hab.efeitos.some((ef) => ef.tipo === t);
  if (tem('dano') || tem('debuff') || tem('provocar') || tem('dot')) return true;
  const feridos = vivos(aliados).filter((a) => a.comb.vida < a.stats.vida * 0.75);
  if (tem('cura')) return feridos.length > 0;
  if (tem('escudo')) {
    const todos = hab.efeitos.some((ef) => ef.tipo === 'escudo' && ef.todos);
    return todos ? vivos(aliados).some((a) => a.comb.vida < a.stats.vida * 0.9) : eu.comb.vida < eu.stats.vida * 0.9;
  }
  return true;
}

function lancar(e: Estado, hab: Habilidade, eu: Lutador, aliados: Lutador[], inimigos: Lutador[]) {
  const h = eu.heroi!.h;
  const p = potenciaHabilidade(h, hab.id);
  const alvoPrincipal = () => vivos(inimigos)[0];
  const atk = hab.escola === 'fisica' ? eu.stats.atq : eu.stats.atqM;

  if (hab.tipo === 'transformacao' && hab.mods) {
    adicionarBuff(eu.comb, `transf:${hab.id}`, escalar(hab.mods, p), hab.duracao ?? 10);
  }
  for (const ef of hab.efeitos) {
    if (ef.tipo === 'dano') {
      for (let g = 0; g < (ef.golpes ?? 1); g++) {
        const alvos = ef.area ? vivos(inimigos) : [alvoPrincipal()].filter(Boolean);
        for (const a of alvos) causarDano(e, eu, a, ef.mult * p, hab.escola, hab.elemento);
      }
    } else if (ef.tipo === 'dot') {
      const alvos = ef.area ? vivos(inimigos) : [alvoPrincipal()].filter(Boolean);
      const valor = atk * ef.mult * p * (1 + (eu.ag.elemento[hab.elemento] ?? 0) / 100);
      for (const a of alvos) a.comb.dots.push({ valor, restante: ef.duracao, elemento: hab.elemento });
    } else if (ef.tipo === 'cura') {
      const valor = eu.stats[ef.base] * ef.mult * p;
      const alvos = ef.todos
        ? vivos(aliados)
        : [vivos(aliados).sort((a, b) => a.comb.vida / a.stats.vida - b.comb.vida / b.stats.vida)[0]];
      for (const a of alvos) {
        const curado = curar(eu, a, valor);
        if (curado > 0) visual(e, a.chave, curado, 'cura', hab.elemento);
      }
    } else if (ef.tipo === 'escudo') {
      const valor = eu.stats[ef.base] * ef.mult * p;
      for (const a of ef.todos ? vivos(aliados) : [eu]) {
        a.comb.escudo = Math.min(a.stats.vida * 0.8, a.comb.escudo + valor);
        visual(e, a.chave, valor, 'escudo', hab.elemento);
      }
    } else if (ef.tipo === 'buff') {
      for (const a of ef.todos ? vivos(aliados) : [eu]) adicionarBuff(a.comb, hab.id, escalar(ef.mods, p), ef.duracao);
    } else if (ef.tipo === 'debuff') {
      const alvos = ef.area ? vivos(inimigos) : [alvoPrincipal()].filter(Boolean);
      for (const a of alvos) adicionarBuff(a.comb, `${h.id}:${hab.id}`, escalar(ef.mods, p), ef.duracao);
    } else if (ef.tipo === 'provocar') {
      eu.comb.provocando = ef.duracao;
    }
  }

  // A habilidade evolui com o uso.
  const aprendida = h.habilidades.find((x) => x.id === hab.id);
  if (aprendida && aprendida.nivel < NIVEL_MAXIMO_HABILIDADE) {
    aprendida.xp += 1;
    if (aprendida.xp >= XP_HABILIDADE(aprendida.nivel)) {
      aprendida.xp = 0;
      aprendida.nivel += 1;
    }
  }
  e.batalha.lancadas.push({ t: e.tempo, heroi: h.id, habilidade: hab.id });
}

/* ---------- Ondas ---------- */

function gerarOnda(e: Estado, mapa: Mapa) {
  const b = e.batalha;
  const chefe = b.onda % ONDAS_POR_CHEFE === 0;
  const quantidade = chefe ? 1 : 1 + Math.floor(aleatorio(e) * mapa.maxInimigos);
  const nivel = nivelDaOnda(mapa, b.onda);
  b.inimigos = [];
  for (let i = 0; i < quantidade; i++) {
    const monstro = sortear(e, mapa.monstros);
    b.proximoUid += 1;
    b.inimigos.push({
      ...combatenteNovo(statsBaseInimigo(monstro, nivel, chefe).vida),
      barra: aleatorio(e) * 0.3,
      uid: b.proximoUid,
      monstro,
      nivel,
      chefe,
    });
  }
}

function recompensar(e: Estado, ctx: Contexto, mapa: Mapa, i: Inimigo) {
  const membros = [...ctx.perfis.values()];
  const soma = (campo: 'ouro' | 'saque') => membros.reduce((s, p) => s + p.mods[campo], 0);
  const mult = i.chefe ? 6 : 1;
  e.estatisticas.abates += 1;
  if (i.chefe) e.estatisticas.chefes += 1;
  const ficha = (e.estatisticas.bestiario[i.monstro] ??= { abates: 0, chefes: 0 });
  ficha.abates += 1;
  if (i.chefe) ficha.chefes += 1;
  if (MARCOS_BESTIARIO.some((m) => m.abates === ficha.abates)) {
    registrar(e, { tipo: 'bestiario', monstro: i.monstro, abates: ficha.abates });
  }
  e.ouro += recompensaOuro(i.nivel) * mult * (i.chefe ? 1.5 : 1) * (1 + soma('ouro') / 100);
  const saque = 1 + soma('saque') / 100;
  if (aleatorio(e) < CHANCE_MATERIAL * saque || i.chefe) e.materiais[mapa.material] += i.chefe ? 6 : 1;
  if (aleatorio(e) < (i.chefe ? 0.25 : CHANCE_ESSENCIA * saque)) e.materiais.essencia += 1;
  if (i.chefe || aleatorio(e) < CHANCE_ITEM * saque) {
    const reliquia = i.chefe && aleatorio(e) < 0.12;
    const item = gerarItem(e, {
      nivel: i.nivel,
      pesos: i.chefe ? PESOS_CHEFE : undefined,
      conjunto: mapa.conjunto,
      reliquia,
    });
    if (guardarItem(e, item) && (item.raridade !== 'comum' && item.raridade !== 'incomum')) {
      registrar(e, { tipo: 'drop', item });
    }
  }
  for (const p of membros) {
    const subiu = ganharXp(e, p.h, recompensaXp(i.nivel) * mult * (1 + p.mods.xp / 100));
    if (subiu) {
      // Recalcula o perfil com o novo nível e cura o herói.
      const novo = criarContexto(e).perfis.get(p.h.id);
      if (novo) {
        ctx.perfis.set(p.h.id, novo);
        const comb = e.batalha.herois[p.h.id];
        if (comb) comb.vida = lutadorHeroi(novo, comb).stats.vida;
      }
    }
  }
}

/* ---------- Passo ---------- */

function atualizarTempos(l: Lutador, dt: number) {
  const c = l.comb;
  c.buffs = c.buffs.filter((b) => (b.restante -= dt) > 0);
  c.provocando = Math.max(0, c.provocando - dt);
  for (const k of Object.keys(c.recargas)) c.recargas[k] = Math.max(0, c.recargas[k] - dt);
  if (c.vida <= 0) return;
  for (const d of c.dots) {
    c.vida = Math.max(0, c.vida - d.valor * dt);
    d.restante -= dt;
  }
  c.dots = c.dots.filter((d) => d.restante > 0);
  if (l.ag.regen > 0 && c.vida > 0) c.vida = Math.min(l.stats.vida, c.vida + (l.stats.vida * l.ag.regen * dt) / 100);
}

function ameaca(l: Lutador): number {
  const base = PERSONAGENS[l.heroi!.h.id].ameaca * (1 + l.ag.ameaca / 100);
  return base * (l.comb.provocando > 0 ? 20 : 1);
}

export function passo(e: Estado, ctx: Contexto): void {
  const b = e.batalha;
  e.tempo += DT;
  b.visuais = b.visuais.filter((v) => v.t > e.tempo - 1.5).slice(-40);
  b.lancadas = b.lancadas.filter((l) => l.t > e.tempo - 2.5).slice(-8);

  if (ctx.perfis.size === 0) return;
  const mapa = mapaPorId(b.mapa);

  for (const [id, p] of ctx.perfis) {
    if (!b.herois[id]) b.herois[id] = combatenteNovo(lutadorHeroi(p, combatenteNovo(1)).stats.vida);
  }
  const herois = [...ctx.perfis.values()].map((p) => lutadorHeroi(p, b.herois[p.h.id]!));

  if (b.situacao === 'descansando') {
    for (const l of herois) {
      l.comb.buffs = [];
      l.comb.dots = [];
      l.comb.vida = Math.min(l.stats.vida, l.comb.vida + l.stats.vida * RECUPERACAO_DESCANSO * DT);
    }
    if (herois.every((l) => l.comb.vida >= l.stats.vida)) b.situacao = 'lutando';
    return;
  }

  if (b.inimigos.length === 0) gerarOnda(e, mapa);
  let inimigos = b.inimigos.map(lutadorInimigo);

  for (const l of [...herois, ...inimigos]) atualizarTempos(l, DT);

  // Heróis: no máximo uma habilidade por passo, além dos ataques básicos.
  for (const eu of herois) {
    if (eu.comb.vida <= 0) continue;
    const h = eu.heroi!.h;
    for (const id of h.equipadas) {
      const hab = habilidade(e, id);
      if (!hab || hab.tipo === 'passiva' || (eu.comb.recargas[id] ?? 0) > 0) continue;
      if (!deveLancar(hab, eu, herois, inimigos)) continue;
      lancar(e, hab, eu, herois, inimigos);
      eu.comb.recargas[id] = recargaEfetiva(hab, eu.stats, eu.ag, h.habilidades.find((x) => x.id === id)?.nivel ?? 1);
      break;
    }
    eu.comb.barra += DT / intervaloAtaque(eu.stats.vel);
    while (eu.comb.barra >= 1) {
      eu.comb.barra -= 1;
      const alvo = vivos(inimigos)[0];
      if (!alvo) break;
      const transf = eu.comb.buffs.find((x) => x.id.startsWith('transf:'));
      const elemento = transf ? (habilidade(e, transf.id.slice(7))?.elemento ?? 'neutro') : 'neutro';
      causarDano(e, eu, alvo, 1, PERSONAGENS[h.id].escolaBasica, elemento);
    }
  }

  // Inimigos: atacam quem chama mais atenção; alguns atingem a party toda.
  for (const ini of inimigos) {
    if (ini.comb.vida <= 0) continue;
    const m = MONSTROS[ini.inimigo!.monstro];
    ini.comb.barra += DT / intervaloAtaque(ini.stats.vel);
    while (ini.comb.barra >= 1) {
      ini.comb.barra -= 1;
      const alvos = vivos(herois);
      if (alvos.length === 0) break;
      const golpes = ini.inimigo!.chefe ? ((ini.comb.recargas.golpes = (ini.comb.recargas.golpes ?? 0) + 1) % 3 === 0) : false;
      if (m.area || golpes) {
        for (const a of alvos) causarDano(e, ini, a, golpes ? 0.9 : 0.6, m.escola, m.elemento);
      } else {
        const alvo = alvos.reduce((melhor, a) => (ameaca(a) > ameaca(melhor) ? a : melhor));
        causarDano(e, ini, alvo, 1, m.escola, m.elemento);
      }
    }
  }

  // Mortos: recompensas e limpeza.
  for (const ini of inimigos) if (ini.comb.vida <= 0) recompensar(e, ctx, mapa, ini.inimigo!);
  b.inimigos = b.inimigos.filter((i) => i.vida > 0);
  inimigos = inimigos.filter((i) => i.comb.vida > 0);
  for (const l of herois) {
    if (l.comb.vida <= 0) {
      l.comb.buffs = [];
      l.comb.dots = [];
      l.comb.escudo = 0;
      l.comb.provocando = 0;
    }
  }

  if (b.inimigos.length === 0) {
    if (b.onda % ONDAS_POR_CHEFE === 0) registrar(e, { tipo: 'chefe', mapa: mapa.id, onda: b.onda });
    e.estatisticas.maiorOnda[mapa.id] = Math.max(e.estatisticas.maiorOnda[mapa.id] ?? 0, b.onda);
    b.onda += 1;
    for (const p of ctx.perfis.values()) {
      const l = lutadorHeroi(p, b.herois[p.h.id]!);
      l.comb.vida = l.comb.vida <= 0 ? l.stats.vida * 0.3 : Math.min(l.stats.vida, l.comb.vida + l.stats.vida * 0.15);
    }
  } else if (herois.every((l) => l.comb.vida <= 0)) {
    b.situacao = 'descansando';
    b.inimigos = [];
    const ultima = [...e.diario].reverse().find((r) => r.evento.tipo === 'derrota');
    if (!ultima || e.tempo - ultima.t > 600) registrar(e, { tipo: 'derrota', mapa: mapa.id });
  }
}

/** Vida máxima de um herói em batalha agora (para a interface). */
export function vidaMaximaEmBatalha(ctx: Contexto, id: PersonagemId): number {
  const p = ctx.perfis.get(id);
  return p ? lutadorHeroi(p, combatenteNovo(1)).stats.vida : 1;
}

export function vidaMaximaInimigo(i: Inimigo): number {
  return statsBaseInimigo(i.monstro, i.nivel, i.chefe).vida;
}
