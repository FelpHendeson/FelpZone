import type { GameState } from '../../core/state';
import type { NeedId } from '../../modules/needs';
import type { SandboxAction } from '../../modules/sandbox-actions';
import { periodsUntilNextDawn } from '../../modules/sandbox-actions';
import { findPendingChapterTrigger, isWorldTriggerConsumed, type IndexedWorldTriggers } from '../../modules/world-events';
import type { JournalView } from '../journal/model';
import { currentChapter, type ExplorationView } from '../sandbox';
import type { GameView } from '../screens/exploration/shared';

export type HintPriority = 'urgente' | 'importante' | 'sugestão';

export type HintAction =
  | { kind: 'sandbox'; label: string; action: SandboxAction }
  | { kind: 'navigate'; label: string; view: GameView }
  | { kind: 'open-actions'; label: string };

/** Sinal do Sistema-tutor: o que importa agora e um atalho para resolver. */
export interface SystemHint {
  id: string;
  priority: HintPriority;
  title: string;
  detail: string;
  action?: HintAction;
}

const PRIORITY_ORDER: Record<HintPriority, number> = { urgente: 0, importante: 1, sugestão: 2 };

const NEED_COPY: Record<'fome' | 'sede', { title: string; noun: string; lookFor: string }> = {
  fome: { title: 'Sua fome está alta', noun: 'comida', lookFor: 'frutos, caça ou carne para cozinhar' },
  sede: { title: 'Sua sede está alta', noun: 'água', lookFor: 'uma fonte de água limpa' },
};

/** Dias sem o capítulo virar antes de o Sistema insistir no próximo passo. */
export const STALLED_CHAPTER_DAYS = 2;

/**
 * Deriva os sinais do Sistema a partir do estado e da visão de exploração.
 * Função pura: não persiste nada e não decide regra — só aponta ações que já existem.
 */
export function deriveSystemHints(input: {
  state: GameState;
  view: ExplorationView;
  journal: JournalView;
  triggers?: IndexedWorldTriggers;
}): SystemHint[] {
  const { state, view, journal, triggers } = input;
  const hints: SystemHint[] = [];

  for (const needId of ['sede', 'fome'] as const) {
    const need = view.needs.find((entry) => entry.id === needId);
    if (!need || (need.band !== 'urgent' && need.band !== 'critical')) continue;
    hints.push(needHint(needId, need.band === 'critical', view));
  }

  const energy = view.needs.find((entry) => entry.id === 'energia');
  if (energy && (energy.band === 'urgent' || energy.band === 'critical')) {
    hints.push({
      id: 'need-energia',
      priority: energy.band === 'critical' ? 'urgente' : 'importante',
      title: 'Sua energia está no fim',
      detail: `${view.rest.label} recupera energia. Uma fogueira ativa torna o repouso melhor.`,
      action: { kind: 'sandbox', label: view.rest.label, action: { type: 'needs.rest', mode: view.rest.mode } },
    });
  }

  const pending = triggers ? findPendingChapterTrigger(triggers, state) : undefined;
  if (pending) {
    const chapter = currentChapter(state.flags);
    hints.push({
      id: `chapter-ready-${pending.id}`,
      priority: 'importante',
      title: chapter ? `Capítulo ${chapter.number} concluído` : 'Capítulo concluído',
      detail: 'A cena-chave foi resolvida. Durma até o amanhecer para começar o próximo capítulo — ou aproveite o resto do dia antes.',
      action: {
        kind: 'sandbox',
        label: `Dormir até o amanhecer (${periodsUntilNextDawn(state.world.period)} período${periodsUntilNextDawn(state.world.period) === 1 ? '' : 's'})`,
        action: { type: 'needs.rest', mode: view.rest.mode, untilDawn: true },
      },
    });
  }

  const people = view.presences.filter((presence) => presence.kind === 'npc' && presence.interactions.some((entry) => entry.available));
  if (people.length > 0) {
    hints.push({
      id: `people-${view.location.id}-${people.map((person) => person.presenceId).join('-')}`,
      priority: 'importante',
      title: people.length === 1 ? `${people[0]!.name} está aqui` : `${people.length} pessoas estão aqui`,
      detail: 'Você pode se aproximar, conversar ou manter distância. Cada escolha muda a história.',
      action: { kind: 'navigate', label: 'Ver quem está aqui', view: 'people' },
    });
  }

  const activities = view.activities.filter((activity) => activity.available);
  if (activities.length > 0) {
    hints.push({
      id: `activities-${activities.map((activity) => activity.activityId).join('-')}`,
      priority: 'importante',
      title: activities.length === 1 ? activities[0]!.label : `${activities.length} atividades disponíveis aqui`,
      detail: 'Atividades com outras pessoas aparecem em Ações locais.',
      action: { kind: 'open-actions', label: 'Abrir ações' },
    });
  }

  if (state.world.period === 'entardecer' && !hasCampfireHere(state)) {
    hints.push({
      id: `night-${state.world.day}`,
      priority: 'sugestão',
      title: 'A noite está chegando',
      detail: 'Uma fogueira protege e melhora o descanso. Veja em Ações locais o que dá para preparar.',
      action: { kind: 'open-actions', label: 'Preparar a noite' },
    });
  }

  const nothingLeftHere =
    !view.location.canExplore &&
    !view.resources.some((resource) => resource.collectable) &&
    activities.length === 0 &&
    people.length === 0;
  const route = view.destinations.find((destination) => destination.accessible);
  if (nothingLeftHere && route) {
    hints.push({
      id: `exhausted-${view.location.id}`,
      priority: 'sugestão',
      title: `Não resta muito em ${view.location.name}`,
      detail: `${route.name} ainda pode guardar descobertas.`,
      action: { kind: 'sandbox', label: `Ir para ${route.name}`, action: { type: 'navigation.move', locationId: route.locationId } },
    });
  }

  const step = currentJourneyStep(journal);
  if (step) {
    const stalled = triggers ? isChapterStalled(state, triggers) : false;
    hints.push({
      id: `journey-${step.journeyId}-${step.stepId}`,
      priority: stalled ? 'importante' : 'sugestão',
      title: stalled ? 'A história espera por você' : `Próximo passo: ${step.title}`,
      detail: stalled ? `Faz alguns dias que nada avança. Próximo passo: ${step.title} (${step.journeyTitle}).` : step.journeyTitle,
      action: { kind: 'navigate', label: 'Ver jornada', view: 'journal' },
    });
  }

  return hints.sort((left, right) => PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]);
}

