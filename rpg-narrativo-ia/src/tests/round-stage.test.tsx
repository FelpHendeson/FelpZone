import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INITIAL_SKILLS } from '../modules/skills';
import {
  INITIAL_COMBAT,
  INITIAL_COMBAT_CATALOG,
  createCombat,
  inspectCombatCatalog,
  resolveRound,
  type RoundEvent,
} from '../modules/combat';
import { RoundStage, type StageFigure } from '../ui/combat/RoundStage';
import { buildStageFrames, shapeOf } from '../ui/combat/stage';

const ALLIES = new Set(['player']);

function event(partial: Partial<RoundEvent> & Pick<RoundEvent, 'kind' | 'actionId'>): RoundEvent {
  return { tick: 1, actorId: 'player', text: 'Ana Sol: algo', ...partial };
}

describe('Caso 8 — palco animado da rodada', () => {
  it('cada evento resolvido vira um quadro, com o dano somado igual à vida perdida', () => {
    const start = createCombat(INITIAL_COMBAT, 'clearing-predator', { playerName: 'Ana Sol' });
    const next = resolveRound(INITIAL_COMBAT, start, ['advance', 'attack'], { opponentStyle: 'balanced' });
    const events = next.lastRound ?? [];
    const frames = buildStageFrames(events, start.distance ?? 'far', INITIAL_COMBAT, ALLIES);
    expect(frames).toHaveLength(events.length);
    const dealtByPlayer = frames.filter((frame) => frame.side === 'ally').reduce((total, frame) => total + frame.damage, 0);
    const lost = start.opponent.health - next.opponent.health;
    expect(dealtByPlayer).toBe(lost);
    const advance = frames.find((frame) => frame.actorId === 'player' && frame.pose === 'advance');
    expect(advance?.distance).toBe('near');
    expect(frames[frames.length - 1]!.distance).toBe(next.distance);
  });

  it('lê esquiva, interrupção, combo e cura sem decidir nada de combate', () => {
    const frames = buildStageFrames(
      [
        event({ kind: 'combo', actionId: 'attack', text: 'Ana Sol: Combo: Corte em Avanço! Mais dano.' }),
        event({ kind: 'hit', actionId: 'attack', text: 'Ana Sol: Golpe causa 4 de dano; Golpe causa 2 (1 absorvido)' }),
        event({ kind: 'evaded', actorId: 'wary-predator', actionId: 'attack', text: 'Predador: Golpe — Ana Sol se esquiva.' }),
        event({ kind: 'interrupted', actionId: 'numen-spark', text: 'Ana Sol: Centelha foi interrompida antes de sair.' }),
        event({ kind: 'self', actionId: 'mend', text: 'Ana Sol: Remendo recupera 5 de vida' }),
      ],
      'near',
      INITIAL_COMBAT,
      ALLIES,
    );
    expect(frames.map((frame) => frame.effect)).toEqual(['combo', 'strike', 'evade', 'interrupt', 'self']);
    expect(frames[0]!.comboName).toBe('Corte em Avanço');
    expect(frames[1]!.damage).toBe(6);
    expect(frames[2]!.side).toBe('foe');
    expect(frames[2]!.damage).toBe(0);
    expect(frames[3]!.pose).toBe('stand');
    expect(frames[4]!.heal).toBe(5);
  });

  it('a forma da criatura vem do pack e quem não declara aparece como figura humana', () => {
    expect(shapeOf(INITIAL_COMBAT, 'bark-crow')).toBe('bird');
    expect(shapeOf(INITIAL_COMBAT, 'thorn-boar')).toBe('boar');
    expect(shapeOf(INITIAL_COMBAT, 'echo-rival')).toBe('humanoid');
    const broken = {
      ...INITIAL_COMBAT_CATALOG,
      combatants: INITIAL_COMBAT_CATALOG.combatants.map((entry, index) => (index === 0 ? { ...entry, shape: 'dragon' } : entry)),
    };
    expect(inspectCombatCatalog(broken, INITIAL_SKILLS).ok).toBe(false);
  });

  it('o palco mostra as silhuetas, o dano no alvo e o nome do combo', () => {
    const allies: StageFigure[] = [{ id: 'player', name: 'Ana Sol', shape: 'humanoid', tint: 'var(--accent)', prop: 'sword' }];
    const foes: StageFigure[] = [{ id: 'thorn-boar', name: 'Javali de Espinhos', shape: 'boar', tint: 'var(--danger)' }];
    const [combo, hit] = buildStageFrames(
      [
        event({ kind: 'combo', actionId: 'attack', text: 'Ana Sol: Combo: Brecha Aberta! Ignora a guarda.' }),
        event({ kind: 'hit', actionId: 'attack', text: 'Ana Sol: Golpe causa 7 de dano' }),
      ],
      'near',
      INITIAL_COMBAT,
      ALLIES,
    );
    const struck = renderToStaticMarkup(<RoundStage frame={hit} distance="near" allies={allies} foes={foes} stepMs={650} />);
    expect(struck).toContain('silhouette--creature');
    expect(struck).toContain('Javali de Espinhos');
    expect(struck).toContain('−7');
    expect(struck).toContain('stage-fig--hurt');
    expect(struck).toContain('aria-hidden="true"');
    const banner = renderToStaticMarkup(<RoundStage frame={combo} distance="near" allies={allies} foes={foes} stepMs={325} />);
    expect(banner).toContain('Combo · Brecha Aberta');
    expect(banner).toContain('--stage-step:325ms');
  });
});
