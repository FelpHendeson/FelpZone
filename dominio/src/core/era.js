// Era ativa. Exporta os dados e constantes da era atual como ligações vivas (`export let`):
// quem importa daqui sempre enxerga a era em uso, e `useEra(id)` troca tudo de uma vez.
import { CIDADE } from '../data/eras/cidade.js';
import { ESCOLA } from '../data/eras/escola.js';
import { BAIRRO } from '../data/eras/bairro.js';

export const ERAS = { escola: ESCOLA, bairro: BAIRRO, cidade: CIDADE };
export const ERA_ORDER = ['escola', 'bairro', 'cidade'];

export let ERA = CIDADE;
export let TYPES, RIVALS, MAP, EDGES, DISTRICTS, POLICE_NODE, POLICE_NODES, ADJ, MAP_W, MAP_H;
export let UPKEEP, ACTIONS_PER_DAY, TRUCE_DAYS, POLICE_RADIUS, HEAT_PER_POINT, HEAT_DRIFT, BRIBE_DAYS;

// mapData: mapa gerado guardado no save (cidade). Sem ele, usa o mapa fixo da era.
export function useEra(id, mapData) {
  ERA = ERAS[id] || CIDADE;
  ({ types: TYPES, rivals: RIVALS } = ERA);
  const m = mapData || ERA.map;
  ({ MAP, EDGES, DISTRICTS, POLICE_NODE } = m);
  POLICE_NODES = m.POLICE_NODES || [POLICE_NODE];
  MAP_W = m.W || 1000; MAP_H = m.H || 680;
  ADJ = MAP.map(() => []);
  EDGES.forEach(([a, b]) => { ADJ[a].push(b); ADJ[b].push(a); });
  const c = ERA.cfg;
  UPKEEP = c.upkeep; ACTIONS_PER_DAY = c.actions; TRUCE_DAYS = c.truceDays; POLICE_RADIUS = c.policeRadius;
  HEAT_PER_POINT = c.heatPerPoint; HEAT_DRIFT = c.heatDrift; BRIBE_DAYS = c.bribeDays;
  return ERA;
}
useEra('cidade');

// Preço na escala da era (a escola mexe com trocados, a cidade com milhares).
export const P = (v) => Math.max(1, Math.round(v * ERA.cfg.price));
// Texto da era com {chaves}.
export const T = (tpl, vars = {}) => tpl.replace(/\{([^}]+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
export const nextEra = (id) => ERA_ORDER[ERA_ORDER.indexOf(id) + 1] || null;
// Mecânicas liberadas na era (construção, armas, eventos).
export const has = (feature) => !!ERA.cfg[feature];
export const eraIndex = (id) => ERA_ORDER.indexOf(id);
// Gangues rivais deste mapa = donos de QG que não são você.
export const mapRivals = () => [...new Set(MAP.filter((m) => m[1] === 'hq' && m[4] !== 'P').map((m) => m[4]))];
