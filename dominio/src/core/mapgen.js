// Gerador de cidades por semente. Mesma semente = mesma cidade (dá pra compartilhar).
// Pontos espalhados (Poisson), ruas por grafo de Gabriel (sem cruzamentos estranhos) + árvore mínima
// (tudo conectado), territórios iniciais em volta de cada QG e tipos sorteados com regras.
import { rng } from './crew.js';

const W = 1600, H = 1100;

// "Os Fundidores" → "dos Fundidores", "Família Coral" → "da Família Coral", "Clã do Trilho" → "do Clã do Trilho".
export function ofName(name) {
  if (name.startsWith('Os ')) return 'dos ' + name.slice(3);
  if (name.startsWith('As ')) return 'das ' + name.slice(3);
  if (/^(Família|Facção|Gangue)/.test(name)) return 'da ' + name;
  return 'do ' + name;
}

const NAMES = {
  boca: ['da Escadaria', 'da Praça', 'do Viaduto', 'do Beco', 'da Curva', 'do Campinho', 'da Linha', 'do Túnel', 'da Feira', 'do Morrinho', 'da Laje', 'do Valão'],
  bar: ['do Tonhão', 'da Esquina', 'do Português', 'da Dona Cida', 'Estrela', 'do Pitbull', 'Recanto', 'do Gringo'],
  inferninho: ['Lua Rubra', 'Paraíso', 'Neon', 'Veludo', 'Sétimo Céu', 'Madrugada', 'Cetim'],
  desmanche: ['da Linha', 'Ferro Velho', 'do Galpão', 'Sucatão', 'da Marginal'],
  fliperama: ['Neon', 'Turbo', 'Arcade 2000', 'Pixel'],
  mercado: ['Mercadão', 'Feira Livre', 'Camelódromo', 'Galeria'],
  campinho: ['do Morro', 'da Vila', 'Várzea', 'do Areião'],
  porto: ['Cais 7', 'Cais 12', 'Terminal Sul', 'Píer Velho'],
  lote: ['da Encosta', 'Baldio', 'do Viaduto', 'da Vila', 'da Linha', 'do Córrego', 'da Ponte', 'do Galpão', 'da Pracinha'],
  banco: ['Banco Central do Porto', 'Banco do Comércio'],
  joalheria: ['Joalheria Brilho', 'Ouro & Cia'],
  loterica: ['Lotérica da Sorte', 'Lotérica Trevo'],
  supermercado: ['Super Bom Preço', 'Atacadão Neon'],
  caixa: ['Caixa 24h do Centro', 'Caixa 24h da Avenida'],
  mansao: ['Mansão do Juiz', 'Mansão dos Albuquerque', 'Casa do Deputado'],
  policia: ['13ª Delegacia', 'Batalhão da PM', '5ª Delegacia'],
  hospital: ['Hospital Municipal'],
  igreja: ['Igreja da Penha'],
  escola: ['Escola Estadual'],
};
const PREFIX = { boca: 'Boca', bar: 'Bar', inferninho: 'Inferninho', desmanche: 'Desmanche', fliperama: 'Fliperama', campinho: 'Campinho', lote: 'Lote' };
const DISTRICT_NAMES = ['ZONA INDUSTRIAL', 'VILA ESPERANÇA', 'CAIS', 'SERRA', 'CENTRO', 'JARDIM NEON'];
const DISTRICT_COLORS = { P: '#ef444410', A: '#a855f712', B: '#22c55e10', C: '#f9731610', D: '#eab30810' };

// Âncoras dos QGs: você no alto à esquerda, rivais nos outros cantos e um no meio-baixo.
const ANCHORS = { P: [230, 200], A: [1370, 210], B: [230, 900], C: [1370, 890], D: [800, 980] };

// Quantos de cada tipo (o resto vira ponto comum sorteado por peso).
const FIXED = { banco: 1, joalheria: 1, loterica: 2, supermercado: 1, caixa: 2, mansao: 2, policia: 2, hospital: 1, igreja: 1, escola: 1, porto: 2 };
const COMMON = [['boca', 22], ['bar', 11], ['inferninho', 8], ['desmanche', 7], ['fliperama', 5], ['mercado', 4], ['campinho', 5], ['lote', 14]];
const ZONES = new Set(['policia', 'hospital', 'igreja', 'escola', 'banco', 'joalheria', 'loterica', 'supermercado', 'caixa', 'mansao']);
const GUARDS = { boca: 2, bar: 2, inferninho: 3, desmanche: 3, fliperama: 2, mercado: 4, campinho: 2, porto: 5, lote: 0 };

