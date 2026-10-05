import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  INITIAL_BESTIARY,
  bestiaryLevel,
  inspectBestiaryCatalog,
  recordBestiaryCombat,
  withBestiary,
} from '../modules/bestiary';
import {
  INITIAL_COMBAT,
  buildCombatResolution,
  createCombat,
  getEncounter,
  readOpponentIntent,
  resolveRound,
} from '../modules/combat';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { describeSandboxFeedback } from '../ui/sandbox/feedback';
import { BestiaryPanel } from '../ui/screens/exploration/BestiaryPanel';
import bestiaryJson from '../../content/first-day/system/bestiary.json' with { type: 'json' };
import { freshState, now } from './helpers';

const sandboxContext = createSandboxContext();
const encounter = getEncounter(INITIAL_COMBAT, 'clearing-predator');
const predatorActions = INITIAL_COMBAT.combatantById.get('wary-predator')!.actionIds;

function explored(): GameState {
  let state: GameState = { ...freshState(), narrativeSession: null };
  for (let count = 0; count < 3; count += 1) state = executeSandboxAction(state, { type: 'exploration.explore' }, { now }).current;
  return state;
}

function withRecord(state: GameState, encounters: number, victories: number, actionsSeen: readonly string[]): GameState {
  return { ...state, bestiary: { entries: { 'wary-predator': { encounters, victories, actionsSeen: [...actionsSeen] } } } };
}

describe('Bestiário: catálogo', () => {
  it('traz uma ficha para cada criatura de combate e recusa fichas sem criatura ou repetidas', () => {
    expect(INITIAL_BESTIARY.entries.map((entry) => entry.combatantId)).toEqual(['wary-predator', 'wary-scout', 'bark-crow', 'spring-serpent', 'thorn-boar']);
    const raw = JSON.parse(JSON.stringify(bestiaryJson)) as { entries: Record<string, unknown>[] };
    expect(inspectBestiaryCatalog({ ...raw, entries: [{ ...raw.entries[0], combatantId: 'dragao' }] }).ok).toBe(false);
    expect(inspectBestiaryCatalog({ ...raw, entries: [raw.entries[0], raw.entries[0]] }).ok).toBe(false);
  });
});

describe('Bestiário: níveis', () => {
  it('avistada pelas pistas, enfrentada no confronto, estudada ao ver todas as ações e dominada com vitórias', () => {
    expect(bestiaryLevel(freshState(), 'wary-predator')).toBe(0);
    const state = explored();
    expect(bestiaryLevel(state, 'wary-predator')).toBe(1);
    expect(bestiaryLevel(withRecord(state, 1, 0, ['attack']), 'wary-predator')).toBe(2);
    expect(bestiaryLevel(withRecord(state, 2, 0, predatorActions), 'wary-predator')).toBe(3);
    expect(bestiaryLevel(withRecord(state, 3, 3, predatorActions), 'wary-predator')).toBe(4);
    const senses = withRecord(state, 1, 1, predatorActions);
    expect(bestiaryLevel({ ...senses, system: { ...senses.system, entries: [{ skillId: 'sharpened-senses', proficiency: 1 }] } }, 'wary-predator')).toBe(4);
  });

  it('o registro conta confrontos e vitórias de cada criatura do encontro e só guarda ações dela', () => {
    const pair = getEncounter(INITIAL_COMBAT, 'clearing-pair');
    const next = recordBestiaryCombat(undefined, pair, { outcome: 'victory', foeActionIds: ['attack', 'peck-dive'] });
    expect(next.entries['wary-predator']).toEqual({ encounters: 1, victories: 1, actionsSeen: ['attack'] });
    expect(next.entries['wary-scout']).toEqual({ encounters: 1, victories: 1, actionsSeen: [] });
  });

  it('quem domina a criatura lê uma ação a mais dela', () => {
    const state = withRecord(explored(), 3, 3, predatorActions);
    const environment = withBestiary({ label: 'Céu limpo · Manhã', effects: [] }, state, encounter);
    expect(environment.effects.map((effect) => effect.id)).toEqual(['bestiary-pattern']);
    const combat = createCombat(INITIAL_COMBAT, encounter.id, { environment });
    expect(readOpponentIntent(INITIAL_COMBAT, combat).revealed).toHaveLength(2);
  });
});

describe('Bestiário: mundo, save e tela', () => {
  it('o confronto registra as ações do oponente pelo replay e o Sistema avisa', () => {
    const state = explored();
    let combat = createCombat(INITIAL_COMBAT, encounter.id, {
      playerName: `${state.character.firstName} ${state.character.lastName}`,
      knownSkillIds: state.system.entries.map((entry) => entry.skillId),
      playerMaxHealth: state.attributes.saude,
      execution: state.execution,
    });
    for (let safety = 0; combat.outcome === 'ongoing' && safety < 40; safety += 1) combat = resolveRound(INITIAL_COMBAT, combat, ['advance', 'attack', 'attack']);
    const resolution = { ...buildCombatResolution(combat, encounter), foeActionIds: ['dodge'] };
    const expected = [...new Set((combat.rounds ?? []).flatMap((round) => round.opponent))];
    const result = executeSandboxAction(state, { type: 'combat.resolve', resolution }, { now });
    expect(result.current.bestiary?.entries['wary-predator']).toEqual({ encounters: 1, victories: 1, actionsSeen: expected });
    expect(describeSandboxFeedback(result, sandboxContext).message).toContain('Bestiário: Predador Arisco');
    expect(parseGameState(serializeGameState(result.current))).toEqual({ status: 'ok', state: result.current });
  });

  it('o save recusa ação que a criatura não tem e mais vitórias que confrontos', () => {
    const raw = JSON.parse(serializeGameState(withRecord(explored(), 1, 1, ['attack'])));
    expect(parseGameState(JSON.stringify(raw)).status).toBe('ok');
    expect(parseGameState(JSON.stringify({ ...raw, bestiary: { entries: { 'wary-predator': { encounters: 1, victories: 1, actionsSeen: ['peck-dive'] } } } })).status).toBe('corrupt');
    expect(parseGameState(JSON.stringify({ ...raw, bestiary: { entries: { 'wary-predator': { encounters: 1, victories: 2, actionsSeen: [] } } } })).status).toBe('corrupt');
  });

  it('a tela mostra só o que já se sabe; a nota de alguém aparece depois de conhecê-lo', () => {
    const unknown = renderToStaticMarkup(<BestiaryPanel state={freshState()} onBack={() => undefined} />);
    expect(unknown).toContain('???');
    expect(unknown).not.toContain('Predador Arisco');
    const mastered = withRecord(explored(), 3, 3, predatorActions);
    const html = renderToStaticMarkup(<BestiaryPanel state={mastered} onBack={() => undefined} />);
    expect(html).toContain('Dominada');
    expect(html).toContain('Em rodadas alternadas');
    expect(html).not.toContain('Ele testa antes de morder');
    const met = { ...mastered, relationships: [{ characterId: 'mira-vale', trust: 1 }] };
    expect(renderToStaticMarkup(<BestiaryPanel state={met} onBack={() => undefined} />)).toContain('Ele testa antes de morder');
  });
});
