import { describe, expect, it } from 'vitest';
import { inspectGameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { INITIAL_COMBAT, resolveRound, type CombatState } from '../modules/combat';
import {
  DUEL_HEALTH,
  createEchoSeal,
  decodeEchoSeal,
  echoSealId,
  encodeEchoResult,
  encodeEchoSeal,
  hasWonAnyConfrontation,
  recordEchoDuel,
  createInitialEchoesState,
  startEchoDuel,
  summarizeRivals,
  verifyEchoResult,
} from '../modules/echoes';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { freshState } from './helpers';

const ana = createEchoSeal(INITIAL_COMBAT, { name: 'Ana Cruz', knownSkillIds: ['sharpened-senses'] }, 'aggressive');
const davi = createEchoSeal(INITIAL_COMBAT, { name: 'Davi Moura', knownSkillIds: ['steady-body'] }, 'defensive');

function duelToEnd(start: CombatState, plan: string[], rivalStyle: 'balanced' | 'aggressive' | 'defensive'): CombatState {
  let state = start;
  for (let round = 0; round < 30 && state.outcome === 'ongoing'; round += 1) {
    state = resolveRound(INITIAL_COMBAT, state, plan, { opponentStyle: rivalStyle });
  }
  return state;
}

describe('Ecos — Selo do Desperto', () => {
  it('o Selo leva o banco de ações liberado pelas habilidades e volta igual do código', () => {
    expect(ana.actionIds).toContain('focus-strike');
    expect(ana.actionIds).toContain('feint');
    expect(ana.actionIds).not.toContain('ember-cut');
    expect(davi.actionIds).not.toContain('focus-strike');
    const code = encodeEchoSeal(ana);
    expect(code.startsWith('ECO1.')).toBe(true);
    expect(decodeEchoSeal(code, INITIAL_COMBAT)).toEqual({ ok: true, value: ana });
    expect(decodeEchoSeal(`  ${code}\n`, INITIAL_COMBAT).ok).toBe(true);
  });

  it('recusa códigos cortados, alterados ou com ações que as habilidades não liberam', () => {
    const code = encodeEchoSeal(ana);
    expect(decodeEchoSeal(code.slice(0, -3), INITIAL_COMBAT).ok).toBe(false);
    expect(decodeEchoSeal('RES1.abc.def', INITIAL_COMBAT).ok).toBe(false);
    const forged = encodeEchoSeal({ ...davi, actionIds: [...davi.actionIds, 'focus-strike'] });
    const inspected = decodeEchoSeal(forged, INITIAL_COMBAT);
    expect(inspected.ok).toBe(false);
    if (!inspected.ok) expect(inspected.reason).toMatch(/não liberam/);
  });

  it('o duelo dá a mesma vitalidade aos dois lados e começa à distância', () => {
    const duel = startEchoDuel(INITIAL_COMBAT, ana, davi);
    expect(duel.player.maxHealth).toBe(DUEL_HEALTH);
    expect(duel.opponent.maxHealth).toBe(DUEL_HEALTH);
    expect(duel.opponent.name).toBe('Davi Moura');
    expect(duel.distance).toBe('far');
  });

  it('o resultado volta ao dono do Eco e só é aceito se o replay conferir', () => {
    const final = duelToEnd(startEchoDuel(INITIAL_COMBAT, ana, davi), ['advance', 'attack', 'attack'], davi.style);
    expect(final.outcome).not.toBe('ongoing');
    const code = encodeEchoResult(ana, davi, final);
    const verified = verifyEchoResult(code, davi, INITIAL_COMBAT);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.value.challengerName).toBe('Ana Cruz');
    expect(verified.value.outcomeForMe).toBe(final.outcome === 'victory' ? 'defeat' : final.outcome === 'defeat' ? 'victory' : 'fled');
    // Contra outro Eco, o mesmo código não vale.
    expect(verifyEchoResult(code, ana, INITIAL_COMBAT).ok).toBe(false);
  });

  it('rivalidades acumulam e o mesmo resultado não conta duas vezes', () => {
    let echoes = createInitialEchoesState();
    const record = { rivalId: echoSealId(davi), rivalName: davi.name, outcome: 'victory' as const, kind: 'challenge' as const, day: 3 };
    echoes = recordEchoDuel(echoes, record);
    echoes = recordEchoDuel(echoes, { ...record, outcome: 'defeat', kind: 'received' }, 'r1');
    echoes = recordEchoDuel(echoes, { ...record, outcome: 'defeat', kind: 'received' }, 'r1');
    expect(summarizeRivals(echoes)).toEqual([{ rivalId: echoSealId(davi), rivalName: 'Davi Moura', wins: 1, losses: 1 }]);
  });

  it('o registro de Ecos sobrevive ao save e às ações do mundo', () => {
    const base = freshState();
    const echoes = recordEchoDuel(createInitialEchoesState(), {
      rivalId: echoSealId(davi), rivalName: 'Davi Moura', outcome: 'victory', kind: 'hot-seat', day: 1,
    });
    const withEchoes = { ...base, echoes };
    expect(inspectGameState(withEchoes).ok).toBe(true);
    const after = executeSandboxAction(withEchoes, { type: 'exploration.explore' }).current;
    expect(after.echoes).toEqual(echoes);
    expect(parseGameState(serializeGameState(after))).toEqual({ status: 'ok', state: after });
    const tampered = { ...JSON.parse(serializeGameState(after)), echoes: { records: [{ rivalId: 'x' }], receivedResultIds: [] } };
    expect(parseGameState(JSON.stringify(tampered)).status).toBe('corrupt');
  });

  it('o Eco nasce da primeira vitória em um confronto do mundo', () => {
    expect(hasWonAnyConfrontation({})).toBe(false);
    expect(hasWonAnyConfrontation({ 'combat.clearing-predator.resolved': true })).toBe(true);
  });
});
