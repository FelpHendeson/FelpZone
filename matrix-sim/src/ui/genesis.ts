import { creatorOf, elementOf, genesisOrder, type BeingDefinition, type Element } from '../simulation/beings';
import type { World } from '../simulation/world';

/** The genesis as a timeline in seconds: the Rules speak, each god shapes its element, a species is created. */
export type GenesisStep =
  | { kind: 'rules'; start: number; duration: number }
  | { kind: 'god'; start: number; duration: number; def: BeingDefinition; home: number }
  | { kind: 'species'; start: number; duration: number; def: BeingDefinition; home: number }
  | { kind: 'end'; start: number; duration: number };
export const GENESIS = { rules: 4.5, god: 5, species: 4.5, spread: 3.2, fade: 0.8 } as const;

export function genesisTimeline(world: World): GenesisStep[] {
  const steps: GenesisStep[] = [{ kind: 'rules', start: 0, duration: GENESIS.rules }];
  let t = GENESIS.rules;
  for (const def of genesisOrder(world)) {
    const home = world.beings.find(b => b.id === def.id)!.home;
    steps.push({ kind: 'god', start: t, duration: GENESIS.god, def, home }); t += GENESIS.god;
  }
  const creator = creatorOf('Folhins');
  const creatorState = creator && world.beings.find(b => b.id === creator.id);
  if (creator && creatorState && world.life.creatures.length) { steps.push({ kind: 'species', start: t, duration: GENESIS.species, def: creator, home: creatorState.home }); t += GENESIS.species; }
  steps.push({ kind: 'end', start: t, duration: 0 });
  return steps;
}
export function stepAt(steps: GenesisStep[], seconds: number) {
  let index = 0;
  steps.forEach((s, i) => { if (s.start <= seconds) index = i; });
  return index;
}

/** What the map may show once a step has begun: revealed elements, present gods, sources and life. */
export type Reveal = { elements: Set<Element>; gods: Set<string>; sources: boolean; life: boolean };
export function revealUpTo(steps: GenesisStep[], step: number): Reveal {
  const reveal: Reveal = { elements: new Set(), gods: new Set(), sources: false, life: false };
  for (const s of steps.slice(0, step + 1)) {
    if (s.kind === 'god') { reveal.elements.add(s.def.element); reveal.gods.add(s.def.id); if (s.def.element === 'essence') reveal.sources = true; }
    if (s.kind === 'species') reveal.life = true;
    if (s.kind === 'end') reveal.life = reveal.sources = true;
  }
  return reveal;
}

/**
 * Seconds at which each cell starts to appear: its element's god shapes it in a wave that leaves the god's home.
 * Cells with no god in this world appear at the end.
 */
export function revealTimes(world: World, steps: GenesisStep[]) {
  const times = new Float32Array(world.cells.length);
  const end = steps.at(-1)!.start;
  const byElement = new Map<Element, Extract<GenesisStep, { kind: 'god' }>>();
  for (const s of steps) if (s.kind === 'god') byElement.set(s.def.element, s);
  const maxDistance = world.size * 2;
  world.cells.forEach((cell, i) => {
    const step = byElement.get(elementOf[cell.terrain]);
    if (!step) { times[i] = end; return; }
    const d = Math.abs(cell.x - step.home % world.size) + Math.abs(cell.y - Math.floor(step.home / world.size));
    times[i] = step.start + 0.6 + Math.sqrt(d / maxDistance) * GENESIS.spread;
  });
  return times;
}

/** The narration of a step, for the caption and for the Voice. */
export function genesisText(step: GenesisStep) {
  if (step.kind === 'rules') return 'As Regras da Existência criaram uma entidade suprema para cada elemento e lhes deram uma missão: dar forma ao mundo, criar a vida e a morte, manter o equilíbrio e fazê-lo evoluir.';
  if (step.kind === 'god') return step.def.genesis;
  if (step.kind === 'species') return `${step.def.name}, ${step.def.epithet}, moldou os primeiros ${step.def.creates} com folhas e sementes e os soltou no mundo.`;
  return 'O mundo está formado. Agora ele segue por conta própria.';
}
