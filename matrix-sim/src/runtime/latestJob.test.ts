import { expect, it, vi } from 'vitest';
import { LatestJob } from './latestJob';

it('limita a fila ao trabalho atual e ao estado mais recente', async () => {
  const releases: ((value: number) => void)[] = [];
  const run = vi.fn((value: number) => new Promise<number>(resolve => releases.push(() => resolve(value))));
  const publish = vi.fn(), discard = vi.fn();
  const queue = new LatestJob(run, publish, discard, vi.fn());
  queue.submit(0);
  for (let i = 1; i <= 100; i++) queue.submit(i);
  expect(run.mock.calls).toEqual([[0]]);
  releases.shift()!(0);
  await vi.waitFor(() => expect(run.mock.calls).toEqual([[0], [100]]));
  expect(publish).not.toHaveBeenCalled();
  expect(discard).toHaveBeenCalledWith(0);
  releases.shift()!(100);
  await vi.waitFor(() => expect(publish).toHaveBeenCalledWith(100));
});

it('libera o resultado de um trabalho encerrado e não começa o que ficou pendente', async () => {
  let release!: (value: number) => void;
  const run = vi.fn(() => new Promise<number>(resolve => { release = resolve; }));
  const publish = vi.fn(), discard = vi.fn();
  const queue = new LatestJob<number, number>(run, publish, discard, vi.fn());
  queue.submit(1); queue.submit(2); queue.dispose(); release(1);
  await vi.waitFor(() => expect(discard).toHaveBeenCalledWith(1));
  expect(run).toHaveBeenCalledTimes(1);
  expect(publish).not.toHaveBeenCalled();
});

it('continua com o estado mais recente depois de uma falha', async () => {
  const failure = new Error('falha');
  const run = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(2);
  const publish = vi.fn(), onError = vi.fn();
  const queue = new LatestJob<number, number>(run, publish, vi.fn(), onError);
  queue.submit(1);
  await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(failure));
  queue.submit(2);
  await vi.waitFor(() => expect(publish).toHaveBeenCalledWith(2));
});

it('permite publicar um quadro compatível enquanto outro mais novo aguarda, evitando starvation', async () => {
  let release!: (value: number) => void;
  const run = vi.fn(() => new Promise<number>(resolve => { release = resolve; }));
  const publish = vi.fn();
  const queue = new LatestJob<number, number>(run, publish, vi.fn(), vi.fn(), (older, newer) => older <= newer);
  queue.submit(1); queue.submit(2); release(1);
  await vi.waitFor(() => expect(publish).toHaveBeenCalledWith(1));
  queue.dispose(); release(2);
});
