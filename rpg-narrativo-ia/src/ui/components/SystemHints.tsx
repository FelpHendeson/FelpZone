import { useEffect, useId, useRef, useState } from 'react';
import type { HintAction, SystemHint } from '../system-hints';
import { SystemCorners } from './Icon';

const PRIORITY_LABEL: Record<SystemHint['priority'], string> = {
  urgente: 'Urgente',
  importante: 'Importante',
  sugestão: 'Sugestão',
};

/** Cartão "Orientação do Sistema" no Mundo: o sinal mais importante, com atalho, e os demais sob demanda. */
export function SystemHintCard({ hints, onAction }: { hints: SystemHint[]; onAction: (action: HintAction) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [top, ...rest] = hints;
  if (!top) {
    return (
      <section className="system-hints system-hints--calm" aria-label="Orientação do Sistema">
        <span className="system-hints__kicker">[ Sistema ]</span>
        <p className="system-hints__calm">Nada urgente agora. Explore, colete e observe quem cruza o seu caminho.</p>
      </section>
    );
  }
  return (
    <section className={`system-hints system-hints--${top.priority === 'urgente' ? 'urgent' : top.priority === 'importante' ? 'important' : 'tip'}`} aria-label="Orientação do Sistema">
      <SystemCorners />
      <span className="system-hints__kicker">[ Sistema ] · {PRIORITY_LABEL[top.priority]}</span>
      <HintBody hint={top} onAction={onAction} />
      {rest.length > 0 ? (
        <>
          <button type="button" className="system-hints__more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Mostrar menos' : `Mais ${rest.length} orientaç${rest.length === 1 ? 'ão' : 'ões'}`}
          </button>
          {expanded ? (
            <ul className="system-hints__list">
              {rest.map((hint) => (
                <li key={hint.id}>
                  <HintBody hint={hint} onAction={onAction} compact />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function HintBody({ hint, onAction, compact = false }: { hint: SystemHint; onAction: (action: HintAction) => void; compact?: boolean }) {
  return (
    <div className={compact ? 'system-hint system-hint--compact' : 'system-hint'}>
      <div>
        <strong>{hint.title}</strong>
        <p>{hint.detail}</p>
      </div>
      {hint.action ? (
        <button type="button" className={compact ? 'button button--compact' : 'button button--primary button--compact'} onClick={() => onAction(hint.action!)}>
          {hint.action.label}
        </button>
      ) : null}
    </div>
  );
}

/** Janela do Sistema para sinais urgentes (modo Guiada), uma vez por sinal e período. */
export function HintAlert({ hint, onAction, onClose }: { hint: SystemHint | null; onAction: (action: HintAction) => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (hint && !node.open) node.showModal();
    if (!hint && node.open) node.close();
  }, [hint]);
  return (
    <dialog ref={dialogRef} className="system-window" aria-labelledby={titleId} onClose={onClose}>
      {hint ? (
        <div className="system-window__panel system-window__panel--alert">
          <SystemCorners />
          <p className="system-window__kicker">[ Sistema ] · Urgente</p>
          <h2 id={titleId} className="system-window__headline">{hint.title}</h2>
          <p className="system-window__detail">{hint.detail}</p>
          {hint.action ? (
            <button
              type="button"
              className="button button--primary"
              autoFocus
              onClick={() => {
                onAction(hint.action!);
                onClose();
              }}
            >
              {hint.action.label}
            </button>
          ) : null}
          <button type="button" className="button button--ghost" onClick={onClose}>Agora não</button>
        </div>
      ) : null}
    </dialog>
  );
}
