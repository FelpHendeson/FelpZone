import { findTitle } from '../../../campaigns/first-day';
import type { Campaign } from '../../../core/events';
import type { GameState } from '../../../core/state';
import { storyVars } from '../../../modules/character';
import { interpolate, notableHistory } from '../../../modules/narrative';
import type { SystemStatusView } from '../../../modules/system-interface';
import { ImagePlaceholder } from '../../components/ImagePlaceholder';
import { Portrait } from '../../components/Portrait';
import type { BondCharacterView } from '../../sandbox';
import { DetailScreen, EmptyAction } from './shared';

/** Crônica viva: tudo derivado do estado persistido — nada aqui é salvo à parte. */
export function ChroniclePanel({
  state,
  campaign,
  status,
  bonds,
  onBack,
}: {
  state: GameState;
  campaign: Campaign;
  status: SystemStatusView;
  bonds: BondCharacterView[];
  onBack: () => void;
}) {
  const vars = storyVars(state.character, state.world.day);
  const decisions = notableHistory(state.history);
  const titles = state.progression.titleIds.map((id) => findTitle(campaign, id)).filter((title) => title !== undefined);
  return (
    <DetailScreen title="Crônica" eyebrow="O que o mundo lembra de você" tone="registry" onBack={onBack}>
      <dl className="chronicle-stats">
        <div><dt>Dia</dt><dd>{state.world.day}</dd></div>
        <div><dt>Nível</dt><dd>{status.level}</dd></div>
        <div><dt>Habilidades</dt><dd>{status.knownSkills.length}</dd></div>
        <div><dt>Vínculos</dt><dd>{bonds.length}</dd></div>
      </dl>

      <section className="chronicle-section" aria-labelledby="chronicle-titles">
        <h2 id="chronicle-titles">Títulos</h2>
        {titles.length === 0 ? <EmptyAction message="Nenhum título reconhecido ainda." /> : (
          <ul className="chronicle-titles">
            {titles.map((title) => (
              <li key={title.id}>
                <ImagePlaceholder kind="icon" label={title.name} src={title.image?.src} className="chronicle-titles__art" />
                <div><strong>{title.name}</strong><p>{title.description}</p></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {bonds.length > 0 ? (
        <section className="chronicle-section" aria-labelledby="chronicle-bonds">
          <h2 id="chronicle-bonds">Quem cruzou seu caminho</h2>
          <ul className="chronicle-bonds">
            {bonds.map((bond) => (
              <li key={bond.npcId}>
                <Portrait name={bond.name} src={bond.portraitSrc} className="chronicle-bonds__portrait" />
                <div>
                  <strong>{bond.name}</strong>
                  <small>{bond.namedBonds.map((entry) => entry.name).join(' · ') || 'Vínculo em formação'}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="chronicle-section" aria-labelledby="chronicle-decisions">
        <h2 id="chronicle-decisions">Decisões marcantes</h2>
        {decisions.length === 0 ? <EmptyAction message="Nenhuma decisão marcante ainda." /> : (
          <ol className="chronicle-timeline">
            {decisions.map((entry, index) => (
              <li key={`${entry.eventId}-${entry.choiceId}-${index}`}>
                <span>{interpolate(entry.eventTitle, vars)}</span>
                <strong>{interpolate(entry.choiceLabel, vars)}</strong>
              </li>
            ))}
          </ol>
        )}
      </section>
    </DetailScreen>
  );
}
