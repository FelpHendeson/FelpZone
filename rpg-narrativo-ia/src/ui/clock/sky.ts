import { MINUTES_PER_DAY } from '../../modules/time';

/**
 * Paleta do céu por minuto do dia, em gradiente contínuo entre paradas: madrugada escura,
 * alvorecer rosado, manhã azul clara, meio-dia azul vivo, tarde dourada, entardecer
 * laranja/púrpura e noite índigo. Só exibição: não afeta regra nenhuma.
 */
interface SkyStop {
  at: number;
  top: string;
  bottom: string;
}

const STOPS: readonly SkyStop[] = [
  { at: 0, top: '#070b1a', bottom: '#141b36' },
  { at: 4 * 60 + 30, top: '#1b1a3c', bottom: '#3e2b4f' },
  { at: 5 * 60 + 30, top: '#e48f86', bottom: '#f5c08a' },
  { at: 8 * 60, top: '#78b2e2', bottom: '#bfe0f4' },
  { at: 12 * 60, top: '#3a8ee0', bottom: '#8dc8f2' },
  { at: 15 * 60, top: '#d9a443', bottom: '#f2d38a' },
  { at: 18 * 60, top: '#d4623a', bottom: '#7a3d8e' },
  { at: 20 * 60, top: '#1e2150', bottom: '#2c2156' },
  { at: MINUTES_PER_DAY, top: '#070b1a', bottom: '#141b36' },
];

export interface SkyColors {
  top: string;
  bottom: string;
  /** Céu escuro: estrelas discretas e brilho frio. */
  night: boolean;
}

export function skyAt(minuteOfDay: number): SkyColors {
  const minute = ((Math.round(minuteOfDay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  let index = 0;
  while (index < STOPS.length - 2 && STOPS[index + 1]!.at <= minute) index += 1;
  const from = STOPS[index]!;
  const to = STOPS[index + 1]!;
  const t = (minute - from.at) / (to.at - from.at);
  return {
    top: mix(from.top, to.top, t),
    bottom: mix(from.bottom, to.bottom, t),
    night: minute < 5 * 60 || minute >= 19 * 60 + 30,
  };
}

function mix(left: string, right: string, t: number): string {
  const a = parse(left);
  const b = parse(right);
  const channel = (index: number) => Math.round(a[index]! + (b[index]! - a[index]!) * t);
  return `#${[0, 1, 2].map((index) => channel(index).toString(16).padStart(2, '0')).join('')}`;
}

function parse(hex: string): number[] {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}