// opts.rivalDefs: gangues locais (nome, líder, cor...); opts.hqName: nome do seu QG.
export function generateCity(seed, rivals = ['A', 'B', 'C', 'D'], opts = {}) {
  const r = rng(seed);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];

  // 1) pontos: âncoras + Poisson-disc
  const pts = [];
  const owners = ['P', ...rivals];
  for (const o of owners) pts.push({ x: ANCHORS[o][0], y: ANCHORS[o][1], hq: o });
  const MIN = 150;
  const target = opts.size || 56;                    // níveis mais altos usam cidades um pouco menores
  for (let tries = 0; tries < 6000 && pts.length < target; tries++) {
    const x = 80 + r() * (W - 160), y = 70 + r() * (H - 140);
    if (pts.every((p) => Math.hypot(p.x - x, p.y - y) >= MIN)) pts.push({ x: Math.round(x), y: Math.round(y) });
  }

  // 2) ruas: grafo de Gabriel (sem ponto dentro do círculo de diâmetro ab), curtas, + árvore mínima
  const n = pts.length;
  const d = (a, b) => Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y);
  const edges = new Set();
  const key = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    if (d(a, b) > 330) continue;
    const mx = (pts[a].x + pts[b].x) / 2, my = (pts[a].y + pts[b].y) / 2, rad = d(a, b) / 2;
    let ok = true;
    for (let c = 0; c < n && ok; c++) if (c !== a && c !== b && Math.hypot(pts[c].x - mx, pts[c].y - my) < rad) ok = false;
    if (ok) edges.add(key(a, b));
  }
  // árvore mínima (Prim) garante que tudo se liga
  const inTree = new Set([0]);
  while (inTree.size < n) {
    let best = null;
    for (const a of inTree) for (let b = 0; b < n; b++) if (!inTree.has(b) && (!best || d(a, b) < best[2])) best = [a, b, d(a, b)];
    edges.add(key(best[0], best[1])); inTree.add(best[1]);
  }
  const EDGES = [...edges].map((k) => k.split(',').map(Number));
  const adj = pts.map(() => []);
  EDGES.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });

  // 3) tipos: QGs, fixos espalhados longe dos QGs, comuns por peso
  const type = pts.map((p) => (p.hq ? 'hq' : null));
  const free = () => pts.map((_, i) => i).filter((i) => !type[i]);
  const farFromHQ = (i) => Math.min(...owners.map((o) => Math.hypot(pts[i].x - ANCHORS[o][0], pts[i].y - ANCHORS[o][1])));
  for (const [t, count] of Object.entries(FIXED)) {
    for (let k = 0; k < count; k++) {
      let cands = free();
      if (t === 'porto') cands = cands.filter((i) => pts[i].y > H - 260);
      else cands = cands.filter((i) => farFromHQ(i) > 230 && adj[i].every((j) => !ZONES.has(type[j])));
      if (!cands.length) cands = free().filter((i) => farFromHQ(i) > 200);
      if (!cands.length) break;
      type[pick(cands)] = t;
    }
  }
  const totalW = COMMON.reduce((s, [, w]) => s + w, 0);
  for (const i of free()) {
    let x = r() * totalW;
    for (const [t, w] of COMMON) { x -= w; if (x <= 0) { type[i] = t; break; } }
    if (!type[i]) type[i] = 'boca';
  }
  // começo justo: perto do seu QG precisa ter bar (recrutar), uma boca e um lote
  const near0 = adj[0].filter((i) => !ZONES.has(type[i]) && type[i] !== 'hq');
  const need = ['bar', 'boca', 'lote'];
  near0.forEach((i, k) => { if (k < need.length) type[i] = need[k]; });

  // 4) donos iniciais: cada rival fica com até 3 pontos comuns vizinhos do QG
  const owner = pts.map((p) => (p.hq || null));
  for (let i = 0; i < n; i++) if (ZONES.has(type[i])) owner[i] = 'X';
  for (const o of rivals) {
    const hq = pts.findIndex((p) => p.hq === o);
    adj[hq].filter((i) => !owner[i] && type[i] !== 'lote').slice(0, 3).forEach((i) => { owner[i] = o; });
  }

  // 5) nomes únicos
  const used = new Set();
  const nameFor = (t, i) => {
    if (t === 'hq') {
      const o = pts[i].hq;
      if (o === 'P') return opts.hqName || 'QG do Farol';
      if (opts.rivalDefs && opts.rivalDefs[o]) return `QG ${ofName(opts.rivalDefs[o].name)}`;
      return { A: 'QG dos Corvos', B: 'QG das Serpentes', C: 'QG dos Dragões', D: 'QG dos Lobos' }[o];
    }
    const pool = NAMES[t] || [t];
    for (let k = 0; k < 20; k++) {
      const base = pick(pool);
      const nm = PREFIX[t] ? `${PREFIX[t]} ${base}` : base;
      if (!used.has(nm)) { used.add(nm); return nm; }
    }
    const nm = `${PREFIX[t] || pool[0]} ${i}`;
    used.add(nm);
    return nm;
  };

  const MAP = pts.map((p, i) => {
    const t = type[i];
    const g = t === 'hq' ? (p.hq === 'P' ? 4 : 6) : owner[i] === 'X' ? 0 : owner[i] ? 3 : GUARDS[t] ?? 2;
    return [nameFor(t, i), t, p.x, p.y, owner[i], g];
  });
  const DISTRICTS = owners.map((o, k) => [o === 'P' ? 'MORRO DO FAROL' : DISTRICT_NAMES[k - 1], ANCHORS[o][0], ANCHORS[o][1], 260, DISTRICT_COLORS[o]]);
  DISTRICTS.push(['CENTRO', 800, 520, 230, '#facc1508']);
  const POLICE_NODES = MAP.map((m, i) => (m[1] === 'policia' ? i : -1)).filter((i) => i >= 0);
  return { MAP, EDGES, DISTRICTS, POLICE_NODE: POLICE_NODES[0] ?? 0, POLICE_NODES, W, H, seed, rivals, generated: true, rivalDefs: opts.rivalDefs || null };
}
