import type { ReactNode } from 'react';
import { findNpc } from '../../../campaigns/first-day';
import type { Campaign } from '../../../core/events';
import type { SystemStatusView } from '../../../modules/system-interface';
import { Icon, SystemCorners, type IconName } from '../../components/Icon';
import { PortraitStack } from '../../components/Portrait';
import type { ExplorationView } from '../../sandbox';
import { ALL_MENU_DOMAINS, revealedMenuDomains, type MenuDomainId } from '../../system-window';
import type { GameView } from './shared';

export type MenuTone = 'world' | 'system' | 'registry' | 'social' | 'domain';

export function GameMenuPanel({
  status,
  view,
  campaign,
  onNavigate,
  guidanceCount,
  guidanceUnseenCount,
  notableCount = 0,
}: {
  status: SystemStatusView;
  view: ExplorationView;
  campaign: Campaign;
  onNavigate: (view: GameView) => void;
  guidanceCount: number;
  guidanceUnseenCount: number;
  notableCount?: number;
}) {
  const activeOrganizations = status.organizations.length;
  const activeCivic = status.civic.filter((entry) => entry.active).length;
  const bondPeople = view.bonds.map((bond) => ({ id: bond.npcId, name: bond.name, src: bond.portraitSrc }));
  const revealed = revealedMenuDomains(status, view.bonds.length, notableCount);
  const hiddenCount = ALL_MENU_DOMAINS.filter((domain) => !revealed.has(domain)).length;
  const show = (domain: MenuDomainId) => revealed.has(domain);
  const familyPeople = status.family
    .filter((member) => !member.isPlayer)
    .map((member) => ({ id: member.actorId, name: member.name, src: findNpc(campaign, member.actorId)?.image?.src }));
  return (
    <div className="tab-panel menu-panel">
      <header className="panel-heading sys-frame">
        <SystemCorners />
        <span className="section-kicker">Central do Sistema</span>
        <h1>Menu</h1>
        <p>Abra somente o domínio que você quer consultar ou desenvolver agora.</p>
      </header>

      <MenuGroup id="menu-group-self" title="Eu e o Sistema">
        <MenuEntry
          icon="progression"
          tone="system"
          title="Progressão"
          detail={`${status.knownSkills.length} habilidades · ${status.trainings.length} treinos`}
          onClick={() => onNavigate('progression')}
        />
        {show('registry') ? <MenuEntry
          icon="registry"
          tone="registry"
          title="Registro"
          detail={`${status.registry.patents.filter((entry) => entry.granted).length} patentes · rankings e títulos`}
          onClick={() => onNavigate('registry')}
        /> : null}
      </MenuGroup>

      {show('relationships') || show('society') || show('family') ? <MenuGroup id="menu-group-people" title="Pessoas">
        {show('relationships') ? <MenuEntry
          icon="relationships"
          tone="social"
          title="Relacionamentos"
          detail={`${view.bonds.length} vínculo${view.bonds.length === 1 ? '' : 's'} conhecido${view.bonds.length === 1 ? '' : 's'}`}
          aside={<PortraitStack people={bondPeople} />}
          onClick={() => onNavigate('relationships')}
        /> : null}
        {show('society') ? <MenuEntry
          icon="society"
          tone="social"
          title="Sociedade"
          detail={`${activeOrganizations} grupos · ${activeCivic} posições ativas`}
          onClick={() => onNavigate('society')}
        /> : null}
        {show('family') ? <MenuEntry
          icon="family"
          tone="social"
          title="Família e lar"
          detail={`${status.family.length} pessoa${status.family.length === 1 ? '' : 's'} reconhecida${status.family.length === 1 ? '' : 's'}`}
          aside={<PortraitStack people={familyPeople} />}
          onClick={() => onNavigate('family')}
        /> : null}
      </MenuGroup> : null}

      <MenuGroup id="menu-group-world" title="Mundo e referência">
        {show('domain') ? <MenuEntry
          icon="domain"
          tone="domain"
          title="Domínio"
          detail={`${status.settlements.claims.length} territórios · economia e política`}
          onClick={() => onNavigate('domain')}
        /> : null}
        {show('chronicle') ? <MenuEntry
          icon="journal"
          tone="registry"
          title="Crônica"
          detail={`${notableCount} decis${notableCount === 1 ? 'ão marcante' : 'ões marcantes'} · títulos e vínculos`}
          onClick={() => onNavigate('chronicle')}
        /> : null}
        <MenuEntry
          icon="map"
          tone="world"
          title="Mapa completo"
          detail={`${view.destinations.length} rotas a partir de ${view.location.name}`}
          onClick={() => onNavigate('map')}
        />
        <MenuEntry
          icon="help"
          tone="world"
          title="Ajuda"
          detail={`${guidanceCount} tópicos disponíveis${guidanceUnseenCount > 0 ? ` · ${guidanceUnseenCount} novo${guidanceUnseenCount === 1 ? '' : 's'}` : ''}`}
          onClick={() => onNavigate('help')}
        />
        <MenuEntry
          icon="settings"
          tone="system"
          title="Configurações"
          detail="Relógio 24h/12h e orientação do Sistema"
          onClick={() => onNavigate('settings')}
        />
      </MenuGroup>

      {hiddenCount > 0 ? (
        <p className="menu-sealed">
          <span aria-hidden="true">◇</span> O Sistema ainda mantém {hiddenCount} interface{hiddenCount === 1 ? '' : 's'} selada{hiddenCount === 1 ? '' : 's'}. Elas se abrem quando houver algo real para consultar.
        </p>
      ) : null}
    </div>
  );
}

export function MenuGroup({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="menu-group" aria-labelledby={id}>
      <h2 id={id} className="menu-group__title">{title}</h2>
      <div className="menu-group__list">{children}</div>
    </section>
  );
}

export function MenuEntry({
  icon,
  tone,
  title,
  detail,
  aside,
  onClick,
}: {
  icon: IconName;
  tone: MenuTone;
  title: string;
  detail: string;
  aside?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`menu-entry menu-entry--${tone}`} onClick={onClick}>
      <span className="menu-entry__icon" aria-hidden="true"><Icon name={icon} /></span>
      <span className="menu-entry__text"><strong>{title}</strong><small>{detail}</small></span>
      {aside}
      <span className="menu-entry__chevron" aria-hidden="true">→</span>
    </button>
  );
}
