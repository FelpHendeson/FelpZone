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
  type CombatStyle,
} from '../../modules/combat';
import {
  allySnapshots,
  listCompanionOrderViews,
} from '../../modules/party';
import { buildCombatLoadout } from '../../modules/equipment';
import { withArchetypeBonus } from '../../modules/archetypes';
import { INITIAL_WEATHER, combatEnvironmentFor, weatherFor } from '../../modules/weather';
import { INITIAL_BESTIARY, bestiaryLevel, withBestiary } from '../../modules/bestiary';
import { BestiaryPanel } from './exploration/BestiaryPanel';
import { CombatScreen } from './CombatScreen';
import { EchoesPanel, type EchoDuelMode } from './exploration/EchoesPanel';
import {
  ECHO_STYLE_LABELS,
  createEchoSeal,
  createInitialEchoesState,
  echoSealId,
  encodeEchoResult,
  hasWonAnyConfrontation,
  startEchoDuel,
  type EchoDuelRecord,
  type EchoSeal,
} from '../../modules/echoes';
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
import { DomainPanel } from './exploration/DomainPanel';
import { SettingsPanel } from './exploration/SettingsPanel';
import { HintAlert } from '../components/SystemHints';
import { TourOverlay } from '../components/Tour';
import { FIRST_TOUR, isTourDone, markTourDone } from '../tour';
import { setClockContext } from '../clock';
import { archetypeOf } from '../silhouettes';
import { worldMinute } from '../../modules/world';
import { usePreferences } from '../preferences';
import { deriveSystemHints, type HintAction } from '../system-hints';
import { currentChapter } from '../sandbox';
import type { IndexedWorldTriggers } from '../../modules/world-events';
import { ChroniclePanel } from './exploration/ChroniclePanel';
import { notableHistory } from '../../modules/narrative';
import { DetailScreen, type DomainView, type GameView } from './exploration/shared';
import { requireActiveCatalog } from './exploration/helpers';
import {
  listUnlockedGuidanceTopics,
  listUnseenGuidanceTopics,
} from '../../modules/guidance';
import { GuidancePanel } from './exploration/GuidancePanel';

interface ExplorationScreenProps {
  state: GameState;
  campaign: Campaign;
  context: SandboxContext;
  feedback?: WorldFeedbackView | null;
  actionPending?: boolean;
  onAction: (action: SandboxAction) => void;
  onResolveCombat: (encounterId: string, finalState: CombatState) => void;
  onGuidanceSeen: (topicId: string) => void;
  onExit: () => void;
  worldTriggers?: IndexedWorldTriggers;
  onRecordEcho?: (record: EchoDuelRecord, resultId?: string) => void;
}

function bottomTabFor(view: GameView): GameTab {
  if (view === 'map' || view === 'people') {
    return 'world';
  }
  if (view === 'relationships' || view === 'progression' || view === 'registry' || view === 'society' || view === 'family' || view === 'domain' || view === 'help' || view === 'chronicle' || view === 'settings' || view === 'echoes' || view === 'bestiary' || isDomainView(view)) {
    return 'menu';
  }
  return view;
}

const DOMAIN_SECTIONS: Record<DomainView, 'territory' | 'economy' | 'politics'> = {
  'domain-territory': 'territory',
  'domain-economy': 'economy',
  'domain-politics': 'politics',
};

function isDomainView(view: GameView): view is DomainView {
  return view in DOMAIN_SECTIONS;
}

