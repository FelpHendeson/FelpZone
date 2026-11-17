// Níveis da expansão por braços: Estado → País → Mundo. Cada nó é jogado como uma cidade gerada.
// Lugares e gangues fictícios. diff: força inicial dos rivais; tribute: renda diária pra organização quando é sua;
// annex: preço pra anexar por negociação (sem jogar); final: o último do nível (não dá pra anexar).
import { CITIES, ROUTES } from './estado.js';
import { NICKNAMES } from './crew.js';

export const LEVELS = {
  estado: {
    label: 'Estado', next: 'pais', nodes: CITIES, routes: ROUTES, home: 'porto', mapSize: 56,
    support: { cap: 3000, soldiers: 8, arms: { pistola: 5 } }, annexMult: 1,
  },
  pais: {
    label: 'País', next: 'mundo', home: 'farol', mapSize: 46,
    support: { cap: 8000, soldiers: 14, arms: { pistola: 8, escopeta: 4 } },
    nodes: {
      farol:      { name: 'Estado do Farol', x: 170, y: 420, home: true, tribute: 2500, desc: 'O seu estado inteiro. A base da organização no país.' },
      sertao:     { name: 'Sertão', x: 380, y: 220, diff: 1.45, tribute: 900, annex: 50000, desc: 'Estradas longas e cidades pequenas: as rotas que cortam o país.' },
      metropole:  { name: 'Metrópole', x: 430, y: 480, diff: 1.5, tribute: 1100, annex: 60000, desc: 'A maior cidade do país. Dinheiro, polícia e facções enormes.' },
      floresta:   { name: 'Floresta', x: 650, y: 180, diff: 1.55, tribute: 1000, annex: 60000, desc: 'Rio, pista clandestina e pouca lei.' },
      fronteira:  { name: 'Fronteira Sul', x: 650, y: 590, diff: 1.6, tribute: 1200, annex: 70000, desc: 'Onde as rotas internacionais entram. Contrabando pesado.' },
      federal:    { name: 'Capital Federal', x: 850, y: 390, diff: 1.8, tribute: 2000, final: true, desc: 'O coração do poder. A última porta antes do mundo.' },
    },
    routes: [['farol', 'sertao'], ['farol', 'metropole'], ['sertao', 'metropole'], ['sertao', 'floresta'], ['metropole', 'fronteira'], ['floresta', 'federal'], ['fronteira', 'federal']],
  },
  mundo: {
    label: 'Mundo', next: null, home: 'patria', mapSize: 42,
    support: { cap: 15000, soldiers: 20, arms: { escopeta: 8, fuzil: 6 } },
    nodes: {
      patria:  { name: 'Seu País', x: 170, y: 400, home: true, tribute: 6000, desc: 'O país inteiro responde à organização.' },
      sombra:  { name: 'Sombra Alta', x: 360, y: 210, diff: 1.9, tribute: 2500, annex: 120000, desc: 'Megacidade das Américas, onde as rotas do continente se cruzam.' },
      austral: { name: 'Porto Austral', x: 380, y: 560, diff: 2.0, tribute: 2600, annex: 130000, desc: 'Fim do mundo e começo de todas as rotas do Pacífico.' },
      marsala: { name: 'Velha Marsala', x: 590, y: 160, diff: 2.0, tribute: 2800, annex: 140000, desc: 'Porto antigo do Mediterrâneo. Famílias de tradição e memória longa.' },
      hakuro:  { name: 'Neo-Hakuro', x: 820, y: 230, diff: 2.1, tribute: 3000, annex: 150000, desc: 'Neon, motos e clãs com código de honra: a terra das gangues de rua lendárias.' },
      nexus:   { name: 'Nexus', x: 650, y: 470, diff: 2.3, tribute: 5000, final: true, desc: 'Onde o dinheiro do mundo é lavado. Quem manda no Nexus manda em tudo.' },
    },
    routes: [['patria', 'sombra'], ['patria', 'austral'], ['sombra', 'marsala'], ['austral', 'nexus'], ['marsala', 'hakuro'], ['hakuro', 'nexus'], ['marsala', 'nexus']],
  },
};

// Gangues geradas para os nós do país e do mundo (as do estado são escritas à mão em estado.js).
const NOUNS = ['Lobos', 'Tigres', 'Escorpiões', 'Falcões', 'Cobras', 'Leões', 'Raposas', 'Tubarões', 'Panteras', 'Abutres', 'Corvos', 'Touros', 'Hienas', 'Águias', 'Morcegos', 'Javalis'];
const FORMS = [(n) => `Os ${n}`, (n) => `Clã dos ${n}`, (n) => `Irmandade dos ${n}`, (n) => `Sindicato dos ${n}`, (n) => `Os ${n} de Ferro`, (n) => `Comando dos ${n}`];
const QUOTES = [
  'Aqui ninguém conhece o teu nome, e é melhor assim.', 'Território se paga com sangue ou com dinheiro.', 'Você chegou tarde: essa cidade já tem dono.',
  'Forasteiro dura pouco por aqui.', 'A gente estava aqui antes de você nascer.', 'Pode vir. A gente sabe esperar.',
];
const COLORS = { A: '#a855f7', B: '#22c55e', C: '#f97316', D: '#eab308' };
function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export function gangsFor(level, id) {
  const node = LEVELS[level].nodes[id];
  if (node.gangs) return node.gangs;
  let h = hash(`${level}:${id}`);
  const next = (m) => { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return h % m; };
  const used = new Set();
  const out = {};
  for (const k of ['A', 'B', 'C', 'D']) {
    let noun; do { noun = NOUNS[next(NOUNS.length)]; } while (used.has(noun)); used.add(noun);
    out[k] = { name: FORMS[next(FORMS.length)](noun), leader: NICKNAMES[next(NICKNAMES.length)], color: COLORS[k], aggr: 0.4 + next(15) / 100,
      quotes: [QUOTES[next(QUOTES.length)], QUOTES[next(QUOTES.length)], QUOTES[next(QUOTES.length)]] };
  }
  return out;
}
