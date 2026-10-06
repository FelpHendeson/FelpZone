import type { Campaign } from '../../../core/events';
import type { GameState } from '../../../core/state';
import type { SystemStatusView } from '../../../modules/system-interface';
import { SystemCorners } from '../../components/Icon';
import { Portrait } from '../../components/Portrait';
import { INITIAL_COMBAT } from '../../../modules/combat';
import { PortraitAvatar } from '../../components/PortraitAvatar';
import { Silhouette } from '../../components/Silhouette';
import { useCustomPortrait } from '../../portrait';
import { archetypeOf } from '../../silhouettes';
import { EmptyAction } from './shared';
import { SystemIdentity } from './SystemPanel';
import { useState } from 'react';
import { buildAwakenedCard } from '../../../modules/awakened-card';
import { AwakenedCardDialog } from './AwakenedCardDialog';

export function CharacterPanel({
  status,
  state,
  campaign,
  abilityName,
  sealCode,
}: {
  status: SystemStatusView;
  state: GameState;
  campaign: Campaign;
  abilityName: string;
  /** Selo do Eco para o rodapé da carta (só depois da primeira vitória). */
  sealCode?: string;
}) {
  const customSrc = useCustomPortrait();
  const [cardOpen, setCardOpen] = useState(false);
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
        <button type="button" className="button button--compact character-hero__card" onClick={() => setCardOpen(true)}>
          Gerar carta
        </button>
      </header>
      {cardOpen ? (
        <AwakenedCardDialog
          open
          card={buildAwakenedCard({ state, rank: status.archetype, titles: campaign.titles, ...(sealCode ? { sealCode } : {}) })}
          portrait={state.character.portrait}
          customSrc={customSrc}
          onClose={() => setCardOpen(false)}
        />
      ) : null}
      {archetype ? (
        <section className="archetype-panel" aria-label="Arquétipo" style={{ ['--archetype' as string]: archetype.palette.primary }}>
          <Silhouette pose={archetype.pose} prop={archetype.prop} tint="var(--text)" glow={archetype.palette.primary} size={72} />
          <div>
            <span className="section-kicker">{status.archetype.rank === 'initiate' ? 'Patente reconhecida' : status.archetype.path ? 'Primeiros dias' : 'Antes do Reset'}</span>
            <strong>{status.archetype.title}</strong>
            <p>{archetype.summary}</p>
            {status.archetype.rank === 'initiate' ? (
              <p className="archetype-panel__rank">Monta a rodada com {status.archetype.roundTicks} tempos.</p>
            ) : status.archetype.path ? (
              <p className="archetype-panel__rank">
                {status.archetype.path.available
                  ? 'Um caminho começou a se formar. Escolha na Árvore do Sistema.'
                  : `O caminho se forma depois de ${status.archetype.path.needed} vitórias (${status.archetype.path.victories}/${status.archetype.path.needed}).`}
              </p>
            ) : status.archetype.next ? (
              <p className="archetype-panel__rank">
                Rumo a Iniciado: {status.archetype.next.techniques}/{status.archetype.next.techniquesNeeded} técnicas ·{' '}
                {status.archetype.next.eliteVictories}/{status.archetype.next.eliteNeeded} elite. Treine na Árvore do Sistema.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
      <CombosKnown discovered={state.combos?.discovered ?? []} />
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

/** Sequências registradas: combos que o jogador já fez acontecer em confrontos do mundo. */
function CombosKnown({ discovered }: { discovered: readonly string[] }) {
  const total = INITIAL_COMBAT.combos.length;
  return (
    <section className="system-combos" aria-label="Sequências registradas">
      <span className="section-kicker">Sequências registradas · {discovered.length}/{total}</span>
      {discovered.length === 0 ? (
        <p className="system-combos__empty">
          Duas ações seguidas na ordem certa formam uma sequência com efeito extra. O Sistema registra cada uma na primeira vez que
          acontece em combate.
        </p>
      ) : (
        <ul className="system-note-list">
          {discovered.map((id) => {
            const combo = INITIAL_COMBAT.combos.find((entry) => entry.id === id);
            if (!combo) return null;
            const first = INITIAL_COMBAT.actionById.get(combo.first)?.name ?? combo.first;
            const second = INITIAL_COMBAT.actionById.get(combo.second)?.name ?? combo.second;
            return (
              <li key={id}>
                <strong>◆ {combo.name}</strong>
                <p>
                  {first} → {second}. {combo.description}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
