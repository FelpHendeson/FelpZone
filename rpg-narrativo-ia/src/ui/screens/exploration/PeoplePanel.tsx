import type { SandboxAction } from '../../../modules/sandbox-actions';
import type { ExplorationView } from '../../sandbox';
import { PresenceSection } from './WorldPanel';
import { DetailScreen } from './shared';

export function PeoplePanel({
  view,
  onAction,
  onBack,
}: {
  view: ExplorationView;
  onAction: (action: SandboxAction) => void;
  onBack: () => void;
}) {
  return (
    <DetailScreen title="Pessoas e criaturas" eyebrow={view.location.name} tone="social" onBack={onBack}>
      <p className="detail-screen__intro">Quem está ao seu alcance agora, o que está fazendo e como pode interagir com você.</p>
      <PresenceSection presences={view.presences} onAction={onAction} />
      {view.knownNpcs.length > 0 ? <KnownNpcSection npcs={view.knownNpcs} locationId={view.location.id} /> : null}
    </DetailScreen>
  );
}

export function KnownNpcSection({
  npcs,
  locationId,
}: {
  npcs: ExplorationView['knownNpcs'];
  locationId: string;
}) {
  const here = npcs.filter((npc) => npc.locationId === locationId && npc.presence !== 'absent' && npc.presence !== 'departed');
  const hints = npcs.flatMap((npc) => (npc.hint ? [npc.hint] : []));
  if (here.length === 0 && hints.length === 0) {
    return null;
  }
  return (
    <section className="known-npc-section" aria-label="Pessoas conhecidas">
      {here.map((npc) => (
        <p key={npc.npcId} className="known-npc-line">
          {npc.name} · {npc.presence === 'present-available' ? 'disponível' : 'ocupada'}
        </p>
      ))}
      {hints.map((hint) => (
        <p key={hint} className="presence-card__hint">{hint}</p>
      ))}
    </section>
  );
}
