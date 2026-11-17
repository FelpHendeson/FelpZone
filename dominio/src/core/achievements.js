// Conquistas: valem pra todas as partidas (ficam guardadas mesmo começando um jogo novo).
// Disparam por acontecimento (hooks.fx) ou por estado (checkState, depois de cada ação e de cada dia).
import { state } from './state.js';

const KEY = 'dominio-conquistas';

export const ACHIEVEMENTS = {
  primeiro:   { icon: '🚩', title: 'Primeiro território', desc: 'Tome o seu primeiro ponto.' },
  recreio:    { icon: '👊', title: 'Rei do recreio', desc: 'Vença uma briga de bonde.' },
  colegios:   { icon: '🏆', title: 'Rei dos colégios', desc: 'Vença a Era Escola.' },
  morro:      { icon: '🏘️', title: 'Dono do morro', desc: 'Vença a Era Bairro.' },
  cidade:     { icon: '🌃', title: 'Dono da cidade', desc: 'Domine uma cidade inteira.' },
  estado:     { icon: '🗺️', title: 'O estado é nosso', desc: 'Suba da expansão do Estado pro País.' },
  pais:       { icon: '🇧🇷', title: 'O país inteiro', desc: 'Suba do País pro Mundo.' },
  mundo:      { icon: '👑', title: 'Dono do mundo', desc: 'Domine o Nexus e termine a história.' },
  aposentado: { icon: '🚪', title: 'Pela porta da frente', desc: 'Largue a vida antes que ela largue você.' },
  golpe:      { icon: '💰', title: 'Golpe perfeito', desc: 'Faça um assalto bem-sucedido.' },
  banco:      { icon: '🏦', title: 'O grande golpe', desc: 'Assalte um banco.' },
  sequestro:  { icon: '🏛️', title: 'Resgate', desc: 'Sequestre o dono de uma mansão.' },
  cobra:      { icon: '🐍', title: 'Cobra criada', desc: 'Seja traído por alguém do seu bonde.' },
  negocio:    { icon: '🤝', title: 'Negócio é negócio', desc: 'Seja traído por uma gangue aliada.' },
  sombra:     { icon: '🗡️', title: 'Trabalho na sombra', desc: 'Apague o braço direito de um líder rival.' },
  familia:    { icon: '❤️', title: 'Família', desc: 'Tenha 5 ou mais membros com nome, todos com lealdade 80+.' },
  hierarquia: { icon: '🎖️', title: 'Hierarquia', desc: 'Tenha 4 tenentes ao mesmo tempo.' },
  arsenal:    { icon: '🔫', title: 'Paiol', desc: 'Junte 30 armas no arsenal.' },
  milionario: { icon: '💎', title: 'Milionário', desc: 'Tenha $100.000 no caixa de uma cidade.' },
  fantasma:   { icon: '👻', title: 'Fantasma', desc: 'Chegue ao dia 30 numa cidade sem sofrer nenhuma batida.' },
  nivel10:    { icon: '🆙', title: 'Lenda da rua', desc: 'Leve o seu personagem ao nível 10.' },
  negociador: { icon: '💼', title: 'Mesa de negociação', desc: 'Anexe um lugar sem guerra.' },
};

const storage = () => (typeof localStorage !== 'undefined' ? localStorage : null);
export function unlocked() {
  try { return JSON.parse(storage().getItem(KEY) || '{}'); } catch (e) { return {}; }
}
let onUnlock = () => {};
export function setUnlockHandler(fn) { onUnlock = fn; }
export function unlock(id) {
  const st = storage();
  if (!st || !ACHIEVEMENTS[id]) return false;
  const u = unlocked();
  if (u[id]) return false;
  u[id] = Date.now();
  try { st.setItem(KEY, JSON.stringify(u)); } catch (e) { /* sem espaço */ }
  onUnlock(id, ACHIEVEMENTS[id]);
  return true;
}

// Por acontecimento.
export function onEvent(type, data = {}) {
  if (type === 'attack' && data.win) unlock('primeiro');
  if (type === 'brawl' && data.win) unlock('recreio');
  if (type === 'win') unlock({ escola: 'colegios', bairro: 'morro', cidade: 'cidade' }[data.era]);
  if (type === 'orgLevel') unlock(data.level === 'pais' ? 'estado' : 'pais');
  if (type === 'ending') unlock(data.kind === 'rei' ? 'mundo' : 'aposentado');
  if (type === 'heist') { unlock('golpe'); if (data.type === 'banco') unlock('banco'); }
  if (type === 'kidnap') unlock('sequestro');
  if (type === 'betrayal') unlock('cobra');
  if (type === 'allyBetrayal') unlock('negocio');
  if (type === 'hit') unlock('sombra');
  if (type === 'annex') unlock('negociador');
}

// Por estado (depois de cada ação e de cada dia).
export function checkState() {
  if (!state || !state.nodes || !state.cmd) return;
  const ok = (state.members || []).filter((m) => m.status === 'ok');
  if (ok.length >= 5 && ok.every((m) => m.loyalty >= 80)) unlock('familia');
  if (ok.filter((m) => m.role === 'ten').length >= 4) unlock('hierarquia');
  if (Object.values(state.arsenal || {}).reduce((a, b) => a + b, 0) >= 30) unlock('arsenal');
  if (state.money >= 100000) unlock('milionario');
  if (state.era === 'cidade' && state.day >= 30 && !(state.stats && state.stats.raids)) unlock('fantasma');
  if (state.cmd.level >= 10) unlock('nivel10');
}
