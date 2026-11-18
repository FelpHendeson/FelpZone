import { MAPAS } from './dados/mapas';
import { PONTOS_POR_NIVEL, xpParaProximo } from './dados/personagens';
import type { Estado, Evento, Heroi } from './tipos';

export const TAMANHO_DIARIO = 60;
export const NIVEL_MAXIMO = 60;

export function registrar(e: Estado, evento: Evento): void {
  e.diario.push({ t: e.tempo, evento });
  if (e.diario.length > TAMANHO_DIARIO) e.diario.splice(0, e.diario.length - TAMANHO_DIARIO);
}

/** Soma XP e sobe de nível; devolve quantos níveis subiu. */
export function ganharXp(e: Estado, h: Heroi, xp: number): number {
  if (h.nivel >= NIVEL_MAXIMO) return 0;
  h.xp += xp;
  let subiu = 0;
  while (h.nivel < NIVEL_MAXIMO && h.xp >= xpParaProximo(h.nivel)) {
    h.xp -= xpParaProximo(h.nivel);
    h.nivel += 1;
    h.pontosLivres += PONTOS_POR_NIVEL;
    h.pontosHabilidade += 1;
    subiu += 1;
    registrar(e, { tipo: 'subiuNivel', heroi: h.id, nivel: h.nivel });
  }
  if (h.nivel >= NIVEL_MAXIMO) h.xp = 0;
  if (subiu) liberarMapas(e);
  return subiu;
}

/** Os mapas abrem pelo nível do Sir LionHearth, o líder da party. */
export function liberarMapas(e: Estado): void {
  const lider = e.herois.find((h) => h.id === 'leao');
  const nivel = lider?.nivel ?? 1;
  for (const m of MAPAS) {
    if (!e.mapasLiberados.includes(m.id) && nivel >= m.nivelMinimo) {
      e.mapasLiberados.push(m.id);
      registrar(e, { tipo: 'mapaLiberado', mapa: m.id });
    }
  }
}
