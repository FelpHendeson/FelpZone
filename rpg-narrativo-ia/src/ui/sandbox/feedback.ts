import type { SandboxContext } from '../../modules/sandbox';
import type { SandboxActionResult } from '../../modules/sandbox-actions';
import { deriveNeedsBands, type NeedId } from '../../modules/needs';
import { attributesToNeedsSnapshot, formatNeedDelta, needLabel } from '../needs/presentation';
import { INITIAL_TRAINING, getTrainingMethod } from '../../modules/training';
import { formatPeriodCost, sandboxDiscoveryName, sandboxItemName } from './labels';

export function describeSandboxFeedback(result: SandboxActionResult, context: SandboxContext): string {
  const parts: string[] = [];

  switch (result.detail.type) {
    case 'navigation.move': {
      const name =
        context.map.locations.get(result.detail.result.toLocationId)?.name ??
        result.detail.result.toLocationId;
      parts.push(`Você chegou a ${name}.`);
      break;
    }
    case 'exploration.explore': {
      const gained = result.detail.result.progressGained;
      const progress = result.detail.result.location.current.progress;
      parts.push(`Exploração +${gained}% (agora ${progress}%).`);
      for (const discovery of result.detail.result.discoveries) {
        parts.push(`Descoberta: ${sandboxDiscoveryName(discovery.id)}.`);
      }
      break;
    }
    case 'resource.collect': {
      for (const yieldEntry of result.detail.result.yields) {
        parts.push(`Coletou ${yieldEntry.quantity}× ${sandboxItemName(yieldEntry.itemId)}.`);
      }
      break;
    }
    case 'crafting.craft': {
      const crafted = result.detail.result;
      if (crafted.structure) {
        const structureName =
          context.crafting.byStructure.get(crafted.structure.structureId)?.name ?? 'estrutura';
        parts.push(`Fabricou ${structureName}.`);
      }

      for (const produced of crafted.produced) {
        parts.push(`Fabricou ${produced.quantity}× ${sandboxItemName(produced.itemId)}.`);
      }

      if (!crafted.structure && crafted.produced.length === 0) {
        parts.push(`Fabricou ${crafted.recipe.name}.`);
      }
      break;
    }
    case 'presence.interact': {
      const declared = result.feedback ?? result.detail.plan.feedback;
      parts.push(declared ?? result.detail.plan.interactionId);
      break;
    }
    case 'needs.consume': {
      parts.push(`Consumiu ${sandboxItemName(result.detail.plan.itemId)}.`);
      appendNeedEffects(parts, result.detail.plan.appliedEffects);
      break;
    }
    case 'needs.rest': {
      parts.push(result.detail.plan.mode === 'campfire' ? 'Você repousou junto à fogueira.' : 'Você repousou.');
      appendNeedEffects(parts, result.detail.plan.appliedEffects);
      break;
    }
    case 'training.train': {
      parts.push(`Treinou ${getTrainingMethod(INITIAL_TRAINING, result.detail.plan.methodId).name}.`);
      break;
    }
    case 'combat.resolve': {
      if (result.detail.resolution.outcome === 'victory') {
        parts.push('Você superou o confronto.');
      } else if (result.detail.resolution.outcome === 'defeat') {
        parts.push('Você recuou ferido do confronto.');
      } else {
        parts.push('Você fugiu do confronto.');
      }
      break;
    }
    case 'equipment.equip': {
      parts.push(`Equipou ${sandboxItemName(result.action.type === 'equipment.equip' ? result.action.itemId : '')}.`);
      break;
    }
    case 'equipment.unequip': {
      parts.push('Você desequipou um espaço.');
      break;
    }
    case 'preparation.assign': {
      parts.push(`Preparou ${sandboxItemName(result.action.type === 'preparation.assign' ? result.action.itemId : '')}.`);
      break;
    }
    case 'preparation.clear': {
      parts.push('Você limpou um espaço de preparação.');
      break;
    }
    case 'garden.cultivate': {
      parts.push('O Jardim integrou uma técnica híbrida.');
      break;
    }
  }

  if (result.timeCost.periods > 0) {
    parts.push(`Tempo: ${formatPeriodCost(result.timeCost.periods)}.`);
  }

  const wear = Object.entries(result.needsWear.changes)
    .filter((entry): entry is [NeedId, number] => entry[1] !== 0)
    .map(([needId, amount]) => formatNeedDelta(needId, amount));
  if (wear.length > 0) {
    parts.push(`Desgaste: ${wear.join(', ')}.`);
  }

  if (result.synchronization.revealedDiscoveryIds.length > 0) {
    const names = result.synchronization.revealedDiscoveryIds.map(sandboxDiscoveryName);
    parts.push(`Reavaliações: ${names.join(', ')}.`);
  }

  if (result.synchronization.renewedNodeIds.length > 0) {
    parts.push('Recursos renovados.');
  }

  if (result.synchronization.recoveredPopulationIds.length > 0) {
    parts.push('Populações recuperadas.');
  }

  if (result.synchronization.learnedRecipeIds.length > 0) {
    const names = result.synchronization.learnedRecipeIds.map(
      (recipeId) => context.crafting.byRecipe.get(recipeId)?.name ?? recipeId,
    );
    parts.push(`Receitas aprendidas: ${names.join(', ')}.`);
  }

  const bands = deriveNeedsBands(attributesToNeedsSnapshot(result.current.attributes));
  const critical = (Object.entries(bands) as Array<[NeedId, (typeof bands)[NeedId]]>)
    .filter(([, band]) => band === 'critical')
    .map(([needId]) => needLabel(needId));
  if (critical.length > 0) {
    parts.push(`Condição crítica: ${critical.join(', ')}. Ações de recuperação continuam disponíveis.`);
  }

  return parts.join(' ');
}

function appendNeedEffects(
  parts: string[],
  effects: readonly { needId: NeedId; amount: number; limited: boolean }[],
): void {
  const described = effects
    .map((effect) => `${formatNeedDelta(effect.needId, effect.amount)}${effect.limited ? ' (limitado)' : ''}`)
    .join(', ');
  if (described) {
    parts.push(`${described}.`);
  }
}
