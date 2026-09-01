import type { SandboxContext } from '../../modules/sandbox';
import type { SandboxActionResult } from '../../modules/sandbox-actions';
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
  }

  if (result.timeCost.periods > 0) {
    parts.push(`Tempo: ${formatPeriodCost(result.timeCost.periods)}.`);
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

  return parts.join(' ');
}
