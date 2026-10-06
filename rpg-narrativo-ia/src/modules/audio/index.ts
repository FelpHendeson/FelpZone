import catalogJson from '../../../content/first-day/system/audio.json' with { type: 'json' };
import { ACTION_POSES, type ActionPose } from '../combat';
import { DEFAULT_PERIODS } from '../time';

/**
 * Som do jogo como dado: que camadas de ambiente tocam em cada período, local e clima, e que
 * som curto acompanha cada pose ou acontecimento. Os sons em si são da interface; o som nunca
 * toca nas regras nem no save.
 */
export const AMBIENCE_BEDS = [
  'night-wind',
  'dawn-birds',
  'birds',
  'leaves',
  'insects',
  'breeze',
  'crickets',
  'water',
  'cave',
  'rain',
  'gusts',
] as const;
export type AmbienceBed = (typeof AMBIENCE_BEDS)[number];

export const AUDIO_CUES = [
  'slash',
  'stab',
  'shoot',
  'cast',
  'guard',
  'dodge',
  'step',
  'hit',
  'miss',
  'interrupt',
  'combo',
  'heal',
  'victory',
  'defeat',
  'system',
  'page',
] as const;
export type AudioCue = (typeof AUDIO_CUES)[number];

export const AUDIO_EVENTS = ['hit', 'miss', 'evade', 'interrupt', 'combo', 'out-of-range', 'victory', 'defeat', 'system', 'page'] as const;
export type AudioEvent = (typeof AUDIO_EVENTS)[number];

export interface LocationAmbience {
  beds: AmbienceBed[];
  /** Lugar fechado (caverna): o ambiente do período e o clima não entram. */
  replacesOutdoor?: boolean;
}

export interface IndexedAudio {
  readonly periods: Readonly<Record<string, readonly AmbienceBed[]>>;
  readonly locations: ReadonlyMap<string, LocationAmbience>;
  readonly weather: ReadonlyMap<string, readonly AmbienceBed[]>;
  readonly poses: ReadonlyMap<ActionPose, AudioCue>;
  readonly events: ReadonlyMap<AudioEvent, AudioCue>;
}

export type AudioInspection<T> = { ok: true; value: T } | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function beds(value: unknown): AmbienceBed[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  if (value.some((entry) => !(AMBIENCE_BEDS as readonly unknown[]).includes(entry))) return undefined;
  if (new Set(value).size !== value.length) return undefined;
  return value as AmbienceBed[];
}

function cue(value: unknown): AudioCue | undefined {
  return (AUDIO_CUES as readonly unknown[]).includes(value) ? (value as AudioCue) : undefined;
}

export function inspectAudioCatalog(value: unknown): AudioInspection<IndexedAudio> {
  const fail = (reason: string) => ({ ok: false as const, reason });
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.ambience) || !isRecord(value.cues)) {
    return fail('O catálogo de som é inválido.');
  }
  const { ambience, cues } = value;
  if (!isRecord(ambience.periods) || !isRecord(ambience.locations) || !isRecord(ambience.weather)) {
    return fail('O ambiente sonoro é inválido.');
  }
  const periods: Record<string, AmbienceBed[]> = {};
  for (const period of DEFAULT_PERIODS) {
    const entry = beds(ambience.periods[period.id]);
    if (!entry) return fail(`O ambiente do período ${period.label} é inválido.`);
    periods[period.id] = entry;
  }
  if (Object.keys(ambience.periods).some((id) => !periods[id])) return fail('O ambiente cita um período inexistente.');
  const locations = new Map<string, LocationAmbience>();
  for (const [id, entry] of Object.entries(ambience.locations)) {
    const list = isRecord(entry) ? beds(entry.beds) : undefined;
    if (!list || !isRecord(entry) || (entry.replacesOutdoor !== undefined && typeof entry.replacesOutdoor !== 'boolean')) {
      return fail('O ambiente de um local é inválido.');
    }
    locations.set(id, { beds: list, ...(entry.replacesOutdoor === true ? { replacesOutdoor: true } : {}) });
  }
  const weather = new Map<string, AmbienceBed[]>();
  for (const [id, entry] of Object.entries(ambience.weather)) {
    const list = beds(entry);
    if (!list) return fail('A camada de clima é inválida.');
    weather.set(id, list);
  }
  if (!isRecord(cues.poses) || !isRecord(cues.events)) return fail('Os sons curtos são inválidos.');
  const poses = new Map<ActionPose, AudioCue>();
  for (const [pose, entry] of Object.entries(cues.poses)) {
    const found = cue(entry);
    if (!(ACTION_POSES as readonly string[]).includes(pose) || !found) return fail('O som de uma pose é inválido.');
    poses.set(pose as ActionPose, found);
  }
  const events = new Map<AudioEvent, AudioCue>();
  for (const [event, entry] of Object.entries(cues.events)) {
    const found = cue(entry);
    if (!(AUDIO_EVENTS as readonly string[]).includes(event) || !found) return fail('O som de um acontecimento é inválido.');
    events.set(event as AudioEvent, found);
  }
  return { ok: true, value: { periods, locations, weather, poses, events } };
}

function loadInitial(): IndexedAudio {
  const result = inspectAudioCatalog(catalogJson);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

export const INITIAL_AUDIO: IndexedAudio = loadInitial();

/** Camadas de ambiente para o momento: período, local e clima. Locais fechados ignoram o lado de fora. */
export function ambienceFor(
  catalog: IndexedAudio,
  scene: { period: string; locationId?: string; weatherId?: string },
): AmbienceBed[] {
  const place = scene.locationId ? catalog.locations.get(scene.locationId) : undefined;
  if (place?.replacesOutdoor) return [...place.beds];
  const layers = [
    ...(catalog.periods[scene.period] ?? []),
    ...(place?.beds ?? []),
    ...((scene.weatherId ? catalog.weather.get(scene.weatherId) : undefined) ?? []),
  ];
  return [...new Set(layers)];
}

export function cueForPose(catalog: IndexedAudio, pose: ActionPose): AudioCue | undefined {
  return catalog.poses.get(pose);
}

export function cueForEvent(catalog: IndexedAudio, event: AudioEvent): AudioCue | undefined {
  return catalog.events.get(event);
}
