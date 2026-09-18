import { useEffect, useState, type ReactNode } from 'react';
import { findNpc } from '../../campaigns/first-day';
import type { Campaign } from '../../core/events';
import type { GameState } from '../../core/state';
import type { SandboxContext } from '../../modules/sandbox';
import type { SandboxAction } from '../../modules/sandbox-actions';
import {
  buildSystemStatus,
  type SystemStatusView,
  type SystemTrainingView,
} from '../../modules/system-interface';
import {
  INITIAL_COMBAT,
  createCombat,
  listAvailableEncounters,
  type CombatState,
  type EncounterDefinition,
} from '../../modules/combat';
import { INITIAL_ITEMS, type ItemKind } from '../../modules/items';
import { INITIAL_ORGANIZATIONS } from '../../modules/organizations';
import {
  INITIAL_PARTY,
  allySnapshots,
  listCompanionOrderViews,
} from '../../modules/party';
import { buildCombatLoadout } from '../../modules/equipment';
import { CombatScreen } from './CombatScreen';
import { AppDialog } from '../components/AppDialog';
import { AttributeSummary } from '../components/AttributeSummary';
import { BottomNavigation, type GameTab } from '../components/BottomNavigation';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GameHud } from '../components/GameHud';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { buildJournalView, type JournalJourneyView } from '../journal/model';
import { JournalPanel, TrackedJourneyCard } from '../components/JournalPanel';
import { formatNeedDelta } from '../needs/presentation';
import {
  buildExplorationView,
  formatPeriodCost,
  type DestinationView,
  type ExplorationView,
  type InteractableView,
  type BondCharacterView,
  type NeedEffectView,
  type PresenceView,
  type RecipeView,
  type ResourceView,
} from '../sandbox';
import { EXPLORATION_INTRO } from './exploration-copy';

interface ExplorationScreenProps {
  state: GameState;
  campaign: Campaign;
  context: SandboxContext;
  feedback?: string | null;
  actionPending?: boolean;
  onAction: (action: SandboxAction) => void;
  onResolveCombat: (encounterId: string, finalState: CombatState) => void;
  onExit: () => void;
}

type GameView = GameTab | 'map' | 'people' | 'relationships' | 'progression' | 'registry' | 'society' | 'family' | 'domain';

function bottomTabFor(view: GameView): GameTab {
  if (view === 'map' || view === 'people') {
    return 'world';
  }
  if (view === 'relationships' || view === 'progression' || view === 'registry' || view === 'society' || view === 'family' || view === 'domain') {
    return 'menu';
  }
  return view;
}

export function ExplorationScreen({
  state,
  campaign,
  context,
  feedback,
  actionPending = false,
  onAction,
  onResolveCombat,
  onExit,
}: ExplorationScreenProps) {
  const [activeView, setActiveView] = useState<GameView>('world');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [trackedJourneyId, setTrackedJourneyId] = useState<string | null>(null);
  const [combatEncounterId, setCombatEncounterId] = useState<string | null>(null);
  const currentLocationId = state.sandbox.navigation.currentLocationId;
  const revealedDiscoveryIds =
    state.sandbox.exploration.locations.find((location) => location.locationId === currentLocationId)
      ?.revealedDiscoveryIds ?? [];
  const encounters = listAvailableEncounters(
    INITIAL_COMBAT,
    currentLocationId,
    state.flags,
    revealedDiscoveryIds,
    state.organizations.entries.map((entry) => entry.id),
  );
  const fightBlockedReason =
    state.attributes.saude < 1 ? 'Você está ferido demais para enfrentar uma ameaça agora.' : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  if (combatEncounterId) {
    const encounter = encounters.find((entry) => entry.id === combatEncounterId)
      ?? INITIAL_COMBAT.encounters.find((entry) => entry.id === combatEncounterId);
    const portrait = buildCombatLoadout(INITIAL_ITEMS, state.items);
    const allies =
      encounter?.requiredOrganizationId === undefined
        ? []
        : allySnapshots(INITIAL_PARTY, INITIAL_ORGANIZATIONS, state.organizations, state.party);
    const initialCombat = createCombat(INITIAL_COMBAT, combatEncounterId, {
      playerName: `${state.character.firstName} ${state.character.lastName}`,
      knownSkillIds: state.system.entries.map((entry) => entry.skillId),
      playerMaxHealth: state.attributes.saude,
      loadout: portrait.loadout,
      prepared: portrait.prepared,
      execution: state.execution,
      allies,
    });
    return (
      <CombatScreen
        initialState={initialCombat}
        encounterName={encounter?.name ?? 'Confronto'}
        orderViews={
          allies.length === 0
            ? []
            : listCompanionOrderViews(INITIAL_PARTY, INITIAL_ORGANIZATIONS, state.organizations, state)
        }
        onFinish={(finalState) => {
          onResolveCombat(combatEncounterId, finalState);
          setCombatEncounterId(null);
        }}
      />
    );
  }

  const view = buildExplorationView(state, campaign, context);
  const status = buildSystemStatus(state, context);
  const journal = buildJournalView(state, context);
  const trackedJourney = journal.journeys.find(
    (journey) => journey.id === trackedJourneyId && journey.status === 'active',
  );

  return (
    <main className="screen screen--exploration">
      <GameHud
        characterName={view.characterName}
        worldLabel={view.worldLabel}
        attributes={state.attributes}
        onExit={onExit}
      />

      <div className="exploration-content">
        {feedback ? <WorldFeedback message={feedback} /> : null}
        <fieldset className="sandbox-action-surface" disabled={actionPending} aria-busy={actionPending}>
          {activeView === 'world' ? (
            <WorldPanel
              view={view}
              trackedJourney={trackedJourney}
              encounters={encounters}
              fightBlockedReason={fightBlockedReason}
              onAction={onAction}
              onFight={setCombatEncounterId}
              onOpenActions={() => setActionsOpen(true)}
              onOpenJournal={() => setActiveView('journal')}
              onNavigate={setActiveView}
            />
          ) : null}
          {activeView === 'map' ? (
            <DetailScreen title="Mapa" eyebrow="Mundo conhecido" tone="world" onBack={() => setActiveView('world')}>
              <LocationMap destinations={view.destinations} currentName={view.location.name} onAction={onAction} />
            </DetailScreen>
          ) : null}
          {activeView === 'people' ? (
            <PeoplePanel view={view} onAction={onAction} onBack={() => setActiveView('world')} />
          ) : null}
          {activeView === 'relationships' ? (
            <RelationshipsPanel bonds={view.bonds} onAction={onAction} onBack={() => setActiveView('menu')} />
          ) : null}
          {activeView === 'character' ? (
            <CharacterPanel status={status} state={state} campaign={campaign} abilityName={view.abilityName} />
          ) : null}
          {activeView === 'progression' ? (
            <SystemPanel
              section="progression"
              status={status}
              campaign={campaign}
              onAction={onAction}
              onBack={() => setActiveView('menu')}
            />
          ) : null}
          {activeView === 'registry' || activeView === 'society' || activeView === 'family' || activeView === 'domain' ? (
            <SystemPanel
              section={activeView}
              status={status}
              campaign={campaign}
              onAction={onAction}
              onBack={() => setActiveView('menu')}
            />
          ) : null}
          {activeView === 'journal' ? (
            <JournalPanel
              view={journal}
              trackedJourneyId={trackedJourneyId}
              onTrackJourney={setTrackedJourneyId}
            />
          ) : null}
          {activeView === 'inventory' ? <InventoryPanel view={view} onAction={onAction} /> : null}
          {activeView === 'menu' ? (
            <GameMenuPanel status={status} view={view} onNavigate={setActiveView} />
          ) : null}

          <AppDialog
            open={actionsOpen}
            title={`Ações em ${view.location.name}`}
            onClose={() => setActionsOpen(false)}
          >
            <ActionsPanel view={view} onAction={onAction} compact />
          </AppDialog>
        </fieldset>
      </div>

      <BottomNavigation
        active={bottomTabFor(activeView)}
        inventoryCount={view.inventory.length}
        onChange={setActiveView}
      />
    </main>
  );
}

