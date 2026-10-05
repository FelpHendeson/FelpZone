import { describe, expect, it } from 'vitest';
import type { GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  INITIAL_ARCHETYPES,
  archetypeRank,
  createInitialArchetypeProgress,
  recordArchetypeCombat,
  techniqueStatus,
  withArchetypeBonus,
  type ArchetypeProgressState,
} from '../modules/archetypes';
import {
  INITIAL_COMBAT,
  ROUND_TICKS,
  buildCombatResolution,
  checkRoundPlan,
  createCombat,
  getEncounter,
  resolveRound,
  type CombatState,
} from '../modules/combat';
import { createEchoSeal, decodeEchoSeal, encodeEchoSeal, echoSealId, startEchoDuel } from '../modules/echoes';
import { buildCombatLoadout } from '../modules/equipment';
import { INITIAL_ITEMS, createInitialItemsState } from '../modules/items';
import { SandboxActionError, executeSandboxAction } from '../modules/sandbox-actions';
import { buildSystemStatus } from '../modules/system-interface';
import { describeSandboxFeedback } from '../ui/sandbox/feedback';
import { createSandboxContext } from '../modules/sandbox';
import { freshState, now } from './helpers';

const sandboxContext = createSandboxContext();

function progress(patch: Partial<ArchetypeProgressState> = {}): ArchetypeProgressState {
  return { ...createInitialArchetypeProgress(), ...patch };
}

function withArchetype(archetypeId: string | undefined, archetypeProgress?: ArchetypeProgressState, sex: 'male' | 'female' = 'female'): GameState {
  const base = freshState();
  return {
    ...base,
    narrativeSession: null,
    character: { ...base.character, sex, ...(archetypeId ? { archetypeId } : {}) },
    ...(archetypeProgress ? { archetypeProgress } : {}),
  };
}

describe('Galho do arquétipo: pack e requisitos', () => {
  it('cada aprendiz com caminho tem um galho de três técnicas; o sem caminho não tem galho próprio', () => {
    const branches = INITIAL_ARCHETYPES.archetypes.map((entry) => [entry.id, entry.branch?.techniques.map((technique) => technique.actionId)]);
    expect(branches).toEqual([
      ['apprentice-mage', ['numen-ward', 'twin-bolt', 'numen-burst']],
      ['apprentice-swordsman', ['parry', 'opening-cut', 'duelist-lunge']],
      ['apprentice-archer', ['double-shot', 'pinning-arrow', 'retreating-shot']],
      ['apprentice-assassin', ['poisoned-blade', 'vanish', 'gap-strike']],
      ['apprentice-pathless', undefined],
    ]);
    const bank = createCombat(INITIAL_COMBAT, 'clearing-predator').player.actionIds;
    for (const actionId of INITIAL_ARCHETYPES.techniqueByActionId.keys()) expect(bank).not.toContain(actionId);
  });

  it('no próprio galho, a primeira técnica pede o hábito da assinatura; fora dele, vitórias', () => {
    const own = techniqueStatus(INITIAL_ARCHETYPES, { archetypeId: 'apprentice-mage', level: 1, progress: progress() }, 'numen-ward');
    expect(own.access).toBe('own');
    expect(own.minutes).toBe(60);
    expect(own.requirements.map((entry) => entry.kind)).toEqual(['signatureUses']);
    expect(own.canTrain).toBe(false);
    expect(techniqueStatus(INITIAL_ARCHETYPES, { archetypeId: 'apprentice-mage', level: 1, progress: progress({ signatureUses: 3 }) }, 'numen-ward').canTrain).toBe(true);

    const open = techniqueStatus(INITIAL_ARCHETYPES, { archetypeId: 'apprentice-pathless', level: 1, progress: progress({ victories: 2 }) }, 'parry');
    expect(open.access).toBe('open');
    expect(open.minutes).toBe(60);
    expect(open.canTrain).toBe(true);

    const distant = techniqueStatus(INITIAL_ARCHETYPES, { archetypeId: 'apprentice-mage', level: 1, progress: progress({ victories: 2 }) }, 'parry');
    expect(distant.access).toBe('distant');
    expect(distant.minutes).toBe(120);
    expect(distant.requirements.find((entry) => entry.kind === 'level')).toMatchObject({ label: 'Nível 2', met: false });
  });

  it('a técnica seguinte do galho exige a anterior', () => {
    const status = techniqueStatus(
      INITIAL_ARCHETYPES,
      { archetypeId: 'apprentice-swordsman', level: 1, progress: progress({ victories: 5 }), actionName: (id) => INITIAL_COMBAT.actionById.get(id)!.name },
      'opening-cut',
    );
    expect(status.requirements[0]).toEqual({ kind: 'previous', label: 'Conhecer Aparar', met: false });
    expect(status.canTrain).toBe(false);
  });

  it('o combate do mundo conta usos da assinatura, vitórias e vitórias de elite', () => {
    let next = recordArchetypeCombat(INITIAL_ARCHETYPES, 'apprentice-assassin', progress(), {
      playerActionIds: ['shadow-strike', 'advance', 'shadow-strike'],
      outcome: 'victory',
      elite: false,
    });
    expect(next).toMatchObject({ signatureUses: 2, victories: 1, eliteVictories: 0 });
    next = recordArchetypeCombat(INITIAL_ARCHETYPES, 'apprentice-assassin', next, { playerActionIds: ['shadow-strike'], outcome: 'defeat', elite: true });
    expect(next).toMatchObject({ signatureUses: 3, victories: 1, eliteVictories: 0 });
    next = recordArchetypeCombat(INITIAL_ARCHETYPES, 'apprentice-assassin', next, { playerActionIds: [], outcome: 'victory', elite: true });
    expect(next).toMatchObject({ victories: 2, eliteVictories: 1 });
    expect(INITIAL_COMBAT.encounterById.get('dense-woods-boar')?.elite).toBe(true);
  });
});

