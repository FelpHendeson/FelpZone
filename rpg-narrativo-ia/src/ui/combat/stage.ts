import {
  FLEE_ACTION_ID,
  type ActionPose,
  type CombatDistance,
  type CombatantShape,
  type IndexedCombat,
  type RoundEvent,
} from '../../modules/combat';
import { poseForAction } from '../silhouettes';

/**
 * Palco da rodada: transforma a linha do tempo já resolvida pelo motor em quadros para animar.
 * Não decide nada de combate; só lê os eventos (quem agiu, o que aconteceu e o texto) e a
 * distância inicial, e acompanha a distância pelos efeitos de movimento das ações.
 */
export type StageEffect = 'strike' | 'self' | 'move' | 'miss' | 'evade' | 'interrupt' | 'combo' | 'out-of-range' | 'skip';

export interface StageFrame {
  index: number;
  tick: number;
  actorId: string;
  /** Lado de quem agiu: `ally` é o jogador e o grupo dele. */
  side: 'ally' | 'foe';
  pose: ActionPose;
  effect: StageEffect;
  /** Dano somado do evento (0 quando não houve). */
  damage: number;
  heal: number;
  /** Distância depois do evento. */
  distance: CombatDistance;
  comboName?: string;
  caption: string;
}

const EFFECT_BY_KIND: Record<RoundEvent['kind'], StageEffect> = {
  hit: 'strike',
  self: 'self',
  move: 'move',
  miss: 'miss',
  evaded: 'evade',
  interrupted: 'interrupt',
  combo: 'combo',
  'out-of-range': 'out-of-range',
  skipped: 'skip',
};

function sumOf(text: string, pattern: RegExp): number {
  let total = 0;
  for (const match of text.matchAll(pattern)) total += Number(match[1]);
  return total;
}

export function buildStageFrames(
  events: readonly RoundEvent[],
  startDistance: CombatDistance,
  combat: IndexedCombat,
  allyIds: ReadonlySet<string>,
): StageFrame[] {
  let distance = startDistance;
  return events.map((event, index) => {
    const action = combat.actionById.get(event.actionId);
    const effect = EFFECT_BY_KIND[event.kind];
    if (event.actionId === FLEE_ACTION_ID) {
      distance = 'far';
    } else if (action && (effect === 'strike' || effect === 'self' || effect === 'move' || effect === 'evade')) {
      // O motor aplica o movimento antes de conferir a esquiva: quem avança chega mesmo errando.
      for (const entry of action.effects) if (entry.type === 'move') distance = entry.to;
    }
    const pose: ActionPose =
      effect === 'interrupt' || effect === 'skip'
        ? 'stand'
        : event.actionId === FLEE_ACTION_ID
          ? 'retreat'
          : action
            ? poseForAction(action)
            : 'heal';
    const comboName = effect === 'combo' ? /Combo: ([^!]+)!/.exec(event.text)?.[1] : undefined;
    return {
      index,
      tick: event.tick,
      actorId: event.actorId,
      side: allyIds.has(event.actorId) ? 'ally' : 'foe',
      pose,
      effect,
      damage: effect === 'strike' ? sumOf(event.text, /causa (\d+)/g) : 0,
      heal: effect === 'strike' || effect === 'self' ? sumOf(event.text, /recupera (\d+)/g) : 0,
      distance,
      ...(comboName ? { comboName } : {}),
      caption: event.text,
    };
  });
}

/** Forma da silhueta de um combatente: a declarada no pack ou figura humana (Despertos, Ecos, rivais). */
export function shapeOf(combat: IndexedCombat, combatantId: string): CombatantShape {
  return combat.combatantById.get(combatantId)?.shape ?? 'humanoid';
}
