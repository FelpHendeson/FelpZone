/**
 * Miniatura de perfil gerada por código: SVG simples e determinístico que
 * varia com raça (pele e traço), core (fundo e emblema) e as cores escolhidas.
 * Devolve texto SVG para servir à web e, depois, ao mobile.
 */
import { CATALOGO, obter } from "../dados";
import type { SimboloCore, TracoVisual } from "../dados/tipos";

export interface ParametrosMiniatura {
  readonly racaId: string;
  readonly coreId: string;
  readonly corCabeloId: string;
  readonly corRoupaId: string;
}

const TRACOS: Readonly<Record<TracoVisual, (pele: string, cabelo: string) => string>> = {
  nenhum: () => "",
  barba: (_p, c) => `<path d="M22 38 Q32 54 42 38 L42 42 Q32 58 22 42 Z" fill="${c}"/>`,
  "orelhas-pontudas": (p) => `<path d="M19 30 L11 22 L21 34 Z" fill="${p}"/><path d="M45 30 L53 22 L43 34 Z" fill="${p}"/>`,
  presas: () => `<path d="M27 41 L28 45 L29 41 Z" fill="#f4f0e0"/><path d="M35 41 L36 45 L37 41 Z" fill="#f4f0e0"/>`,
  "orelhas-de-lobo": (_p, c) => `<path d="M20 22 L18 8 L28 17 Z" fill="${c}"/><path d="M44 22 L46 8 L36 17 Z" fill="${c}"/>`,
  caninos: () => `<path d="M29 40 L30 43 L31 40 Z" fill="#fff"/><path d="M33 40 L34 43 L35 40 Z" fill="#fff"/>`,
  chifres: () => `<path d="M23 20 Q16 10 20 4 Q22 12 27 17 Z" fill="#e6d6b0"/><path d="M41 20 Q48 10 44 4 Q42 12 37 17 Z" fill="#e6d6b0"/>`,
  antenas: (_p, c) => `<path d="M28 16 Q24 6 20 5" stroke="${c}" stroke-width="1.5" fill="none"/><path d="M36 16 Q40 6 44 5" stroke="${c}" stroke-width="1.5" fill="none"/>`,
};

const SIMBOLOS: Readonly<Record<SimboloCore, string>> = {
  "lua-negra": `<circle cx="0" cy="0" r="4" fill="#d8d0f0"/><circle cx="1.6" cy="-1" r="3.4" fill="#1a1428"/>`,
  chama: `<path d="M0 -5 Q4 0 0 5 Q-4 0 0 -5 Z" fill="#ffb347"/>`,
  raio: `<path d="M1 -5 L-3 1 L0 1 L-1 5 L3 -1 L0 -1 Z" fill="#ffe066"/>`,
  montanha: `<path d="M-5 4 L-1 -4 L1 0 L2 -2 L5 4 Z" fill="#c8b58a"/>`,
  sol: `<circle r="3" fill="#ffe8a3"/><circle r="4.6" fill="none" stroke="#ffe8a3" stroke-dasharray="1.5 1.4"/>`,
  garra: `<path d="M-3 -4 L-2 4 M0 -5 L0 4 M3 -4 L2 4" stroke="#f0d0d0" stroke-width="1.2"/>`,
  olho: `<ellipse rx="5" ry="3" fill="#cfe8f0"/><circle r="1.6" fill="#1a2a33"/>`,
  espiral: `<path d="M0 0 Q2 -2 3 0 Q3 3 0 3 Q-4 3 -4 0 Q-4 -5 1 -5" stroke="#d6c2ea" stroke-width="1.1" fill="none"/>`,
  martelo: `<rect x="-4" y="-4" width="8" height="3" fill="#d9c7a3"/><rect x="-0.8" y="-1" width="1.6" height="6" fill="#a37b4d"/>`,
  trilha: `<path d="M-4 4 Q0 0 -1 -1 Q-2 -3 4 -4" stroke="#cfe0c4" stroke-width="1.2" stroke-dasharray="1.6 1" fill="none"/>`,
  pata: `<circle cx="0" cy="1.5" r="2.2" fill="#e3e8c8"/><circle cx="-3" cy="-1.5" r="1.1" fill="#e3e8c8"/><circle cx="-1" cy="-3.4" r="1.1" fill="#e3e8c8"/><circle cx="1.5" cy="-3.4" r="1.1" fill="#e3e8c8"/><circle cx="3.3" cy="-1.2" r="1.1" fill="#e3e8c8"/>`,
  vazio: `<circle r="4" fill="none" stroke="#bdbdbd" stroke-width="1.2"/>`,
};

/** Gera a miniatura como texto SVG (64×64). Lança se algum id não existir no catálogo. */
export function gerarMiniaturaSvg(p: ParametrosMiniatura): string {
  const raca = obter(CATALOGO.racas, p.racaId);
  const core = obter(CATALOGO.cores, p.coreId);
  const cabelo = obter(CATALOGO.coresCabelo, p.corCabeloId).hex;
  const roupa = obter(CATALOGO.coresRoupa, p.corRoupaId).hex;
  const pele = raca.visual.pele;
  const traco = TRACOS[raca.visual.traco](pele, cabelo);
  // Traços que ficam atrás da cabeça (orelhas, chifres, antenas) vêm antes; os do rosto, depois.
  const atras = ["orelhas-pontudas", "orelhas-de-lobo", "chifres", "antenas"].includes(raca.visual.traco);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">`,
    `<rect width="64" height="64" rx="10" fill="${core.visual.cor}"/>`,
    `<path d="M10 64 Q12 46 32 46 Q52 46 54 64 Z" fill="${roupa}"/>`,
    atras ? traco : "",
    `<circle cx="32" cy="30" r="13" fill="${pele}"/>`,
    `<path d="M19 28 Q20 14 32 15 Q44 14 45 28 Q40 20 32 21 Q24 20 19 28 Z" fill="${cabelo}"/>`,
    `<circle cx="27" cy="32" r="1.5" fill="#1b1a1f"/><circle cx="37" cy="32" r="1.5" fill="#1b1a1f"/>`,
    atras ? "" : traco,
    `<g transform="translate(54 10)"><circle r="7" fill="#00000055"/>${SIMBOLOS[core.visual.simbolo]}</g>`,
    `</svg>`,
  ].join("");
}
