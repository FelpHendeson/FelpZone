import { useState } from 'react';
import type { CombatStyle, IndexedCombat } from '../../../modules/combat';
import {
  ECHO_STYLE_LABELS,
  decodeEchoSeal,
  encodeEchoSeal,
  summarizeRivals,
  verifyEchoResult,
  type EchoDuelRecord,
  type EchoesState,
  type EchoSeal,
} from '../../../modules/echoes';
import { Choice } from './SettingsPanel';
import { archetypeOf } from '../../silhouettes';
import { DetailScreen } from './shared';

export type EchoDuelMode = 'challenge' | 'hot-seat';

interface EchoesPanelProps {
  combat: IndexedCombat;
  mySeal: EchoSeal;
  echoes: EchoesState;
  pendingResultCode: string | null;
  onStyle: (style: CombatStyle) => void;
  onDuel: (rival: EchoSeal, mode: EchoDuelMode) => void;
  onRecord: (record: Omit<EchoDuelRecord, 'day'>, resultId?: string) => void;
  onBack: () => void;
}

/** Ecos: o Selo do Desperto, a Prova do Eco (contra a IA do Eco ou na mesma tela) e os resultados. */
export function EchoesPanel({ combat, mySeal, echoes, pendingResultCode, onStyle, onDuel, onRecord, onBack }: EchoesPanelProps) {
  const myCode = encodeEchoSeal(mySeal);
  const [rivalCode, setRivalCode] = useState('');
  const [resultCode, setResultCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const rival = rivalCode.trim() ? decodeEchoSeal(rivalCode, combat) : null;
  const rivals = summarizeRivals(echoes);

  function receiveResult() {
    const verified = verifyEchoResult(resultCode, mySeal, combat);
    if (!verified.ok) {
      setMessage(verified.reason);
      return;
    }
    if (echoes.receivedResultIds.includes(verified.value.resultId)) {
      setMessage('Este resultado já foi registrado.');
      return;
    }
    onRecord(
      { rivalId: verified.value.challengerId, rivalName: verified.value.challengerName, outcome: verified.value.outcomeForMe, kind: 'received' },
      verified.value.resultId,
    );
    setResultCode('');
    setMessage(
      verified.value.outcomeForMe === 'victory'
        ? `Seu Eco resistiu a ${verified.value.challengerName}. O Registro anotou a vitória.`
        : verified.value.outcomeForMe === 'defeat'
          ? `${verified.value.challengerName} superou o seu Eco. O Registro anotou a derrota.`
          : `${verified.value.challengerName} recuou diante do seu Eco.`,
    );
  }

  return (
    <DetailScreen title="Ecos" eyebrow="Prova do Eco" tone="registry" onBack={onBack}>
      <p className="detail-screen__intro">
        [ Sistema ] Todo Desperto deixa um Eco: a marca das escolhas que o Sistema registrou em combate. Em Basilis,
        Despertos de ilhas distantes só se cruzam assim. A Prova do Eco é um duelo reconhecido pelo Sistema — ninguém
        morre, mas o Registro lembra.
      </p>

      {pendingResultCode ? (
        <section className="echo-card echo-card--result" aria-labelledby="echo-result">
          <h2 id="echo-result">Envie o resultado</h2>
          <p>Mande este código para quem é dono do Eco. Ao registrar, o jogo dele refaz o duelo e confere o desfecho.</p>
          <CodeBox code={pendingResultCode} label="Código de resultado" />
        </section>
      ) : null}

      <section className="echo-card" aria-labelledby="echo-seal">
        <h2 id="echo-seal">Seu Selo do Desperto</h2>
        <p>
          {mySeal.name}
          {archetypeOf(mySeal.archetypeId) ? ` · ${archetypeOf(mySeal.archetypeId)!.name}` : ''} · {mySeal.actionIds.length} ações · {mySeal.knownSkillIds.length} habilidade{mySeal.knownSkillIds.length === 1 ? '' : 's'}.
          Quem enfrentar o seu Eco luta contra a IA seguindo o estilo que você escolher.
        </p>
        <Choice
          name="Estilo tático do seu Eco"
          value={mySeal.style}
          onChange={onStyle}
          options={[
            { id: 'balanced', label: ECHO_STYLE_LABELS.balanced, hint: 'Alterna defesa e ataque' },
            { id: 'aggressive', label: ECHO_STYLE_LABELS.aggressive, hint: 'Dano primeiro, sempre' },
            { id: 'defensive', label: ECHO_STYLE_LABELS.defensive, hint: 'Abre cada rodada protegido' },
          ]}
        />
        <CodeBox code={myCode} label="Seu Selo" share={`Meu Selo do Desperto em Reset: ${myCode}`} />
      </section>

      <section className="echo-card" aria-labelledby="echo-challenge">
        <h2 id="echo-challenge">Prova do Eco</h2>
        <label className="echo-field">
          <span>Cole o Selo de outro Desperto</span>
          <textarea value={rivalCode} rows={3} spellCheck={false} placeholder="ECO1.…" onChange={(event) => setRivalCode(event.target.value)} />
        </label>
        {rival && !rival.ok ? <p className="echo-error">{rival.reason}</p> : null}
        {rival && rival.ok ? (
          <div className="echo-rival">
            <p>
              <strong>Eco de {rival.value.name}</strong>
              {archetypeOf(rival.value.archetypeId) ? ` · ${archetypeOf(rival.value.archetypeId)!.name}` : ''} · {ECHO_STYLE_LABELS[rival.value.style]} ·{' '}
              {rival.value.actionIds.length} ações
            </p>
            <div className="echo-actions">
              <button type="button" className="button button--primary" onClick={() => onDuel(rival.value, 'challenge')}>
                Enfrentar o Eco
              </button>
              <button type="button" className="button" onClick={() => onDuel(rival.value, 'hot-seat')}>
                Duelo na mesma tela
              </button>
            </div>
            <p className="echo-hint">
              No duelo na mesma tela, {rival.value.name} monta a própria rodada no seu aparelho; a sequência fica oculta até os
              dois declararem pronto.
            </p>
          </div>
        ) : null}
      </section>

      <section className="echo-card" aria-labelledby="echo-received">
        <h2 id="echo-received">Registrar um resultado recebido</h2>
        <label className="echo-field">
          <span>Alguém enfrentou o seu Eco? Cole o código de resultado</span>
          <textarea value={resultCode} rows={3} spellCheck={false} placeholder="RES1.…" onChange={(event) => setResultCode(event.target.value)} />
        </label>
        <button type="button" className="button" disabled={!resultCode.trim()} onClick={receiveResult}>
          Conferir e registrar
        </button>
        {message ? <p className="echo-message" role="status">{message}</p> : null}
      </section>

      <section className="echo-card" aria-labelledby="echo-rivals">
        <h2 id="echo-rivals">Rivalidades</h2>
        {rivals.length === 0 ? (
          <p className="echo-hint">Nenhuma Prova do Eco ainda. Troque Selos com alguém para começar uma rivalidade.</p>
        ) : (
          <ul className="echo-rivals">
            {rivals.map((entry) => (
              <li key={entry.rivalId}>
                <strong>{entry.rivalName}</strong>
                <span>
                  {entry.wins} vitória{entry.wins === 1 ? '' : 's'} · {entry.losses} derrota{entry.losses === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DetailScreen>
  );
}

function CodeBox({ code, label, share }: { code: string; label: string; share?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  async function shareCode() {
    try {
      await navigator.share({ text: share ?? code });
    } catch {
      // Compartilhar é opcional; copiar continua disponível.
    }
  }
  return (
    <div className="echo-code">
      <textarea readOnly value={code} rows={3} aria-label={label} onFocus={(event) => event.currentTarget.select()} />
      <div className="echo-actions">
        <button type="button" className="button button--compact" onClick={copy}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
        {share && typeof navigator !== 'undefined' && 'share' in navigator ? (
          <button type="button" className="button button--compact" onClick={shareCode}>
            Compartilhar
          </button>
        ) : null}
      </div>
    </div>
  );
}
