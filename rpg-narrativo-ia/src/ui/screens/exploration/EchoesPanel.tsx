import { useState, type ReactNode } from 'react';
import type { CombatStyle, IndexedCombat } from '../../../modules/combat';
import {
  ECHO_ALLY_HEALTH,
  ECHO_STYLE_LABELS,
  MAX_ECHO_ALLIES,
  addEchoAlly,
  decodeEchoSeal,
  recordEchoBond,
  removeEchoAlly,
  verifyEchoThanks,
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
  /** Agradecimento a enviar ao dono do Eco que lutou ao seu lado. */
  pendingThanksCode?: string | null;
  /** Grava mudanças do Círculo e dos Laços de Eco. */
  onUpdateEchoes?: (echoes: EchoesState) => void;
  /** Dia de jogo (para o registro dos laços). */
  day?: number;
  /** Seções extras de troca entre jogadores (marcas). */
  extra?: ReactNode;
  /** Abre o torneio na mesma tela. */
  onTournament?: () => void;
  onStyle: (style: CombatStyle) => void;
  onDuel: (rival: EchoSeal, mode: EchoDuelMode) => void;
  onRecord: (record: Omit<EchoDuelRecord, 'day'>, resultId?: string) => void;
  onBack: () => void;
}

/** Ecos: o Selo do Desperto, a Prova do Eco (contra a IA do Eco ou na mesma tela) e os resultados. */
export function EchoesPanel({
  combat,
  mySeal,
  echoes,
  pendingResultCode,
  pendingThanksCode = null,
  onUpdateEchoes,
  day = 1,
  extra,
  onTournament,
  onStyle,
  onDuel,
  onRecord,
  onBack,
}: EchoesPanelProps) {
  const myCode = encodeEchoSeal(mySeal);
  const [rivalCode, setRivalCode] = useState('');
  const [resultCode, setResultCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [thanksCode, setThanksCode] = useState('');
  const [circleMessage, setCircleMessage] = useState<string | null>(null);
  const circle = (echoes.allies ?? []).map((code) => ({ code, seal: decodeEchoSeal(code, combat) }));
  const allyAvailableToday = (echoes.allies?.length ?? 0) > 0 && echoes.lastAllyDay !== day;

  function addAlly() {
    const added = addEchoAlly(echoes, rivalCode, combat);
    if (!added.ok) {
      setCircleMessage(added.reason);
      return;
    }
    if (rival?.ok && rival.value.name === mySeal.name && rival.value.actionIds.join() === mySeal.actionIds.join()) {
      setCircleMessage('Este é o seu próprio Selo.');
      return;
    }
    onUpdateEchoes?.(added.value);
    setCircleMessage(
      (echoes.allies?.length ?? 0) >= MAX_ECHO_ALLIES
        ? `Eco guardado no Círculo. O mais antigo saiu (limite de ${MAX_ECHO_ALLIES}).`
        : 'Eco guardado no Círculo. Ele pode lutar ao seu lado antes de um confronto, uma vez por dia.',
    );
  }

  function receiveThanks() {
    const verified = verifyEchoThanks(thanksCode, mySeal);
    if (!verified.ok) {
      setCircleMessage(verified.reason);
      return;
    }
    if (echoes.receivedResultIds.includes(verified.value.thanksId)) {
      setCircleMessage('Este agradecimento já foi registrado.');
      return;
    }
    onUpdateEchoes?.(recordEchoBond(echoes, verified.value, day));
    setThanksCode('');
    setCircleMessage(
      `Seu Eco lutou ao lado de ${verified.value.helperName} contra ${verified.value.encounterName}${
        verified.value.outcome === 'victory' ? ' e venceram' : ''
      }. O laço foi registrado.`,
    );
  }
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

      {pendingThanksCode ? (
        <section className="echo-card echo-card--result" aria-labelledby="echo-thanks">
          <h2 id="echo-thanks">Agradeça ao seu Eco aliado</h2>
          <p>Mande este código para quem é dono do Eco. Ao colar, o jogo dele registra que os dois lutaram juntos.</p>
          <CodeBox code={pendingThanksCode} label="Código de agradecimento" />
        </section>
      ) : null}

      <section className="echo-card" aria-labelledby="echo-seal">
        <h2 id="echo-seal">Seu Selo do Desperto</h2>
        <p>
          {mySeal.name}
          {archetypeOf(mySeal.archetypeId) ? ` · ${archetypeOf(mySeal.archetypeId)!.name}` : ''}
          {mySeal.rank === 'initiate' ? ' · Iniciado' : ''} · {mySeal.actionIds.length} ações · {mySeal.knownSkillIds.length} habilidade{mySeal.knownSkillIds.length === 1 ? '' : 's'}.
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
              {archetypeOf(rival.value.archetypeId) ? ` · ${archetypeOf(rival.value.archetypeId)!.name}` : ''}
              {rival.value.rank === 'initiate' ? ' · Iniciado' : ''} · {ECHO_STYLE_LABELS[rival.value.style]} ·{' '}
              {rival.value.actionIds.length} ações
            </p>
            <div className="echo-actions">
              <button type="button" className="button button--primary" onClick={() => onDuel(rival.value, 'challenge')}>
                Enfrentar o Eco
              </button>
              <button type="button" className="button" onClick={() => onDuel(rival.value, 'hot-seat')}>
                Duelo na mesma tela
              </button>
              {onUpdateEchoes ? (
                <button type="button" className="button button--ghost" onClick={addAlly}>
                  Chamar como aliado
                </button>
              ) : null}
            </div>
            <p className="echo-hint">
              No duelo na mesma tela, {rival.value.name} monta a própria rodada no seu aparelho; a sequência fica oculta até os
              dois declararem pronto.
            </p>
          </div>
        ) : null}
      </section>

      {onTournament ? (
        <section className="echo-card" aria-labelledby="echo-tournament">
          <h2 id="echo-tournament">Torneio na mesma tela</h2>
          <p className="echo-hint">De 4 a 8 Despertos num aparelho só, em chave eliminatória. Quem não tem partida salva entra como aprendiz criado na hora.</p>
          <button type="button" className="button" onClick={onTournament}>
            Montar torneio
          </button>
        </section>
      ) : null}

      <section className="echo-card" aria-labelledby="echo-circle">
        <h2 id="echo-circle">Círculo de Ecos</h2>
        <p className="echo-hint">
          Ecos aliados lutam ao seu lado num confronto do mundo, um por dia, com {ECHO_ALLY_HEALTH} de vitalidade e o estilo do dono.
          {(echoes.allies?.length ?? 0) > 0 ? (allyAvailableToday ? ' Disponível hoje.' : ' Já chamado hoje.') : ''}
        </p>
        {circle.length === 0 ? (
          <p className="echo-hint">Cole o Selo de alguém acima e toque em "Chamar como aliado" para guardá-lo aqui.</p>
        ) : (
          <ul className="echo-rivals">
            {circle.map(({ code, seal }) => (
              <li key={code}>
                <strong>{seal.ok ? `Eco de ${seal.value.name}` : 'Selo ilegível'}</strong>
                <span>
                  {seal.ok ? `${archetypeOf(seal.value.archetypeId)?.name ?? 'Sem arquétipo'} · ${ECHO_STYLE_LABELS[seal.value.style]}` : ''}{' '}
                  {onUpdateEchoes ? (
                    <button type="button" className="button button--compact button--ghost" onClick={() => onUpdateEchoes(removeEchoAlly(echoes, code))}>
                      Tirar
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
        <label className="echo-field">
          <span>Alguém chamou o seu Eco como aliado? Cole o agradecimento</span>
          <textarea value={thanksCode} rows={2} spellCheck={false} placeholder="AGR1.…" onChange={(event) => setThanksCode(event.target.value)} />
        </label>
        <button type="button" className="button" disabled={!thanksCode.trim()} onClick={receiveThanks}>
          Registrar laço
        </button>
        {circleMessage ? <p className="echo-message" role="status">{circleMessage}</p> : null}
        {(echoes.bonds ?? []).length > 0 ? (
          <>
            <h3 className="echo-subtitle">Laços de Eco</h3>
            <ul className="echo-rivals">
              {(echoes.bonds ?? []).map((bond) => (
                <li key={bond.helperId}>
                  <strong>{bond.helperName}</strong>
                  <span>
                    {bond.assists} luta{bond.assists === 1 ? '' : 's'} juntos · {bond.victories} vitória{bond.victories === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
          </>
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
      {extra}
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
