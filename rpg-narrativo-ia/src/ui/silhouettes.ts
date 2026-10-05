import { INITIAL_ARCHETYPES, type ArchetypeDefinition } from '../modules/archetypes';
import { INITIAL_COMBAT, type ActionPose, type CombatActionDefinition, type IndexedCombat } from '../modules/combat';
import type { SilhouetteProp } from './components/Silhouette';

/** Pose declarada pela ação no pack ou deduzida dos efeitos. */
export function poseForAction(action: CombatActionDefinition): ActionPose {
  if (action.pose) return action.pose;
  const types = new Set(action.effects.map((effect) => effect.type));
  if (action.effects.some((effect) => effect.type === 'move' && effect.to === 'far')) return 'retreat';
  if (types.has('move') && types.has('damage')) return 'lunge';
  if (types.has('move')) return 'advance';
  if (types.has('evade')) return 'dodge';
  if (types.has('heal')) return 'heal';
  if (types.has('guard')) return 'guard';
  if (action.range === 'reach') return 'throw';
  return 'strike';
}

/** Pose da habilidade: a da primeira técnica de combate que ela libera. */
export function poseForSkill(skillId: string, combat: IndexedCombat = INITIAL_COMBAT): ActionPose {
  const action = combat.actions.find((entry) => entry.skillId === skillId);
  return action ? poseForAction(action) : 'stand';
}

export function archetypeOf(archetypeId: string | undefined): ArchetypeDefinition | undefined {
  return archetypeId ? INITIAL_ARCHETYPES.byId.get(archetypeId) : undefined;
}

/** Adereço que a silhueta do arquétipo carrega na carta de apresentação. */
export function archetypeProp(archetypeId: string | undefined): SilhouetteProp {
  return archetypeOf(archetypeId)?.prop ?? 'none';
}
