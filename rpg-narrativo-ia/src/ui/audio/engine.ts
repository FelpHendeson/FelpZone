import type { AmbienceBed, AudioCue } from '../../modules/audio';

/**
 * Motor de som sintetizado com Web Audio: nenhum arquivo, então funciona offline e sem licença.
 * Só começa depois do primeiro toque ou tecla (exigência dos navegadores) e se cala quando a
 * aba fica oculta. Sem Web Audio (testes, navegadores antigos), tudo vira silêncio.
 */
export type SoundLevel = 'off' | 'low' | 'mid' | 'high';
export type SoundChannel = 'ambience' | 'effects';

const LEVEL_GAIN: Record<SoundLevel, number> = { off: 0, low: 0.25, mid: 0.55, high: 0.9 };
const FADE_IN = 2.2;
const FADE_OUT = 1.6;

interface ActiveBed {
  gain: GainNode;
  stop: () => void;
}

type Ctx = AudioContext;

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export class SoundEngine {
  private ctx: Ctx | undefined;
  private channels: Partial<Record<SoundChannel, GainNode>> = {};
  private levels: Record<SoundChannel, SoundLevel>;
  private wanted: AmbienceBed[] = [];
  private active = new Map<AmbienceBed, ActiveBed>();
  private noise: AudioBuffer | undefined;
  private installed = false;

  constructor(levels: Record<SoundChannel, SoundLevel>) {
    this.levels = { ...levels };
  }

  /** Espera o primeiro gesto para criar o contexto de áudio. */
  install(): void {
    if (this.installed || typeof window === 'undefined') return;
    this.installed = true;
    const unlock = () => {
      this.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  get unlocked(): boolean {
    return this.ctx !== undefined;
  }

  private unlock(): void {
    if (this.ctx) return;
    const Constructor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return;
    try {
      this.ctx = new Constructor();
    } catch {
      return;
    }
    for (const channel of ['ambience', 'effects'] as const) {
      const gain = this.ctx.createGain();
      gain.gain.value = LEVEL_GAIN[this.levels[channel]];
      gain.connect(this.ctx.destination);
      this.channels[channel] = gain;
    }
    void this.ctx.resume();
    this.syncAmbience();
  }

  setLevel(channel: SoundChannel, level: SoundLevel): void {
    this.levels[channel] = level;
    const gain = this.channels[channel];
    if (this.ctx && gain) gain.gain.setTargetAtTime(LEVEL_GAIN[level], this.ctx.currentTime, 0.15);
    if (channel === 'ambience') this.syncAmbience();
  }

  setAmbience(beds: readonly AmbienceBed[]): void {
    this.wanted = [...beds];
    this.syncAmbience();
  }

  play(cue: AudioCue): void {
    const ctx = this.ctx;
    const out = this.channels.effects;
    if (!ctx || !out || this.levels.effects === 'off' || ctx.state !== 'running') return;
    playCue(this, ctx, out, cue);
  }

  /** Liga as camadas desejadas e desliga as outras, com transição suave. */
  private syncAmbience(): void {
    const ctx = this.ctx;
    const out = this.channels.ambience;
    if (!ctx || !out) return;
    const wanted = new Set(this.levels.ambience === 'off' ? [] : this.wanted);
    for (const [bed, active] of this.active) {
      if (wanted.has(bed)) continue;
      this.active.delete(bed);
      active.gain.gain.cancelScheduledValues(ctx.currentTime);
      active.gain.gain.setValueAtTime(active.gain.gain.value, ctx.currentTime);
      active.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_OUT);
      window.setTimeout(active.stop, FADE_OUT * 1000 + 100);
    }
    for (const bed of wanted) {
      if (this.active.has(bed)) continue;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_IN);
      gain.connect(out);
      const stop = buildBed(this, ctx, gain, bed);
      this.active.set(bed, {
        gain,
        stop: () => {
          stop();
          gain.disconnect();
        },
      });
    }
  }

  noiseBuffer(ctx: Ctx): AudioBuffer {
    if (!this.noise) {
      const length = ctx.sampleRate * 2;
      this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    }
    return this.noise;
  }
}

/* ---------- blocos de síntese ---------- */

function noiseSource(engine: SoundEngine, ctx: Ctx): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = engine.noiseBuffer(ctx);
  source.loop = true;
  source.loopStart = Math.random();
  return source;
}

function filter(ctx: Ctx, type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  return node;
}

/** Oscila um parâmetro em volta do valor atual. */
function lfo(ctx: Ctx, param: AudioParam, rate: number, depth: number): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.frequency.value = rate;
  const amount = ctx.createGain();
  amount.gain.value = depth;
  osc.connect(amount).connect(param);
  osc.start();
  return osc;
}

function pan(ctx: Ctx, out: AudioNode, value: number): AudioNode {
  if (typeof ctx.createStereoPanner !== 'function') return out;
  const node = ctx.createStereoPanner();
  node.pan.value = value;
  node.connect(out);
  return node;
}