describe('Galho do arquétipo: treino no mundo', () => {
  it('treinar a técnica custa tempo, entra no save e no banco de combate', () => {
    const state = withArchetype('apprentice-mage', progress({ signatureUses: 3 }));
    const result = executeSandboxAction(state, { type: 'archetype.train', actionId: 'numen-ward' }, { now });
    expect(result.timeCost.minutes).toBe(60);
    expect(result.current.archetypeProgress?.techniqueIds).toEqual(['numen-ward']);
    expect(describeSandboxFeedback(result, sandboxContext).message).toContain('Aprendeu Escudo de Númen');
    const portrait = withArchetypeBonus(buildCombatLoadout(INITIAL_ITEMS, createInitialItemsState()), result.current);
    expect(createCombat(INITIAL_COMBAT, 'clearing-predator', { loadout: portrait.loadout }).player.actionIds).toContain('numen-ward');
    expect(parseGameState(serializeGameState(result.current))).toEqual({ status: 'ok', state: result.current });
  });

  it('recusa o treino sem os requisitos e o treino repetido', () => {
    const locked = withArchetype('apprentice-mage');
    expect(() => executeSandboxAction(locked, { type: 'archetype.train', actionId: 'numen-ward' }, { now })).toThrow(SandboxActionError);
    const learned = withArchetype('apprentice-mage', progress({ signatureUses: 3, techniqueIds: ['numen-ward'] }));
    expect(() => executeSandboxAction(learned, { type: 'archetype.train', actionId: 'numen-ward' }, { now })).toThrow('já foi aprendida');
  });

  it('a técnica aprendida vale num confronto do mundo, verificado por replay, e o confronto conta vitória', () => {
    let state = withArchetype('apprentice-swordsman', progress({ techniqueIds: ['parry'] }));
    for (let count = 0; count < 3; count += 1) state = executeSandboxAction(state, { type: 'exploration.explore' }, { now }).current;
    const portrait = withArchetypeBonus(buildCombatLoadout(INITIAL_ITEMS, state.items), state);
    let combat: CombatState = createCombat(INITIAL_COMBAT, 'clearing-predator', {
      playerName: `${state.character.firstName} ${state.character.lastName}`,
      knownSkillIds: state.system.entries.map((entry) => entry.skillId),
      playerMaxHealth: state.attributes.saude,
      loadout: portrait.loadout,
      prepared: portrait.prepared,
      execution: state.execution,
    });
    for (let safety = 0; combat.outcome === 'ongoing' && safety < 40; safety += 1) {
      combat = resolveRound(INITIAL_COMBAT, combat, ['advance', 'parry', 'attack']);
    }
    expect(combat.outcome).toBe('victory');
    const result = executeSandboxAction(
      state,
      { type: 'combat.resolve', resolution: buildCombatResolution(combat, getEncounter(INITIAL_COMBAT, 'clearing-predator')) },
      { now },
    );
    expect(result.current.archetypeProgress).toMatchObject({ techniqueIds: ['parry'], victories: 1, eliteVictories: 0 });
  });

  it('saves recusam técnica inexistente e contadores incoerentes; saves antigos seguem válidos', () => {
    const state = withArchetype('apprentice-archer', progress({ victories: 2, eliteVictories: 1, techniqueIds: ['double-shot'] }));
    const raw = JSON.parse(serializeGameState(state));
    expect(parseGameState(JSON.stringify({ ...raw, archetypeProgress: { ...raw.archetypeProgress, techniqueIds: ['inventada'] } })).status).toBe('corrupt');
    expect(parseGameState(JSON.stringify({ ...raw, archetypeProgress: { ...raw.archetypeProgress, eliteVictories: 3 } })).status).toBe('corrupt');
    const legacy = withArchetype(undefined);
    expect(legacy.archetypeProgress).toBeUndefined();
    expect(parseGameState(serializeGameState(legacy)).status).toBe('ok');
  });
});

