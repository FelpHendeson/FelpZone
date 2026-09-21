import type { SandboxContext } from '../../modules/sandbox';
import type { SandboxActionResult } from '../../modules/sandbox-actions';
import { deriveNeedsBands, type NeedId } from '../../modules/needs';
import { attributesToNeedsSnapshot, formatNeedDelta, needLabel } from '../needs/presentation';
import { getTrainingMethod } from '../../modules/training';
import { formatPeriodCost, sandboxDiscoveryName, sandboxItemName } from './labels';

export const FEEDBACK_KINDS = ['info', 'success', 'warning', 'discovery', 'journey', 'critical'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export interface FeedbackEntry {
  kind: FeedbackKind;
  message: string;
}

export interface WorldFeedbackView {
  kind: FeedbackKind;
  message: string;
  title: string;
}

const KIND_PRIORITY: Record<FeedbackKind, number> = {
  critical: 5,
  warning: 4,
  discovery: 3,
  journey: 2,
  success: 1,
  info: 0,
};

export function feedbackTitle(kind: FeedbackKind): string {
  if (kind === 'critical' || kind === 'warning') {
    return 'Atenção à condição';
  }
  if (kind === 'discovery') {
    return 'Nova descoberta';
  }
  if (kind === 'journey') {
    return 'Jornada atualizada';
  }
  return 'Mundo atualizado';
}

export function feedbackClassName(kind: FeedbackKind): string {
  if (kind === 'critical' || kind === 'warning') {
    return 'world-feedback world-feedback--warning';
  }
  if (kind === 'discovery') {
    return 'world-feedback world-feedback--discovery';
  }
  if (kind === 'journey') {
    return 'world-feedback world-feedback--journey';
  }
  return 'world-feedback';
}

export function feedbackIcon(kind: FeedbackKind): string {
  if (kind === 'critical' || kind === 'warning') {
    return '!';
  }
  if (kind === 'discovery') {
    return '✦';
  }
  if (kind === 'journey') {
    return '⌖';
  }
  return '✓';
}

export function mergeFeedback(entries: readonly FeedbackEntry[]): WorldFeedbackView | null {
  const present = entries.filter((entry) => entry.message.trim() !== '');
  if (present.length === 0) {
    return null;
  }
  const kind = present.reduce(
    (best, entry) => (KIND_PRIORITY[entry.kind] > KIND_PRIORITY[best] ? entry.kind : best),
    present[0].kind,
  );
  return {
    kind,
    message: present.map((entry) => entry.message).join(' '),
    title: feedbackTitle(kind),
  };
}

export function describeSandboxFeedback(result: SandboxActionResult, context: SandboxContext): WorldFeedbackView {
  const entries: FeedbackEntry[] = [];
  const push = (kind: FeedbackKind, message: string | undefined) => {
    if (message && message.trim() !== '') {
      entries.push({ kind, message });
    }
  };

  switch (result.detail.type) {
    case 'navigation.move': {
      const name =
        context.map.locations.get(result.detail.result.toLocationId)?.name ??
        result.detail.result.toLocationId;
      push('success', `Você chegou a ${name}.`);
      break;
    }
    case 'exploration.explore': {
      const gained = result.detail.result.progressGained;
      const progress = result.detail.result.location.current.progress;
      push('success', `Exploração +${gained}% (agora ${progress}%).`);
      for (const discovery of result.detail.result.discoveries) {
        push('discovery', `Descoberta: ${sandboxDiscoveryName(discovery.id, context.exploration)}.`);
      }
      break;
    }
    case 'resource.collect': {
      for (const yieldEntry of result.detail.result.yields) {
        push('success', `Coletou ${yieldEntry.quantity}× ${sandboxItemName(yieldEntry.itemId, context.items)}.`);
      }
      break;
    }
    case 'crafting.craft': {
      const crafted = result.detail.result;
      if (crafted.structure) {
        const structureName =
          context.crafting.byStructure.get(crafted.structure.structureId)?.name ?? 'estrutura';
        push('success', `Fabricou ${structureName}.`);
      }

      for (const produced of crafted.produced) {
        push('success', `Fabricou ${produced.quantity}× ${sandboxItemName(produced.itemId, context.items)}.`);
      }

      if (!crafted.structure && crafted.produced.length === 0) {
        push('success', `Fabricou ${crafted.recipe.name}.`);
      }
      break;
    }
    case 'presence.interact': {
      const declared = result.feedback ?? result.detail.plan.feedback;
      push('success', declared ?? result.detail.plan.interactionId);
      break;
    }
    case 'needs.consume': {
      push('success', `Consumiu ${sandboxItemName(result.detail.plan.itemId, context.items)}.`);
      appendNeedEffects(push, result.detail.plan.appliedEffects);
      break;
    }
    case 'needs.rest': {
      push('success', result.detail.plan.mode === 'campfire' ? 'Você repousou junto à fogueira.' : 'Você repousou.');
      appendNeedEffects(push, result.detail.plan.appliedEffects);
      break;
    }
    case 'training.train': {
      const training = context.training;
      if (!training) {
        throw new Error('O catálogo de treinamentos do pack ativo não está disponível.');
      }
      push('success', `Treinou ${getTrainingMethod(training, result.detail.plan.methodId).name}.`);
      break;
    }
    case 'combat.resolve': {
      if (result.detail.resolution.outcome === 'victory') {
        push('success', 'Você superou o confronto.');
      } else if (result.detail.resolution.outcome === 'defeat') {
        push('critical', 'Você recuou ferido do confronto.');
      } else {
        push('success', 'Você fugiu do confronto.');
      }
      break;
    }
    case 'equipment.equip': {
      push('success', `Equipou ${sandboxItemName(result.action.type === 'equipment.equip' ? result.action.itemId : '', context.items)}.`);
      break;
    }
    case 'equipment.unequip': {
      push('success', 'Você desequipou um espaço.');
      break;
    }
    case 'preparation.assign': {
      push('success', `Preparou ${sandboxItemName(result.action.type === 'preparation.assign' ? result.action.itemId : '', context.items)}.`);
      break;
    }
    case 'preparation.clear': {
      push('success', 'Você limpou um espaço de preparação.');
      break;
    }
    case 'garden.cultivate': {
      push('success', 'O Jardim integrou uma técnica híbrida.');
      break;
    }
    case 'interactable.interact': {
      push('success', result.feedback ?? result.detail.plan.feedback ?? result.detail.plan.actionId);
      break;
    }
    case 'bond.act': {
      push('success', result.feedback ?? result.detail.plan.feedback ?? result.detail.plan.actionId);
      break;
    }
    case 'registry.claim': {
      push('success', 'O Registro concedeu uma patente.');
      break;
    }
    case 'organization.act': {
      push('success', result.feedback ?? result.detail.plan.feedback ?? result.detail.plan.actionId);
      break;
    }
    case 'family.act':
    case 'civic.act':
    case 'economy.act':
    case 'settlement.act':
    case 'politics.act': {
      push('success', result.feedback ?? result.detail.plan.feedback ?? result.detail.plan.actionId);
      break;
    }
  }

  if (result.timeCost.periods > 0) {
    push('info', `Tempo: ${formatPeriodCost(result.timeCost.periods)}.`);
  }

  const wear = Object.entries(result.needsWear.changes)
    .filter((entry): entry is [NeedId, number] => entry[1] !== 0)
    .map(([needId, amount]) => formatNeedDelta(needId, amount));
  if (wear.length > 0) {
    push('info', `Desgaste: ${wear.join(', ')}.`);
  }

  if (result.synchronization.revealedDiscoveryIds.length > 0) {
    const names = result.synchronization.revealedDiscoveryIds.map((id) => sandboxDiscoveryName(id, context.exploration));
    push('discovery', `Reavaliações: ${names.join(', ')}.`);
  }

  if (result.synchronization.renewedNodeIds.length > 0) {
    push('info', 'Recursos renovados.');
  }

  if (result.synchronization.recoveredPopulationIds.length > 0) {
    push('info', 'Populações recuperadas.');
  }

  if (result.synchronization.learnedRecipeIds.length > 0) {
    const names = result.synchronization.learnedRecipeIds.map(
      (recipeId) => context.crafting.byRecipe.get(recipeId)?.name ?? recipeId,
    );
    push('success', `Receitas aprendidas: ${names.join(', ')}.`);
  }

  const bands = deriveNeedsBands(attributesToNeedsSnapshot(result.current.attributes));
  const critical = (Object.entries(bands) as Array<[NeedId, (typeof bands)[NeedId]]>)
    .filter(([, band]) => band === 'critical')
    .map(([needId]) => needLabel(needId));
  if (critical.length > 0) {
    push('critical', `Condição crítica: ${critical.join(', ')}. Ações de recuperação continuam disponíveis.`);
  }

  return mergeFeedback(entries) ?? { kind: 'info', message: '', title: feedbackTitle('info') };
}

function appendNeedEffects(
  push: (kind: FeedbackKind, message: string | undefined) => void,
  effects: readonly { needId: NeedId; amount: number; limited: boolean }[],
): void {
  const described = effects
    .map((effect) => `${formatNeedDelta(effect.needId, effect.amount)}${effect.limited ? ' (limitado)' : ''}`)
    .join(', ');
  if (described) {
    push('success', `${described}.`);
  }
}
