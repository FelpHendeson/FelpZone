import { expect, it } from 'vitest';
import { DayClock, NORMAL_DAY_MS, SPEEDS, TICKS_PER_DAY } from './dayClock';

it.each(SPEEDS)('a velocidade %s× mantém vinte passos por dia e a duração selecionada', speed => {
  const clock = new DayClock();
  let steps = 0;
  const duration = NORMAL_DAY_MS / speed;
  for (let elapsed = 0; elapsed < duration; elapsed += 50) steps += clock.update(Math.min(50, duration - elapsed), speed);
  expect(steps).toBe(TICKS_PER_DAY);
  expect(clock.progress).toBeCloseTo(0);
});
it('os habitantes recebem atualizações antes do primeiro dia terminar', () => {
  const clock = new DayClock();
  expect(clock.update(250, 1)).toBe(0);
  expect(clock.update(250, 1)).toBe(1);
  expect(clock.progress).toBeCloseTo(0.05);
});
it('preserva frações ao pausar e mudar a velocidade', () => {
  const clock = new DayClock();
  clock.update(200, 1);
  clock.update(200, 0);
  expect(clock.progress).toBeCloseTo(0.02);
  expect(clock.update(150, 2)).toBe(1);
  expect(clock.progress).toBeCloseTo(0.05);
});
it('limita atrasos sem fila de recuperação e ignora entradas inválidas', () => {
  const clock = new DayClock();
  expect(clock.update(60000, 10)).toBe(5);
  expect(clock.update(0, 1)).toBe(0);
  expect(clock.update(NaN, 1)).toBe(0);
  expect(clock.update(1, Infinity)).toBe(0);
  expect(clock.update(-500, 1)).toBe(0);
});