describe('Evolução para Iniciado', () => {
  it('duas técnicas do próprio galho e uma vitória de elite: Iniciado, com título pelo sexo e seis tempos', () => {
    const almost = progress({ techniqueIds: ['parry', 'opening-cut'], victories: 3 });
    expect(archetypeRank(INITIAL_ARCHETYPES, { archetypeId: 'apprentice-swordsman', progress: almost }).rank).toBe('apprentice');
    const done = { ...almost, eliteVictories: 1 };
    expect(archetypeRank(INITIAL_ARCHETYPES, { archetypeId: 'apprentice-swordsman', progress: done, sex: 'female' })).toMatchObject({
      rank: 'initiate',
      title: 'Espadachim Iniciada',
      roundTicks: 6,
    });
    expect(archetypeRank(INITIAL_ARCHETYPES, { archetypeId: 'apprentice-archer', progress: progress({ techniqueIds: ['double-shot', 'pinning-arrow'], victories: 1, eliteVictories: 1 }), sex: 'male' }).title).toBe('Arqueiro Iniciado');
  });

  it('técnicas de galho distante não contam; o sem caminho vira Iniciado em qualquer galho', () => {
    const swordTechniques = progress({ techniqueIds: ['parry', 'opening-cut'], victories: 1, eliteVictories: 1 });
    expect(archetypeRank(INITIAL_ARCHETYPES, { archetypeId: 'apprentice-mage', progress: swordTechniques }).rank).toBe('apprentice');
    expect(archetypeRank(INITIAL_ARCHETYPES, { archetypeId: 'apprentice-pathless', progress: swordTechniques, sex: 'male' })).toMatchObject({
      rank: 'initiate',
      branchArchetypeId: 'apprentice-swordsman',
      title: 'Espadachim Iniciado',
    });
  });

  it('o Iniciado monta a rodada com seis tempos; o Aprendiz, com cinco', () => {
    const plan = ['advance', 'attack', 'attack', 'guard'];
    const apprentice = createCombat(INITIAL_COMBAT, 'clearing-predator');
    const initiate = createCombat(INITIAL_COMBAT, 'clearing-predator', { playerRoundTicks: 6 });
    // Avançar (1) + Golpe (2) + Golpe (2) + Postura (1) = 6 tempos.
    expect(checkRoundPlan(INITIAL_COMBAT, apprentice, 'player', plan).ok).toBe(false);
    expect(checkRoundPlan(INITIAL_COMBAT, initiate, 'player', plan).ok).toBe(true);
    expect(checkRoundPlan(INITIAL_COMBAT, initiate, 'player', [...plan, 'guard']).ok).toBe(false);
    expect(() => createCombat(INITIAL_COMBAT, 'clearing-predator', { playerRoundTicks: 9 })).toThrow();
    expect(ROUND_TICKS).toBe(5);
  });

  it('o treino que completa a patente anuncia o Iniciado', () => {
    const state = withArchetype('apprentice-assassin', progress({ techniqueIds: ['poisoned-blade'], victories: 3, eliteVictories: 1, signatureUses: 3 }), 'male');
    const result = executeSandboxAction(state, { type: 'archetype.train', actionId: 'vanish' }, { now });
    expect(result.detail).toMatchObject({ type: 'archetype.train', plan: { initiated: true } });
    expect(describeSandboxFeedback(result, sandboxContext).message).toContain('Patente reconhecida: Assassino Iniciado');
  });
});

