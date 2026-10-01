import type { SystemStatusView } from '../../../modules/system-interface';
import { MenuEntry } from './GameMenuPanel';
import { DetailScreen, type GameView } from './shared';

export function DomainPanel({
  status,
  onNavigate,
  onBack,
}: {
  status: SystemStatusView;
  onNavigate: (view: GameView) => void;
  onBack: () => void;
}) {
  const claims = status.settlements.claims.length;
  const structures = status.settlements.structures.length;
  const wallets = status.economy.wallets.length;
  const properties = status.economy.properties.length;
  const mandates = status.politics.mandates.length;
  const agreements = status.politics.agreements.length;
  return (
    <DetailScreen title="Domínio" eyebrow="Construção de poder" tone="domain" onBack={onBack}>
      <p className="detail-screen__intro">Território, economia e política são sistemas distintos. Abra só o que quer administrar agora.</p>
      <div className="menu-group__list">
        <MenuEntry
          icon="territory"
          tone="domain"
          title="Base e território"
          detail={claims === 0 ? 'sem reivindicação' : `${claims} território${claims === 1 ? '' : 's'} · ${structures} estrutura${structures === 1 ? '' : 's'}`}
          onClick={() => onNavigate('domain-territory')}
        />
        <MenuEntry
          icon="economy"
          tone="domain"
          title="Economia"
          detail={wallets === 0 && properties === 0 ? 'sem saldo nem propriedade' : `${wallets} carteira${wallets === 1 ? '' : 's'} · ${properties} propriedade${properties === 1 ? '' : 's'}`}
          onClick={() => onNavigate('domain-economy')}
        />
        <MenuEntry
          icon="politics"
          tone="domain"
          title="Política"
          detail={mandates === 0 && agreements === 0 ? 'sem mandato nem acordo' : `${mandates} mandato${mandates === 1 ? '' : 's'} · ${agreements} acordo${agreements === 1 ? '' : 's'}`}
          onClick={() => onNavigate('domain-politics')}
        />
      </div>
    </DetailScreen>
  );
}
