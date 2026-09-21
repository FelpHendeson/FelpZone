import type { SystemStatusView } from '../../../modules/system-interface';
import type { ExplorationView } from '../../sandbox';
import type { GameView } from './shared';

export function GameMenuPanel({
  status,
  view,
  onNavigate,
}: {
  status: SystemStatusView;
  view: ExplorationView;
  onNavigate: (view: GameView) => void;
}) {
  const activeOrganizations = status.organizations.length;
  const activeCivic = status.civic.filter((entry) => entry.active).length;
  return (
    <div className="tab-panel menu-panel">
      <header className="panel-heading">
        <span className="section-kicker">Central do Sistema</span>
        <h1>Menu</h1>
        <p>Abra somente o domínio que você quer consultar ou desenvolver agora.</p>
      </header>
      <div className="hub-card-grid">
        <button type="button" className="hub-card hub-card--featured hub-card--progression" onClick={() => onNavigate('progression')}>
          <span className="hub-card__icon" aria-hidden="true">❖</span><span><strong>Progressão</strong><small>{status.knownSkills.length} habilidades · {status.trainings.length} treinos</small></span><span aria-hidden="true">→</span>
        </button>
        <button type="button" className="hub-card hub-card--registry" onClick={() => onNavigate('registry')}>
          <span className="hub-card__icon" aria-hidden="true">▣</span><span><strong>Registro</strong><small>{status.registry.patents.filter((entry) => entry.granted).length} patentes · rankings e títulos</small></span><span aria-hidden="true">→</span>
        </button>
        <button type="button" className="hub-card hub-card--society" onClick={() => onNavigate('society')}>
          <span className="hub-card__icon" aria-hidden="true">⚑</span><span><strong>Sociedade</strong><small>{activeOrganizations} grupos · {activeCivic} posições ativas</small></span><span aria-hidden="true">→</span>
        </button>
        <button type="button" className="hub-card hub-card--domain" onClick={() => onNavigate('domain')}>
          <span className="hub-card__icon" aria-hidden="true">⌂</span><span><strong>Domínio</strong><small>{status.settlements.claims.length} territórios · economia e política</small></span><span aria-hidden="true">→</span>
        </button>
        <button type="button" className="hub-card hub-card--relationships" onClick={() => onNavigate('relationships')}>
          <span className="hub-card__icon" aria-hidden="true">♙</span><span><strong>Relacionamentos</strong><small>{view.bonds.length} vínculo{view.bonds.length === 1 ? '' : 's'} conhecido{view.bonds.length === 1 ? '' : 's'}</small></span><span aria-hidden="true">→</span>
        </button>
        <button type="button" className="hub-card hub-card--family" onClick={() => onNavigate('family')}>
          <span className="hub-card__icon" aria-hidden="true">♡</span><span><strong>Família e lar</strong><small>{status.family.length} pessoa{status.family.length === 1 ? '' : 's'} reconhecida{status.family.length === 1 ? '' : 's'}</small></span><span aria-hidden="true">→</span>
        </button>
        <button type="button" className="hub-card" onClick={() => onNavigate('map')}>
          <span className="hub-card__icon" aria-hidden="true">⌖</span><span><strong>Mapa completo</strong><small>{view.destinations.length} rotas a partir de {view.location.name}</small></span><span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
