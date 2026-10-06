import { useState } from 'react';
import { INITIAL_ARCHETYPES } from '../../../modules/archetypes';
import type { IndexedCombat } from '../../../modules/combat';
import type { IndexedConditions } from '../../../modules/conditions';
import type { IndexedExecution } from '../../../modules/execution';
import {
  TOURNAMENT_MAX,
  TOURNAMENT_MIN,
  createEchoSeal,
  createTournament,
  decodeEchoSeal,
  echoSealId,
  inspectTournamentDraft,
  nextMatch,
  recordTournamentDuel,
  roundName,
  startEchoDuel,
  tournamentChampion,
  tournamentRecord,
  type EchoSeal,
  type TournamentParticipant,
  type TournamentState,
} from '../../../modules/echoes';
import { Silhouette } from '../../components/Silhouette';
import { archetypeOf } from '../../silhouettes';
import { CombatScreen } from '../CombatScreen';
import { DetailScreen } from './shared';

const DRAFT_KEY = 'reset.tournament.draft';

function readDraft(): TournamentState | null {
  try {
    const raw = globalThis.localStorage?.getItem(DRAFT_KEY);
    if (!raw) return null;
    const inspected = inspectTournamentDraft(JSON.parse(raw));
    return inspected.ok ? inspected.value : null;
  } catch {
    return null;
  }
}

function writeDraft(state: TournamentState | null): void {
  try {
    if (state && !tournamentChampion(state)) globalThis.localStorage?.setItem(DRAFT_KEY, JSON.stringify(state));
    else globalThis.localStorage?.removeItem(DRAFT_KEY);
  } catch {
    // O rascunho é só conveniência: sem armazenamento, o torneio segue na memória.
  }
}

/** Torneio na mesma tela: montagem, chave eliminatória, duelos passando o aparelho e campeão. */
export function TournamentScreen({
  combat,
  conditions,
  execution,
  mySeal,
  onBack,
}: {
  combat: IndexedCombat;
  conditions?: IndexedConditions;
  execution?: IndexedExecution;
  mySeal: EchoSeal;
  onBack: () => void;
}) {
  const [participants, setParticipants] = useState<TournamentParticipant[]>([{ seal: mySeal, origin: 'seal' }]);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [draft, setDraft] = useState<TournamentState | null>(readDraft);
  const [dueling, setDueling] = useState(false);

  function update(next: TournamentState | null) {
    setTournament(next);
    writeDraft(next);
  }

  if (tournament && dueling) {
    const match = nextMatch(tournament);
    if (match) {
      const a = tournament.participants[match.match.a!]!.seal;
      const b = tournament.participants[match.match.b!]!.seal;
      return (
        <CombatScreen
          initialState={startEchoDuel(combat, a, b)}
          encounterName={`${a.name} × ${b.name}`}
          kicker={`Torneio · ${roundName(tournament, match.round)}`}
          tint={archetypeOf(a.archetypeId)?.palette.primary}
          opponentTint={archetypeOf(b.archetypeId)?.palette.primary}
          combat={combat}
          conditions={conditions}
          execution={execution}
          control={{ kind: 'hot-seat', playerLabel: a.name, opponentLabel: b.name }}
          finishLabel="Voltar à chave"
          resultDetail={(final) =>
            final.outcome === 'victory' ? `${a.name} avança.` : final.outcome === 'defeat' ? `${b.name} avança.` : `${a.name} desistiu: ${b.name} avança.`
          }
          onFinish={(final) => {
            update(recordTournamentDuel(tournament, final.outcome === 'ongoing' ? 'fled' : final.outcome));
            setDueling(false);
          }}
        />
      );
    }
  }

  if (tournament) {
    return <Bracket tournament={tournament} onDuel={() => setDueling(true)} onReset={() => { update(null); setDraft(null); }} onBack={onBack} />;
  }

  return (
    <DetailScreen title="Torneio" eyebrow="Mesma tela" tone="registry" onBack={onBack}>
      <p className="detail-screen__intro">
        [ Sistema ] De {TOURNAMENT_MIN} a {TOURNAMENT_MAX} Despertos num aparelho só, em chave eliminatória. Cada duelo é passado de mão em
        mão: a sequência fica oculta até os dois declararem pronto. Todos começam com a mesma vitalidade, em campo neutro. Nada do
        torneio muda a sua partida.
      </p>
      {draft ? (
        <section className="echo-card">
          <h2>Torneio interrompido</h2>
          <p className="echo-hint">Há um torneio em andamento neste aparelho com {draft.participants.length} Despertos.</p>
          <div className="echo-actions">
            <button type="button" className="button button--primary" onClick={() => update(draft)}>
              Retomar torneio
            </button>
            <button type="button" className="button button--ghost" onClick={() => { writeDraft(null); setDraft(null); }}>
              Descartar
            </button>
          </div>
        </section>
      ) : null}
      <ParticipantsSetup
        combat={combat}
        participants={participants}
        onChange={setParticipants}
        onStart={() => {
          const created = createTournament(participants, Date.now() % 2_147_483_647);
          if (created.ok) update(created.value);
        }}
      />
    </DetailScreen>
  );
}

