import type { Campaign } from '../../../core/events';
import type { GameState } from '../../../core/state';
import type { SystemStatusView } from '../../../modules/system-interface';
import { SystemCorners } from '../../components/Icon';
import { Portrait } from '../../components/Portrait';
import { PortraitAvatar } from '../../components/PortraitAvatar';
import { Silhouette } from '../../components/Silhouette';
import { useCustomPortrait } from '../../portrait';
import { archetypeOf } from '../../silhouettes';
import { EmptyAction } from './shared';
import { SystemIdentity } from './SystemPanel';

export function CharacterPanel({
  status,
  state,
  campaign,
  abilityName,
}: {
  status: SystemStatusView;
  state: GameState;
  campaign: Campaign;
  abilityName: string;
}) {
  const customSrc = useCustomPortrait();
  const archetype = archetypeOf(state.character.archetypeId);
  return (
    <div className="tab-panel character-panel">
      <header className="character-hero sys-frame">
        <SystemCorners />
        {state.character.portrait || archetype ? (
          <PortraitAvatar portrait={state.character.portrait} archetypeId={state.character.archetypeId} customSrc={customSrc} size={64} className="character-hero__avatar" />
        ) : (
          <Portrait name={status.characterName} className="character-hero__avatar" />
        )}
        <div>
          <span className="section-kicker">{status.archetype.title}</span>
          <h1>{status.characterName}</h1>
          <p>{abilityName}</p>
        </div>
        <span className="system-console__level">Nível <strong>{status.level}</strong></span>
      </header>
      {archetype ? (
        <section className="archetype-panel" aria-label="Arquétipo" style={{ ['--archetype' as string]: archetype.palette.primary }}>
          <Silhouette pose={archetype.pose} prop={archetype.prop} tint="var(--text)" glow={archetype.palette.primary} size={72} />
          <div>
            <span className="section-kicker">{status.archetype.rank === 'initiate' ? 'Patente reconhecida' : 'Antes do Reset'}</span>
            <strong>{status.archetype.title}</strong>
            <p>{archetype.summary}</p>
            {status.archetype.rank === 'initiate' ? (
              <p className="archetype-panel__rank">Monta a rodada com {status.archetype.roundTicks} tempos.</p>
            ) : status.archetype.next ? (
              <p className="archetype-panel__rank">
                Rumo a Iniciado: {status.archetype.next.techniques}/{status.archetype.next.techniquesNeeded} técnicas ·{' '}
                {status.archetype.next.eliteVictories}/{status.archetype.next.eliteNeeded} elite. Treine na Árvore do Sistema.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
      <SystemIdentity state={state} campaign={campaign} abilityName={abilityName} />
      <section className="system-calendar" aria-label="Calendário pessoal">
        <span className="section-kicker">Linha da vida</span>
        <p><strong>{status.calendar.dateLabel}</strong><span>{status.calendar.ageYears} anos · {status.calendar.stageName}</span></p>
        {status.calendar.upcoming.length > 0 ? (
          <ul className="system-note-list">{status.calendar.upcoming.map((entry) => <li key={entry.id}><strong>{entry.label}</strong><p>{entry.hint} {entry.dueLabel}.</p></li>)}</ul>
        ) : <EmptyAction message="Nenhum marco pessoal próximo." />}
      </section>
      {status.nextMilestone ? (
        <section className="system-milestone accent-bar" aria-label="Próximo marco">
          <span className="section-kicker">Próximo marco · Nível {status.nextMilestone.level}</span>
          <ul className="system-milestone__list">{status.nextMilestone.requirements.map((requirement) => <li key={requirement.text} className={requirement.met ? 'is-met' : undefined}><span aria-hidden="true">{requirement.met ? '✓' : '○'}</span> {requirement.text}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
