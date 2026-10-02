import { useCallback, useEffect, useRef, useState } from 'react';
import { MINUTES_PER_DAY } from '../../modules/time';

/** Duração da animação do relógio: cresce com o tempo passado, entre ~0,4 s e 3 s. */
export function clockAnimationMs(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.round(Math.min(3000, 300 + 900 * Math.log2(1 + minutes / 30)));
}

function prefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

/**
 * Relógio exibido: quando o horário do mundo avança, o mostrador corre do antigo ao novo
 * em alguns segundos. O motor já resolveu a ação; isto é só apresentação, pulável no toque.
 */
export function useAnimatedClock(day: number, minute: number): {
  day: number;
  minute: number;
  elapsed: number;
  animating: boolean;
  skip: () => void;
} {
  const target = (day - 1) * MINUTES_PER_DAY + minute;
  const [shown, setShown] = useState(target);
  const [elapsed, setElapsed] = useState(0);
  const frame = useRef<number | null>(null);
  const shownRef = useRef(target);

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  useEffect(() => {
    const from = shownRef.current;
    const delta = target - from;
    stop();
    const duration = clockAnimationMs(delta);
    if (delta <= 0 || duration === 0 || prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      shownRef.current = target;
      setShown(target);
      setElapsed(0);
      return;
    }
    setElapsed(delta);
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const value = Math.round(from + delta * eased);
      shownRef.current = value;
      setShown(value);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        frame.current = null;
        setElapsed(0);
      }
    };
    frame.current = requestAnimationFrame(tick);
    return stop;
  }, [target, stop]);

  const skip = useCallback(() => {
    stop();
    shownRef.current = target;
    setShown(target);
    setElapsed(0);
  }, [stop, target]);

  return {
    day: Math.floor(shown / MINUTES_PER_DAY) + 1,
    minute: shown % MINUTES_PER_DAY,
    elapsed,
    animating: elapsed > 0,
    skip,
  };
}
