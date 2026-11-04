import type { LifeEvent } from '../simulation/creatures';
import { climateAt, type World } from '../simulation/world';

export type VoiceKind = LifeEvent['kind'] | 'season' | 'extinction' | 'genesis';
export type VoiceEntry = { key: string; kind: VoiceKind; day: number; text: string; creatureId: number | null };
export const voiceStyle: Record<VoiceKind, { label: string; icon: string }> = {
  arrival: { label: 'Chegada', icon: '✦' }, birth: { label: 'Nascimento', icon: '✿' }, death: { label: 'Morte', icon: '✝' },
  conflict: { label: 'Disputa', icon: '⚔' }, leadership: { label: 'Liderança', icon: '◆' }, culture: { label: 'Cultura', icon: '❖' },
  season: { label: 'Estação', icon: '☀' }, extinction: { label: 'Extinção', icon: '✕' },
  essence: { label: 'Despertar', icon: '✧' }, genesis: { label: 'Gênese', icon: '◎' },
};
/** Kinds the world "announces" over the map; births, deaths and disputes stay in the feed only. */
const announced = new Set<VoiceKind>(['arrival', 'leadership', 'culture', 'season', 'extinction', 'essence', 'genesis']);

/** The first words of a new world: where its essence surfaces. */
export function worldGenesis(world: World): VoiceEntry[] {
  const names = world.essenceSources.map(s => s.name);
  if (!names.length) return [];
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`;
  return [{ key: `${world.seed}:genesis`, kind: 'genesis', day: world.day, text: `A essência aflora em ${names.length === 1 ? 'uma nascente' : `${names.length} nascentes`}: ${list}.`, creatureId: null }];
}

const eventKey = (e: LifeEvent) => `${e.day}:${e.kind}:${e.creatureId}:${e.text}`;
export function fromEvent(e: LifeEvent): VoiceEntry {
  return { key: eventKey(e), kind: e.kind, day: e.day, text: e.text, creatureId: e.creatureId || null };
}

/** World-level facts that are not stored as life events: a new season and bands that vanished. */
export function chronicleChanges(previous: World, next: World): VoiceEntry[] {
  if (previous.seed !== next.seed || next.day <= previous.day) return [];
  const entries: VoiceEntry[] = [];
  const before = climateAt(previous.seed, previous.day), after = climateAt(next.seed, next.day);
  if (before.season !== after.season) entries.push({ key: `${next.day}:season`, kind: 'season', day: next.day, text: `Começou ${after.season === 'Primavera' ? 'a' : 'o'} ${after.season} do ano ${after.year}.`, creatureId: null });
  const alive = (world: World, id: number) => world.life.creatures.some(c => c.bandId === id);
  for (const band of next.life.bands) if (alive(previous, band.id) && !alive(next, band.id)) {
    entries.push({ key: `${next.day}:extinction:${band.id}`, kind: 'extinction', day: next.day, text: `O bando ${band.name} desapareceu do mundo.`, creatureId: null });
  }
  return entries;
}

/** Newest first. Life events roll off after 40 entries, so the chronicle fills older gaps. */
export function voiceFeed(events: LifeEvent[], chronicle: VoiceEntry[], limit = 40): VoiceEntry[] {
  const merged = [...events.map(fromEvent), ...chronicle].map((entry, order) => ({ entry, order }));
  return merged.sort((a, b) => b.entry.day - a.entry.day || b.order - a.order).slice(0, limit).map(({ entry }) => entry);
}

/** Entries that appeared between two states and deserve a banner over the map. A new world starts with nothing known. */
export function newAnnouncements(previous: World | null, next: World, chronicle: VoiceEntry[]): VoiceEntry[] {
  const known = new Set(previous?.seed === next.seed ? previous.life.events.map(eventKey) : []);
  return [...next.life.events.filter(e => !known.has(eventKey(e))).map(fromEvent), ...chronicle].filter(e => announced.has(e.kind));
}