function needHint(needId: 'fome' | 'sede', critical: boolean, view: ExplorationView): SystemHint {
  const copy = NEED_COPY[needId];
  const priority: HintPriority = critical ? 'urgente' : 'importante';
  const item = view.inventory.find((entry) => entry.consumable && entry.effects.some((effect) => effect.needId === (needId as NeedId)));
  if (item) {
    return {
      id: `need-${needId}`,
      priority,
      title: copy.title,
      detail: `Você tem ${item.quantity}× ${item.name} na mochila.`,
      action: { kind: 'sandbox', label: `Consumir ${item.name}`, action: { type: 'needs.consume', itemId: item.itemId } },
    };
  }
  const source = view.resources.find((resource) => resource.collectable);
  if (source) {
    return {
      id: `need-${needId}`,
      priority,
      title: copy.title,
      detail: `Há ${source.name} aqui. Colete e prepare ${copy.noun} em Ações locais.`,
      action: { kind: 'open-actions', label: 'Abrir ações' },
    };
  }
  return {
    id: `need-${needId}`,
    priority,
    title: copy.title,
    detail: `Nada aqui resolve isso agora. Explore ou mude de local para encontrar ${copy.lookFor}.`,
    action: view.location.canExplore
      ? { kind: 'sandbox', label: 'Explorar', action: { type: 'exploration.explore' } }
      : { kind: 'navigate', label: 'Ver o mapa', view: 'map' },
  };
}

function hasCampfireHere(state: GameState): boolean {
  const here = state.sandbox.navigation.currentLocationId;
  return state.sandbox.crafting.structures.some((entry) => entry.locationId === here && entry.active);
}

function currentJourneyStep(journal: JournalView): { journeyId: string; journeyTitle: string; stepId: string; title: string } | null {
  const journeys = [...journal.journeys].filter((journey) => journey.status === 'active');
  journeys.sort((left, right) => (left.kind === 'main' ? -1 : 0) - (right.kind === 'main' ? -1 : 0));
  for (const journey of journeys) {
    const step = journey.steps.find((entry) => entry.current);
    if (step) return { journeyId: journey.id, journeyTitle: journey.title, stepId: step.id, title: step.title };
  }
  return null;
}

/** O capítulo seguinte ainda não está liberado e o atual já dura `STALLED_CHAPTER_DAYS` dias ou mais. */
export function isChapterStalled(state: GameState, triggers: IndexedWorldTriggers): boolean {
  for (const trigger of triggers.definitions) {
    if (trigger.source.type !== 'story.chapter' || trigger.source.after === undefined) continue;
    const openedDay = state.story?.chapterDays[trigger.source.after];
    if (openedDay === undefined) continue;
    if (isWorldTriggerConsumed(state, trigger.id)) continue;
    if (state.world.day - openedDay >= STALLED_CHAPTER_DAYS) return true;
  }
  return false;
}
