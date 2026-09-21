import { useEffect, useState } from 'react';
import type { Campaign } from '../../core/events';
import type { GameState } from '../../core/state';
import type { SandboxContext } from '../../modules/sandbox';
import type { SandboxAction } from '../../modules/sandbox-actions';
import { buildSystemStatus } from '../../modules/system-interface';
import {
  createCombat,
  listAvailableEncounters,
  type CombatState,
} from '../../modules/combat';
import {
  allySnapshots,
  listCompanionOrderViews,
} from '../../modules/party';
import { buildCombatLoadout } from '../../modules/equipment';
import { CombatScreen } from './CombatScreen';
import { AppDialog } from '../components/AppDialog';
import { BottomNavigation, type GameTab } from '../components/BottomNavigation';
import { GameHud } from '../components/GameHud';
import { buildJournalView } from '../journal/model';
import { JournalPanel } from '../components/JournalPanel';
import { buildExplorationView, type WorldFeedbackView } from '../sandbox';
import { WorldFeedback } from './exploration/WorldFeedback';
import { WorldPanel, LocationMap } from './exploration/WorldPanel';
import { PeoplePanel } from './exploration/PeoplePanel';
import { RelationshipsPanel } from './exploration/RelationshipsPanel';
import { CharacterPanel } from './exploration/CharacterPanel';
import { GameMenuPanel } from './exploration/GameMenuPanel';
import { ActionsPanel } from './exploration/ActionsPanel';
import { InventoryPanel } from './exploration/InventoryPanel';
import { SystemPanel } from './exploration/SystemPanel';
import { DetailScreen, type GameView } from './exploration/shared';
import { requireActiveCatalog } from './exploration/helpers';

interface ExplorationScreenProps {
  state: GameState;
  campaign: Campaign;
  context: SandboxContext;
  feedback?: WorldFeedbackView | null;
  actionPending?: boolean;
  onAction: (action: SandboxAction) => void;
  onResolveCombat: (encounterId: string, finalState: CombatState) => void;
  onExit: () => void;
}

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
  const combat = requireActiveCatalog(context.combat, 'combate');
  const items = requireActiveCatalog(context.items, 'itens');
  const party = requireActiveCatalog(context.party, 'party');
  const organizations = requireActiveCatalog(context.organizations, 'organizações');
  const encounters = listAvailableEncounters(
    combat,
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
      ?? combat.encounters.find((entry) => entry.id === combatEncounterId);
    const portrait = buildCombatLoadout(items, state.items);
    const allies =
      encounter?.requiredOrganizationId === undefined
        ? []
        : allySnapshots(party, organizations, state.organizations, state.party);
    const initialCombat = createCombat(combat, combatEncounterId, {
      playerName: `${state.character.firstName} ${state.character.lastName}`,
      knownSkillIds: state.system.entries.map((entry) => entry.skillId),
      playerMaxHealth: state.attributes.saude,
      loadout: portrait.loadout,
      prepared: portrait.prepared,
      execution: state.execution,
      allies,
      runtime: { conditions: context.conditions, execution: context.execution },
    });
    return (
      <CombatScreen
        initialState={initialCombat}
        encounterName={encounter?.name ?? 'Confronto'}
        combat={combat}
        conditions={context.conditions}
        execution={context.execution}
        orderViews={
          allies.length === 0
            ? []
            : listCompanionOrderViews(party, organizations, state.organizations, state)
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
        {feedback ? <WorldFeedback feedback={feedback} /> : null}
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
