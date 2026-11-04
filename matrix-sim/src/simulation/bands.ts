import { random, type Variant, type Creature } from './creatures';
import type { World } from './world';

export type Band = {
  id: number; name: string; variant: Variant; leaderId: number | null; origin: number; home: number;
  attack: number; defense: number; cohesion: number; aggression: number;
  wins: number; losses: number; updatedDay: number; lastCultureDay: number;
  history: { day: number; text: string }[];
};
const clamp = (n: number) => Math.max(0.1, Math.min(0.95, n));
export const bandColor = (id: number) => ['#72cda5', '#eeaa78', '#b9a4ec', '#7bbfe5', '#e5bc67', '#df91b4', '#a8c576', '#8bcaca'][(id - 1) % 8];
export function bandProfile(b: Band) {
  if (b.defense > b.attack + 0.12) return 'Defensivo';
  if (b.attack > b.defense + 0.12 || b.aggression > 0.7) return 'Ousado';
  if (b.cohesion > 0.68) return 'Coeso';
  return 'Equilibrado';
}
export function createBand(world: World, id: number, name: string, variant: Variant, origin: number): Band {
  return { id, name, variant, origin, home: origin, leaderId: null,
    attack: 0.25 + random(world.seed, id, world.day, 20) * 0.45,
    defense: 0.25 + random(world.seed, id, world.day, 21) * 0.4 + (variant === 'bosque' ? 0.12 : 0),
    cohesion: 0.35 + random(world.seed, id, world.day, 22) * 0.45,
    aggression: 0.2 + random(world.seed, id, world.day, 23) * 0.5,
    wins: 0, losses: 0, updatedDay: world.day, lastCultureDay: world.day,
    history: [{ day: world.day, text: 'O bando começou a ocupar esta região.' }],
  };
}

/** Strength varies by role, and nearby allies help the defender hold their ground. */
export function bandStrength(band: Band | undefined, defending: boolean, allies: number) {
  if (!band) return 0;
  return (defending ? band.defense : band.attack) * 0.4 + (defending ? Math.min(3, allies) * band.cohesion * 0.08 : 0);
}
export function learnFromConflict(band: Band, attacking: boolean, won: boolean) {
  if (attacking) band.attack = clamp(band.attack + 0.015);
  else band.defense = clamp(band.defense + 0.015);
  if (won) { band.wins++; band.aggression = clamp(band.aggression + 0.025); }
  else { band.losses++; band.defense = clamp(band.defense + 0.025); band.cohesion = clamp(band.cohesion + 0.015); band.aggression = clamp(band.aggression - 0.02); }
}

/** Once per day: slow adaptation to the leader, hunger and fear; home follows the group. */
export function adaptBand(world: World, band: Band, members: Creature[]) {
  if (!members.length || band.updatedDay >= world.day) return;
  band.updatedDay = world.day;
  const leader = members.find(c => c.id === band.leaderId) ?? members[0];
  const hunger = members.reduce((sum, c) => sum + Math.max(0, (65 - c.energy) / 65), 0) / members.length;
  const fear = members.reduce((sum, c) => sum + Math.max(0, ...c.relations.map(r => r.fear)), 0) / members.length;
  const approach = (value: number, target: number) => clamp(value + (target - value) * 0.02);
  band.attack = approach(band.attack, 0.25 + leader.temperament * 0.5 + hunger * 0.15);
  band.defense = approach(band.defense, 0.4 + fear * 0.45);
  band.cohesion = approach(band.cohesion, 0.45 + fear * 0.4);
  band.aggression = approach(band.aggression, 0.2 + leader.temperament * 0.5 + hunger * 0.2);
  const cx = members.reduce((sum, c) => sum + c.x, 0) / members.length;
  const cy = members.reduce((sum, c) => sum + c.y, 0) / members.length;
  // Anchor on a real member: an average coordinate could land inside a lake or mountain.
  const anchor = members.reduce((best, c) => Math.abs(c.x - cx) + Math.abs(c.y - cy) < Math.abs(best.x - cx) + Math.abs(best.y - cy) ? c : best);
  band.home = anchor.y * world.size + anchor.x;
}
