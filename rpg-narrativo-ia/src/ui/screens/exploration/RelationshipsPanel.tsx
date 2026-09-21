import type { SandboxAction } from '../../../modules/sandbox-actions';
import { formatPeriodCost, type BondCharacterView } from '../../sandbox';
import { DetailScreen, EmptyAction } from './shared';

export function RelationshipsPanel({
  bonds,
  onAction,
  onBack,
}: {
  bonds: BondCharacterView[];
  onAction: (action: SandboxAction) => void;
  onBack: () => void;
}) {
  return (
    <DetailScreen title="Relacionamentos" eyebrow="Laços e convivência" tone="social" onBack={onBack}>
      <p className="detail-screen__intro">Acompanhe vínculos persistentes e escolha como aprofundar cada relação.</p>
      <RelationshipSection bonds={bonds} onAction={onAction} />
    </DetailScreen>
  );
}

export function RelationshipSection({
  bonds,
  onAction,
}: {
  bonds: BondCharacterView[];
  onAction: (action: SandboxAction) => void;
}) {
  return (
    <section className="relationship-section" aria-labelledby="relationships-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Laços persistentes</span>
          <h2 id="relationships-title">Relacionamentos</h2>
        </div>
        <span className="section-count">{bonds.length}</span>
      </div>
      {bonds.length === 0 ? <EmptyAction message="Nenhum relacionamento foi revelado." /> : (
        <div className="relationship-card-list">
          {bonds.map((bond) => (
            <article key={bond.npcId} className="relationship-card">
              <header>
                <span className="relationship-list__avatar" aria-hidden="true">♙</span>
                <div><strong>{bond.name}</strong><small>{bond.namedBonds.map((item) => item.name).join(' · ') || 'Vínculo em formação'}</small></div>
              </header>
              <div className="relationship-card__metrics">
                {bond.outgoing.map((dimension) => <span key={`out-${dimension.dimensionId}`}>{dimension.name}: {dimension.value}</span>)}
                {bond.incoming.map((dimension) => <span key={`in-${dimension.dimensionId}`}>{dimension.name} recebida: {dimension.value}</span>)}
              </div>
              <BondActionGroup label="Relação" actions={bond.actions} actionType="bond.act" onAction={onAction} />
              <BondActionGroup label="Grupos" actions={bond.organizationActions} actionType="organization.act" onAction={onAction} />
              <BondActionGroup label="Família" actions={bond.familyActions} actionType="family.act" onAction={onAction} />
              <BondActionGroup label="Vida civil" actions={bond.civicActions} actionType="civic.act" onAction={onAction} />
              <BondActionGroup label="Comércio" actions={bond.economyActions} actionType="economy.act" onAction={onAction} />
              <BondActionGroup label="Território" actions={bond.settlementActions} actionType="settlement.act" onAction={onAction} />
              <BondActionGroup label="Política" actions={bond.politicsActions} actionType="politics.act" onAction={onAction} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type BondActionType = 'bond.act' | 'organization.act' | 'family.act' | 'civic.act' | 'economy.act' | 'settlement.act' | 'politics.act';

function toBondSandboxAction(type: BondActionType, actionId: string): SandboxAction {
  switch (type) {
    case 'bond.act': return { type, actionId };
    case 'organization.act': return { type, actionId };
    case 'family.act': return { type, actionId };
    case 'civic.act': return { type, actionId };
    case 'economy.act': return { type, actionId };
    case 'settlement.act': return { type, actionId };
    case 'politics.act': return { type, actionId };
  }
}

export function BondActionGroup({
  label,
  actions,
  actionType,
  onAction,
}: {
  label: string;
  actions: BondCharacterView['actions'];
  actionType: BondActionType;
  onAction: (action: SandboxAction) => void;
}) {
  if (actions.length === 0) return null;
  return (
    <details className="relationship-action-group">
      <summary><span>{label}</span><small>{actions.length} aç{actions.length === 1 ? 'ão' : 'ões'}</small><span aria-hidden="true">⌄</span></summary>
      <div className="relationship-action-group__body">
        {actions.map((action) => (
          <button
            key={action.actionId}
            type="button"
            className="button button--compact"
            disabled={!action.available}
            title={action.blockedReason ?? action.hint}
            onClick={() => onAction(toBondSandboxAction(actionType, action.actionId))}
          >
            {action.label}<small>{action.blockedReason ?? formatPeriodCost(action.costPeriods)}</small>
          </button>
        ))}
      </div>
    </details>
  );
}
