import { describe, expect, it } from 'vitest';
import { populateWorld } from '../simulation/creatures';
import { createWorld } from '../simulation/world';
import { elementOf, genesisOrder } from '../simulation/beings';
import { GENESIS, genesisText, genesisTimeline, revealTimes, revealUpTo, stepAt } from './genesis';

const world = populateWorld(createWorld('origem-001', 48));

describe('gênese animada', () => {
  it('as Regras falam, cada deus age na ordem do mundo e por fim surge a espécie', () => {
    const steps = genesisTimeline(world);
    expect(steps.map(s => s.kind)).toEqual(['rules', 'god', 'god', 'god', 'god', 'god', 'species', 'end']);
    expect(steps.filter(s => s.kind === 'god').map(s => s.kind === 'god' && s.def.id)).toEqual(genesisOrder(world).map(d => d.id));
    for (let i = 1; i < steps.length; i++) expect(steps[i].start).toBe(steps[i - 1].start + steps[i - 1].duration);
    expect(steps.at(-1)!.start).toBe(GENESIS.rules + 5 * GENESIS.god + GENESIS.species);
    expect(genesisTimeline(createWorld('origem-001', 48)).map(s => s.kind)).not.toContain('species');
  });
  it('cada passo revela só o que já foi criado', () => {
    const steps = genesisTimeline(world);
    expect(revealUpTo(steps, 0)).toEqual({ elements: new Set(), gods: new Set(), sources: false, life: false });
    const first = steps[1];
    expect(first.kind === 'god' && revealUpTo(steps, 1).gods.has(first.def.id)).toBe(true);
    const essenceStep = steps.findIndex(s => s.kind === 'god' && s.def.element === 'essence');
    expect(revealUpTo(steps, essenceStep - 1).sources).toBe(false);
    expect(revealUpTo(steps, essenceStep).sources).toBe(true);
    expect(revealUpTo(steps, steps.length - 2).life).toBe(true);
    expect(revealUpTo(steps, steps.length - 3).life).toBe(false);
    expect(stepAt(steps, 0)).toBe(0);
    expect(stepAt(steps, GENESIS.rules + 0.01)).toBe(1);
    expect(stepAt(steps, 999)).toBe(steps.length - 1);
  });
  it('cada região surge no passo do deus do seu elemento, em onda a partir da morada', () => {
    const steps = genesisTimeline(world), times = revealTimes(world, steps);
    world.cells.forEach((cell, i) => {
      const step = steps.find(s => s.kind === 'god' && s.def.element === elementOf[cell.terrain])!;
      expect(times[i]).toBeGreaterThanOrEqual(step.start);
      expect(times[i]).toBeLessThan(step.start + step.duration);
    });
    const water = steps.find(s => s.kind === 'god' && s.def.element === 'water');
    if (water?.kind !== 'god') throw new Error('sem deus da água');
    const waterCells = world.cells.flatMap((c, i) => c.terrain === 'water' ? [i] : []);
    const distance = (i: number) => Math.abs(i % world.size - water.home % world.size) + Math.abs(Math.floor(i / world.size) - Math.floor(water.home / world.size));
    const nearest = waterCells.reduce((a, b) => distance(a) <= distance(b) ? a : b), farthest = waterCells.reduce((a, b) => distance(a) >= distance(b) ? a : b);
    expect(times[nearest]).toBeLessThan(times[farthest]);
  });
  it('tem uma frase para cada passo', () => {
    for (const step of genesisTimeline(world)) expect(genesisText(step).length).toBeGreaterThan(20);
  });
});
