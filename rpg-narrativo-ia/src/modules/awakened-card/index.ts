import type { GameState } from '../../core/state';
import { INITIAL_ARCHETYPES, archetypeSignatureActions, type IndexedArchetypes } from '../archetypes';
import { INITIAL_COMBAT, type IndexedCombat } from '../combat';

/**
 * Carta do Desperto: o resumo do personagem para compartilhar como imagem. Só lê o estado;
 * nada da carta volta para a partida.
 */
export interface AwakenedCardAchievement {
  label: string;
  value: string;
}

export interface AwakenedCardData {
  name: string;
  archetypeId?: string;
  archetypeName: string;
  rank: 'apprentice' | 'initiate';
  /** Patente ou fase mostrada (por exemplo, "Aprendiz de Espadachim" ou o título de Iniciado). */
  rankTitle: string;
  palette: { primary: string; secondary: string };
  signature?: { actionId: string; name: string };
  achievements: [AwakenedCardAchievement, AwakenedCardAchievement, AwakenedCardAchievement];
  /** Código do Selo do Eco, quando o Eco já nasceu. */
  sealCode?: string;
}

const NEUTRAL_PALETTE = { primary: '#73d7b4', secondary: '#cfe3e0' };

export function buildAwakenedCard(input: {
  state: GameState;
  rank: { rank: 'apprentice' | 'initiate'; title: string };
  titles: readonly { id: string; name: string }[];
  sealCode?: string;
  combat?: IndexedCombat;
  archetypes?: IndexedArchetypes;
}): AwakenedCardData {
  const { state } = input;
  const combat = input.combat ?? INITIAL_COMBAT;
  const archetypes = input.archetypes ?? INITIAL_ARCHETYPES;
  const archetype = state.character.archetypeId ? archetypes.byId.get(state.character.archetypeId) : undefined;
  const signatureId = archetypeSignatureActions(archetypes, archetype?.id)[0];
  const signatureAction = signatureId ? combat.actionById.get(signatureId) : undefined;
  return {
    name: `${state.character.firstName} ${state.character.lastName}`.trim() || 'Desperto',
    ...(archetype ? { archetypeId: archetype.id } : {}),
    archetypeName: archetype?.name ?? 'Sobrevivente',
    rank: input.rank.rank,
    rankTitle: input.rank.title,
    palette: archetype ? { primary: archetype.palette.primary, secondary: archetype.palette.secondary } : NEUTRAL_PALETTE,
    ...(signatureAction ? { signature: { actionId: signatureAction.id, name: signatureAction.name } } : {}),
    achievements: [
      { label: 'Título mais recente', value: latestTitle(state, input.titles) },
      { label: 'Maior vitória', value: biggestVictory(state, combat) },
      { label: 'Sobrevivência', value: state.world.day === 1 ? '1 dia' : `${state.world.day} dias` },
    ],
    ...(input.sealCode ? { sealCode: input.sealCode } : {}),
  };
}

function latestTitle(state: GameState, titles: readonly { id: string; name: string }[]): string {
  for (let index = state.progression.titleIds.length - 1; index >= 0; index -= 1) {
    const found = titles.find((title) => title.id === state.progression.titleIds[index]);
    if (found) return found.name;
  }
  return 'Ainda sem título';
}

/** A criatura mais resistente (maior vida) que o Desperto já venceu, pelo Bestiário. */
function biggestVictory(state: GameState, combat: IndexedCombat): string {
  let best: { name: string; maxHealth: number } | undefined;
  for (const [combatantId, record] of Object.entries(state.bestiary?.entries ?? {})) {
    if (record.victories <= 0) continue;
    const combatant = combat.combatantById.get(combatantId);
    if (combatant && (!best || combatant.maxHealth > best.maxHealth)) best = combatant;
  }
  return best?.name ?? 'Ainda sem vitórias';
}

/** Divide o código em linhas do tamanho dado (para o rodapé da carta). */
export function wrapCode(code: string, width: number): string[] {
  const lines: string[] = [];
  for (let index = 0; index < code.length; index += width) lines.push(code.slice(index, index + width));
  return lines;
}