function ParticipantsSetup({
  combat,
  participants,
  onChange,
  onStart,
}: {
  combat: IndexedCombat;
  participants: TournamentParticipant[];
  onChange: (next: TournamentParticipant[]) => void;
  onStart: () => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [archetypeId, setArchetypeId] = useState(INITIAL_ARCHETYPES.archetypes[0]!.id);
  const [message, setMessage] = useState<string | null>(null);
  const full = participants.length >= TOURNAMENT_MAX;
  const names = new Set(participants.map((entry) => entry.seal.name.toLowerCase()));

  function add(seal: EchoSeal, origin: TournamentParticipant['origin']) {
    if (full) return;
    if (participants.some((entry) => echoSealId(entry.seal) === echoSealId(seal))) {
      setMessage('Este Desperto já está no torneio.');
      return;
    }
    onChange([...participants, { seal, origin }]);
    setMessage(null);
  }

  return (
    <>
      <section className="echo-card" aria-labelledby="tournament-people">
        <h2 id="tournament-people">
          Participantes · {participants.length}/{TOURNAMENT_MAX}
        </h2>
        <ul className="tournament-people">
          {participants.map((entry, index) => {
            const archetype = archetypeOf(entry.seal.archetypeId);
            return (
              <li key={echoSealId(entry.seal)}>
                <Silhouette pose={archetype?.pose ?? 'stand'} prop={archetype?.prop ?? 'none'} tint="var(--text)" glow={archetype?.palette.primary} size={36} />
                <span>
                  <strong>{entry.seal.name}</strong>
                  <small>
                    {archetype?.name ?? 'Sem arquétipo'}
                    {entry.seal.rank === 'initiate' ? ' · Iniciado' : ''} · {entry.origin === 'seal' ? 'Selo' : 'criado agora'}
                  </small>
                </span>
                <button type="button" className="button button--compact button--ghost" onClick={() => onChange(participants.filter((_, position) => position !== index))}>
                  Tirar
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="button button--primary" disabled={participants.length < TOURNAMENT_MIN} onClick={onStart}>
          {participants.length < TOURNAMENT_MIN ? `Faltam ${TOURNAMENT_MIN - participants.length} para começar` : 'Sortear a chave'}
        </button>
      </section>

      <section className="echo-card" aria-labelledby="tournament-quick">
        <h2 id="tournament-quick">Aprendiz criado na hora</h2>
        <p className="echo-hint">Para quem não tem partida salva: só nome e arquétipo, com a técnica do arquétipo e as ações básicas.</p>
        <label className="echo-field">
          <span>Nome</span>
          <input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="chip-row" role="radiogroup" aria-label="Arquétipo">
          {INITIAL_ARCHETYPES.archetypes.map((entry) => (
            <button key={entry.id} type="button" role="radio" aria-checked={entry.id === archetypeId} aria-pressed={entry.id === archetypeId} className="chip" onClick={() => setArchetypeId(entry.id)}>
              {entry.name.replace('Aprendiz de ', '').replace('Aprendiz ', '')}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="button"
          disabled={full || !name.trim() || names.has(name.trim().toLowerCase())}
          onClick={() => {
            add(createEchoSeal(combat, { name: name.trim(), knownSkillIds: [], archetypeId }), 'quick');
            setName('');
          }}
        >
          Adicionar aprendiz
        </button>
      </section>

      <section className="echo-card" aria-labelledby="tournament-seal">
        <h2 id="tournament-seal">Trazer um Selo</h2>
        <label className="echo-field">
          <span>Cole o Selo do Desperto</span>
          <textarea value={code} rows={2} spellCheck={false} placeholder="ECO1.…" onChange={(event) => setCode(event.target.value)} />
        </label>
        <button
          type="button"
          className="button"
          disabled={full || !code.trim()}
          onClick={() => {
            const decoded = decodeEchoSeal(code, combat);
            if (!decoded.ok) {
              setMessage(decoded.reason);
              return;
            }
            add(decoded.value, 'seal');
            setCode('');
          }}
        >
          Adicionar Selo
        </button>
        {message ? <p className="echo-message" role="status">{message}</p> : null}
      </section>
    </>
  );
}

function Bracket({
  tournament,
  onDuel,
  onReset,
  onBack,
}: {
  tournament: TournamentState;
  onDuel: () => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const next = nextMatch(tournament);
  const champion = tournamentChampion(tournament);
  const [copied, setCopied] = useState(false);
  const name = (index: number | null) => (index === null ? '—' : tournament.participants[index]!.seal.name);
  const record = tournamentRecord(tournament);
  return (
    <DetailScreen title="Torneio" eyebrow={champion ? 'Campeão' : 'Chave'} tone="registry" onBack={onBack}>
      {champion ? (
        <section className="tournament-champion" aria-label="Campeão do torneio">
          <Silhouette
            pose={archetypeOf(champion.seal.archetypeId)?.pose ?? 'stand'}
            prop={archetypeOf(champion.seal.archetypeId)?.prop ?? 'none'}
            tint="var(--text)"
            glow={archetypeOf(champion.seal.archetypeId)?.palette.primary}
            size={96}
          />
          <span className="section-kicker">[ Sistema ] Campeão do torneio</span>
          <strong>{champion.seal.name}</strong>
          <small>{archetypeOf(champion.seal.archetypeId)?.name ?? 'Desperto'}</small>
          <div className="echo-actions">
            <button
              type="button"
              className="button button--compact"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(record);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? 'Registro copiado' : 'Copiar registro'}
            </button>
            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <button type="button" className="button button--compact" onClick={() => void navigator.share({ text: record }).catch(() => undefined)}>
                Compartilhar
              </button>
            ) : null}
          </div>
        </section>
      ) : next ? (
        <section className="tournament-next" aria-label="Próximo duelo">
          <span className="section-kicker">{roundName(tournament, next.round)} · próximo duelo</span>
          <strong>
            {name(next.match.a)} × {name(next.match.b)}
          </strong>
          <p className="echo-hint">{name(next.match.a)} monta a rodada primeiro; depois o aparelho passa para {name(next.match.b)}.</p>
          <button type="button" className="button button--primary" onClick={onDuel}>
            Começar duelo
          </button>
        </section>
      ) : null}
      <ol className="tournament-bracket">
        {tournament.rounds.map((matches, round) => (
          <li key={round}>
            <span className="section-kicker">{roundName(tournament, round)}</span>
            <ul>
              {matches.map((match, index) => (
                <li key={index} className={match === next?.match ? 'tournament-match tournament-match--next' : 'tournament-match'}>
                  <span className={match.winner !== undefined && match.winner === match.a ? 'is-winner' : undefined}>{name(match.a)}</span>
                  <small>×</small>
                  <span className={match.winner !== undefined && match.winner === match.b ? 'is-winner' : undefined}>
                    {match.a !== null && match.b === null && round === 0 ? 'folga' : name(match.b)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <button type="button" className="button button--ghost" onClick={onReset}>
        {champion ? 'Novo torneio' : 'Abandonar torneio'}
      </button>
    </DetailScreen>
  );
}
