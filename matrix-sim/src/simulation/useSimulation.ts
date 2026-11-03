import { useCallback, useEffect, useRef, useState } from 'react';
import { WorkerClient } from '../runtime/workerClient';
import { profile } from '../runtime/performance';
import { createWorld, type World } from './world';
import { populateWorld } from './creatures';
import type { SimulationCommand, SimulationResult } from './simulation.worker';
import { applyFrame } from './frame';

export function useSimulation() {
  const [world, setWorld] = useState(() => populateWorld(createWorld('origem-001')));
  const initial = useRef(world);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const engine = useRef<WorkerClient<SimulationCommand, SimulationResult> | null>(null);
  const ready = useRef<Promise<SimulationResult> | null>(null);
  const epoch = useRef(0);
  const stepping = useRef(false);
  useEffect(() => {
    let client: WorkerClient<SimulationCommand, SimulationResult>;
    try { client = new WorkerClient(new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' })); }
    catch { setError('Este navegador não conseguiu iniciar a simulação em segundo plano.'); return; }
    engine.current = client;
    const preparation = client.request({ type: 'reset', world: initial.current });
    ready.current = preparation;
    preparation.catch(error => { if (engine.current === client) setError(String(error)); });
    return () => { engine.current = null; client.dispose(); };
  }, []);
  const replaceWorld = useCallback((next: World) => {
    epoch.current++;
    setWorld(next); setError('');
    if (!engine.current) return;
    const preparation = engine.current.request({ type: 'reset', world: next });
    ready.current = preparation;
    preparation.catch(error => setError(String(error)));
  }, []);
  const advance = useCallback(async (ticks: number) => {
    if (stepping.current || !engine.current) return;
    const generation = epoch.current, client = engine.current;
    stepping.current = true; setBusy(true);
    try {
      await ready.current;
      if (generation !== epoch.current || engine.current !== client) return;
      const result = await client.request({ type: 'advance', ticks });
      if (generation === epoch.current && engine.current === client) {
        const frame = result.frame;
        if (frame) setWorld(previous => applyFrame(previous, frame));
        profile('matrix-simulation-worker-ms', Math.round(result.elapsed));
      }
    } catch (error) { if (generation === epoch.current && engine.current === client) setError(String(error)); }
    finally { stepping.current = false; setBusy(false); }
  }, []);
  return { world, replaceWorld, advance, busy, error };
}
