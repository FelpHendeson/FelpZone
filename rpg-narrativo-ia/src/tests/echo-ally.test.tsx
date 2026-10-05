import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  INITIAL_COMBAT,
  buildCombatResolution,
  createCombat,
  getEncounter,
  planCombatantRound,
  resolveRound,
  type CombatState,
} from '../modules/combat';
import {
  ECHO_ALLY_HEALTH,
  ECHO_ALLY_ID,
  addEchoAlly,
  canCallEchoAlly,
  createEchoSeal,
  createInitialEchoesState,
  echoAllySnapshot,
  echoSealId,
  encodeEchoSeal,
  encodeEchoThanks,
  recordEchoBond,
  removeEchoAlly,
  verifyEchoThanks,
} from '../modules/echoes';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { EchoAllyChooser } from '../ui/screens/exploration/EchoAllyChooser';
import { freshState, now } from './helpers';

const friend = createEchoSeal(INITIAL_COMBAT, { name: 'Caio Duarte', knownSkillIds: ['sharpened-senses'], archetypeId: 'apprentice-archer' }, 'defensive');
const friendCode = encodeEchoSeal(friend);
const encounter = getEncounter(INITIAL_COMBAT, 'clearing-predator');

function explored(echoes = addEchoAlly(createInitialEchoesState(), friendCode)): GameState {
  let state: GameState = { ...freshState(), narrativeSession: null };
  for (let count = 0; count < 3; count += 1) state = executeSandboxAction(state, { type: 'exploration.explore' }, { now }).current;
  return { ...state, echoes: echoes.ok ? echoes.value : createInitialEchoesState() };
}

function fightWithAlly(state: GameState): CombatState {
  let combat = createCombat(INITIAL_COMBAT, encounter.id, {
    playerName: `${state.character.firstName} ${state.character.lastName}`,
    knownSkillIds: state.system.entries.map((entry) => entry.skillId),
    playerMaxHealth: state.attributes.saude,
    execution: state.execution,
    allies: [echoAllySnapshot(friend)],
  });
  for (let safety = 0; combat.outcome === 'ongoing' && safety < 40; safety += 1) combat = resolveRound(INITIAL_COMBAT, combat, ['advance', 'attack', 'attack']);
  return combat;
}

describe('Círculo de Ecos', () => {
  it('guarda até três Selos sem repetir e recusa códigos inválidos', () => {
    const start = createInitialEchoesState();
    const once = addEchoAlly(start, friendCode);
    expect(once.ok && once.value.allies).toEqual([friendCode]);
    const twice = once.ok ? addEchoAlly(once.value, ` ${friendCode} `) : once;
    expect(twice.ok && twice.value.allies).toHaveLength(1);
    let state = once.ok ? once.value : start;
    for (const name of ['A', 'B', 'C']) {
      const added = addEchoAlly(state, encodeEchoSeal(createEchoSeal(INITIAL_COMBAT, { name, knownSkillIds: [] })));
      if (added.ok) state = added.value;
    }
    expect(state.allies).toHaveLength(3);
    expect(state.allies).not.toContain(friendCode);
    expect(addEchoAlly(start, 'ECO1.lixo.123').ok).toBe(false);
    expect(removeEchoAlly(state, state.allies![0]!).allies).toHaveLength(2);
  });

  it('o Eco aliado entra com vitalidade reduzida, o banco do Selo e o estilo do dono', () => {
    const snapshot = echoAllySnapshot(friend);
    expect(snapshot).toMatchObject({ id: ECHO_ALLY_ID, name: 'Eco de Caio Duarte', maxHealth: ECHO_ALLY_HEALTH, style: 'defensive' });
    expect(ECHO_ALLY_HEALTH).toBe(18);
    const combat = createCombat(INITIAL_COMBAT, encounter.id, { allies: [snapshot] });
    const plan = planCombatantRound(INITIAL_COMBAT, combat, ECHO_ALLY_ID, combat.allies[0]!.style);
    const first = INITIAL_COMBAT.actionById.get(plan[0]!)!;
    expect(first.effects.some((effect) => effect.type === 'guard' || effect.type === 'evade')).toBe(true);
  });
});