/** Envelope curto: sobe rápido até o pico e decai até quase zero. */
function envelope(ctx: Ctx, at: number, attack: number, peak: number, duration: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  return gain;
}

function tone(
  ctx: Ctx,
  out: AudioNode,
  type: OscillatorType,
  from: number,
  to: number,
  duration: number,
  peak: number,
  delay = 0,
): void {
  const at = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + duration);
  osc.connect(envelope(ctx, at, Math.min(0.01, duration / 4), peak, duration)).connect(out);
  osc.start(at);
  osc.stop(at + duration + 0.05);
}

function burst(
  engine: SoundEngine,
  ctx: Ctx,
  out: AudioNode,
  type: BiquadFilterType,
  from: number,
  to: number,
  duration: number,
  peak: number,
  q = 1,
  delay = 0,
): void {
  const at = ctx.currentTime + delay;
  const source = noiseSource(engine, ctx);
  const shape = filter(ctx, type, from, q);
  if (to !== from) shape.frequency.exponentialRampToValueAtTime(to, at + duration);
  source.connect(shape).connect(envelope(ctx, at, Math.min(0.01, duration / 4), peak, duration)).connect(out);
  source.start(at, Math.random());
  source.stop(at + duration + 0.05);
}

/* ---------- ambiente ---------- */

/** Repete um acontecimento em intervalos aleatórios enquanto a camada estiver ligada. */
function every(minMs: number, maxMs: number, fn: () => void): () => void {
  let timer = 0;
  let alive = true;
  const next = () => {
    timer = window.setTimeout(() => {
      if (!alive) return;
      fn();
      next();
    }, random(minMs, maxMs));
  };
  next();
  return () => {
    alive = false;
    window.clearTimeout(timer);
  };
}

/** Uma cama de ruído filtrado, com respiração lenta no volume. */
function bed(
  engine: SoundEngine,
  ctx: Ctx,
  out: AudioNode,
  shape: BiquadFilterNode[],
  level: number,
  breath: { rate: number; depth: number },
): () => void {
  const source = noiseSource(engine, ctx);
  const gain = ctx.createGain();
  gain.gain.value = level;
  let node: AudioNode = source;
  for (const entry of shape) node = node.connect(entry);
  node.connect(gain).connect(out);
  source.start();
  const wobble = lfo(ctx, gain.gain, breath.rate, breath.depth);
  return () => {
    source.stop();
    wobble.stop();
  };
}

function chirps(ctx: Ctx, out: AudioNode, count: number, base: number, peak: number) {
  const voice = pan(ctx, out, random(-0.8, 0.8));
  for (let index = 0; index < count; index += 1) {
    const at = index * random(0.07, 0.12);
    tone(ctx, voice, 'sine', base, base * random(1.3, 1.7), 0.07, peak, at);
  }
}

function buildBed(engine: SoundEngine, ctx: Ctx, out: GainNode, name: AmbienceBed): () => void {
  const stops: (() => void)[] = [];
  switch (name) {
    case 'night-wind':
      stops.push(bed(engine, ctx, out, [filter(ctx, 'lowpass', 340)], 0.09, { rate: 0.07, depth: 0.05 }));
      stops.push(
        every(9000, 18000, () => {
          const voice = pan(ctx, out, random(-0.7, 0.7));
          tone(ctx, voice, 'sine', 370, 330, 0.35, 0.05);
          tone(ctx, voice, 'sine', 360, 320, 0.45, 0.05, 0.55);
        }),
      );
      break;
    case 'dawn-birds':
      stops.push(every(2500, 7000, () => chirps(ctx, out, Math.round(random(2, 4)), random(2200, 3200), 0.035)));
      break;
    case 'birds':
      stops.push(every(1000, 3200, () => chirps(ctx, out, Math.round(random(2, 5)), random(2400, 3800), 0.04)));
      break;
    case 'leaves':
      stops.push(bed(engine, ctx, out, [filter(ctx, 'highpass', 2600), filter(ctx, 'lowpass', 6500)], 0.018, { rate: 0.18, depth: 0.012 }));
      break;
    case 'insects': {
      const stopBed = bed(engine, ctx, out, [filter(ctx, 'bandpass', 4800, 7)], 0.05, { rate: 9, depth: 0.035 });
      stops.push(stopBed);
      break;
    }
    case 'breeze':
      stops.push(bed(engine, ctx, out, [filter(ctx, 'lowpass', 520)], 0.06, { rate: 0.1, depth: 0.04 }));
      break;
    case 'crickets': {
      const cricket = () => {
        const voice = pan(ctx, out, random(-0.9, 0.9));
        const pitch = random(4300, 4900);
        for (let index = 0; index < 3; index += 1) tone(ctx, voice, 'sine', pitch, pitch, 0.035, 0.025, index * 0.06);
      };
      stops.push(every(600, 1400, cricket));
      stops.push(every(900, 2000, cricket));
      break;
    }
    case 'water':
      stops.push(bed(engine, ctx, out, [filter(ctx, 'bandpass', 1100, 0.6)], 0.07, { rate: 0.6, depth: 0.025 }));
      stops.push(bed(engine, ctx, out, [filter(ctx, 'highpass', 3200)], 0.015, { rate: 1.3, depth: 0.01 }));
      break;
    case 'cave': {
      stops.push(bed(engine, ctx, out, [filter(ctx, 'lowpass', 160)], 0.09, { rate: 0.05, depth: 0.03 }));
      // Gotejamento com eco: atraso realimentado e abafado.
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.28;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.38;
      const damp = filter(ctx, 'lowpass', 2200);
      delay.connect(damp).connect(feedback).connect(delay);
      damp.connect(out);
      stops.push(
        every(1400, 4200, () => {
          const voice = pan(ctx, delay, random(-0.6, 0.6));
          tone(ctx, voice, 'sine', random(1200, 1600), 650, 0.06, 0.07);
          tone(ctx, out, 'sine', random(1200, 1600), 650, 0.06, 0.05);
        }),
      );
      stops.push(() => feedback.disconnect());
      break;
    }
    case 'rain':
      stops.push(bed(engine, ctx, out, [filter(ctx, 'highpass', 900), filter(ctx, 'lowpass', 7000)], 0.1, { rate: 0.3, depth: 0.015 }));
      break;
    case 'gusts':
      stops.push(bed(engine, ctx, out, [filter(ctx, 'bandpass', 600, 0.8)], 0.07, { rate: 0.12, depth: 0.065 }));
      break;
  }
  return () => stops.forEach((stop) => stop());
}

