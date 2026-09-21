import type { Campaign } from '../../../core/events';
import type { GameState } from '../../../core/state';
import type { SystemStatusView } from '../../../modules/system-interface';
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
  return (
    <div className="tab-panel character-panel">
      <header className="character-hero">
        <span className="character-hero__avatar" aria-hidden="true">♙</span>
        <div><span className="section-kicker">Sobrevivente</span><h1>{status.characterName}</h1><p>{abilityName}</p></div>
        <span className="system-console__level">Nível <strong>{status.level}</strong></span>
      </header>
      <SystemIdentity state={state} campaign={campaign} abilityName={abilityName} />
      <section className="system-calendar" aria-label="Calendário pessoal">
        <span className="section-kicker">Linha da vida</span>
        <p><strong>{status.calendar.dateLabel}</strong><span>{status.calendar.ageYears} anos · {status.calendar.stageName}</span></p>
        {status.calendar.upcoming.length > 0 ? (
          <ul className="system-note-list">{status.calendar.upcoming.map((entry) => <li key={entry.id}><strong>{entry.label}</strong><p>{entry.hint} {entry.dueLabel}.</p></li>)}</ul>
        ) : <EmptyAction message="Nenhum marco pessoal próximo." />}
      </section>
      {status.nextMilestone ? (
        <section className="system-milestone" aria-label="Próximo marco">
          <span className="section-kicker">Próximo marco · Nível {status.nextMilestone.level}</span>
          <ul className="system-milestone__list">{status.nextMilestone.requirements.map((requirement) => <li key={requirement.text} className={requirement.met ? 'is-met' : undefined}><span aria-hidden="true">{requirement.met ? '✓' : '○'}</span> {requirement.text}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
