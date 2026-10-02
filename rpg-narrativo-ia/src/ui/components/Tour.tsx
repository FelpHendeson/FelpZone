import { useEffect, useLayoutEffect, useState } from 'react';
import { SystemCorners } from './Icon';
import type { TourStep } from '../tour';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay({ steps, onFinish }: { steps: readonly TourStep[]; onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[index];

  useLayoutEffect(() => {
    if (!step) return;
    const element = document.querySelector(step.target);
    element?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
    const measure = () => {
      const box = document.querySelector(step.target)?.getBoundingClientRect();
      setRect(box && box.width > 0 ? { top: box.top, left: box.left, width: box.width, height: box.height } : null);
    };
    const frame = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, [step]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFinish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFinish]);

  if (!step) return null;
  const last = index === steps.length - 1;
  const below = rect ? rect.top + rect.height + 16 < window.innerHeight - 220 : false;
  const cardTop = rect ? (below ? rect.top + rect.height + 12 : Math.max(12, rect.top - 12)) : undefined;

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={`Tour: ${step.title}`}>
      {rect ? (
        <div
          className="tour__spotlight"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      ) : (
        <div className="tour__backdrop" />
      )}
      <div
        className={`tour__card${rect && !below ? ' tour__card--above' : ''}${rect ? '' : ' tour__card--center'}`}
        style={cardTop !== undefined ? { top: cardTop } : undefined}
      >
        <SystemCorners />
        <span className="tour__kicker">[ Sistema ] · {index + 1}/{steps.length}</span>
        <strong className="tour__title">{step.title}</strong>
        <p className="tour__text">{step.text}</p>
        <div className="tour__actions">
          <button type="button" className="button button--ghost button--compact" onClick={onFinish}>Pular tour</button>
          <button type="button" className="button button--primary button--compact" autoFocus onClick={() => (last ? onFinish() : setIndex(index + 1))}>
            {last ? 'Entendi' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  );
}
