import { ARMAS, CLASSES, LIMITE_VIDA_DESCANSO, RECUPERACAO_VIDA, ZONAS, type Monstro } from './dados';
import type { Estado, Heroi } from './tipos';

/** XP necessária para passar do nível informado ao seguinte. */
export function xpParaProximo(nivel: number): number {
  return Math.round(30 * Math.pow(1.5, nivel - 1));
}

export function vidaMaxima(h: Heroi): number {
  return 30 + h.atributos.vigor * 8 + h.nivel * 4 + CLASSES[h.classe].vidaExtra;
}

export function ataque(h: Heroi): number {
  const arma = ARMAS[h.arma];
  const bonusArma = arma.ataque * (arma.afinidade === h.classe ? 1.5 : 1);
  return 2 + h.atributos[CLASSES[h.classe].primario] * 2 + h.nivel + bonusArma;
}

/** Rendimento entre 50% (exausto) e 100% (descansado). */
export function eficiencia(h: Heroi): number {
  return 1 - h.fadiga / 200;
}

/** Fração do dano do monstro que passa pela defesa. */
export function fatorDefesa(h: Heroi): number {
  return 30 / (30 + h.atributos.vigor * 3);
}

export function danoRecebidoPorSegundo(h: Heroi, m: Monstro): number {
  return m.ataque * fatorDefesa(h);
}

export function bonusXp(h: Heroi): number {
  return 1 + h.atributos.mente * 0.03;
}

export function bonusSaque(h: Heroi): number {
  return 1 + h.atributos.destreza * 0.03;
}

export function mineracaoPorSegundo(h: Heroi): number {
  return 0.05 + h.atributos.forca * 0.015;
}

/** Multiplicador do ganho de fadiga; vigor reduz o desgaste. */
export function fatorFadiga(h: Heroi): number {
  return 20 / (20 + h.atributos.vigor);
}

export function maiorNivel(e: Estado): number {
  return e.herois.reduce((m, h) => Math.max(m, h.nivel), 1);
}

/**
 * Estimativas por minuto para a interface ajudar nas decisões. Considera as
 * pausas: lutar até o limite de vida e recuperar uma fração por segundo.
 */
export function estimativaCaca(h: Heroi, zona: keyof typeof ZONAS) {
  const m = ZONAS[zona].monstro;
  const dano = danoRecebidoPorSegundo(h, m);
  /** Segundos até a vida acabar, partindo de vida cheia. */
  const segundosDeFolego = dano > 0 ? vidaMaxima(h) / dano : Infinity;
  const fracaoGasta = 1 - LIMITE_VIDA_DESCANSO;
  const lutando = segundosDeFolego * fracaoGasta;
  const descansando = fracaoGasta / RECUPERACAO_VIDA;
  /** Fração do tempo em combate, descontadas as pausas para descansar. */
  const tempoAtivo = Number.isFinite(lutando) ? lutando / (lutando + descansando) : 1;
  const abatesPorSegundo = ((ataque(h) * eficiencia(h)) / m.vida) * tempoAtivo;
  return {
    xpPorMinuto: abatesPorSegundo * m.xp * bonusXp(h) * 60,
    ouroPorMinuto: abatesPorSegundo * m.ouro * 60,
    saquePorMinuto: abatesPorSegundo * m.chanceSaque * bonusSaque(h) * 60,
    segundosDeFolego,
    tempoAtivo,
  };
}
