import { describe, expect, it } from 'vitest';
import {
  INITIAL_COMBAT,
  ROUND_TICKS,
  buildCombatResolution,
  checkRoundPlan,
  createCombat,
  planCombatantRound,
  readOpponentIntent,
  resolveRound,
  verifyCombatResolution,
  type CombatState,
} from '../modules/combat';

function fight(encounterId = 'clearing-predator', knownSkillIds: string[] = [], health = 30): CombatState {
  return createCombat(INITIAL_COMBAT, encounterId, { knownSkillIds, playerMaxHealth: health });
}

describe('Combate por rodadas — sequência planejada', () => {
  it('cada lado monta a rodada dentro do orçamento de tempos', () => {
    const state = fight();
    expect(ROUND_TICKS).toBe(5);
    const ok = checkRoundPlan(INITIAL_COMBAT, state, 'player', ['advance', 'attack', 'attack']);
    expect(ok).toMatchObject({ ok: true, usedTicks: 5 });
    expect(ok.slots.map((slot) => [slot.actionId, slot.start, slot.lands])).toEqual([
      ['advance', 1, 1],
      ['attack', 2, 2],
      ['attack', 4, 4],
    ]);
    const tooLong = checkRoundPlan(INITIAL_COMBAT, state, 'player', ['attack', 'attack', 'attack']);
    expect(tooLong.ok).toBe(false);
    expect(tooLong.reason).toMatch(/Não cabe/);
    expect(checkRoundPlan(INITIAL_COMBAT, state, 'player', ['ember-cut']).ok).toBe(false);
    expect(() => resolveRound(INITIAL_COMBAT, state, [])).toThrow(/ao menos uma ação/);
  });

  it('começa longe: golpe corpo a corpo erra até alguém avançar', () => {
    const state = fight();
    expect(state.distance).toBe('far');
    const held = resolveRound(INITIAL_COMBAT, state, ['attack', 'dodge', 'guard', 'guard'], { opponentPlan: ['guard'] });
    const miss = held.lastRound?.find((event) => event.actorId === 'player' && event.actionId === 'attack');
    expect(miss?.kind).toBe('out-of-range');
    expect(held.distance).toBe('far');
    // O predador só golpeia de perto, então a IA dele avança primeiro.
    const next = resolveRound(INITIAL_COMBAT, state, ['guard']);
    expect(next.rounds?.[0]?.opponent[0]).toBe('advance');
    expect(next.distance).toBe('near');
  });

  it('a linha do tempo intercala os dois lados pelo tempo em que cada ação acontece', () => {
    const next = resolveRound(INITIAL_COMBAT, fight(), ['advance', 'attack', 'attack']);
    const ticks = next.lastRound!.map((event) => event.tick);
    expect([...ticks].sort((left, right) => left - right)).toEqual(ticks);
    expect(new Set(next.lastRound!.map((event) => event.actorId))).toEqual(new Set(['player', 'wary-predator']));
    expect(next.turn).toBe(1);
    expect(next.rounds).toEqual([{ player: ['advance', 'attack', 'attack'], opponent: next.rounds![0]!.opponent }]);
  });

  it('esquivar faz o golpe que chega naquele tempo errar', () => {
    const state = { ...fight(), distance: 'near' as const };
    const opponentPlan = ['attack', 'attack'];
    const next = resolveRound(INITIAL_COMBAT, state, ['dodge', 'guard', 'attack'], { opponentPlan });
    const firstHit = next.lastRound!.find((event) => event.actorId === 'wary-predator');
    expect(firstHit?.kind).toBe('evaded');
  });

  it('um golpe que fere durante a preparação interrompe uma ação lenta', () => {
    const state = { ...fight('clearing-predator', ['sharpened-senses']), distance: 'near' as const };
    // Golpe Preciso prepara no tempo 1 e sai no 2; o golpe do oponente cai no tempo 1.
    const next = resolveRound(INITIAL_COMBAT, state, ['focus-strike', 'guard'], { opponentPlan: ['attack', 'attack'] });
    const strike = next.lastRound!.find((event) => event.actionId === 'focus-strike');
    expect(strike?.kind).toBe('interrupted');
    expect(next.opponent.health).toBe(next.opponent.maxHealth);
  });

  it('a postura defensiva vale só para a rodada', () => {
    const state = { ...fight(), distance: 'near' as const };
    const next = resolveRound(INITIAL_COMBAT, state, ['guard'], { opponentPlan: ['guard'] });
    expect(next.player.guard).toBe(0);
  });

  it('a IA planeja de forma determinística e o Sistema deixa ler a intenção', () => {
    const state = fight();
    const plan = planCombatantRound(INITIAL_COMBAT, state, 'wary-predator');
    expect(plan).toEqual(planCombatantRound(INITIAL_COMBAT, state, 'wary-predator'));
    expect(checkRoundPlan(INITIAL_COMBAT, state, 'wary-predator', plan).ok).toBe(true);
    expect(readOpponentIntent(INITIAL_COMBAT, state).revealed).toHaveLength(1);
    // Sentidos Aguçados revelam a segunda ação também.
    const sharp = fight('clearing-predator', ['sharpened-senses']);
    expect(readOpponentIntent(INITIAL_COMBAT, sharp).revealed.map((action) => action.id)).toEqual(plan.slice(0, 2));
  });

  it('a resolução no mundo reproduz as sequências declaradas e recusa adulteração', () => {
    let state = fight('clearing-predator', ['sharpened-senses'], 40);
    for (let round = 0; round < 20 && state.outcome === 'ongoing'; round += 1) {
      state = resolveRound(INITIAL_COMBAT, state, ['advance', 'guard', 'focus-strike']);
    }
    expect(state.outcome).toBe('victory');
    const encounter = INITIAL_COMBAT.encounterById.get('clearing-predator')!;
    const resolution = buildCombatResolution(state, encounter);
    expect(resolution.playerPlans).toHaveLength(state.turn);
    const options = { knownSkillIds: ['sharpened-senses'], playerMaxHealth: 40 };
    expect(verifyCombatResolution(INITIAL_COMBAT, resolution, encounter, options)).toEqual(resolution);
    const forged = { ...resolution, remainingHealth: 40 };
    expect(() => verifyCombatResolution(INITIAL_COMBAT, forged, encounter, options)).toThrow();
  });

  it('a carga lenta do javali pode ser desmanchada por uma Finta', () => {
    const state = { ...fight('dense-woods-boar', ['sharpened-senses'], 40), distance: 'near' as const };
    const next = resolveRound(INITIAL_COMBAT, state, ['feint', 'guard', 'attack'], { opponentPlan: ['gore-charge'] });
    expect(next.lastRound!.find((event) => event.actionId === 'gore-charge')?.kind).toBe('interrupted');
  });
});
