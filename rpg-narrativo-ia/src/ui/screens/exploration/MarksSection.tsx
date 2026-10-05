import { useState } from 'react';
import type { GameState } from '../../../core/state';
import { INITIAL_COMBAT } from '../../../modules/combat';
import { bestiaryLevel } from '../../../modules/bestiary';
import {
  INITIAL_MARKS,
  encodeMark,
  encodeMarkAnswer,
  isChallengeDone,
  markAuthorId,
  markText,
  receiveMark,
  receiveMarkAnswer,
  type MarkContent,
  type MarkType,
  type MarksState,
} from '../../../modules/marks';
import type { SandboxAction } from '../../../modules/sandbox-actions';
import { AppDialog } from '../../components/AppDialog';

export interface MarkNames {
  location: (id: string) => string;
  creature: (id: string) => string;
}

function victoriesOver(state: GameState) {
  return (combatantId: string) => state.bestiary?.entries[combatantId]?.victories ?? 0;
}

function typeOf(content: MarkContent) {
  const phrase = INITIAL_MARKS.phraseById.get(content.phraseId);
  return INITIAL_MARKS.types.find((type) => type.id === phrase?.type);
}

/** Marcas no local atual: as recebidas de outros Despertos, as suas e o botão para deixar uma. */
export function MarksSection({
  state,
  names,
  onAction,
}: {
  state: GameState;
  names: MarkNames;
  onAction: (action: SandboxAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const locationId = state.sandbox.navigation.currentLocationId;
  const received = (state.marks?.received ?? []).filter((mark) => mark.locationId === locationId);
  const left = (state.marks?.left ?? []).filter((mark) => mark.locationId === locationId);
  const myName = `${state.character.firstName} ${state.character.lastName}`;
  return (
    <section className="marks-section" aria-label="Marcas neste local">
      <div className="marks-section__head">
        <span className="section-kicker">Marcas de Despertos</span>
        <button type="button" className="button button--compact button--ghost" onClick={() => setOpen(true)}>
          Deixar marca · 5 min
        </button>
      </div>
      {received.length === 0 && left.length === 0 ? (
        <p className="marks-section__empty">Nenhuma marca aqui. Marcas de outros Despertos chegam por código, em Ecos.</p>
      ) : (
        <ul className="marks-list">
          {received.map((mark) => {
            const type = typeOf(mark);
            const done = isChallengeDone(mark, victoriesOver(state));
            return (
              <li key={mark.id} className={`mark-card mark-card--${type?.id ?? 'greeting'}`}>
                <span className="mark-card__icon" aria-hidden="true">{type?.icon}</span>
                <div>
                  <p>“{markText(mark, names)}”</p>
                  <small>
                    {type?.name} · marca de {mark.authorName}
                    {mark.baselineVictories !== undefined ? (done ? ' · desafio cumprido' : ' · desafio em aberto') : ''}
                  </small>
                  {done ? (
                    <details className="mark-card__answer">
                      <summary>Responder a {mark.authorName}</summary>
                      <textarea readOnly rows={2} value={encodeMarkAnswer(mark, myName, markAuthorId(state))} onFocus={(event) => event.currentTarget.select()} />
                    </details>
                  ) : null}
                </div>
              </li>
            );
          })}
          {left.map((mark) => (
            <li key={mark.id} className="mark-card mark-card--mine">
              <span className="mark-card__icon" aria-hidden="true">{typeOf(mark)?.icon}</span>
              <div>
                <p>“{markText(mark, names)}”</p>
                <small>Sua marca · compartilhe o código em Ecos</small>
              </div>
            </li>
          ))}
        </ul>
      )}
      <LeaveMarkDialog open={open} state={state} names={names} onClose={() => setOpen(false)} onLeave={(action) => { onAction(action); setOpen(false); }} />
    </section>
  );
}

function LeaveMarkDialog({
  open,
  state,
  names,
  onClose,
  onLeave,
}: {
  open: boolean;
  state: GameState;
  names: MarkNames;
  onClose: () => void;
  onLeave: (action: SandboxAction) => void;
}) {
  const [type, setType] = useState<MarkType>('warning');
  const [phraseId, setPhraseId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const phrases = INITIAL_MARKS.phrases.filter((phrase) => phrase.type === type);
  const phrase = INITIAL_MARKS.phraseById.get(phraseId) ?? phrases[0];
  const targets =
    phrase?.target === 'creature'
      ? INITIAL_COMBAT.combatants.filter((combatant) => bestiaryLevel(state, combatant.id) >= 1).map((combatant) => ({ id: combatant.id, name: combatant.name }))
      : phrase?.target === 'location'
        ? state.sandbox.navigation.discoveredLocationIds.map((id) => ({ id, name: names.location(id) }))
        : [];
  const target = targets.find((entry) => entry.id === targetId) ?? targets[0];
  const blocked = phrase?.target !== 'none' && !target;
  const preview = phrase
    ? markText({ locationId: '', phraseId: phrase.id, ...(target ? { targetId: target.id } : {}) }, names)
    : '';
  return (
    <AppDialog open={open} title="Deixar uma marca" onClose={onClose}>
      <div className="marks-dialog">
      <p className="marks-dialog__hint">
        A marca fica neste local. Depois, em Ecos, copie o código e mande para outro Desperto: ela aparece no mesmo lugar do mundo dele.
      </p>
      <div className="chip-row" role="radiogroup" aria-label="Tipo de marca">
        {INITIAL_MARKS.types.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="radio"
            aria-checked={entry.id === type}
            className="chip"
            aria-pressed={entry.id === type}
            onClick={() => {
              setType(entry.id);
              setPhraseId('');
              setTargetId('');
            }}
          >
            {entry.icon} {entry.name}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Frase</span>
        <select value={phrase?.id ?? ''} onChange={(event) => { setPhraseId(event.target.value); setTargetId(''); }}>
          {phrases.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.text.replace('{alvo}', entry.target === 'creature' ? '(criatura)' : '(local)')}
            </option>
          ))}
        </select>
      </label>
      {phrase && phrase.target !== 'none' ? (
        <label className="field">
          <span>{phrase.target === 'creature' ? 'Criatura' : 'Local'}</span>
          {targets.length === 0 ? (
            <small className="field__error">{phrase.target === 'creature' ? 'Você ainda não avistou nenhuma criatura.' : 'Nenhum local descoberto.'}</small>
          ) : (
            <select value={target?.id ?? ''} onChange={(event) => setTargetId(event.target.value)}>
              {targets.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          )}
        </label>
      ) : null}
      {preview ? <p className="marks-dialog__preview">“{preview}”</p> : null}
      <div className="button-stack">
        <button
          type="button"
          className="button button--primary"
          disabled={!phrase || blocked}
          onClick={() => phrase && onLeave(target ? { type: 'mark.leave', phraseId: phrase.id, targetId: target.id } : { type: 'mark.leave', phraseId: phrase.id })}
        >
          Deixar marca
        </button>
        <button type="button" className="button button--ghost" onClick={onClose}>
          Cancelar
        </button>
      </div>
      </div>
    </AppDialog>
  );
}

/** Troca de marcas em Ecos: suas marcas com o código, marcas recebidas e respostas a desafios. */
export function MarksExchange({
  state,
  names,
  world,
  onUpdateMarks,
}: {
  state: GameState;
  names: MarkNames;
  world: { locationIds: ReadonlySet<string> };
  onUpdateMarks: (marks: MarksState) => void;
}) {
  const [markCode, setMarkCode] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const authorId = markAuthorId(state);
  const myName = `${state.character.firstName} ${state.character.lastName}`;
  const left = state.marks?.left ?? [];

  function importMark() {
    const result = receiveMark(state.marks, markCode, world, { day: state.world.day, myAuthorId: authorId, victoriesOver: victoriesOver(state) });
    if (!result.ok) {
      setMessage(result.reason);
      return;
    }
    onUpdateMarks(result.value);
    setMarkCode('');
    const mark = result.value.received[result.value.received.length - 1]!;
    setMessage(`Marca recebida: ela aparece em ${names.location(mark.locationId)}.`);
  }

  function importAnswer() {
    const result = receiveMarkAnswer(state.marks, answerCode, authorId);
    if (!result.ok) {
      setMessage(result.reason);
      return;
    }
    onUpdateMarks(result.value);
    setAnswerCode('');
    setMessage('Resposta registrada: alguém cumpriu o seu desafio.');
  }

  return (
    <section className="echo-card" aria-labelledby="echo-marks">
      <h2 id="echo-marks">Marcas</h2>
      <p className="echo-hint">
        Deixe marcas pelo mundo (na tela do local) e mande o código para outro Desperto. Desafios cumpridos voltam como resposta.
      </p>
      {left.length > 0 ? (
        <ul className="marks-list">
          {left.map((mark) => (
            <li key={mark.id} className="mark-card mark-card--mine">
              <span className="mark-card__icon" aria-hidden="true">{typeOf(mark)?.icon}</span>
              <div>
                <p>“{markText(mark, names)}”</p>
                <small>
                  {names.location(mark.locationId)}
                  {mark.answers.length > 0 ? ` · cumprido por ${mark.answers.map((answer) => answer.responderName).join(', ')}` : ''}
                </small>
                <textarea readOnly rows={2} aria-label="Código da marca" value={encodeMark(mark, myName, authorId)} onFocus={(event) => event.currentTarget.select()} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <label className="echo-field">
        <span>Recebeu uma marca? Cole o código</span>
        <textarea value={markCode} rows={2} spellCheck={false} placeholder="MRC1.…" onChange={(event) => setMarkCode(event.target.value)} />
      </label>
      <button type="button" className="button" disabled={!markCode.trim()} onClick={importMark}>
        Receber marca
      </button>
      <label className="echo-field">
        <span>Alguém cumpriu um desafio seu? Cole a resposta</span>
        <textarea value={answerCode} rows={2} spellCheck={false} placeholder="RSP1.…" onChange={(event) => setAnswerCode(event.target.value)} />
      </label>
      <button type="button" className="button" disabled={!answerCode.trim()} onClick={importAnswer}>
        Registrar resposta
      </button>
      {message ? <p className="echo-message" role="status">{message}</p> : null}
    </section>
  );
}