describe('Galho na interface e nos Ecos', () => {
  it('a Árvore mostra o próprio galho primeiro, os distantes depois, e a patente com o progresso', () => {
    const state = withArchetype('apprentice-archer', progress({ techniqueIds: ['double-shot'], victories: 2 }));
    const view = buildSystemStatus(state, sandboxContext).archetype;
    expect(view.branches[0]).toMatchObject({ archetypeId: 'apprentice-archer', access: 'own', name: 'Caminho do Arco' });
    expect(view.branches.slice(1).every((branch) => branch.access === 'distant')).toBe(true);
    expect(view.branches[0]!.techniques[1]).toMatchObject({ actionId: 'pinning-arrow', canTrain: true, minutes: 90 });
    expect(view).toMatchObject({ title: 'Aprendiz de Arqueiro', rank: 'apprentice', roundTicks: 5, next: { techniques: 1, techniquesNeeded: 2 } });
    const pathless = buildSystemStatus(withArchetype('apprentice-pathless'), sandboxContext).archetype;
    expect(pathless.branches.every((branch) => branch.access === 'open')).toBe(true);
  });

  it('o Selo do Eco leva técnicas e patente; o duelo dá seis tempos ao Iniciado e recusa patente forjada', () => {
    const initiate = progress({ techniqueIds: ['numen-ward', 'twin-bolt'], victories: 2, eliteVictories: 1 });
    const seal = createEchoSeal(INITIAL_COMBAT, { name: 'Ana', knownSkillIds: [], archetypeId: 'apprentice-mage', progress: initiate });
    expect(seal).toMatchObject({ rank: 'initiate', techniqueIds: ['numen-ward', 'twin-bolt'] });
    expect(seal.actionIds).toEqual(expect.arrayContaining(['numen-bolt', 'numen-ward', 'twin-bolt']));
    expect(decodeEchoSeal(encodeEchoSeal(seal), INITIAL_COMBAT)).toEqual({ ok: true, value: seal });
    const rival = createEchoSeal(INITIAL_COMBAT, { name: 'Caio', knownSkillIds: [] });
    const duel = startEchoDuel(INITIAL_COMBAT, seal, rival);
    expect(duel.player.roundTicks).toBe(6);
    expect(duel.opponent.roundTicks).toBeUndefined();

    const forged = encodeEchoSeal({ ...seal, techniqueIds: ['numen-ward'], actionIds: seal.actionIds.filter((id) => id !== 'twin-bolt') });
    expect(decodeEchoSeal(forged, INITIAL_COMBAT).ok).toBe(false);
    const stolen = encodeEchoSeal({ ...rival, actionIds: [...rival.actionIds, 'numen-ward'] });
    expect(decodeEchoSeal(stolen, INITIAL_COMBAT).ok).toBe(false);
  });

  it('Selos sem galho mantêm a mesma identidade de antes', () => {
    const seal = createEchoSeal(INITIAL_COMBAT, { name: 'Ana', knownSkillIds: [], archetypeId: 'apprentice-mage', progress: progress() });
    expect(seal.techniqueIds).toBeUndefined();
    expect(seal.rank).toBeUndefined();
    expect(echoSealId(seal)).toBe(echoSealId(createEchoSeal(INITIAL_COMBAT, { name: 'Ana', knownSkillIds: [], archetypeId: 'apprentice-mage' })));
  });
});
