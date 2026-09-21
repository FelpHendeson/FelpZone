import type { SandboxCoreState, SandboxState } from '../../modules/sandbox/types';
import type { ObjectivesState } from '../../modules/objectives/types';
import type { SkillsProgressState } from '../../modules/skills/types';
import type { ItemsState } from '../../modules/items/types';
import type { PersistentConditionState } from '../../modules/conditions/types';
import type { GardenState } from '../../modules/garden/types';
import type { NPCsState } from '../../modules/npcs/types';
import type { InteractablesState } from '../../modules/interactables/types';
import type { BondsState } from '../../modules/bonds/types';
import type { RegistryState } from '../../modules/registry/types';
import type { OrganizationsState } from '../../modules/organizations/types';
import type { ExecutionState } from '../../modules/execution/types';
import type { PartyState } from '../../modules/party/types';
import type { CalendarState } from '../../modules/calendar/types';
import type { FamilyState } from '../../modules/family/types';
import type { CivicState } from '../../modules/civic/types';
import type { EconomyState } from '../../modules/economy/types';
import type { SettlementsState } from '../../modules/settlements/types';
import type { PoliticsState } from '../../modules/politics/types';
import { DEFAULT_PERIODS } from '../../modules/time';

export const SCHEMA_VERSION_V1 = 1 as const;
export const SCHEMA_VERSION_V2 = 2 as const;
export const SCHEMA_VERSION_V3 = 3 as const;
export const SCHEMA_VERSION_V4 = 4 as const;
export const SCHEMA_VERSION_V5 = 5 as const;
export const SCHEMA_VERSION_V6 = 6 as const;
export const SCHEMA_VERSION_V7 = 7 as const;
export const SCHEMA_VERSION_V8 = 8 as const;
export const SCHEMA_VERSION_V9 = 9 as const;
export const SCHEMA_VERSION_V10 = 10 as const;
export const SCHEMA_VERSION_V11 = 11 as const;
export const SCHEMA_VERSION_V12 = 12 as const;
export const SCHEMA_VERSION_V13 = 13 as const;
export const SCHEMA_VERSION_V14 = 14 as const;
export const SCHEMA_VERSION_V15 = 15 as const;
export const SCHEMA_VERSION_V16 = 16 as const;
export const SCHEMA_VERSION_V17 = 17 as const;
export const SCHEMA_VERSION_V18 = 18 as const;
export const SCHEMA_VERSION_V19 = 19 as const;
export const SCHEMA_VERSION_V20 = 20 as const;
export const SCHEMA_VERSION_V21 = 21 as const;
export const SCHEMA_VERSION_V22 = 22 as const;
export const SCHEMA_VERSION_V23 = 23 as const;
export const SCHEMA_VERSION = 24 as const;

export const MIGRATED_CAMPAIGN_ID = 'first-day';

export type GameStatus = 'playing' | 'completed';

export const LEGACY_ATTRIBUTE_IDS = ['saude', 'energia', 'fome', 'humanidade', 'cautela'] as const;
export const ATTRIBUTE_IDS = ['saude', 'energia', 'fome', 'sede', 'humanidade', 'cautela'] as const;

export type AttributeId = (typeof ATTRIBUTE_IDS)[number];

export type DayPeriod = (typeof DEFAULT_PERIODS)[number]['id'];

export const DAY_PERIODS: readonly DayPeriod[] = DEFAULT_PERIODS.map((period) => period.id);

export function isAttributeId(value: unknown): value is AttributeId {
  return (ATTRIBUTE_IDS as readonly string[]).includes(value as string);
}

export function isDayPeriod(value: unknown): value is DayPeriod {
  return typeof value === 'string' && (DAY_PERIODS as readonly string[]).includes(value);
}

export interface LegacyAttributes {
  saude: number;
  energia: number;
  fome: number;
  humanidade: number;
  cautela: number;
}

export interface Attributes extends LegacyAttributes {
  sede: number;
}

export const CHARACTER_SEXES = ['male', 'female', 'unspecified'] as const;
export type CharacterSex = (typeof CHARACTER_SEXES)[number];

export interface LegacyCharacterIdentity {
  firstName: string;
  lastName: string;
}

export interface CharacterIdentity extends LegacyCharacterIdentity {
  sex: CharacterSex;
}

