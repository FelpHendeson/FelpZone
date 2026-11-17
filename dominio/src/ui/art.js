// Arte em SVG em camadas: avatares (rosto, cabelo, cicatriz, acessório, jaqueta) e bandeiras.
// Tudo é recolorível: a jaqueta e a bandeira usam as cores escolhidas pelo jogador.
import { SKINS, HAIR_COLORS } from '../data/look.js';
import { SYMBOLS } from '../data/flags.js';

let uid = 0;

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('');
}

// Símbolo num quadro 100×100. `bg` pinta os furos (olho da caveira etc.).
export function symbolPath(key, color, bg) {
  const s = SYMBOLS[key];
  if (!s) return '';
  let out = '';
  if (s.d) out += `<path d="${s.d}" fill="${color}"/>`;
  if (s.stroke) out += `<path d="${s.stroke}" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round"/>`;
  if (s.head) out += `<circle cx="${s.head[0]}" cy="${s.head[1]}" r="${s.head[2]}" fill="${color}"/>`;
  (s.holes || []).forEach(([x, y, r]) => { out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${bg}"/>`; });
  if (s.dot) out += `<circle cx="${s.dot[0]}" cy="${s.dot[1]}" r="${s.dot[2]}" fill="${color}"/>`;
  return out;
}

// Conteúdo da bandeira num quadro 150×100 (sem a tag <svg>), pra reusar dentro do mapa.
export function flagInner(f) {
  const p = [];
  p.push(`<rect width="150" height="100" fill="${f.bg}"/>`);
  switch (f.pattern) {
    case 'faixa': p.push(`<rect y="36" width="150" height="28" fill="${f.fg}"/>`); break;
    case 'listras': p.push(`<rect width="150" height="20" fill="${f.fg}"/><rect y="40" width="150" height="20" fill="${f.fg}"/><rect y="80" width="150" height="20" fill="${f.fg}"/>`); break;
    case 'diagonal': p.push(`<polygon points="0,100 0,72 118,0 150,0 150,28 32,100" fill="${f.fg}"/>`); break;
    case 'cruz': p.push(`<rect x="58" width="34" height="100" fill="${f.fg}"/><rect y="33" width="150" height="34" fill="${f.fg}"/>`); break;
    case 'borda': p.push(`<rect x="6" y="6" width="138" height="88" fill="none" stroke="${f.fg}" stroke-width="12"/>`); break;
    default: break;
  }
  // contorno na cor do fundo: o símbolo continua visível mesmo sobre um padrão da mesma cor
  p.push(`<g transform="translate(43 18) scale(.64)" stroke="${f.bg}" stroke-width="7" paint-order="stroke" stroke-linejoin="round">${symbolPath(f.symbol, f.sym, f.bg)}</g>`);
  return p.join('');
}
export function flagSVG(f, cls = 'flag') {
  return `<svg class="${cls}" viewBox="0 0 150 100" preserveAspectRatio="xMidYMid slice">${flagInner(f)}</svg>`;
}

const HAIR_BACK = {
  blackpower: (c) => `<circle cx="50" cy="35" r="29" fill="${c}"/>`,
  comprido: (c) => `<path d="M28 40 C26 16 74 16 72 40 L74 74 C64 79 36 79 26 74 Z" fill="${c}"/>`,
  trancas: (c) => `<path d="M30 40 C30 22 70 22 70 40 L72 66 L66 66 L64 44 L36 44 L34 66 L28 66 Z" fill="${c}"/>`,
};
const HAIR_FRONT = {
  raspado: (c) => `<path d="M31 39 C30 21 70 21 69 39 C64 30 36 30 31 39 Z" fill="${c}" opacity=".55"/>`,
  curto: (c) => `<path d="M30 41 C27 18 73 18 70 41 C67 31 58 27 50 28 C42 27 33 31 30 41 Z" fill="${c}"/>`,
  topete: (c) => `<path d="M30 41 C25 20 44 9 64 14 C76 18 75 32 70 41 C66 31 58 27 48 28 C40 29 34 33 30 41 Z" fill="${c}"/><path d="M42 16 C54 4 78 9 74 24 C67 17 56 16 42 16 Z" fill="${shade(c, 0.15)}"/>`,
  moicano: (c) => `<path d="M31 39 C30 23 70 23 69 39 C64 31 36 31 31 39 Z" fill="${c}" opacity=".35"/><path d="M45 9 C48 6 52 6 55 9 L57 33 L43 33 Z" fill="${c}"/>`,
  blackpower: (c) => `<path d="M29 39 C29 26 71 26 71 39 C62 32 38 32 29 39 Z" fill="${c}"/>`,
  trancas: (c) => `<path d="M30 41 C28 19 72 19 70 41 C66 31 34 31 30 41 Z" fill="${c}"/><path d="M38 24 L36 38 M46 21 L45 34 M54 21 L55 34 M62 24 L64 38" stroke="${shade(c, 0.25)}" stroke-width="1.6"/>`,
  comprido: (c) => `<path d="M30 42 C29 22 71 22 70 42 C64 29 50 27 41 33 C37 36 33 38 30 42 Z" fill="${c}"/>`,
  careca: () => `<ellipse cx="44" cy="28" rx="7" ry="3" fill="#fff" opacity=".18"/>`,
};
const BROWS = {
  neutro: 'M38 38 L46 38 M54 38 L62 38',
  bravo: 'M37 35 L46 40 M63 35 L54 40',
  desconfiado: 'M37 38 L46 37 M54 35 L63 38',
};
const MOUTHS = {
  serio: '<path d="M44 59 L56 59" stroke="#3b1f17" stroke-width="2" stroke-linecap="round"/>',
  canto: '<path d="M44 59 Q52 61 57 55" fill="none" stroke="#3b1f17" stroke-width="2" stroke-linecap="round"/>',
  rosnando: '<path d="M43 58 L57 58 L56 61 L44 61 Z" fill="#fff" stroke="#3b1f17" stroke-width="1.6" stroke-linejoin="round"/>',
};
const SCARS = {
  olho: 'M55 36 L61 53',
  bochecha: 'M33 52 L42 57',
  testa: 'M44 26 L52 33',
};

// look: { skin, hair, hairColor, brows, mouth, scar, acc }  jacket: { color, accent }  flag: pro emblema no peito
export function avatarSVG(look, jacket, flag, opts = {}) {
  const id = `av${uid++}`;
  const skin = SKINS[look.skin] || SKINS[2];
  const sk2 = shade(skin, -0.22);
  const hc = HAIR_COLORS[look.hairColor] || HAIR_COLORS[0];
  const jc = jacket.color, ac = jacket.accent;
  const bg = opts.bg || shade(flag ? flag.bg : ac, -0.55);
  const p = [];
  p.push(`<defs><clipPath id="${id}"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#${id})">`);
  p.push(`<rect width="100" height="100" fill="${bg}"/>`);
  if (HAIR_BACK[look.hair]) p.push(HAIR_BACK[look.hair](hc));
  // jaqueta
  p.push(`<rect x="43" y="58" width="14" height="16" fill="${sk2}"/>`);
  p.push(`<path d="M6 106 C6 80 25 69 50 69 C75 69 94 80 94 106 Z" fill="${jc}"/>`);
  p.push(`<path d="M12 96 C18 84 28 77 39 73 M88 96 C82 84 72 77 61 73" stroke="${ac}" stroke-width="3.5" fill="none"/>`);
  p.push(`<path d="M38 71 L50 89 L62 71" fill="${shade(jc, -0.35)}" stroke="${ac}" stroke-width="2.5"/>`);
  if (flag) p.push(`<g transform="translate(62 80) scale(.13)">${symbolPath(flag.symbol, ac, jc)}</g>`);
  if (look.acc === 'corrente') p.push(`<path d="M41 72 Q50 86 59 72" fill="none" stroke="#e5c158" stroke-width="2.4" stroke-dasharray="2.5 1.5"/>`);
  // cabeça
  p.push(`<ellipse cx="31" cy="46" rx="4" ry="6" fill="${sk2}"/><ellipse cx="69" cy="46" rx="4" ry="6" fill="${sk2}"/>`);
  p.push(`<ellipse cx="50" cy="44" rx="19" ry="22" fill="${skin}"/>`);
  p.push(`<path d="M33 52 C36 62 44 66 50 66 C56 66 64 62 67 52" fill="none" stroke="${sk2}" stroke-width="1.2" opacity=".6"/>`);
  if (look.acc === 'brinco') p.push(`<circle cx="30" cy="52" r="2" fill="#e5c158"/>`);
  // rosto
  p.push(`<path d="${BROWS[look.brows] || BROWS.neutro}" stroke="${shade(hc, -0.1)}" stroke-width="2.6" stroke-linecap="round"/>`);
  if (look.acc === 'oculos') {
    p.push(`<path d="M35 41 h12 v7 q-6 3 -12 0 z M53 41 h12 v7 q-6 3 -12 0 z" fill="#0b0b12"/><path d="M47 43 L53 43" stroke="#0b0b12" stroke-width="2"/>`);
  } else {
    p.push(`<ellipse cx="42" cy="45" rx="2.6" ry="3" fill="#1a1a1a"/><ellipse cx="58" cy="45" rx="2.6" ry="3" fill="#1a1a1a"/>`);
  }
  p.push(`<path d="M50 46 L47.5 53 L51 53" fill="none" stroke="${sk2}" stroke-width="1.6" stroke-linejoin="round"/>`);
  p.push(MOUTHS[look.mouth] || MOUTHS.serio);
  if (SCARS[look.scar]) p.push(`<path d="${SCARS[look.scar]}" stroke="#a14b4b" stroke-width="2" stroke-linecap="round"/><path d="${SCARS[look.scar]}" stroke="#f3c1c1" stroke-width=".6" stroke-dasharray="2 2"/>`);
  // cabelo e acessório de cabeça
  if (HAIR_FRONT[look.hair]) p.push(HAIR_FRONT[look.hair](hc));
  if (look.acc === 'bandana') p.push(`<path d="M30 33 C40 28 60 28 70 33 L70 38 C60 34 40 34 30 38 Z" fill="${ac}"/><path d="M70 34 L79 31 L77 37 L72 37 Z" fill="${shade(ac, -0.2)}"/>`);
  if (look.acc === 'bone') p.push(`<path d="M29 37 C29 15 71 15 71 37 Z" fill="${ac}"/><path d="M52 35 L84 37 L72 41 L50 39 Z" fill="${shade(ac, -0.25)}"/>`);
  if (opts.status === 'morto' || opts.status === 'traidor') p.push(`<rect width="100" height="100" fill="#000" opacity=".55"/>`);
  p.push('</g>');
  if (opts.ring) p.push(`<circle cx="50" cy="50" r="48" fill="none" stroke="${opts.ring}" stroke-width="4"/>`);
  return `<svg class="${opts.cls || 'avatar'}" viewBox="0 0 100 100">${p.join('')}</svg>`;
}
