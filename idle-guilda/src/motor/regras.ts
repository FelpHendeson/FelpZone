import { ARMAS, CLASSES } from './dados';
import type { Classe, Estado, Heroi } from './tipos';

/** XP necessária para passar do nível informado ao seguinte. */
export function xpParaProximo(nivel: number): number {
  return Math.round(30 * Math.pow(1.6, nivel - 1));
}

export function vidaMaxima(h: Heroi): number {
  return 30 + h.atributos.vigor * 10 + h.nivel * 5 + CLASSES[h.classe].vidaExtra;
}

export function bonusArma(h: Heroi): number {
  const arma = ARMAS[h.arma];
  return arma.ataque * (arma.afinidade === h.classe ? 1.5 : 1);
}

/** Força bruta do herói, base para dano e cura. */
function potencia(h: Heroi): number {
  return 2 + h.atributos.poder * 2 + h.nivel + bonusArma(h);
}

/** Dano por segundo causado ao monstro. */
export function dano(h: Heroi): number {
  return potencia(h) * CLASSES[h.classe].fatorDano;
}

/** Vida curada por segundo (só a Mística cura). */
export function cura(h: Heroi): number {
  return CLASSES[h.classe].papel === 'cura' ? potencia(h) * 0.1 : 0;
}

/** Fração do dano do monstro que passa pela defesa. */
export function fatorDefesa(h: Heroi): number {
  return 30 / (30 + h.atributos.vigor * 3);
}

export function temClasse(e: Estado, classe: Classe): boolean {
  return e.herois.some((h) => h.classe === classe);
}

export function maiorNivel(e: Estado): number {
  return e.herois.reduce((m, h) => Math.max(m, h.nivel), 1);
}

export function danoDaParty(e: Estado): number {
  return e.herois.reduce((s, h) => s + dano(h), 0);
}