export interface CharacterIdentityInput extends LegacyCharacterIdentity {
  sex?: CharacterSex;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface Relationship {
  characterId: string;
  trust: number;
}

export interface WorldState {
  day: number;
  period: DayPeriod;
}

export interface ProgressionState {
  abilityIds: string[];
  titleIds: string[];
}

export interface HistoryEntry {
  eventId: string;
  eventTitle: string;
  choiceId: string;
  choiceLabel: string;
  notable: boolean;
}

export interface NarrativeSession {
  campaignId: string;
  eventId: string;
}

interface SharedState<TAttributes> {
  status: GameStatus;
  character: LegacyCharacterIdentity;
  attributes: TAttributes;
  inventory: InventoryItem[];
  relationships: Relationship[];
  flags: Record<string, boolean>;
  history: HistoryEntry[];
  world: WorldState;
  progression: ProgressionState;
  updatedAt: string;
}

export interface GameStateV1 extends SharedState<LegacyAttributes> {
  schemaVersion: typeof SCHEMA_VERSION_V1;
  currentEventId: string;
}

export interface GameStateV2 extends SharedState<LegacyAttributes> {
  schemaVersion: typeof SCHEMA_VERSION_V2;
  currentEventId: string;
  sandbox: SandboxCoreState;
}

export interface GameStateV3 extends SharedState<LegacyAttributes> {
  schemaVersion: typeof SCHEMA_VERSION_V3;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxCoreState;
}

export interface GameStateV4 extends SharedState<LegacyAttributes> {
  schemaVersion: typeof SCHEMA_VERSION_V4;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState;
}

export interface GameStateV5 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V5;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState;
}

export interface GameStateV6 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V6;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState;
  objectives: ObjectivesState;
}

export interface GameStateV7 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V7;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState;
  objectives: ObjectivesState;
  system: SkillsProgressState;
}

export interface GameStateV8 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V8;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState;
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
}

export interface GameStateV9 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V9;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState;
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
}

export interface GameStateV10 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V10;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState;
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
}

export interface GameStateV11 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V11;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
}

export interface GameStateV12 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V12;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
}

export interface GameStateV13 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V13;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
}

export interface GameStateV14 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V14;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
  registry: RegistryState;
}

export interface GameStateV15 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V15;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
  registry: RegistryState;
  organizations: OrganizationsState;
}

export interface GameStateV16 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V16;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
  registry: RegistryState;
  organizations: OrganizationsState;
  execution: ExecutionState;
}

export interface GameStateV17 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V17;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
  registry: RegistryState;
  organizations: OrganizationsState;
  execution: ExecutionState;
  party: PartyState;
}

export interface GameStateV18 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V18;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
  registry: RegistryState;
  organizations: OrganizationsState;
  execution: ExecutionState;
  party: PartyState;
  calendar: CalendarState;
}

export interface GameStateV19 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V19;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
  registry: RegistryState;
  organizations: OrganizationsState;
  execution: ExecutionState;
  party: PartyState;
  calendar: CalendarState;
  family: FamilyState;
}

export interface GameStateV20 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V20;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
  registry: RegistryState;
  organizations: OrganizationsState;
  execution: ExecutionState;
  party: PartyState;
  calendar: CalendarState;
  family: FamilyState;
  civic: CivicState;
}

export interface GameStateV21 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V21;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
  registry: RegistryState;
  organizations: OrganizationsState;
  execution: ExecutionState;
  party: PartyState;
  calendar: CalendarState;
  family: FamilyState;
  civic: CivicState;
  economy: EconomyState;
}

export interface GameStateV22 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V22;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
  registry: RegistryState;
  organizations: OrganizationsState;
  execution: ExecutionState;
  party: PartyState;
  calendar: CalendarState;
  family: FamilyState;
  civic: CivicState;
  economy: EconomyState;
  settlements: SettlementsState;
}

export interface GameStateV23 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V23;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
  registry: RegistryState;
  organizations: OrganizationsState;
  execution: ExecutionState;
  party: PartyState;
  calendar: CalendarState;
  family: FamilyState;
  civic: CivicState;
  economy: EconomyState;
  settlements: SettlementsState;
  politics: PoliticsState;
}

export interface GameState extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION;
  character: CharacterIdentity;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState & { npcs: NPCsState; interactables: InteractablesState };
  objectives: ObjectivesState;
  system: SkillsProgressState;
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
  registry: RegistryState;
  organizations: OrganizationsState;
  execution: ExecutionState;
  party: PartyState;
  calendar: CalendarState;
  family: FamilyState;
  civic: CivicState;
  economy: EconomyState;
  settlements: SettlementsState;
  politics: PoliticsState;
}
