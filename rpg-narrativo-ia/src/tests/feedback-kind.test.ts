import { describe, expect, it } from 'vitest';
import {
  feedbackClassName,
  feedbackIcon,
  feedbackTitle,
  mergeFeedback,
  type WorldFeedbackView,
} from '../ui/sandbox/feedback';

describe('feedback estruturado', () => {
  it('define estilo, ícone e título pelo kind mesmo quando o texto muda', () => {
    const renamedDiscovery: WorldFeedbackView = {
      kind: 'discovery',
      message: 'Você encontrou um rastro antigo.',
      title: feedbackTitle('discovery'),
    };
    expect(renamedDiscovery.message.includes('Descoberta:')).toBe(false);
    expect(feedbackClassName(renamedDiscovery.kind)).toBe('world-feedback world-feedback--discovery');
    expect(feedbackIcon(renamedDiscovery.kind)).toBe('✦');
    expect(feedbackTitle(renamedDiscovery.kind)).toBe('Nova descoberta');

    const renamedCritical: WorldFeedbackView = {
      kind: 'critical',
      message: 'Você está no limite.',
      title: feedbackTitle('critical'),
    };
    expect(renamedCritical.message.includes('Condição crítica:')).toBe(false);
    expect(feedbackClassName(renamedCritical.kind)).toBe('world-feedback world-feedback--warning');
    expect(feedbackIcon(renamedCritical.kind)).toBe('!');
    expect(feedbackTitle(renamedCritical.kind)).toBe('Atenção à condição');

    const renamedJourney: WorldFeedbackView = {
      kind: 'journey',
      message: 'Objetivo avançou.',
      title: feedbackTitle('journey'),
    };
    expect(renamedJourney.message.includes('Jornada ')).toBe(false);
    expect(renamedJourney.message.includes('Nova jornada:')).toBe(false);
    expect(feedbackClassName(renamedJourney.kind)).toBe('world-feedback world-feedback--journey');
    expect(feedbackIcon(renamedJourney.kind)).toBe('⌖');
    expect(feedbackTitle(renamedJourney.kind)).toBe('Jornada atualizada');
  });

  it('não reclassifica um kind pelo texto da mensagem', () => {
    const copyThatLooksLikeDiscovery: WorldFeedbackView = {
      kind: 'success',
      message: 'Descoberta: isso não deve virar visual de descoberta.',
      title: feedbackTitle('success'),
    };
    expect(feedbackClassName(copyThatLooksLikeDiscovery.kind)).toBe('world-feedback');
    expect(feedbackIcon(copyThatLooksLikeDiscovery.kind)).toBe('✓');
    expect(feedbackTitle(copyThatLooksLikeDiscovery.kind)).toBe('Mundo atualizado');

    const merged = mergeFeedback([
      { kind: 'success', message: 'Descoberta: texto enganoso.' },
      { kind: 'info', message: 'Jornada concluída: também enganoso.' },
    ]);
    expect(merged?.kind).toBe('success');
    expect(merged?.title).toBe('Mundo atualizado');
  });
});
