import type { ArchetypeProgressState } from '../../modules/archetypes/branch';
import type { ComboDiscoveryState } from '../../modules/combat/combos';
import type { BestiaryState } from '../../modules/bestiary';
import type { MarksState } from '../../modules/marks';
import type { EchoesState } from '../../modules/echoes';
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
import type { GuidanceState } from '../../modules/guidance/types';
import type { ContextualActivitiesState } from '../../modules/activities/types';
import type { ChanceState } from '../../modules/chance/types';
import type { StoryState } from '../../modules/story/types';
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
export const SCHEMA_VERSION_V24 = 24 as const;
export const SCHEMA_VERSION_V25 = 25 as const;
export const SCHEMA_VERSION_V26 = 26 as const;
export const SCHEMA_VERSION_V27 = 27 as const;
export const SCHEMA_VERSION = 28 as const;

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

/**
 * Retrato escolhido na criação: silhueta montável (índices de tom de pele, corte e cor do
 * cabelo) ou imagem própria guardada só no aparelho (`custom`). Opcional e aditivo.
 */
export type PortraitConfig =
  | { kind: 'silhouette'; skin: number; hair: number; hairColor: number }
  | { kind: 'custom' }
  /** Retrato pronto do pack; se o pack não o tiver mais, a interface mostra o busto padrão. */
  | { kind: 'preset'; id: string };

export interface CharacterIdentity extends LegacyCharacterIdentity {
  sex: CharacterSex;
  /** Arquétipo de aprendiz escolhido na criação (opcional: saves antigos não têm). */
  archetypeId?: string;
  portrait?: PortraitConfig;
}

export interface CharacterIdentityInput extends LegacyCharacterIdentity {
  sex?: CharacterSex;
  archetypeId?: string;
  portrait?: PortraitConfig;
}

export const PORTRAIT_OPTION_COUNT = 6;

export const PORTRAIT_PRESET_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function isPortraitConfig(value: unknown): value is PortraitConfig {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.kind === 'custom') return Object.keys(record).length === 1;
  if (record.kind === 'preset') return Object.keys(record).length === 2 && typeof record.id === 'string' && PORTRAIT_PRESET_ID.test(record.id);
  const index = (entry: unknown) => typeof entry === 'number' && Number.isSafeInteger(entry) && entry >= 0 && entry < PORTRAIT_OPTION_COUNT;
  return record.kind === 'silhouette' && index(record.skin) && index(record.hair) && index(record.hairColor);
}

/** Copia a identidade preservando os campos opcionais. */
export function copyCharacterIdentity(character: CharacterIdentity): CharacterIdentity {
  return {
    firstName: character.firstName,
    lastName: character.lastName,
    sex: character.sex,
    ...(character.archetypeId ? { archetypeId: character.archetypeId } : {}),
    ...(character.portrait ? { portrait: { ...character.portrait } } : {}),
  };
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
  /** Porções que restam na unidade já aberta (consumo parcial). Ausente = nenhuma aberta. */
  openPortions?: number;
}

export interface Relationship {
  characterId: string;
  trust: number;
}

export interface WorldState {
  day: number;
  period: DayPeriod;
  /** Minuto do dia (0–1439). Ausente em saves antigos: vale o início do período. */
  minute?: number;
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

export interface GameStateV24 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V24;
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

export interface GameStateV25 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V25;
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
  guidance: GuidanceState;
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
  guidance: GuidanceState;
  activities: ContextualActivitiesState;
  /** Semente e cursor da sorte (schema 27): sorteios são reproduzíveis e não se repetem ao recarregar. */
  rng: ChanceState;
  /** Dia de abertura de cada capítulo (schema 28): capítulos avançam por cena-chave, com prazo relativo. */
  story: StoryState;
  /** Duelos de Ecos (opcional e aditivo: saves sem duelos não têm o campo). */
  echoes?: EchoesState;
  /** Galho do arquétipo: técnicas aprendidas e hábitos de combate (opcional e aditivo). */
  archetypeProgress?: ArchetypeProgressState;
  /** Combos de rodada já descobertos (opcional e aditivo). */
  combos?: ComboDiscoveryState;
  /** Bestiário: confrontos, vitórias e ações vistas por criatura (opcional e aditivo). */
  bestiary?: BestiaryState;
  /** Marcas deixadas e recebidas de outros Despertos (opcional e aditivo). */
  marks?: MarksState;
}

export interface GameStateV26 extends Omit<GameState, 'schemaVersion' | 'rng' | 'story'> {
  schemaVersion: typeof SCHEMA_VERSION_V26;
}

export interface GameStateV27 extends Omit<GameState, 'schemaVersion' | 'story'> {
  schemaVersion: typeof SCHEMA_VERSION_V27;
}