describe('Eco aliado no mundo', () => {
  it('luta ao lado num confronto verificado e só pode ser chamado uma vez por dia', () => {
    const state = explored();
    expect(canCallEchoAlly(state.echoes, state.world.day)).toBe(true);
    const combat = fightWithAlly(state);
    expect(combat.outcome).toBe('victory');
    const resolution = { ...buildCombatResolution(combat, encounter), echoAlly: friendCode };
    const result = executeSandboxAction(state, { type: 'combat.resolve', resolution }, { now });
    expect(result.current.echoes?.lastAllyDay).toBe(state.world.day);
    expect(result.current.party.vitals.some((entry) => entry.actorId === ECHO_ALLY_ID)).toBe(false);
    expect(canCallEchoAlly(result.current.echoes, state.world.day)).toBe(false);
    expect(parseGameState(serializeGameState(result.current))).toEqual({ status: 'ok', state: result.current });
  });

  it('recusa Eco fora do Círculo, Eco já chamado hoje e resultado jogado sem o aliado declarado', () => {
    const state = explored();
    const resolution = { ...buildCombatResolution(fightWithAlly(state), encounter), echoAlly: friendCode };
    const outsider = { ...state, echoes: createInitialEchoesState() };
    expect(() => executeSandboxAction(outsider, { type: 'combat.resolve', resolution }, { now })).toThrow('Círculo');
    const used = { ...state, echoes: { ...state.echoes!, lastAllyDay: state.world.day } };
    expect(() => executeSandboxAction(used, { type: 'combat.resolve', resolution }, { now })).toThrow('hoje');
    const { echoAlly: _omit, ...withoutAlly } = resolution;
    void _omit;
    expect(() => executeSandboxAction(state, { type: 'combat.resolve', resolution: withoutAlly }, { now })).toThrow();
  });
});

describe('Laços de Eco', () => {
  const me = createEchoSeal(INITIAL_COMBAT, { name: 'Ana Cruz', knownSkillIds: [] });

  it('o agradecimento registra o laço uma única vez e só no Eco certo', () => {
    const code = encodeEchoThanks({
      helperName: 'Caio Duarte',
      helperId: echoSealId(friend),
      allySealId: echoSealId(me),
      encounterName: 'Javali de Espinhos',
      outcome: 'victory',
      day: 4,
    });
    const verified = verifyEchoThanks(code, me);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    const once = recordEchoBond(createInitialEchoesState(), verified.value, 5);
    expect(once.bonds).toEqual([{ helperId: echoSealId(friend), helperName: 'Caio Duarte', assists: 1, victories: 1, lastDay: 5 }]);
    expect(recordEchoBond(once, verified.value, 6).bonds![0]!.assists).toBe(1);
    expect(verifyEchoThanks(code, friend).ok).toBe(false);
    expect(verifyEchoThanks('AGR1.xx.yy', me).ok).toBe(false);
  });

  it('o save guarda Círculo e Laços e recusa Selo ilegível no Círculo', () => {
    const state = explored();
    const raw = JSON.parse(serializeGameState({ ...state, echoes: { ...state.echoes!, bonds: [{ helperId: 'x', helperName: 'Caio', assists: 2, victories: 1, lastDay: 3 }] } }));
    expect(parseGameState(JSON.stringify(raw)).status).toBe('ok');
    expect(parseGameState(JSON.stringify({ ...raw, echoes: { ...raw.echoes, allies: ['ECO1.ruim.0'] } })).status).toBe('corrupt');
    expect(parseGameState(JSON.stringify({ ...raw, echoes: { ...raw.echoes, bonds: [{ helperId: 'x', helperName: 'C', assists: 1, victories: 2, lastDay: 1 }] } })).status).toBe('corrupt');
  });

  it('antes do confronto, a tela oferece os Ecos do Círculo ou lutar sozinho', () => {
    const html = renderToStaticMarkup(
      <EchoAllyChooser encounterName="Predador Arisco" allies={[{ code: friendCode, seal: friend }]} onChoose={() => undefined} onCancel={() => undefined} />,
    );
    expect(html).toContain('Eco de Caio Duarte');
    expect(html).toContain('Aprendiz de Arqueiro');
    expect(html).toContain('Lutar sozinho');
  });
});
