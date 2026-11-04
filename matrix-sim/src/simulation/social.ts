import { random, remember, type Creature, type LifeEvent } from './creatures';
import { edibleFood } from './food';
import type { World } from './world';
import { TICKS_PER_DAY } from './dayClock';
import { adaptBand, bandProfile, bandStrength, learnFromConflict } from './bands';

const distance = (a: Creature, b: Creature) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function sentiment(c: Creature, other: Creature, day: number, fear: number, anger: number) {
  const previous = c.relations.find(r => r.id === other.id);
  c.relations = [...c.relations.filter(r => r.id !== other.id), {
    id: other.id, fear: Math.min(1, (previous?.fear ?? 0) + fear),
    anger: Math.min(1, (previous?.anger ?? 0) + anger), lastDay: day,
  }].slice(-6);
}

/** Local, nonlethal disputes. Different origins alone never trigger aggression. */
export function advanceSocialLife(world: World, elapsedDays = 1): World {
  const creatures = world.life.creatures.map(c => ({ ...c, history: [...c.history], relations: c.relations.map(r => ({ ...r })) }));
  const bands = world.life.bands.map(b => ({ ...b, history: [...b.history] })), events = [...world.life.events];
  const profiles = new Map(bands.map(b => [b.id, bandProfile(b)]));
  const log = (kind: LifeEvent['kind'], c: Creature, text: string) => {
    remember(c, world.day, text); events.push({ day: world.day, kind, creatureId: c.id, text });
  };
  for (const band of bands) {
    const members = creatures.filter(c => c.bandId === band.id);
    if (!members.some(c => c.id === band.leaderId)) {
      const successor = [...members].sort((a, b) => b.age - a.age || b.energy - a.energy || a.id - b.id)[0];
      band.leaderId = successor?.id ?? null;
      if (successor) log('leadership', successor, `Folhim #${successor.id} assumiu a liderança de ${band.name} após a saída do líder anterior.`);
    }
    if (world.tick === 0) adaptBand(world, band, members);
  }
  // Spatial buckets keep encounters local rather than scanning every pair of inhabitants.
  const positions = new Map<number, Creature[]>();
  for (const c of creatures) {
    const index = c.y * world.size + c.x;
    positions.set(index, [...(positions.get(index) ?? []), c]);
  }
  const moment = world.day * TICKS_PER_DAY + world.tick;
  const offset = moment % Math.max(1, creatures.length);
  for (const c of [...creatures.slice(offset), ...creatures.slice(0, offset)]) {
    if (c.age < 28 || c.energy < 18 || world.day - c.lastConflictDay < 12) continue;
    const index = c.y * world.size + c.x;
    const nearby = [index, index - 1, index + 1, index - world.size, index + world.size]
      .flatMap(i => positions.get(i) ?? []).filter(other => other.id !== c.id && distance(c, other) <= 1)
      .sort((a, b) => a.id - b.id);
    for (const other of nearby) {
      if (other.age < 28 || other.energy < 18 || world.day - other.lastConflictDay < 12) continue;
      const relation = c.relations.find(r => r.id === other.id);
      if ((relation?.fear ?? 0) > 0.25) continue;
      const band = bands.find(b => b.id === c.bandId);
      const otherBand = bands.find(b => b.id === other.bandId);
      const leadership = c.bandId === other.bandId && band?.leaderId === other.id && c.energy >= 70 && c.temperament > other.temperament + 0.15;
      const scarce = c.energy < 65 && edibleFood(world.cells[index].vegetation) < 3;
      const resentment = (relation?.anger ?? 0) > 0.4;
      const territorial = c.bandId !== other.bandId && band && band.aggression > 0.75 && c.energy >= 65 && Math.abs(c.x - band.home % world.size) + Math.abs(c.y - Math.floor(band.home / world.size)) <= 5;
      if (!leadership && !scarce && !resentment && !territorial) continue;
      const chance = leadership ? 0.12 : (0.05 + c.temperament * 0.2 + (relation?.anger ?? 0) * 0.15) * (0.6 + (band?.aggression ?? 0.5) * 0.8);
      if (random(world.seed, c.id * 211 + other.id, moment, 15) >= 1 - (1 - chance) ** elapsedDays) continue;
      const allies = nearby.filter(a => a.id !== other.id && a.bandId === other.bandId && a.energy >= 18).length;
      const strength = (a: Creature) => a.energy / 100 + a.temperament * 0.35 + random(world.seed, a.id, moment, 16) * 0.5 + bandStrength(a.id === c.id ? band : otherBand, a.id !== c.id, a.id !== c.id ? allies : 0);
      const winner = strength(c) >= strength(other) ? c : other, loser = winner === c ? other : c;
      // Energy loss is capped: a dispute cannot kill or provide food.
      for (const participant of [c, other]) { participant.energy = Math.max(1, participant.energy - 6); participant.lastConflictDay = world.day; }
      winner.action = 'disputing'; loser.action = 'fleeing';
      winner.moving = loser.moving = false;
      if (c.bandId !== other.bandId) {
        if (band) learnFromConflict(band, true, winner.id === c.id);
        if (otherBand) learnFromConflict(otherBand, false, winner.id === other.id);
      }
      sentiment(loser, winner, world.day, 0.75, 0.55);
      sentiment(winner, loser, world.day, 0.08, 0.25);
      const scope = c.bandId === other.bandId ? 'dentro do bando' : c.variant === other.variant ? 'entre bandos da mesma variação' : 'entre Bosque e Campina';
      const reason = leadership ? 'pela liderança' : scarce ? 'por alimento escasso' : resentment ? 'por uma agressão lembrada' : 'pela área do bando';
      const text = `Disputa ${scope} ${reason}: #${winner.id} prevaleceu e #${loser.id} recuou.`;
      log('conflict', winner, text); remember(loser, world.day, text);
      if (leadership && band && winner.id !== band.leaderId) {
        band.leaderId = winner.id;
        log('leadership', winner, `Folhim #${winner.id} tomou a liderança de ${band.name}, antes de #${loser.id}.`);
      }
      break; // At most one encounter per individual within the cooldown.
    }
  }
  for (const band of bands) {
    const profile = bandProfile(band);
    if (profile !== profiles.get(band.id) && world.day - band.lastCultureDay >= 7) {
      band.lastCultureDay = world.day;
      const text = `${band.name} passou de ${profiles.get(band.id)?.toLocaleLowerCase('pt-BR')} para ${profile.toLocaleLowerCase('pt-BR')}.`;
      band.history = [...band.history, { day: world.day, text }].slice(-5);
      events.push({ day: world.day, kind: 'culture', creatureId: band.leaderId ?? 0, text });
    }
  }
  return { ...world, life: { ...world.life, creatures, bands, events: events.slice(-40) } };
}
