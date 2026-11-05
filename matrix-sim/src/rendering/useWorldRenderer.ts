import { useEffect, useRef, useState, type RefObject } from 'react';
import { LatestJob } from '../runtime/latestJob';
import { WorkerClient } from '../runtime/workerClient';
import { profile } from '../runtime/performance';
import type { World } from '../simulation/world';
import type { Layer } from './drawWorld';
import type { RenderCommand, RenderResult } from './render.worker';

export function useWorldRenderer(canvas: RefObject<HTMLCanvasElement | null>, world: World, layer: Layer) {
  const queue = useRef<LatestJob<RenderCommand, RenderResult> | null>(null);
  const [error, setError] = useState('');
  const latest = useRef<RenderCommand>({ world, layer });
  const scheduled = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDraw = useRef(-Infinity);
  useEffect(() => {
    if (typeof OffscreenCanvas === 'undefined') { setError('O desenho em segundo plano exige um navegador com OffscreenCanvas.'); return; }
    let client: WorkerClient<RenderCommand, RenderResult>;
    try { client = new WorkerClient(new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' })); }
    catch { setError('Não foi possível iniciar o desenho em segundo plano. Recarregue a página.'); return; }
    const jobs = new LatestJob<RenderCommand, RenderResult>(
      command => client.request(command),
      result => {
        const started = performance.now();
        try {
          const target = canvas.current;
          if (!target) return;
          if (target.width !== result.bitmap.width) target.width = result.bitmap.width;
          if (target.height !== result.bitmap.height) target.height = result.bitmap.height;
          const ctx = target.getContext('2d');
          if (!ctx) throw new Error('Não foi possível apresentar o mapa.');
          ctx.drawImage(result.bitmap, 0, 0);
          setError('');
          profile('matrix-present-ms', Number((performance.now() - started).toFixed(2)), 'worker-render-ms', Math.round(result.elapsed));
        } finally { result.bitmap.close(); }
      },
      result => result.bitmap.close(),
      error => setError(error instanceof Error ? error.message : String(error)),
      (older, newer) => older.layer === newer.layer && older.world.seed === newer.world.seed && older.world.size === newer.world.size && older.world.waterLevel === newer.world.waterLevel && older.world.day <= newer.world.day,
    );
    queue.current = jobs;
    return () => { if (scheduled.current !== null) clearTimeout(scheduled.current); scheduled.current = null; queue.current = null; jobs.dispose(); client.dispose(); };
  }, [canvas]);
  useEffect(() => {
    const previous = latest.current;
    latest.current = { world, layer };
    const viewChanged = previous.layer !== layer || previous.world.seed !== world.seed || previous.world.waterLevel !== world.waterLevel || previous.world.size !== world.size || world.day < previous.world.day;
    const submit = () => { scheduled.current = null; lastDraw.current = performance.now(); queue.current?.submit(latest.current); };
    if (viewChanged || performance.now() - lastDraw.current >= 1000) {
      if (scheduled.current !== null) clearTimeout(scheduled.current);
      submit();
    } else if (scheduled.current === null) scheduled.current = setTimeout(submit, 1000 - (performance.now() - lastDraw.current));
  }, [world, layer]);
  return error;
}