export function ExplorationScreen({
  state,
  campaign,
  context,
  feedback,
  actionPending = false,
  onAction,
  onResolveCombat,
  onGuidanceSeen,
  onExit,
  worldTriggers,
  onRecordEcho,
}: ExplorationScreenProps) {
  const preferences = usePreferences();
  setClockContext(state.world, preferences.clockFormat);
  const [tourOpen, setTourOpen] = useState(() => !isTourDone());
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<GameView>('world');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [trackedJourneyId, setTrackedJourneyId] = useState<string | null>(null);
  const [combatEncounterId, setCombatEncounterId] = useState<string | null>(null);
  const [helpTopicId, setHelpTopicId] = useState<string | null>(null);
  const [guidancePopupDismissed, setGuidancePopupDismissed] = useState(false);
  const [echoStyle, setEchoStyle] = useState<CombatStyle>(readEchoStyle);
  const [duel, setDuel] = useState<{ rival: EchoSeal; mode: EchoDuelMode; start: CombatState } | null>(null);
  const [pendingResultCode, setPendingResultCode] = useState<string | null>(null);
  const currentLocationId = state.sandbox.navigation.currentLocationId;
  const revealedDiscoveryIds =
    state.sandbox.exploration.locations.find((location) => location.locationId === currentLocationId)
      ?.revealedDiscoveryIds ?? [];
  const combat = requireActiveCatalog(context.combat, 'combate');
  const items = requireActiveCatalog(context.items, 'itens');
  const party = requireActiveCatalog(context.party, 'party');
  const organizations = requireActiveCatalog(context.organizations, 'organizações');
  const guidance = requireActiveCatalog(context.guidance, 'orientação');
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

  const mySeal = createEchoSeal(
    combat,
    {
      name: `${state.character.firstName} ${state.character.lastName}`,
      knownSkillIds: state.system.entries.map((entry) => entry.skillId),
      archetypeId: state.character.archetypeId,
      progress: state.archetypeProgress,
    },
    echoStyle,
  );

  if (duel) {
    const hotSeat = duel.mode === 'hot-seat';
    return (
      <CombatScreen
        initialState={duel.start}
        encounterName={`${mySeal.name} × ${duel.rival.name}`}
        tint={archetypeOf(state.character.archetypeId)?.palette.primary}
        opponentTint={archetypeOf(duel.rival.archetypeId)?.palette.primary}
        discoveredCombos={state.combos?.discovered}
        kicker={hotSeat ? 'Prova do Eco · mesma tela' : `Prova do Eco · Eco ${ECHO_STYLE_LABELS[duel.rival.style].toLowerCase()}`}
        combat={combat}
        conditions={context.conditions}
        execution={context.execution}
        control={
          hotSeat
            ? { kind: 'hot-seat', playerLabel: state.character.firstName, opponentLabel: duel.rival.name }
            : { kind: 'ai', style: duel.rival.style }
        }
        finishLabel="Voltar aos Ecos"
        resultDetail={(final) =>
          final.outcome === 'victory'
            ? `O Registro anota a vitória sobre ${duel.rival.name}. Nada muda no seu corpo: a Prova do Eco não fere de verdade.`
            : final.outcome === 'defeat'
              ? `${duel.rival.name} venceu desta vez. A Prova do Eco não fere de verdade.`
              : 'Você recuou da Prova. O Registro anota a desistência.'
        }
        onFinish={(final) => {
          const outcome = final.outcome === 'ongoing' ? 'fled' : final.outcome;
          onRecordEcho?.({ rivalId: echoSealId(duel.rival), rivalName: duel.rival.name, outcome, kind: duel.mode, day: state.world.day });
          setPendingResultCode(duel.mode === 'challenge' ? encodeEchoResult(mySeal, duel.rival, final) : null);
          setDuel(null);
          setActiveView('echoes');
        }}
      />
    );
  }

  if (combatEncounterId) {
    const encounter = encounters.find((entry) => entry.id === combatEncounterId)
      ?? combat.encounters.find((entry) => entry.id === combatEncounterId);
    const portrait = withArchetypeBonus(buildCombatLoadout(items, state.items), state);
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
      playerRoundTicks: portrait.roundTicks,
      environment: encounter
        ? withBestiary(combatEnvironmentFor(state, INITIAL_WEATHER, context.calendar), state, encounter)
        : combatEnvironmentFor(state, INITIAL_WEATHER, context.calendar),
    });
    return (
      <CombatScreen
        initialState={initialCombat}
        encounterName={encounter?.name ?? 'Confronto'}
        tint={archetypeOf(state.character.archetypeId)?.palette.primary}
        discoveredCombos={state.combos?.discovered}
        studied={encounter ? bestiaryLevel(state, encounter.opponentId) >= 3 : false}
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
  const unlockedGuidance = listUnlockedGuidanceTopics(guidance, state.guidance);
  const unseenGuidance = listUnseenGuidanceTopics(guidance, state.guidance);
  const popupGuidance = guidancePopupDismissed
    ? null
    : unseenGuidance.find((topic) => topic.popupOnUnlock !== false) ?? null;
  const hints = preferences.guidanceLevel === 'off' ? [] : deriveSystemHints({ state, view, journal, triggers: worldTriggers });
  const alertKey = (id: string) => `${id}@${state.world.day}-${state.world.period}`;
  const urgentHint =
    preferences.guidanceLevel === 'guided' && !tourOpen && !popupGuidance
      ? hints.find((hint) => hint.priority === 'urgente' && !dismissedAlerts.includes(alertKey(hint.id))) ?? null
      : null;
  const chapter = currentChapter(state.flags);
  const handleHintAction = (action: HintAction) => {
    if (action.kind === 'sandbox') onAction(action.action);
    else if (action.kind === 'navigate') setActiveView(action.view);
    else setActionsOpen(true);
  };

  return (
    <main className="screen screen--exploration">
      <GameHud
        characterName={view.characterName}
        worldLabel={view.calendarLabel}
        clock={{ day: state.world.day, minute: worldMinute(state.world), format: preferences.clockFormat }}
        chapterLabel={chapter ? `Capítulo ${chapter.number} · ${chapter.title}` : undefined}
        attributes={state.attributes}
        portrait={state.character.portrait}
        archetypeId={state.character.archetypeId}
        rankTitle={status.archetype.title}
        weather={weatherFor(INITIAL_WEATHER, state.rng.seed, state.world.day, context.calendar)}
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
              hints={preferences.guidanceLevel === 'off' ? undefined : hints}
              onHintAction={handleHintAction}
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
              ability={{ name: view.abilityName, imageSrc: view.abilityImageSrc }}
              onAction={onAction}
              onBack={() => setActiveView('menu')}
            />
          ) : null}
          {activeView === 'registry' || activeView === 'society' || activeView === 'family' ? (
            <SystemPanel
              section={activeView}
              status={status}
              campaign={campaign}
              onAction={onAction}
              onBack={() => setActiveView('menu')}
            />
          ) : null}
          {activeView === 'settings' ? (
            <SettingsPanel
              clockFormat={preferences.clockFormat}
              guidanceLevel={preferences.guidanceLevel}
              onClockFormat={preferences.setClockFormat}
              onGuidanceLevel={preferences.setGuidanceLevel}
              onReplayTour={() => {
                setActiveView('world');
                setTourOpen(true);
              }}
              onBack={() => setActiveView('menu')}
            />
          ) : null}
          {activeView === 'chronicle' ? (
            <ChroniclePanel state={state} campaign={campaign} status={status} bonds={view.bonds} onBack={() => setActiveView('menu')} />
          ) : null}
          {activeView === 'domain' ? (
            <DomainPanel status={status} onNavigate={setActiveView} onBack={() => setActiveView('menu')} />
          ) : null}
          {isDomainView(activeView) ? (
            <SystemPanel
              section={DOMAIN_SECTIONS[activeView]}
              status={status}
              campaign={campaign}
              onAction={onAction}
              onBack={() => setActiveView('domain')}
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
          {activeView === 'help' ? (
            <GuidancePanel
              catalog={guidance}
              state={state.guidance}
              initialTopicId={helpTopicId}
              onSeen={onGuidanceSeen}
              onBack={() => setActiveView('menu')}
            />
          ) : null}
          {activeView === 'menu' ? (
            <GameMenuPanel
              status={status}
              view={view}
              campaign={campaign}
              onNavigate={setActiveView}
              guidanceCount={unlockedGuidance.length}
              guidanceUnseenCount={unseenGuidance.length}
              notableCount={notableHistory(state.history).length}
              echoesUnlocked={hasWonAnyConfrontation(state.flags)}
              echoRecords={state.echoes?.records.length ?? 0}
              bestiaryCount={INITIAL_BESTIARY.entries.filter((entry) => bestiaryLevel(state, entry.combatantId) > 0).length}
            />
          ) : null}
          {activeView === 'bestiary' ? <BestiaryPanel state={state} onBack={() => setActiveView('menu')} /> : null}
          {activeView === 'echoes' ? (
            <EchoesPanel
              combat={combat}
              mySeal={mySeal}
              echoes={state.echoes ?? createInitialEchoesState()}
              pendingResultCode={pendingResultCode}
              onStyle={(style) => {
                setEchoStyle(style);
                writeEchoStyle(style);
              }}
              onDuel={(rival, mode) => setDuel({ rival, mode, start: startEchoDuel(combat, mySeal, rival) })}
              onRecord={(record, resultId) => onRecordEcho?.({ ...record, day: state.world.day }, resultId)}
              onBack={() => setActiveView('menu')}
            />
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

      {popupGuidance ? (
        <AppDialog
          open
          title={popupGuidance.title}
          onClose={() => {
            setGuidancePopupDismissed(true);
            onGuidanceSeen(popupGuidance.id);
          }}
        >
          <p>{popupGuidance.summary}</p>
          <div className="button-stack">
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                setGuidancePopupDismissed(true);
                onGuidanceSeen(popupGuidance.id);
              }}
            >
              Entendi
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                setGuidancePopupDismissed(true);
                setHelpTopicId(popupGuidance.id);
                onGuidanceSeen(popupGuidance.id);
                setActiveView('help');
              }}
            >
              Ver detalhes
            </button>
          </div>
        </AppDialog>
      ) : null}

      <HintAlert
        hint={urgentHint}
        onAction={handleHintAction}
        onClose={() => {
          if (urgentHint) setDismissedAlerts((current) => [...current, alertKey(urgentHint.id)]);
        }}
      />

      {tourOpen && activeView === 'world' && !popupGuidance ? (
        <TourOverlay
          steps={FIRST_TOUR}
          onFinish={() => {
            markTourDone();
            setTourOpen(false);
          }}
        />
      ) : null}

      <BottomNavigation
        active={bottomTabFor(activeView)}
        inventoryCount={view.inventory.length}
        onChange={setActiveView}
      />
    </main>
  );
}

const ECHO_STYLE_KEY = 'reset.echo.style';

function readEchoStyle(): CombatStyle {
  try {
    const value = globalThis.localStorage?.getItem(ECHO_STYLE_KEY);
    return value === 'aggressive' || value === 'defensive' ? value : 'balanced';
  } catch {
    return 'balanced';
  }
}

function writeEchoStyle(style: CombatStyle): void {
  try {
    globalThis.localStorage?.setItem(ECHO_STYLE_KEY, style);
  } catch {
    // Preferência do aparelho: sem armazenamento, o Eco volta a Equilibrado.
  }
}
