// Save versionado. Cada mudança de formato ganha uma migração, pra partidas antigas não quebrarem.
//
// Formato atual: localStorage['dominio-save'] = { version, savedAt, state }
// Legado (v0.1–v0.4): localStorage['dominio-save-v1'] = state  (tratado como versão 1)

export const SAVE_VERSION = 3;
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
