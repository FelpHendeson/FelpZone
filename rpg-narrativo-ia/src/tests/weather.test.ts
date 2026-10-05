import { describe, expect, it } from 'vitest';
import type { GameState } from '../core/state';
import {
  INITIAL_COMBAT,
  actionTicks,
  buildCombatResolution,
  createCombat,
  getEncounter,
  readOpponentIntent,
  resolveRound,
  type CombatState,
} from '../modules/combat';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { INITIAL_WEATHER, combatEnvironmentFor, inspectWeatherCatalog, weatherFor } from '../modules/weather';
import catalogJson from '../../content/first-day/world/weather.json' with { type: 'json' };
import { freshState, now } from './helpers';

function seedFor(weatherId: string, day: number): number {
  for (let seed = 1; seed < 10_000; seed += 1) if (weatherFor(INITIAL_WEATHER, seed, day).id === weatherId) return seed;
  throw new Error(`nenhuma semente com ${weatherId}`);
}

function at(seed: number, day: number, period: GameState['world']['period']): Pick<GameState, 'rng' | 'world'> {
  return { rng: { seed, cursor: 0 }, world: { day, period } } as Pick<GameState, 'rng' | 'world'>;
}

describe('Clima do dia', () => {
  it('o pack traz cinco climas e recusa pesos ou efeitos sem sentido', () => {
    expect(INITIAL_WEATHER.weathers.map((weather) => weather.id)).toEqual(['clear', 'cloudy', 'rain', 'mist', 'wind']);
    const raw = JSON.parse(JSON.stringify(catalogJson)) as Record<string, unknown>;
    expect(inspectWeatherCatalog({ ...raw, seasonWeights: { dry: { granizo: 1 } } }).ok).toBe(false);
    expect(inspectWeatherCatalog({ ...raw, fieldEffects: [{ id: 'x', label: 'x', side: 'all', when: { weather: ['rain'] } }] }).ok).toBe(false);
    expect(inspectWeatherCatalog({ ...raw, fieldEffects: [{ id: 'x', label: 'x', side: 'all', when: {}, damage: 1 }] }).ok).toBe(false);
  });

  it('é determinístico pela semente e pelo dia, começa com céu limpo e chove mais na estação úmida', () => {
    expect(weatherFor(INITIAL_WEATHER, 42, 1).id).toBe('clear');
    expect(weatherFor(INITIAL_WEATHER, 42, 9)).toEqual(weatherFor(INITIAL_WEATHER, 42, 9));
    const rainy = (day: number) => Array.from({ length: 600 }, (_, seed) => weatherFor(INITIAL_WEATHER, seed, day).id === 'rain').filter(Boolean).length;
    // Dia 2 é da estação seca (Brasa); dia 8, da úmida (Chuva).
    expect(rainy(8)).toBeGreaterThan(rainy(2) * 2);
  });

  it('o ambiente do confronto junta o clima e a hora do dia', () => {
    const seed = seedFor('rain', 8);
    const night = combatEnvironmentFor(at(seed, 8, 'noite'));
    expect(night.label).toBe('Chuvoso · Noite');
    expect(night.effects.map((effect) => effect.id)).toEqual(['rain-reach', 'rain-numen', 'night-creatures']);
    expect(combatEnvironmentFor(at(42, 1, 'manha'))).toEqual({ label: 'Céu limpo · Manhã', effects: [] });
  });
});

describe('Clima no combate', () => {
  const granted = { ...createCombat(INITIAL_COMBAT, 'clearing-predator').loadout, grantedActionIds: ['numen-bolt'] };

  it('a chuva dispersa o Númen (preparo mais longo) e enfraquece golpes de longe', () => {
    const rain = combatEnvironmentFor(at(seedFor('rain', 8), 8, 'manha'));
    const dry = createCombat(INITIAL_COMBAT, 'clearing-predator', { loadout: granted });
    const wet = createCombat(INITIAL_COMBAT, 'clearing-predator', { loadout: granted, environment: rain });
    expect(actionTicks(INITIAL_COMBAT, dry, 'player', 'numen-bolt')).toBe(2);
    expect(actionTicks(INITIAL_COMBAT, wet, 'player', 'numen-bolt')).toBe(3);
    const hit = (state: CombatState) => {
      const round = resolveRound(INITIAL_COMBAT, state, ['throw-stone']);
      return state.opponent.health - round.opponent.health;
    };
    expect(hit(dry) - hit(wet)).toBeGreaterThan(0);
  });

  it('a névoa esconde uma ação da leitura do oponente', () => {
    const mist = combatEnvironmentFor(at(seedFor('mist', 8), 8, 'manha'));
    const clear = createCombat(INITIAL_COMBAT, 'clearing-predator');
    const foggy = createCombat(INITIAL_COMBAT, 'clearing-predator', { environment: mist });
    expect(readOpponentIntent(INITIAL_COMBAT, clear).revealed).toHaveLength(1);
    expect(readOpponentIntent(INITIAL_COMBAT, foggy).revealed).toHaveLength(0);
  });

  it('o confronto do mundo é verificado com o clima e a hora em que aconteceu', () => {
    const base = freshState();
    let state: GameState = { ...base, narrativeSession: null, rng: { ...base.rng, seed: seedFor('rain', 8) } };
    for (let count = 0; count < 3; count += 1) state = executeSandboxAction(state, { type: 'exploration.explore' }, { now }).current;
    state = { ...state, world: { ...state.world, day: 8 } };
    const environment = combatEnvironmentFor(state);
    expect(environment.label.startsWith('Chuvoso')).toBe(true);
    let combat = createCombat(INITIAL_COMBAT, 'clearing-predator', {
      playerName: `${state.character.firstName} ${state.character.lastName}`,
      knownSkillIds: state.system.entries.map((entry) => entry.skillId),
      playerMaxHealth: state.attributes.saude,
      execution: state.execution,
      environment,
    });
    expect(combat.environment).toEqual(environment);
    for (let safety = 0; combat.outcome === 'ongoing' && safety < 40; safety += 1) combat = resolveRound(INITIAL_COMBAT, combat, ['advance', 'attack', 'attack']);
    const result = executeSandboxAction(
      state,
      { type: 'combat.resolve', resolution: buildCombatResolution(combat, getEncounter(INITIAL_COMBAT, 'clearing-predator')) },
      { now },
    );
    expect(result.current.flags['combat.clearing-predator.resolved']).toBe(true);
  });
});
