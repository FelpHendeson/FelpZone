import { useCallback, useEffect, useRef } from 'react';
import { DayClock } from './dayClock';

export function useDayClock(running: boolean, speed: number, advance: (ticks: number) => Promise<void>) {
  const clock = useRef(new DayClock());
  const pending = useRef(false);
  const last = useRef(0);
  const progress = useRef<HTMLProgressElement>(null);
  const reset = useCallback(() => {
    clock.current = new DayClock(); last.current = performance.now();
    if (progress.current) progress.current.value = 0;
  }, []);
  useEffect(() => {
    if (!running) return;
    let stopped = false;
    last.current = performance.now();
    const tick = async () => {
      const now = performance.now(), elapsed = now - last.current;
      last.current = now;
      if (pending.current || document.hidden) return;
      const steps = clock.current.update(elapsed, speed);
      if (progress.current) progress.current.value = clock.current.progress;
      if (!steps) return;
      pending.current = true;
      try { await advance(steps); }
      finally {
        pending.current = false;
        last.current = performance.now();
      }
    };
    const timer = setInterval(() => { if (!stopped) void tick(); }, 100);
    return () => {
      stopped = true; clearInterval(timer);
      if (progress.current) progress.current.value = clock.current.progress;
    };
  }, [running, speed, advance]);
  return { progress, reset };
}
