// Save versionado. Cada mudança de formato ganha uma migração, pra partidas antigas não quebrarem.
//
// Formato atual: localStorage['dominio-save'] = { version, savedAt, state }
// Legado (v0.1–v0.4): localStorage['dominio-save-v1'] = state  (tratado como versão 1)

export const SAVE_VERSION = 7;
const KEY = 'dominio-save';
const LEGACY_KEY = 'dominio-save-v1';

// MIGRATIONS[v] converte um state da versão v para a v+1.
const MIGRATIONS = {
  1: (s) => {
    if (s.bribeDays === undefined) s.bribeDays = 0;
    delete s.bribed;
    for (const n of s.nodes) n.lowkey = !!n.lowkey;
    return s;
  },
  // v3 (F1): bonde com nome. O state.js cria o Comandante e os membros padrão ao carregar.
  2: (s) => { s.needsCrew = true; return s; },
  // v4 (F2): eras. Saves antigos são partidas do Modo Livre: Cidade, com o tutorial já cumprido.
  3: (s) => {
    s.era = s.era || 'cidade';
    s.motos = s.motos || 0; s.warnings = 0; s.suspended = 0;
    s.stats = s.stats || { recruited: 0, captured: 0 };
    s.objIdx = s.objIdx || 0;
    s.campaign = false;
    return s;
  },
  // v5 (F3): arsenal, eventos, lotes. Os lotes novos do mapa são completados pelo state.js ao carregar.
  4: (s) => {
    s.arsenal = s.arsenal || {};
    s.buffs = s.buffs || [];
    s.stats = { lots: 0, builds: 0, events: 0, ...s.stats };
    return s;
  },
  // v6 (F4): mapa gerado (só partidas novas), operações. Saves antigos seguem no mapa fixo da era.
  5: (s) => { s.map = s.map || null; return s; },
  // v7 (F5): mercado (criado com valores padrão na primeira consulta) e organização (estado).
  6: (s) => s,
};

const storage = () => (typeof localStorage !== 'undefined' ? localStorage : null);

export function migrate(version, s) {
  let v = version;
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`Sem migração do save v${v}`);
    s = step(s);
    v++;
  }
  return s;
}

export function saveGame(state) {
  const st = storage();
  if (!st) return;
  try { st.setItem(KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state })); } catch (e) { /* sem espaço */ }
}

export function loadGame() {
  const st = storage();
  if (!st) return null;
  try {
    const cur = JSON.parse(st.getItem(KEY));
    if (cur && cur.state && cur.state.nodes) return migrate(cur.version || 1, cur.state);
    const legacy = JSON.parse(st.getItem(LEGACY_KEY));
    if (legacy && legacy.nodes) return migrate(1, legacy);
  } catch (e) { /* save corrompido: começa do zero */ }
  return null;
}

export function clearSave() {
  const st = storage();
  if (!st) return;
  st.removeItem(KEY);
  st.removeItem(LEGACY_KEY);
}
