import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ScriptLine } from '../../core/events';
import { SystemCorners } from './Icon';
import { Portrait } from './Portrait';

export interface ScriptSpeaker {
  name: string;
  portraitSrc?: string;
}

interface ScriptStageProps {
  lines: ScriptLine[];
  playerName: string;
  speakers: Record<string, ScriptSpeaker>;
  interpolate: (text: string) => string;
  onComplete: () => void;
  /** Milissegundos por caractere; 0 mostra a linha inteira de uma vez. */
  charDelay?: number;
}

const DEFAULT_CHAR_DELAY = 18;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/**
 * Cena de visual novel: uma linha por toque, com digitação progressiva.
 * Linhas `system` consecutivas formam uma janela do Sistema que cresce a cada toque.
 * Nada aqui é persistido: recarregar a partida reinicia o roteiro do evento atual.
 */
export function ScriptStage({ lines, playerName, speakers, interpolate, onComplete, charDelay }: ScriptStageProps) {
  const delay = charDelay ?? (prefersReducedMotion() ? 0 : DEFAULT_CHAR_DELAY);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const [finished, setFinished] = useState(lines.length === 0);
  const logEndRef = useRef<HTMLDivElement>(null);

  const current = finished ? undefined : lines[index];
  const currentText = current ? interpolate(current.text) : '';
  const visible = delay === 0 ? currentText.length : Math.min(shown, currentText.length);
  const typing = current !== undefined && visible < currentText.length;

  useEffect(() => {
    if (!current || delay === 0) return;
    const length = currentText.length;
    const timer = window.setInterval(() => {
      setShown((value) => {
        if (value >= length) {
          window.clearInterval(timer);
          return value;
        }
        return value + 1;
      });
    }, delay);
    return () => window.clearInterval(timer);
  }, [current, currentText, delay]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView?.({ block: 'end', behavior: delay === 0 ? 'auto' : 'smooth' });
  }, [index, finished, delay]);

  function advance() {
    if (finished) return;
    if (typing) {
      setShown(currentText.length);
      return;
    }
    if (index + 1 >= lines.length) {
      finish();
      return;
    }
    setShown(0);
    setIndex(index + 1);
  }

  function finish() {
    setFinished(true);
    onComplete();
  }

  // Janela do Sistema aberta: grupo de linhas `system` consecutivas até a atual.
  const systemGroupStart = current?.kind === 'system' ? groupStart(lines, index) : -1;
  const pastLines = finished ? lines : lines.slice(0, systemGroupStart >= 0 ? systemGroupStart : index);

  return (
    <section className="vn-stage" aria-label="Cena">
      <div className="vn-log" aria-live="off">
        {pastLines.map((line, lineIndex) => (
          <Fragment key={lineIndex}>{renderLine(line, interpolate(line.text), playerName, speakers, 'log')}</Fragment>
        ))}
      </div>

      {current && current.kind !== 'system' ? (
        <button type="button" className={`vn-box vn-box--${current.kind}`} onClick={advance} aria-label="Avançar diálogo">
          {renderLine(current, currentText.slice(0, visible), playerName, speakers, 'box')}
          <span className="sr-only">{currentText}</span>
          <span className={typing ? 'vn-box__cue vn-box__cue--typing' : 'vn-box__cue'} aria-hidden="true">▾</span>
        </button>
      ) : null}

      {current && current.kind === 'system' ? (
        <div className="vn-system" role="dialog" aria-modal="true" aria-label="Mensagem do Sistema" onClick={advance}>
          <div className="vn-system__panel">
            <SystemCorners />
            <p className="vn-system__kicker">[ Sistema ]</p>
            <ul className="vn-system__lines">
              {lines.slice(systemGroupStart, index + 1).map((line, offset) => {
                const lineIndex = systemGroupStart + offset;
                const text = interpolate(line.text);
                return (
                  <li key={lineIndex} className={lineIndex === index ? 'is-current' : undefined}>
                    {formatInline(lineIndex === index ? text.slice(0, visible) : text)}
                    {lineIndex === index ? <span className="sr-only">{text}</span> : null}
                  </li>
                );
              })}
            </ul>
            <button type="button" className="button button--primary vn-system__next" onClick={(event) => { event.stopPropagation(); advance(); }} autoFocus>
              {typing ? 'Mostrar' : 'Continuar'}
            </button>
          </div>
        </div>
      ) : null}

      {!finished ? (
        <button type="button" className="vn-skip" onClick={finish}>
          Pular cena <span aria-hidden="true">»</span>
        </button>
      ) : null}
      <div ref={logEndRef} className="vn-anchor" aria-hidden="true" />
    </section>
  );
}

function groupStart(lines: ScriptLine[], index: number): number {
  let start = index;
  while (start > 0 && lines[start - 1]?.kind === 'system') start -= 1;
  return start;
}

function renderLine(
  line: ScriptLine,
  text: string,
  playerName: string,
  speakers: Record<string, ScriptSpeaker>,
  place: 'log' | 'box',
): ReactNode {
  const className = `vn-line vn-line--${line.kind} vn-line--${place}`;
  switch (line.kind) {
    case 'narration':
      return <p className={className}>{formatInline(text)}</p>;
    case 'thought':
      return (
        <div className={className}>
          <span className="vn-line__speaker">{playerName} <small>pensa</small></span>
          <p>{formatInline(text)}</p>
        </div>
      );
    case 'system':
      return (
        <div className={className}>
          <span className="vn-line__speaker">Sistema</span>
          <p>{formatInline(text)}</p>
        </div>
      );
    case 'speech': {
      const speaker = speakers[line.speakerId] ?? { name: line.speakerId };
      return (
        <div className={className}>
          <Portrait name={speaker.name} src={speaker.portraitSrc} className="vn-line__portrait" />
          <div>
            <span className="vn-line__speaker">{speaker.name}</span>
            <p>{formatInline(text)}</p>
          </div>
        </div>
      );
    }
  }
}

/** Negrito com **texto**, mesmo dialeto mínimo já usado nos eventos. */
function formatInline(text: string): ReactNode {
  const parts = text.split('**');
  return parts.map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : <Fragment key={index}>{part}</Fragment>));
}
