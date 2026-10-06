import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import catalogJson from '../../content/first-day/system/audio.json' with { type: 'json' };
import { INITIAL_AUDIO, ambienceFor, cueForEvent, cueForPose, inspectAudioCatalog } from '../modules/audio';
import { ACTION_POSES, INITIAL_COMBAT } from '../modules/combat';
import { DEFAULT_PERIODS } from '../modules/time';
import { INITIAL_WEATHER } from '../modules/weather';
import mapJson from '../../content/first-day/world/map.json' with { type: 'json' };
import { DEFAULT_SOUND_LEVELS, readSoundLevel, sound } from '../ui/audio';
import { buildStageFrames, frameCues } from '../ui/combat/stage';
import { SettingsPanel } from '../ui/screens/exploration/SettingsPanel';

interface RawAudio {
  version: number;
  ambience: {
    periods: Record<string, unknown>;
    locations: Record<string, Record<string, unknown>>;
    weather: Record<string, unknown>;
  };
  cues: { poses: Record<string, unknown>; events: Record<string, unknown> };
}

function clone(): RawAudio {
  return JSON.parse(JSON.stringify(catalogJson));
}

describe('Caso 9 — som ambiente e de combate', () => {
  it('todo período tem ambiente e o local fechado troca o lado de fora', () => {
    for (const period of DEFAULT_PERIODS) expect(ambienceFor(INITIAL_AUDIO, { period: period.id }).length).toBeGreaterThan(0);
    expect(ambienceFor(INITIAL_AUDIO, { period: 'manha' })).toEqual(['birds', 'leaves']);
    expect(ambienceFor(INITIAL_AUDIO, { period: 'noite', locationId: 'spring-lake', weatherId: 'rain' })).toEqual([
      'crickets',
      'night-wind',
      'water',
      'rain',
    ]);
    expect(ambienceFor(INITIAL_AUDIO, { period: 'manha', locationId: 'hidden-cave', weatherId: 'rain' })).toEqual(['cave']);
  });

  it('locais e climas citados existem no pack', () => {
    const locationIds = new Set(JSON.stringify(mapJson).match(/"id":"[a-z-]+"/g)?.map((entry) => entry.slice(6, -1)));
    for (const id of INITIAL_AUDIO.locations.keys()) expect(locationIds.has(id), id).toBe(true);
    for (const id of INITIAL_AUDIO.weather.keys()) expect(INITIAL_WEATHER.byId.has(id), id).toBe(true);
  });

  it('rejeita catálogo com camada, período, pose ou som desconhecido', () => {
    const cases = [
      (raw: RawAudio) => (raw.ambience.periods.manha = ['dragons']),
      (raw: RawAudio) => delete raw.ambience.periods.noite,
      (raw: RawAudio) => (raw.ambience.periods.eclipse = ['birds']),
      (raw: RawAudio) => (raw.ambience.locations['hidden-cave'].replacesOutdoor = 'sim'),
      (raw: RawAudio) => (raw.cues.poses.dance = 'hit'),
      (raw: RawAudio) => (raw.cues.events.hit = 'explosion'),
      (raw: RawAudio) => (raw.version = 2),
    ];
    for (const mutate of cases) {
      const raw = clone();
      mutate(raw);
      expect(inspectAudioCatalog(raw).ok).toBe(false);
    }
  });

  it('toda pose tem som e cada quadro do palco soa conforme o que aconteceu', () => {
    for (const pose of ACTION_POSES.filter((entry) => entry !== 'stand')) expect(cueForPose(INITIAL_AUDIO, pose), pose).toBeDefined();
    expect(cueForEvent(INITIAL_AUDIO, 'victory')).toBe('victory');
    const frames = buildStageFrames(
      [
        { tick: 1, actorId: 'player', actionId: 'attack', kind: 'hit', text: 'Ana: Golpe causa 3 de dano' },
        { tick: 2, actorId: 'player', actionId: 'attack', kind: 'evaded', text: 'Ana: Golpe — Fera se esquiva.' },
        { tick: 3, actorId: 'player', actionId: 'advance', kind: 'move', text: 'Ana: Avançar: avança' },
      ],
      'far',
      INITIAL_COMBAT,
      new Set(['player']),
    );
    expect(frames.map((frame) => frameCues(INITIAL_AUDIO, frame))).toEqual([['hit'], ['dodge'], ['step']]);
  });

  it('sem Web Audio tudo fica em silêncio, e o volume começa baixo', () => {
    expect(() => sound.play('hit')).not.toThrow();
    expect(() => sound.setAmbience(['birds'])).not.toThrow();
    expect(sound.unlocked).toBe(false);
    expect(readSoundLevel('ambience')).toBe(DEFAULT_SOUND_LEVELS.ambience);
    expect(DEFAULT_SOUND_LEVELS).toEqual({ ambience: 'low', effects: 'mid' });
  });

  it('Configurações mostra volume de ambiente e de efeitos', () => {
    const html = renderToStaticMarkup(
      <SettingsPanel
        clockFormat="24h"
        guidanceLevel="guided"
        onClockFormat={() => undefined}
        onGuidanceLevel={() => undefined}
        sound={{ ambience: 'low', effects: 'mid' }}
        onSoundLevel={() => undefined}
        onReplayTour={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(html).toContain('Volume: Ambiente');
    expect(html).toContain('Volume: Efeitos');
    expect(html).toContain('primeiro toque');
  });
});