/* ---------- efeitos ---------- */

function playCue(engine: SoundEngine, ctx: Ctx, out: AudioNode, cue: AudioCue): void {
  switch (cue) {
    case 'slash':
      burst(engine, ctx, out, 'bandpass', 3500, 900, 0.18, 0.5, 1.5);
      break;
    case 'stab':
      burst(engine, ctx, out, 'highpass', 2500, 2500, 0.07, 0.45);
      tone(ctx, out, 'triangle', 900, 700, 0.05, 0.12);
      break;
    case 'shoot':
      tone(ctx, out, 'triangle', 260, 190, 0.18, 0.25);
      burst(engine, ctx, out, 'bandpass', 1500, 3500, 0.12, 0.2, 1, 0.03);
      break;
    case 'cast':
      tone(ctx, out, 'sine', 660, 660, 0.25, 0.14);
      tone(ctx, out, 'sine', 990, 990, 0.25, 0.12, 0.06);
      tone(ctx, out, 'sine', 1320, 1320, 0.3, 0.1, 0.12);
      break;
    case 'guard':
      tone(ctx, out, 'sine', 150, 90, 0.15, 0.4);
      tone(ctx, out, 'triangle', 620, 600, 0.2, 0.1);
      break;
    case 'dodge':
      burst(engine, ctx, out, 'bandpass', 500, 2200, 0.16, 0.3);
      break;
    case 'step':
      burst(engine, ctx, out, 'lowpass', 260, 200, 0.07, 0.45);
      break;
    case 'hit':
      tone(ctx, out, 'sine', 130, 55, 0.16, 0.6);
      burst(engine, ctx, out, 'lowpass', 1800, 600, 0.09, 0.35);
      break;
    case 'miss':
      burst(engine, ctx, out, 'bandpass', 900, 1800, 0.14, 0.18);
      break;
    case 'interrupt':
      tone(ctx, out, 'square', 620, 180, 0.16, 0.1);
      tone(ctx, out, 'square', 410, 120, 0.16, 0.07, 0.04);
      break;
    case 'combo':
      tone(ctx, out, 'triangle', 880, 880, 0.14, 0.2);
      tone(ctx, out, 'triangle', 1320, 1320, 0.22, 0.2, 0.09);
      break;
    case 'heal':
      tone(ctx, out, 'sine', 520, 780, 0.3, 0.2);
      break;
    case 'victory':
      [523, 659, 784, 1047].forEach((note, index) => tone(ctx, out, 'triangle', note, note, index === 3 ? 0.5 : 0.18, 0.2, index * 0.12));
      break;
    case 'defeat':
      [392, 330, 262].forEach((note, index) => tone(ctx, out, 'triangle', note, note, index === 2 ? 0.6 : 0.3, 0.18, index * 0.22));
      break;
    case 'system':
      tone(ctx, out, 'sine', 1318, 1318, 0.7, 0.2);
      tone(ctx, out, 'sine', 1976, 1976, 0.45, 0.07);
      break;
    case 'page':
      burst(engine, ctx, out, 'bandpass', 2600, 1800, 0.12, 0.12, 0.8);
      break;
  }
}