function WorldFeedback({ message }: { message: string }) {
  const discovery = message.includes('Descoberta:');
  const warning = message.includes('Condição crítica:');
  const journey = message.includes('Jornada ') || message.includes('Nova jornada:');
  const className = warning
    ? 'world-feedback world-feedback--warning'
    : discovery
      ? 'world-feedback world-feedback--discovery'
      : journey
        ? 'world-feedback world-feedback--journey'
      : 'world-feedback';

  return (
    <section
      className={className}
      role="status"
      aria-live="polite"
    >
      <span className="world-feedback__icon" aria-hidden="true">{warning ? '!' : discovery ? '✦' : journey ? '⌖' : '✓'}</span>
      <div>
        <strong>{warning ? 'Atenção à condição' : discovery ? 'Nova descoberta' : journey ? 'Jornada atualizada' : 'Mundo atualizado'}</strong>
        <p>{message}</p>
      </div>
    </section>
  );
}

function WorldPanel({
  view,
  trackedJourney,
  encounters,
  fightBlockedReason,
  onAction,
  onFight,
  onOpenActions,
  onOpenJournal,
  onNavigate,
}: {
  view: ExplorationView;
  trackedJourney?: JournalJourneyView;
  encounters: EncounterDefinition[];
  fightBlockedReason?: string;
  onAction: (action: SandboxAction) => void;
  onFight: (encounterId: string) => void;
  onOpenActions: () => void;
  onOpenJournal: () => void;
  onNavigate: (view: GameView) => void;
}) {
  return (
    <div className="world-panel">
      <section className="location-hero" aria-labelledby="current-location-title">
        <ImagePlaceholder kind="scene" label={view.location.imageLabel} className="location-hero__image" />
        <div className="location-hero__shade" aria-hidden="true" />
        <div className="location-hero__badges" aria-label="Estado do local">
          <span>Zona descoberta</span>
          <span>Sistema ativo</span>
        </div>
        <div className="location-hero__content">
          <p className="location-hero__kicker">Local atual</p>
          <h1 id="current-location-title">{view.location.name}</h1>
          <p>{view.location.description}</p>
          <div className="location-progress">
            <span>Exploração</span>
            <strong>{view.location.progress}%</strong>
            <div className="progress-bar" aria-label={`${view.location.progress}% explorado`}>
              <span style={{ width: `${view.location.progress}%` }} />
            </div>
          </div>
          <div className="location-hero__actions">
            <button
              type="button"
              className="button button--primary location-hero__primary"
              disabled={!view.location.canExplore}
              onClick={() => onAction({ type: 'exploration.explore' })}
            >
              <span aria-hidden="true">⌕</span>
              <span>
                <strong>Explorar</strong>
                <small>{view.location.exploreDisabledReason ?? formatPeriodCost(view.location.exploreCostPeriods)}</small>
              </span>
            </button>
            <button type="button" className="button location-hero__secondary" onClick={onOpenActions}>
              <span aria-hidden="true">⌁</span>
              <span>
                <strong>Ações locais</strong>
                <small>{view.resources.length + view.recipes.length} disponíveis</small>
              </span>
            </button>
          </div>
        </div>
      </section>

      <details className="world-briefing">
        <summary>
          <span aria-hidden="true">❖</span>
          <strong>Orientação do Sistema</strong>
          <small>Consultar</small>
        </summary>
        <p>{EXPLORATION_INTRO}</p>
      </details>

      {trackedJourney ? (
        <TrackedJourneyCard journey={trackedJourney} onOpenJournal={onOpenJournal} />
      ) : null}

      <div className="world-context-grid">
        <WorldShortcuts view={view} onNavigate={onNavigate} />
        <InteractableSection interactables={view.interactables} onAction={onAction} />
        {view.lingering.length > 0 ? (
          <section className="lingering-section" aria-label="Condições persistentes">
            <span className="section-kicker">Feridas que permanecem</span>
            <ul className="lingering-list">
              {view.lingering.map((entry) => (
                <li key={entry.conditionId}>
                  {entry.name} · {entry.remainingPeriods} período{entry.remainingPeriods === 1 ? '' : 's'}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <ThreatSection encounters={encounters} blockedReason={fightBlockedReason} onFight={onFight} />
      </div>
    </div>
  );
}

function WorldShortcuts({ view, onNavigate }: { view: ExplorationView; onNavigate: (view: GameView) => void }) {
  const peopleHere = view.presences.length;
  return (
    <section className="world-shortcuts" aria-labelledby="world-shortcuts-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Escolha seu foco</span>
          <h2 id="world-shortcuts-title">Ao seu redor</h2>
        </div>
      </div>
      <div className="hub-card-grid hub-card-grid--compact">
        <button type="button" className="hub-card" onClick={() => onNavigate('map')}>
          <span className="hub-card__icon" aria-hidden="true">⌖</span>
          <span><strong>Mapa</strong><small>{view.destinations.length} rota{view.destinations.length === 1 ? '' : 's'} conhecida{view.destinations.length === 1 ? '' : 's'}</small></span>
          <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="hub-card" onClick={() => onNavigate('people')}>
          <span className="hub-card__icon" aria-hidden="true">♙</span>
          <span><strong>Pessoas e criaturas</strong><small>{peopleHere === 0 ? 'Ninguém visível agora' : `${peopleHere} presença${peopleHere === 1 ? '' : 's'} neste local`}</small></span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

function DetailScreen({
  title,
  eyebrow,
  tone = 'system',
  onBack,
  children,
}: {
  title: string;
  eyebrow: string;
  tone?: 'world' | 'social' | 'system';
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`tab-panel detail-screen detail-screen--${tone}`}>
      <header className="detail-screen__header">
        <button type="button" className="back-button" onClick={onBack} aria-label={`Voltar de ${title}`}>
          <span aria-hidden="true">←</span>
        </button>
        <div>
          <span className="section-kicker">{eyebrow}</span>
          <h1>{title}</h1>
        </div>
      </header>
      {children}
    </div>
  );
}

function PeoplePanel({
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

function RelationshipsPanel({
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

function RelationshipSection({
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

function BondActionGroup({
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

function CharacterPanel({
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

function GameMenuPanel({
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

function ThreatSection({
  encounters,
  blockedReason,
  onFight,
}: {
  encounters: EncounterDefinition[];
  blockedReason?: string;
  onFight: (encounterId: string) => void;
}) {
  if (encounters.length === 0) {
    return null;
  }

  return (
    <section className="threat-section" aria-labelledby="threats-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Perigo à espreita</span>
          <h2 id="threats-title">Ameaças neste local</h2>
        </div>
        <span className="section-count">{encounters.length}</span>
      </div>
      <div className="threat-card-list">
        {encounters.map((encounter) => (
          <article key={encounter.id} className="threat-card">
            <div className="threat-card__body">
              <h3>{encounter.name}</h3>
              <p>{encounter.description}</p>
              <p className="threat-card__cost">{blockedReason ?? `Enfrentar custa ${formatPeriodCost(encounter.timeCost.periods)}`}</p>
            </div>
            <button
              type="button"
              className="button button--danger button--action"
              disabled={Boolean(blockedReason)}
              onClick={() => onFight(encounter.id)}
            >
              Enfrentar
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function InteractableSection({
  interactables,
  onAction,
}: {
  interactables: InteractableView[];
  onAction: (action: SandboxAction) => void;
}) {
  if (interactables.length === 0) {
    return null;
  }

  return (
    <section className="presence-section" aria-labelledby="interactables-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">O que dá para examinar</span>
          <h2 id="interactables-title">Pontos de interesse</h2>
        </div>
        <span className="section-count">{interactables.length}</span>
      </div>
      <div className="presence-card-list">
        {interactables.map((interactable) => (
          <article key={interactable.interactableId} className="presence-card">
            <div className="presence-card__body">
              <div className="presence-card__title">
                <h3>{interactable.name}</h3>
                <p className="presence-card__meta">{interactable.stageName}</p>
              </div>
              <p>{interactable.stageDescription}</p>
              {interactable.facts.map((fact) => (
                <p key={fact}>{fact}</p>
              ))}
              <div className="presence-card__actions">
                {interactable.actions.map((action) => (
                  <button
                    key={action.actionId}
                    type="button"
                    className="button button--action"
                    disabled={!action.available}
                    onClick={() =>
                      onAction({
                        type: 'interactable.interact',
                        interactableId: interactable.interactableId,
                        actionId: action.actionId,
                      })
                    }
                  >
                    {action.label}
                    <small>{action.blockedReason ?? formatPeriodCost(action.costPeriods)}</small>
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PresenceSection({
  presences,
  onAction,
}: {
  presences: PresenceView[];
  onAction: (action: SandboxAction) => void;
}) {
  if (presences.length === 0) {
    return null;
  }

  return (
    <section className="presence-section" aria-labelledby="presences-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Quem está aqui</span>
          <h2 id="presences-title">Presenças neste local</h2>
        </div>
        <span className="section-count">{presences.length}</span>
      </div>

      <div className="presence-card-list">
        {presences.map((presence, index) => (
          <PresenceCard
            key={presence.presenceId}
            presence={presence}
            onAction={onAction}
            initiallyOpen={index === 0}
          />
        ))}
      </div>
    </section>
  );
}

function PresenceCard({
  presence,
  onAction,
  initiallyOpen,
}: {
  presence: PresenceView;
  onAction: (action: SandboxAction) => void;
  initiallyOpen: boolean;
}) {
  const resolved = presence.status === 'resolved';
  const cardClass =
    presence.status === 'available'
      ? 'presence-card'
      : `presence-card presence-card--${presence.status}`;

  return (
    <article className={cardClass} aria-labelledby={`${presence.presenceId}-name`}>
      <details open={initiallyOpen}>
        <summary className="presence-card__summary">
          <ImagePlaceholder
            kind={presence.imageKind}
            label={presence.imageLabel}
            className="presence-card__media"
          />
          <span className="presence-card__title">
            <h3 id={`${presence.presenceId}-name`}>{presence.name}</h3>
            <span className="presence-card__meta">
              <span aria-hidden="true">{presence.kindSymbol}</span>
              {presence.kindLabel} · {presence.statusLabel}
            </span>
          </span>
          <span className="presence-card__chevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="presence-card__body">
        <p>{presence.description}</p>
        {presence.trust !== undefined ? (
          <p className="presence-card__trust">Confiança: {presence.trust}</p>
        ) : null}
        {presence.hint ? <p className="presence-card__hint">{presence.hint}</p> : null}
        {resolved ? (
          <p className="presence-card__resolved">Ocorrência concluída.</p>
        ) : (
          <div className="presence-actions">
            {presence.interactions.map((interaction) => {
              const reasonId = `${interaction.interactionId}-reason`;
              const hintId = `${interaction.interactionId}-hint`;
              const describedBy = [
                interaction.hint ? hintId : null,
                interaction.blockedReason ? reasonId : null,
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <div key={interaction.interactionId} className="presence-action">
                  <button
                    type="button"
                    className="button button--presence"
                    disabled={!interaction.available}
                    aria-describedby={describedBy || undefined}
                    onClick={() =>
                      onAction({
                        type: 'presence.interact',
                        presenceId: presence.presenceId,
                        interactionId: interaction.interactionId,
                      })
                    }
                  >
                    <span>{interaction.label}</span>
                    <small>{formatPeriodCost(interaction.costPeriods)}</small>
                  </button>
                  {interaction.hint ? (
                    <p id={hintId} className="presence-action__hint">
                      {interaction.hint}
                    </p>
                  ) : null}
                  {interaction.blockedReason ? (
                    <p id={reasonId} className="presence-action__reason">
                      {interaction.blockedReason}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </details>
    </article>
  );
}

function LocationMap({
  destinations,
  currentName,
  onAction,
}: {
  destinations: DestinationView[];
  currentName: string;
  onAction: (action: SandboxAction) => void;
}) {
  const parents = destinations.filter((destination) => destination.relation === 'parent');
  const siblings = destinations.filter((destination) => destination.relation === 'sibling');
  const children = destinations.filter((destination) => destination.relation === 'child');

  return (
    <section className="world-map" aria-labelledby="world-map-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Arredores conhecidos</span>
          <h2 id="world-map-title">Mapa do local</h2>
        </div>
        <span className="section-count">{destinations.length}</span>
      </div>

      {destinations.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">?</span>
          <strong>O mapa termina aqui por enquanto</strong>
          <p>Explore o local para encontrar passagens e revelar novos destinos.</p>
        </div>
      ) : (
        <div className="map-route-list">
          <div className="map-current-location">
            <span className="map-node__marker" aria-hidden="true">●</span>
            <span><small>Você está aqui</small><strong>{currentName}</strong></span>
          </div>
          <MapGroup label="Retornar" destinations={parents} onAction={onAction} />
          <MapGroup label="Mesmo território" destinations={siblings} onAction={onAction} />
          <MapGroup label="Seguir adiante" destinations={children} onAction={onAction} />
        </div>
      )}
    </section>
  );
}

function MapGroup({
  label,
  destinations,
  onAction,
}: {
  label: string;
  destinations: DestinationView[];
  onAction: (action: SandboxAction) => void;
}) {
  if (destinations.length === 0) {
    return null;
  }

  return (
    <div className="map-route-group">
      <span className="map-route-group__label">{label}</span>
      {destinations.map((destination) => (
        <MapNode key={destination.locationId} destination={destination} onAction={onAction} />
      ))}
    </div>
  );
}

function MapNode({ destination, onAction }: { destination: DestinationView; onAction: (action: SandboxAction) => void }) {
  return (
    <button
      type="button"
      className="map-node"
      disabled={!destination.accessible}
      onClick={() => onAction({ type: 'navigation.move', locationId: destination.locationId })}
    >
      <span className="map-node__marker" aria-hidden="true">{destination.accessible ? '○' : '▒'}</span>
      <span className="map-node__copy">
        <strong>{destination.name}</strong>
        <small>{destination.blockedReason ?? `${destination.relationLabel} · ${formatPeriodCost(destination.costPeriods)}`}</small>
      </span>
      <span className="map-node__arrow" aria-hidden="true">→</span>
    </button>
  );
}

function ActionsPanel({
  view,
  onAction,
  compact = false,
}: {
  view: ExplorationView;
  onAction: (action: SandboxAction) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'tab-panel tab-panel--action-drawer' : 'tab-panel'}>
      {!compact ? <header className="panel-heading">
        <span className="section-kicker">{view.location.name}</span>
        <h1>Ações disponíveis</h1>
        <p>Veja custos e resultados antes de comprometer um período.</p>
      </header> : <p className="action-drawer__intro">Escolha uma atividade. O custo aparece antes de você agir.</p>}

      <section className="action-section" aria-labelledby="rest-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Recuperação</span>
            <h2 id="rest-title">Descanso</h2>
          </div>
          {view.rest.recommended ? <span className="condition-chip condition-chip--urgent">Recomendado</span> : null}
        </div>
        <article className={view.rest.recommended ? 'rest-card rest-card--recommended' : 'rest-card'}>
          <div className="rest-card__icon" aria-hidden="true">☾</div>
          <div className="rest-card__body">
            <h3>{view.rest.label}</h3>
            <p>{view.rest.description}</p>
            <NeedEffectList effects={view.rest.effects} />
            <button
              type="button"
              className="button button--compact rest-card__button"
              onClick={() => onAction({ type: 'needs.rest', mode: view.rest.mode })}
            >
              {view.rest.label} · {formatPeriodCost(view.rest.costPeriods)}
            </button>
          </div>
        </article>
      </section>

      <section className="action-section" aria-labelledby="collect-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Recursos revelados</span>
            <h2 id="collect-title">Coleta</h2>
          </div>
          <span className="section-count">{view.resources.length}</span>
        </div>
        {view.resources.length === 0 ? (
          <EmptyAction message="Nenhum ponto de coleta foi revelado neste local." />
        ) : (
          <div className="action-card-list">
            {view.resources.map((resource) => (
              <ResourceCard key={resource.nodeId} resource={resource} onAction={onAction} />
            ))}
          </div>
        )}
      </section>

      <section className="action-section" aria-labelledby="craft-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Conhecimento atual</span>
            <h2 id="craft-title">Fabricação</h2>
          </div>
          <span className="section-count">{view.recipes.length}</span>
        </div>
        {view.recipes.length === 0 ? (
          <EmptyAction message="Nenhuma receita conhecida." />
        ) : (
          <div className="action-card-list">
            {view.recipes.map((recipe) => (
              <RecipeCard key={recipe.recipeId} recipe={recipe} onAction={onAction} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ResourceCard({ resource, onAction }: { resource: ResourceView; onAction: (action: SandboxAction) => void }) {
  return (
    <article className={resource.collectable ? 'action-card' : 'action-card action-card--blocked'}>
      <div className="item-glyph" aria-hidden="true">{itemGlyph(resource.nodeId)}</div>
      <div className="action-card__body">
        <div className="action-card__title">
          <h3>{resource.name}</h3>
          <span>{resource.availableUnits} disponíveis</span>
        </div>
        <p>{resource.yields.map((entry) => `${entry.quantityPerUnit}× ${entry.name}`).join(' · ')}</p>
        <div className="resource-meter" aria-label={`${resource.availableUnits} unidades disponíveis`}>
          <span style={{ width: `${Math.min(100, resource.availableUnits * 10)}%` }} />
        </div>
        <div className="action-card__footer">
          <small>{resource.blockedReason ?? `Até ${resource.maxCollectable} por coleta · ${formatPeriodCost(resource.costPeriods)}`}</small>
          <button
            type="button"
            className="button button--compact"
            disabled={!resource.collectable}
            onClick={() => onAction({ type: 'resource.collect', nodeId: resource.nodeId, units: 1 })}
          >
            Coletar 1
          </button>
        </div>
      </div>
    </article>
  );
}

function RecipeCard({ recipe, onAction }: { recipe: RecipeView; onAction: (action: SandboxAction) => void }) {
  const outcome = recipe.structureName
    ? `Cria ${recipe.structureName}`
    : recipe.products.map((entry) => `${entry.quantity}× ${entry.name}`).join(' · ');

  return (
    <article className={recipe.craftable ? 'action-card' : 'action-card action-card--blocked'}>
      <div className="item-glyph" aria-hidden="true">{itemGlyph(recipe.recipeId)}</div>
      <div className="action-card__body">
        <div className="action-card__title">
          <h3>{recipe.name}</h3>
          <span>{recipe.craftable ? 'Disponível' : 'Bloqueada'}</span>
        </div>
        <ul className="ingredient-list" aria-label="Ingredientes">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.itemId}>{ingredient.quantity}× {ingredient.name}</li>
          ))}
        </ul>
        {outcome ? <p className="action-card__outcome">{outcome}</p> : null}
        <div className="action-card__footer">
          <small>
            {recipe.blockedReason ??
              `${formatPeriodCost(recipe.costPeriods)}${recipe.stationTags.length ? ` · ${recipe.stationTags.join(', ')}` : ''}`}
          </small>
          <button
            type="button"
            className="button button--compact"
            disabled={!recipe.craftable}
            onClick={() => onAction({ type: 'crafting.craft', recipeId: recipe.recipeId })}
          >
            Fabricar
          </button>
        </div>
      </div>
    </article>
  );
}

function KnownNpcSection({
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

function InventoryPanel({ view, onAction }: { view: ExplorationView; onAction: (action: SandboxAction) => void }) {
  const [filter, setFilter] = useState<'all' | ItemKind>('all');
  const [pending, setPending] = useState<
    | { type: 'equipment.equip'; itemId: string; name: string }
    | { type: 'preparation.assign'; slot: number; itemId: string; name: string }
    | null
  >(null);
  const emptyPrep = view.preparation.find((slot) => slot.itemId === null);
  const filteredInventory = filter === 'all' ? view.inventory : view.inventory.filter((item) => item.kind === filter);
  const filters: Array<{ id: 'all' | ItemKind; label: string }> = [
    { id: 'all', label: 'Visão geral' },
    { id: 'consumable', label: 'Consumíveis' },
    { id: 'equipment', label: 'Equipamentos' },
    { id: 'material', label: 'Materiais' },
  ];

  return (
    <div className="tab-panel">
      <header className="panel-heading panel-heading--split">
        <div>
          <span className="section-kicker">Pertences carregados</span>
          <h1>Mochila</h1>
        </div>
        <span className="inventory-total">{view.inventory.reduce((total, item) => total + item.quantity, 0)} itens</span>
      </header>

      <nav className="inventory-tabs" aria-label="Categorias da mochila">
        {filters.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={filter === entry.id ? 'inventory-tabs__item inventory-tabs__item--active' : 'inventory-tabs__item'}
            aria-pressed={filter === entry.id}
            onClick={() => setFilter(entry.id)}
          >
            {entry.label}
            <small>{entry.id === 'all' ? view.inventory.length : view.inventory.filter((item) => item.kind === entry.id).length}</small>
          </button>
        ))}
      </nav>

      {filter !== 'material' ? <section className="loadout-board" aria-label="Preparação e equipamento">
        {filter === 'all' || filter === 'consumable' ? (
        <div>
          <span className="section-kicker">Preparação</span>
          <ul className="loadout-slots">
            {view.preparation.map((slot) => (
              <li key={slot.index}>
                <strong>{slot.index + 1}</strong>
                <span>{slot.itemName ?? '—'}</span>
                {slot.itemId ? (
                  <button type="button" className="button button--compact" onClick={() => onAction({ type: 'preparation.clear', slot: slot.index })}>
                    Remover
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        ) : null}
        {filter === 'all' || filter === 'equipment' ? (
        <div>
          <span className="section-kicker">Equipado</span>
          <ul className="loadout-slots">
            {view.equipment.map((slot) => (
              <li key={slot.slot}>
                <strong>{slot.label}</strong>
                <span>{slot.itemName ?? '—'}</span>
                {slot.itemId ? (
                  <button type="button" className="button button--compact" onClick={() => onAction({ type: 'equipment.unequip', slot: slot.slot })}>
                    Desequipar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        ) : null}
      </section> : null}

      {filteredInventory.length === 0 ? (
        <div className="empty-state empty-state--large">
          <span aria-hidden="true">▣</span>
          <strong>{view.inventory.length === 0 ? 'Sua mochila está vazia' : 'Nada nesta categoria'}</strong>
          <p>{view.inventory.length === 0 ? 'Explore o mundo e revele pontos de coleta para encontrar materiais.' : 'Os itens de outras categorias continuam guardados.'}</p>
        </div>
      ) : (
        <ul className="inventory-grid">
          {filteredInventory.map((item) => (
            <li key={item.itemId} className={item.consumable ? 'inventory-grid__item inventory-grid__item--consumable' : 'inventory-grid__item'}>
              <span className="inventory-grid__icon" aria-hidden="true">{itemGlyph(item.itemId)}</span>
              <strong>{item.name}</strong>
              <span>× {item.quantity}</span>
              {item.consumable ? (
                <>
                  <NeedEffectList effects={item.effects} compact />
                  <button
                    type="button"
                    className="button button--compact inventory-grid__consume"
                    onClick={() => onAction({ type: 'needs.consume', itemId: item.itemId })}
                  >
                    Consumir
                  </button>
                </>
              ) : null}
              {item.canEquip ? (
                <button
                  type="button"
                  className="button button--compact inventory-grid__consume"
                  onClick={() => setPending({ type: 'equipment.equip', itemId: item.itemId, name: item.name })}
                >
                  Equipar
                </button>
              ) : null}
              {item.canPrepare && emptyPrep ? (
                <button
                  type="button"
                  className="button button--compact inventory-grid__consume"
                  onClick={() => setPending({ type: 'preparation.assign', slot: emptyPrep.index, itemId: item.itemId, name: item.name })}
                >
                  Preparar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.type === 'equipment.equip' ? `Equipar ${pending.name}` : pending ? `Preparar ${pending.name}` : ''}
        message={
          pending?.type === 'equipment.equip'
            ? 'Isso substitui o equipamento atual deste espaço.'
            : pending
              ? 'O consumível fica reservado para o próximo confronto.'
              : ''
        }
        confirmLabel="Confirmar"
        onConfirm={() => {
          if (pending?.type === 'equipment.equip') {
            onAction({ type: 'equipment.equip', itemId: pending.itemId });
          } else if (pending?.type === 'preparation.assign') {
            onAction({ type: 'preparation.assign', slot: pending.slot, itemId: pending.itemId });
          }
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

function NeedEffectList({ effects, compact = false }: { effects: NeedEffectView[]; compact?: boolean }) {
  return (
    <ul className={compact ? 'need-effect-list need-effect-list--compact' : 'need-effect-list'} aria-label="Efeitos">
      {effects.map((effect) => (
        <li key={effect.needId}>
          {formatNeedDelta(effect.needId, effect.amount)}{effect.limited ? ' (limitado)' : ''}
        </li>
      ))}
    </ul>
  );
}

function SystemPanel({
  section,
  status,
  campaign,
  onAction,
  onBack,
}: {
  section: 'progression' | 'registry' | 'society' | 'family' | 'domain';
  status: SystemStatusView;
  campaign: Campaign;
  onAction: (action: SandboxAction) => void;
  onBack: () => void;
}) {
  const [pending, setPending] = useState<SystemTrainingView | null>(null);
  const [pendingGarden, setPendingGarden] = useState<string | null>(null);
  const [pendingPatent, setPendingPatent] = useState<string | null>(null);
  const gardenRecipe = status.garden.recipes.find((recipe) => recipe.id === pendingGarden);
  const patent = status.registry.patents.find((entry) => entry.id === pendingPatent);
  const sectionCopy = {
    progression: { eyebrow: 'Fortalecimento', title: 'Progressão', description: 'Eteris, Númen, habilidades, treino e Jardim.' },
    registry: { eyebrow: 'Reconhecimento do Sistema', title: 'Registro', description: 'Patentes, classificações e posições reconhecidas.' },
    society: { eyebrow: 'Vida compartilhada', title: 'Sociedade', description: 'Grupos, companheiros, profissões e cidadania.' },
    family: { eyebrow: 'Laços de vida', title: 'Família e lar', description: 'Parentesco, casa, linhagem e os marcos de uma vida compartilhada.' },
    domain: { eyebrow: 'Construção de poder', title: 'Domínio', description: 'Economia, propriedades, territórios e política.' },
  }[section];

  return (
    <div className={`tab-panel system-panel system-panel--${section}`}>
      <header className="system-console">
        <button type="button" className="back-button" onClick={onBack} aria-label={`Voltar de ${sectionCopy.title}`}><span aria-hidden="true">←</span></button>
        <div>
          <span className="section-kicker">{sectionCopy.eyebrow}</span>
          <h1>{sectionCopy.title}</h1>
          <p>{sectionCopy.description}</p>
        </div>
        <span className="system-console__level">Nível <strong>{status.level}</strong></span>
      </header>

      <div className="system-disclosure-list">
        {section === 'progression' ? <>
        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">∞</span>
            <span><strong>Eteris e Númen</strong><small>Fundamentos conhecidos</small></span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            <ul className="system-note-list">
              {status.energies.map((energy) => (
                <li key={energy.id}><strong>{energy.name}</strong><p>{energy.description}</p></li>
              ))}
              {status.execution.reserves.map((reserve) => (
                <li key={reserve.energyId}>
                  <strong>{reserve.name}</strong>
                  <p>
                    {reserve.current}/{reserve.max} disponível
                  </p>
                </li>
              ))}
            </ul>
            <ul className="system-chip-list" aria-label="Campos de aplicação">
              {status.fields.map((field) => (
                <li key={field.id} className="system-chip"><strong>{field.name}</strong><span>{field.description}</span></li>
              ))}
            </ul>
          </div>
        </details>

        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⌘</span>
            <span><strong>Habilidades e caminhos</strong><small>{status.knownSkills.length} conhecidas</small></span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body system-disclosure__body--stack">
            <section aria-labelledby="system-skills-title">
              <div className="section-heading"><h2 id="system-skills-title">Habilidades conhecidas</h2><span className="section-count">{status.knownSkills.length}</span></div>
              {status.knownSkills.length === 0 ? <EmptyAction message="O Sistema ainda não registrou habilidades." /> : (
                <ul className="system-skill-list">
                  {status.knownSkills.map((skill) => (
                    <li key={skill.skillId} className="system-skill">
                      <div className="system-skill__head"><strong>{skill.name}</strong><span>Proficiência {skill.proficiency}</span></div>
                      <p>{skill.description}</p><small>{skill.pathName}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="system-tree-title">
              <div className="section-heading"><h2 id="system-tree-title">Árvore de habilidades</h2></div>
              {status.tree.paths.length === 0 ? <EmptyAction message="Nenhum caminho revelado ainda." /> : (
                <div className="system-tree">
                  {status.tree.paths.map((path) => (
                    <article key={path.pathId} className="system-tree__path">
                      <header className="system-tree__path-head"><strong>{path.name}</strong><span>{path.field === 'corpo' ? 'Corpo' : 'Poder'}</span></header>
                      <ul className="system-tree__nodes">
                        {path.nodes.map((node) => (
                          <li key={node.skillId} className={`system-tree__node system-tree__node--${node.status}`}>
                            <strong>{node.name}</strong>
                            <span>{node.status === 'known' ? `Conhecida · proficiência ${node.proficiency}` : 'Possível de desenvolver'}</span>
                          </li>
                        ))}
                      </ul>
                      {path.hasHiddenSkills ? <small className="system-tree__hidden">Há possibilidades ainda não compreendidas neste caminho</small> : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </details>

        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">△</span>
            <span><strong>Treinamento</strong><small>{status.trainings.length} métodos conhecidos</small></span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.trainings.length === 0 ? <EmptyAction message="Nenhum método de treino disponível agora." /> : (
              <div className="action-card-list">
                {status.trainings.map((training) => (
                  <article key={training.methodId} className={training.canTrain ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title"><h3>{training.name}</h3><span>{training.targetLabel}</span></div>
                      <p>{training.description}</p>
                      <ul className="training-effects" aria-label="Efeitos do treino">
                        {training.effectsSummary.map((effect) => <li key={effect}>{effect}</li>)}
                      </ul>
                      {training.requirementsSummary.length > 0 ? (
                        <p className="training-requirements">Requisitos: {training.requirementsSummary.join(', ')}</p>
                      ) : null}
                      <div className="action-card__footer">
                        <small>{training.blockedReason ?? `Custa ${formatPeriodCost(training.costPeriods)}`}</small>
                        <button type="button" className="button button--compact" disabled={!training.canTrain} onClick={() => setPending(training)}>Treinar</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </details>

        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">❀</span>
            <span><strong>Jardim</strong><small>{status.garden.cultivationPoints} ponto{status.garden.cultivationPoints === 1 ? '' : 's'} de cultivo</small></span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.garden.recipes.length === 0 ? (
              <EmptyAction message="Nenhuma integração percebida no Jardim." />
            ) : (
              <div className="action-card-list">
                {status.garden.recipes.map((recipe) => (
                  <article key={recipe.id} className={recipe.visibility === 'available' ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{recipe.name ?? 'Integração percebida'}</h3>
                        <span>{recipe.visibility === 'cultivated' ? 'Cultivada' : recipe.visibility === 'available' ? 'Disponível' : 'Percebida'}</span>
                      </div>
                      {recipe.description ? <p>{recipe.description}</p> : <p>Os requisitos desta integração ainda não estão claros.</p>}
                      {recipe.cost ? (
                        <p className="training-requirements">
                          Custa {recipe.cost.cultivationPoints} ponto{recipe.cost.cultivationPoints === 1 ? '' : 's'} · {formatPeriodCost(recipe.cost.timeCost.periods)}
                        </p>
                      ) : null}
                      <div className="action-card__footer">
                        <small>{recipe.requirementsMet === false ? 'Requisitos em aberto' : recipe.visibility === 'cultivated' ? 'Já integrada' : 'Integração irreversível neste recorte'}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={recipe.visibility !== 'available' || !recipe.requirementsMet}
                          onClick={() => setPendingGarden(recipe.id)}
                        >
                          Cultivar integração
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </details>

        </> : null}
        {section === 'registry' ? <>
        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">▣</span>
            <span>
              <strong>Registro</strong>
              <small>
                {status.registry.accessGranted
                  ? `${status.registry.rankings.length} ranking${status.registry.rankings.length === 1 ? '' : 's'} visíve${status.registry.rankings.length === 1 ? 'l' : 'is'}`
                  : 'Acesso não concedido'}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {!status.registry.accessGranted ? (
              <EmptyAction message="O Registro ainda não reconhece este usuário." />
            ) : (
              <>
                {status.registry.rankings.length === 0 ? (
                  <EmptyAction message="Nenhum ranking reconhecido neste recorte." />
                ) : (
                  <div className="action-card-list">
                    {status.registry.rankings.map((ranking) => (
                      <article key={ranking.rankingId} className="action-card">
                        <div className="action-card__body">
                          <div className="action-card__title">
                            <h3>{ranking.name}</h3>
                            <span>{ranking.scope}</span>
                          </div>
                          <p>{ranking.description}</p>
                          <p className="training-requirements">
                            {ranking.metricLabel}
                            {ranking.playerPosition ? ` · posição ${ranking.playerPosition}` : ''}
                          </p>
                          <ol className="registry-standings" aria-label={`Classificação de ${ranking.name}`}>
                            {ranking.standings.map((standing) => (
                              <li key={standing.actorId} className={standing.isPlayer ? 'is-player' : undefined}>
                                <span>
                                  {standing.position}. {standing.name}
                                </span>
                                <span>{standing.score}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {status.registry.patents.length === 0 ? (
                  <EmptyAction message="Nenhuma patente declarada neste pack." />
                ) : (
                  <div className="action-card-list">
                    {status.registry.patents.map((entry) => (
                      <article key={entry.id} className={entry.claimable || entry.granted ? 'action-card' : 'action-card action-card--blocked'}>
                        <div className="action-card__body">
                          <div className="action-card__title">
                            <h3>{entry.name}</h3>
                            <span>{entry.granted ? 'Concedida' : entry.claimable ? 'Reivindicável' : 'Requisitos em aberto'}</span>
                          </div>
                          <p>{entry.description}</p>
                          <div className="action-card__footer">
                            <small>{entry.granted ? 'Já registrada neste recorte' : 'A patente não substitui o nível'}</small>
                            <button
                              type="button"
                              className="button button--compact"
                              disabled={!entry.claimable}
                              onClick={() => setPendingPatent(entry.id)}
                            >
                              Reivindicar patente
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </details>

        </> : null}
        {section === 'society' ? <>
        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⚑</span>
            <span>
              <strong>Grupos</strong>
              <small>
                {status.organizations.length === 1
                  ? '1 organização ativa'
                  : `${status.organizations.length} organizações ativas`}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.organizations.length === 0 ? (
              <EmptyAction message="Nenhum grupo ativo neste recorte." />
            ) : (
              <div className="action-card-list">
                {status.organizations.map((organization) => (
                  <article key={organization.id} className="action-card">
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{organization.name}</h3>
                        <span>{organization.typeName}</span>
                      </div>
                      <p>{organization.description}</p>
                      <ul className="registry-standings" aria-label={`Membros de ${organization.name}`}>
                        {organization.members.map((member) => (
                          <li key={member.actorId} className={member.isPlayer ? 'is-player' : undefined}>
                            <span>{member.isPlayer ? 'Você' : findNpc(campaign, member.actorId)?.name ?? member.actorId}</span>
                            <span>
                              {member.roleName} · {member.membershipName}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {status.party.some((member) => !member.isPlayer) ? (
              <ul className="registry-standings" aria-label="Companhia ativa">
                {status.party
                  .filter((member) => !member.isPlayer)
                  .map((member) => (
                    <li key={member.actorId}>
                      <span>{member.name}</span>
                      <span>
                        {member.roleName} · {member.health}/{member.maxHealth}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : null}
            {status.organizationActions.length > 0 ? (
              <div className="action-card-list">
                {status.organizationActions.map((action) => (
                  <article key={action.actionId} className={action.available ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{action.label}</h3>
                        <span>{action.available ? 'Disponível' : 'Bloqueada'}</span>
                      </div>
                      <p>{action.hint}</p>
                      <div className="action-card__footer">
                        <small>{action.blockedReason ?? `Custa ${formatPeriodCost(action.costPeriods)}`}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={!action.available}
                          onClick={() => onAction({ type: 'organization.act', actionId: action.actionId })}
                        >
                          Executar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </details>

        </> : null}
        {section === 'family' ? <>
        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⌂</span>
            <span>
              <strong>Família e lar</strong>
              <small>
                {status.family.length === 1 ? '1 pessoa reconhecida' : `${status.family.length} pessoas reconhecidas`}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.family.length === 0 ? (
              <EmptyAction message="Nenhuma estrutura familiar neste recorte." />
            ) : (
              <ul className="registry-standings" aria-label="Família e lar">
                {status.family.map((member) => (
                  <li key={member.actorId} className={member.isPlayer ? 'is-player' : undefined}>
                    <span>{member.isPlayer ? 'Você' : member.name}</span>
                    <span>
                      {[member.kinshipName, member.householdName, member.stageName]
                        .filter(Boolean)
                        .join(' · ') || 'Sem parentesco declarado'}
                      {member.ageYears !== undefined ? ` · ${member.ageYears} anos` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {status.familyActions.length > 0 ? (
              <div className="action-card-list">
                {status.familyActions.map((action) => (
                  <article key={action.actionId} className={action.available ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{action.label}</h3>
                        <span>{action.available ? 'Disponível' : 'Bloqueada'}</span>
                      </div>
                      <p>{action.hint}</p>
                      <div className="action-card__footer">
                        <small>{action.blockedReason ?? `Custa ${formatPeriodCost(action.costPeriods)}`}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={!action.available}
                          onClick={() => onAction({ type: 'family.act', actionId: action.actionId })}
                        >
                          Executar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </details>

        </> : null}
        {section === 'society' ? <>
        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⚖</span>
            <span>
              <strong>Ocupação e cidadania</strong>
              <small>
                {status.civic.filter((entry) => entry.active).length === 1
                  ? '1 concessão ativa'
                  : `${status.civic.filter((entry) => entry.active).length} concessões ativas`}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.civic.length === 0 ? (
              <EmptyAction message="Nenhuma cidadania ou ofício reconhecido neste recorte." />
            ) : (
              <ul className="registry-standings" aria-label="Ocupação e cidadania">
                {status.civic.map((entry) => (
                  <li key={`${entry.kind}:${entry.definitionId}:${entry.active ? 'active' : 'revoked'}`}>
                    <span>{entry.name}</span>
                    <span>
                      {[entry.kind === 'citizenship' ? 'Cidadania' : entry.kind === 'profession' ? 'Profissão' : entry.kind, entry.scopeName, entry.active ? 'Ativa' : 'Revogada']
                        .join(' · ')}
                      {entry.progress !== undefined ? ` · prática ${entry.progress}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {status.civicActions.length > 0 ? (
              <div className="action-card-list">
                {status.civicActions.map((action) => (
                  <article key={action.actionId} className={action.available ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{action.label}</h3>
                        <span>{action.available ? 'Disponível' : 'Bloqueada'}</span>
                      </div>
                      <p>{action.hint}</p>
                      <div className="action-card__footer">
                        <small>{action.blockedReason ?? `Custa ${formatPeriodCost(action.costPeriods)}`}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={!action.available}
                          onClick={() => onAction({ type: 'civic.act', actionId: action.actionId })}
                        >
                          Executar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </details>

        </> : null}
        {section === 'domain' ? <>
        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⚖</span>
            <span>
              <strong>Comércio e propriedade</strong>
              <small>
                {status.economy.wallets.length === 0
                  ? 'sem saldo'
                  : status.economy.wallets.map((wallet) => `${wallet.amount} ${wallet.name}`).join(' · ')}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.economy.wallets.length === 0 && status.economy.properties.length === 0 ? (
              <EmptyAction message="Nenhuma transação ou direito de uso neste recorte." />
            ) : (
              <ul className="registry-standings" aria-label="Comércio e propriedade">
                {status.economy.wallets.map((wallet) => (
                  <li key={wallet.currencyId}>
                    <span>{wallet.name}</span>
                    <span>{wallet.amount}</span>
                  </li>
                ))}
                {status.economy.properties.map((property) => (
                  <li key={property.propertyId}>
                    <span>{property.name}</span>
                    <span>Direito de uso</span>
                  </li>
                ))}
              </ul>
            )}
            {status.economyActions.length > 0 ? (
              <div className="action-card-list">
                {status.economyActions.map((action) => (
                  <article key={action.actionId} className={action.available ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{action.label}</h3>
                        <span>{action.available ? 'Disponível' : 'Bloqueada'}</span>
                      </div>
                      <p>{action.hint}</p>
                      <div className="action-card__footer">
                        <small>{action.blockedReason ?? `Custa ${formatPeriodCost(action.costPeriods)}`}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={!action.available}
                          onClick={() => onAction({ type: 'economy.act', actionId: action.actionId })}
                        >
                          Executar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </details>

        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⌂</span>
            <span>
              <strong>Base e território</strong>
              <small>
                {status.settlements.claims.length === 0
                  ? 'sem reivindicação'
                  : status.settlements.structures.length === 0
                    ? 'acampamento reivindicado'
                    : `${status.settlements.structures.length} estrutura${status.settlements.structures.length === 1 ? '' : 's'}`}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.settlements.claims.length === 0 && status.settlements.projects.length === 0 ? (
              <EmptyAction message="Nenhuma base administrável neste recorte." />
            ) : (
              <ul className="registry-standings" aria-label="Base e território">
                {status.settlements.claims.map((claim) => (
                  <li key={claim.territoryId}>
                    <span>{claim.name}</span>
                    <span>Reivindicado</span>
                  </li>
                ))}
                {status.settlements.structures.map((structure) => (
                  <li key={`${structure.territoryName}-${structure.structureTypeId}`}>
                    <span>{structure.name}</span>
                    <span>{structure.territoryName}</span>
                  </li>
                ))}
                {status.settlements.projects.map((project) => (
                  <li key={project.projectId}>
                    <span>{project.label}</span>
                    <span>{project.remainingPeriods} período{project.remainingPeriods === 1 ? '' : 's'}</span>
                  </li>
                ))}
                {status.settlements.storage.map((entry) => (
                  <li key={`${entry.territoryId}-${entry.itemId}`}>
                    <span>Estoque {entry.itemId}</span>
                    <span>{entry.quantity}/{entry.capacity}</span>
                  </li>
                ))}
                {status.settlements.assignments.map((assignment) => (
                  <li key={`${assignment.npcId}-${assignment.roleName}`}>
                    <span>{assignment.roleName}</span>
                    <span>{assignment.npcId}</span>
                  </li>
                ))}
              </ul>
            )}
            {status.settlementActions.length > 0 ? (
              <div className="action-card-list">
                {status.settlementActions.map((action) => (
                  <article key={action.actionId} className={action.available ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{action.label}</h3>
                        <span>{action.available ? 'Disponível' : 'Bloqueada'}</span>
                      </div>
                      <p>{action.hint}</p>
                      <div className="action-card__footer">
                        <small>{action.blockedReason ?? `Custa ${formatPeriodCost(action.costPeriods)}`}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={!action.available}
                          onClick={() => onAction({ type: 'settlement.act', actionId: action.actionId })}
                        >
                          Executar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </details>

        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⚑</span>
            <span>
              <strong>Facções e diplomacia</strong>
              <small>
                {status.politics.mandates.length === 0
                  ? 'sem mandato'
                  : status.politics.agreements.find((entry) => entry.status === 'active')
                    ? 'pacto ativo'
                    : 'mandato em vigor'}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.politics.mandates.length === 0 && status.politics.agreements.length === 0 ? (
              <EmptyAction message="Nenhuma facção ou acordo neste recorte." />
            ) : (
              <ul className="registry-standings" aria-label="Facções e diplomacia">
                {status.politics.mandates.map((mandate) => (
                  <li key={`${mandate.factionName}-${mandate.officeName}`}>
                    <span>{mandate.officeName}</span>
                    <span>{mandate.factionName}</span>
                  </li>
                ))}
                {status.politics.relations.map((relation) => (
                  <li key={`${relation.fromName}-${relation.toName}`}>
                    <span>{relation.fromName} → {relation.toName}</span>
                    <span>{relation.stanceName}</span>
                  </li>
                ))}
                {status.politics.agreements.map((agreement) => (
                  <li key={agreement.agreementId}>
                    <span>{agreement.name}</span>
                    <span>{agreement.status}</span>
                  </li>
                ))}
                {status.politics.laws.map((law) => (
                  <li key={law.lawId}>
                    <span>{law.name}</span>
                    <span>{law.jurisdictionLocationId}</span>
                  </li>
                ))}
                {status.politics.influence.map((entry) => (
                  <li key={entry.factionName}>
                    <span>{entry.factionName}</span>
                    <span>{entry.amount}</span>
                  </li>
                ))}
              </ul>
            )}
            {status.politicsActions.length > 0 ? (
              <div className="action-card-list">
                {status.politicsActions.map((action) => (
                  <article key={action.actionId} className={action.available ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{action.label}</h3>
                        <span>{action.available ? 'Disponível' : 'Bloqueada'}</span>
                      </div>
                      <p>{action.hint}</p>
                      <div className="action-card__footer">
                        <small>{action.blockedReason ?? `Custa ${formatPeriodCost(action.costPeriods)}`}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={!action.available}
                          onClick={() => onAction({ type: 'politics.act', actionId: action.actionId })}
                        >
                          Executar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </details>
        </> : null}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending ? `Treinar: ${pending.name}` : ''}
        message={
          pending
            ? `${pending.targetLabel}. Custa ${formatPeriodCost(pending.costPeriods)}. ${pending.effectsSummary.join('. ')}.`
            : ''
        }
        confirmLabel="Confirmar treino"
        onConfirm={() => {
          if (pending) {
            onAction({ type: 'training.train', methodId: pending.methodId });
            setPending(null);
          }
        }}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pendingGarden !== null}
        title={gardenRecipe?.name ? `Cultivar: ${gardenRecipe.name}` : 'Cultivar integração'}
        message={
          gardenRecipe?.cost
            ? `Custa ${gardenRecipe.cost.cultivationPoints} ponto${gardenRecipe.cost.cultivationPoints === 1 ? '' : 's'} de cultivo e ${formatPeriodCost(gardenRecipe.cost.timeCost.periods)}. A integração é permanente neste recorte.`
            : 'A integração consome cultivo e tempo.'
        }
        confirmLabel="Confirmar cultivo"
        onConfirm={() => {
          if (pendingGarden) {
            onAction({ type: 'garden.cultivate', recipeId: pendingGarden });
            setPendingGarden(null);
          }
        }}
        onCancel={() => setPendingGarden(null)}
      />
      <ConfirmDialog
        open={pendingPatent !== null}
        title={patent?.name ? `Reivindicar: ${patent.name}` : 'Reivindicar patente'}
        message={
          patent
            ? `${patent.description} A patente permanece separada do nível, do ranking e de qualquer título.`
            : 'O Registro avalia os requisitos desta patente.'
        }
        confirmLabel="Confirmar reivindicação"
        onConfirm={() => {
          if (pendingPatent) {
            onAction({ type: 'registry.claim', patentId: pendingPatent });
            setPendingPatent(null);
          }
        }}
        onCancel={() => setPendingPatent(null)}
      />
    </div>
  );
}

function SystemIdentity({
  state,
  campaign,
  abilityName,
}: {
  state: GameState;
  campaign: Campaign;
  abilityName: string;
}) {
  return (
    <div className="system-identity">
      <div className="system-identity__profile">
        <span className="character-card__avatar" aria-hidden="true">♙</span>
        <div><span className="section-kicker">Sobrevivente</span><strong>{state.character.firstName} {state.character.lastName}</strong><small>{abilityName}</small></div>
      </div>
      <AttributeSummary attributes={state.attributes} />
      {state.relationships.length > 0 ? (
        <section className="character-trust" aria-labelledby="character-trust-title">
          <div className="section-heading"><h2 id="character-trust-title">Confiança</h2><span className="section-count">{state.relationships.length}</span></div>
        <ul className="relationship-list" aria-label="Confiança residual">
          {state.relationships.map((relationship) => (
            <li key={relationship.characterId}>
              <span className="relationship-list__avatar" aria-hidden="true">♙</span>
              <div><strong>{findNpc(campaign, relationship.characterId)?.name ?? relationship.characterId}</strong><span>Confiança residual</span></div>
              <strong>{relationship.trust}</strong>
            </li>
          ))}
        </ul>
        </section>
      ) : null}
    </div>
  );
}

function EmptyAction({ message }: { message: string }) {
  return <p className="empty-action">{message}</p>;
}

function itemGlyph(id: string): string {
  if (id.includes('water') || id.includes('agua') || id.includes('spring')) return '◒';
  if (id.includes('meat') || id.includes('rabbit')) return '♨';
  if (id.includes('campfire') || id.includes('cook')) return '♨';
  if (id.includes('branch') || id.includes('stick') || id.includes('galho')) return '⌁';
  if (id.includes('hide') || id.includes('cloth')) return '▧';
  if (id.includes('horn') || id.includes('bone')) return '◇';
  if (id.includes('fruit') || id.includes('fruto')) return '●';
  return '◆';
}
