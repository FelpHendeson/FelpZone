// Som sem arquivos: efeitos e trilha sintetizados com Web Audio. Tudo desligável (prefs.sfx, prefs.music).
// O navegador só deixa tocar depois de um toque/clique, então o áudio liga no primeiro gesto.
import { prefs } from './dialog.js';

let ctx = null, master, sfxBus, musicBus, noiseBuf = null;
let musicTimer = null, step = 0, nextTime = 0, track = null;

function init() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}
// Primeiro gesto do jogador: destrava o áudio e começa a trilha.
export function unlockAudio() {
  if (!init()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (prefs.music && !musicTimer) startMusic();
}

function tone(freq, t, dur, { type = 'square', vol = 0.3, bus = sfxBus, slide = 0, attack = 0.005 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
}
function noise(t, dur, { vol = 0.3, bus = sfxBus, filter = 2000, type = 'bandpass' } = {}) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = filter;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02);
}
const N = (semi) => 440 * Math.pow(2, (semi - 9) / 12);   // semitons a partir do Dó central (C4 = 0)

export function sfx(name) {
  if (!prefs.sfx || !init() || ctx.state !== 'running') return;
  const t = ctx.currentTime + 0.01;
  switch (name) {
    case 'click': tone(880, t, 0.05, { vol: 0.08, type: 'triangle' }); break;
    case 'attack': noise(t, 0.25, { vol: 0.35, filter: 900 }); tone(110, t, 0.3, { type: 'sine', vol: 0.5, slide: 0.5 }); break;
    case 'hit': noise(t, 0.12, { vol: 0.4, filter: 600, type: 'lowpass' }); tone(90, t, 0.15, { type: 'sine', vol: 0.5, slide: 0.6 }); break;
    case 'win': [0, 4, 7, 12].forEach((s, i) => tone(N(s + 12), t + i * 0.08, 0.22, { vol: 0.18, type: 'square' })); break;
    case 'lose': [7, 4, 0, -5].forEach((s, i) => tone(N(s), t + i * 0.1, 0.25, { vol: 0.16, type: 'sawtooth' })); break;
    case 'money': tone(N(24), t, 0.08, { vol: 0.15, type: 'square' }); tone(N(31), t + 0.07, 0.18, { vol: 0.15, type: 'square' }); break;
    case 'siren': for (let i = 0; i < 4; i++) tone(i % 2 ? 660 : 880, t + i * 0.22, 0.22, { vol: 0.12, type: 'sawtooth' }); break;
    case 'level': [0, 4, 7, 12, 16, 19].forEach((s, i) => tone(N(s + 12), t + i * 0.07, 0.3, { vol: 0.14, type: 'triangle' })); break;
    case 'achievement': [12, 16, 19, 24].forEach((s, i) => tone(N(s + 12), t + i * 0.06, 0.35, { vol: 0.12, type: 'sine' })); break;
    case 'betrayal': [0, -1, -6].forEach((s, i) => tone(N(s), t + i * 0.18, 0.4, { vol: 0.16, type: 'sawtooth' })); break;
    case 'day': tone(N(7), t, 0.4, { vol: 0.06, type: 'sine' }); tone(N(12), t + 0.12, 0.5, { vol: 0.06, type: 'sine' }); break;
    default: break;
  }
}

// ---------- trilha procedural (um clima por era) ----------
// bass: graus da escala por compasso; scale: escala em semitons; bpm.
const TRACKS = {
  escola:  { bpm: 112, root: 0,  scale: [0, 2, 4, 7, 9],      bass: [0, 5, 3, 4], swing: 0 },     // maior, pra cima
  bairro:  { bpm: 96,  root: -3, scale: [0, 3, 5, 7, 10],     bass: [0, 0, 3, 4], swing: 0.06 },  // menor pentatônica, funk
  cidade:  { bpm: 88,  root: -8, scale: [0, 2, 3, 7, 8],      bass: [0, 4, 3, 1], swing: 0.04 },  // menor, tenso
  estado:  { bpm: 80,  root: -10, scale: [0, 3, 5, 6, 7, 10], bass: [0, 3, 1, 4], swing: 0.03 },  // blues, épico
};
export function setTrack(name) {
  track = TRACKS[name] || TRACKS.cidade;
}
function scheduleStep(t) {
  const tr = track || TRACKS.cidade;
  const s16 = step % 16, bar = Math.floor(step / 16) % tr.bass.length;
  const root = tr.root + tr.scale[tr.bass[bar] % tr.scale.length];
  if (s16 % 4 === 0) { tone(55 * Math.pow(2, (root + 3) / 12), t, 0.28, { type: 'triangle', vol: 0.5, bus: musicBus }); }
  if (s16 === 0 || s16 === 8 || (s16 === 10 && bar % 2)) { tone(60, t, 0.18, { type: 'sine', vol: 0.9, bus: musicBus, slide: 0.4 }); }
  if (s16 === 4 || s16 === 12) noise(t, 0.12, { vol: 0.35, bus: musicBus, filter: 1800 });
  if (s16 % 2 === 0) noise(t, 0.04, { vol: 0.12, bus: musicBus, filter: 8000, type: 'highpass' });
  // melodia esparsa, sorteada na escala (sempre a mesma por compasso: soa como um tema)
  if ((s16 === 6 || s16 === 14) && ((step * 7 + bar) % 3 !== 0)) {
    const deg = tr.scale[(bar * 3 + s16) % tr.scale.length];
    tone(N(tr.root + deg + 12), t, 0.35, { type: 'square', vol: 0.07, bus: musicBus });
  }
}
function startMusic() {
  if (!init() || musicTimer) return;
  nextTime = ctx.currentTime + 0.1;
  musicTimer = setInterval(() => {
    const tr = track || TRACKS.cidade;
    const dur16 = 60 / tr.bpm / 4;
    while (nextTime < ctx.currentTime + 0.25) {
      const sw = step % 2 ? dur16 * tr.swing : 0;
      scheduleStep(nextTime + sw);
      nextTime += dur16; step++;
    }
  }, 60);
}
export function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
export function applyAudioPrefs() {
  if (!ctx) return;
  if (prefs.music) startMusic(); else stopMusic();
}
