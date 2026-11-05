import { useEffect, useMemo, useRef } from 'react';
import type { World } from '../simulation/world';
import { GENESIS, revealTimes, stepAt, type GenesisStep } from './genesis';

type Props = { world: World; steps: GenesisStep[]; startedAt: number; onStep: (index: number) => void };
const VOID = [5, 8, 14] as const;

/**
 * Draws the genesis over the finished map: a void that each god pushes back from its home, and the light of the god
 * at work. The world underneath is already complete; the overlay only decides what may be seen yet.
 */
export function GenesisOverlay({ world, steps, startedAt, onStep }: Props) {
  const mask = useRef<HTMLCanvasElement>(null), light = useRef<HTMLCanvasElement>(null);
  const times = useMemo(() => revealTimes(world, steps), [world.seed, world.size, steps]);
  const step = useRef(-1);
  useEffect(() => {
    const maskCanvas = mask.current, lightCanvas = light.current;
    if (!maskCanvas || !lightCanvas) return;
    const size = world.size, unit = 8;
    maskCanvas.width = maskCanvas.height = size;
    lightCanvas.width = lightCanvas.height = size * unit;
    const m = maskCanvas.getContext('2d'), l = lightCanvas.getContext('2d');
    if (!m || !l) return;
    const image = m.createImageData(size, size);
    // A faint, fixed grain keeps the void from looking like a flat hole. The hash is mixed so stars do not line up.
    const mix = (i: number) => { let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return (h ^ h >>> 16) >>> 0; };
    const grain = Uint8Array.from({ length: size * size }, (_, i) => { const h = mix(i + size * 7919); return h % 61 === 0 ? 70 : h % 9; });
    let frame = 0;
    const draw = (now: number) => {
      const t = (now - startedAt) / 1000;
      const current = stepAt(steps, t);
      if (current !== step.current) { step.current = current; onStep(current); }
      for (let i = 0; i < times.length; i++) {
        const shown = Math.max(0, Math.min(1, (t - times[i]) / GENESIS.fade));
        const o = i * 4;
        image.data[o] = VOID[0] + grain[i]; image.data[o + 1] = VOID[1] + grain[i]; image.data[o + 2] = VOID[2] + grain[i] * 1.4;
        image.data[o + 3] = Math.round((1 - shown) * 255);
      }
      m.putImageData(image, 0, 0);
      l.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
      const s = steps[current];
      if (s.kind === 'god' || s.kind === 'species') {
        const local = t - s.start, x = (s.home % size + 0.5) * unit, y = (Math.floor(s.home / size) + 0.5) * unit;
        const color = s.def.color;
        // The god's light at its home, and the wave of creation leaving it.
        const glow = l.createRadialGradient(x, y, 0, x, y, unit * 9);
        glow.addColorStop(0, `${color}cc`); glow.addColorStop(0.35, `${color}44`); glow.addColorStop(1, `${color}00`);
        l.fillStyle = glow; l.beginPath(); l.arc(x, y, unit * 9, 0, Math.PI * 2); l.fill();
        for (const delay of [0, 0.9, 1.8]) {
          const wave = local - delay;
          if (wave <= 0 || wave > GENESIS.spread + 1) continue;
          const radius = Math.sqrt(wave / (GENESIS.spread + 1)) * size * unit * (s.kind === 'species' ? 0.25 : 1.1);
          l.strokeStyle = color; l.globalAlpha = Math.max(0, 1 - wave / (GENESIS.spread + 1)) * 0.8; l.lineWidth = unit * 0.8;
          l.beginPath(); l.arc(x, y, radius, 0, Math.PI * 2); l.stroke(); l.globalAlpha = 1;
        }
      }
      if (current < steps.length - 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [world.size, steps, startedAt, times, onStep]);
  return <>
    <canvas ref={mask} className="genesis-mask" aria-hidden="true" />
    <canvas ref={light} className="genesis-light" aria-hidden="true" />
  </>;
}
