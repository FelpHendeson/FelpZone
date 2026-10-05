import catalogJson from '../../../content/first-day/system/bestiary.json' with { type: 'json' };
import type { GameState } from '../../core/state/types';
import {
  INITIAL_COMBAT,
  type CombatEnvironment,
  type CombatFieldEffect,
  type EncounterDefinition,
  type IndexedCombat,
} from '../combat';

/**
 * Bestiário: o que o Desperto aprendeu de cada criatura. Os níveis são derivados de contadores
 * aditivos no save e do que já foi revelado no mundo; o texto vem do pack.
 */
export interface BestiaryEntryDefinition {
  combatantId: string;
  region: string;
  /** Nível 1 (avistada). */
  summary: string;
  /** Nível 2 (enfrentada). */
  lore: string;
  /** Nível 3 (estudada): o repertório da criatura. */
  study: string;
  /** Nível 4 (dominada): o padrão de comportamento. */
  pattern: string;
  /** Comentário de alguém que o Desperto já conheceu, no nível 4. */
  note?: { npcId: string; text: string };
}

export interface IndexedBestiary {
  readonly entries: readonly BestiaryEntryDefinition[];
  readonly byCombatantId: ReadonlyMap<string, BestiaryEntryDefinition>;
  readonly masteryVictories: number;
}

export interface BestiaryRecord {
  encounters: number;
  victories: number;
  /** Ações que a criatura já mostrou em confronto (derivadas do replay). */
  actionsSeen: string[];
}

export interface BestiaryState {
  entries: Record<string, BestiaryRecord>;
}

export type BestiaryLevel = 0 | 1 | 2 | 3 | 4;

export const BESTIARY_LEVEL_NAMES: Record<BestiaryLevel, string> = {
  0: 'Desconhecida',
  1: 'Avistada',
  2: 'Enfrentada',
  3: 'Estudada',
  4: 'Dominada',
};

export type BestiaryInspection<T> = { ok: true; value: T } | { ok: false; reason: string };

export function inspectBestiaryCatalog(value: unknown, combat: IndexedCombat = INITIAL_COMBAT): BestiaryInspection<IndexedBestiary> {
  const fail = (reason: string) => ({ ok: false as const, reason });
  if (!isRecord(value) || !Array.isArray(value.entries) || !isRecord(value.rules)) return fail('O catálogo do Bestiário é inválido.');
  const masteryVictories = value.rules.masteryVictories;
  if (!Number.isSafeInteger(masteryVictories) || (masteryVictories as number) < 1 || (masteryVictories as number) > 20) {
    return fail('As regras do Bestiário são inválidas.');
  }
  const entries: BestiaryEntryDefinition[] = [];
  for (const entry of value.entries) {
    if (
      !isRecord(entry) ||
      typeof entry.combatantId !== 'string' ||
      !combat.combatantById.has(entry.combatantId) ||
      entries.some((existing) => existing.combatantId === entry.combatantId) ||
      ![entry.region, entry.summary, entry.lore, entry.study, entry.pattern].every(nonEmpty)
    ) {
      return fail('Uma ficha do Bestiário é inválida ou repetida.');
    }
    const note = entry.note;
    if (note !== undefined && (!isRecord(note) || !nonEmpty(note.npcId) || !nonEmpty(note.text))) {
      return fail('A nota de uma ficha do Bestiário é inválida.');
    }
    entries.push({
      combatantId: entry.combatantId,
      region: entry.region as string,
      summary: entry.summary as string,
      lore: entry.lore as string,
      study: entry.study as string,
      pattern: entry.pattern as string,
      ...(isRecord(note) ? { note: { npcId: note.npcId as string, text: note.text as string } } : {}),
    });
  }
  return {
    ok: true,
    value: Object.freeze({
      entries: Object.freeze(entries),
      byCombatantId: new Map(entries.map((entry) => [entry.combatantId, entry])),
      masteryVictories: masteryVictories as number,
    }),
  };
}

export function indexBestiaryCatalog(value: unknown, combat?: IndexedCombat): IndexedBestiary {
  const inspected = inspectBestiaryCatalog(value, combat);
  if (!inspected.ok) throw new Error(inspected.reason);
  return inspected.value;
}

export const INITIAL_BESTIARY = indexBestiaryCatalog(catalogJson);

export function createInitialBestiaryState(): BestiaryState {
  return { entries: {} };
}

export function copyBestiaryState(state: BestiaryState): BestiaryState {
  return {
    entries: Object.fromEntries(
      Object.entries(state.entries).map(([id, record]) => [id, { ...record, actionsSeen: [...record.actionsSeen] }]),
    ),
  };
}

const COUNTER_LIMIT = 1_000_000;

export function inspectBestiaryState(value: unknown, combat: IndexedCombat = INITIAL_COMBAT): BestiaryInspection<BestiaryState> {
  const fail = { ok: false as const, reason: 'O Bestiário do salvamento é inválido.' };
  if (!isRecord(value) || !isRecord(value.entries)) return fail;
  const entries: Record<string, BestiaryRecord> = {};
  for (const [id, record] of Object.entries(value.entries)) {
    const combatant = combat.combatantById.get(id);
    if (!combatant || !isRecord(record)) return fail;
    const counter = (entry: unknown) => Number.isSafeInteger(entry) && (entry as number) >= 0 && (entry as number) <= COUNTER_LIMIT;
    if (!counter(record.encounters) || !counter(record.victories) || (record.victories as number) > (record.encounters as number)) return fail;
    if (!Array.isArray(record.actionsSeen)) return fail;
    const seen = new Set<string>();
    for (const actionId of record.actionsSeen) {
      if (typeof actionId !== 'string' || seen.has(actionId) || !combatant.actionIds.includes(actionId)) return fail;
      seen.add(actionId);
    }
    entries[id] = { encounters: record.encounters as number, victories: record.victories as number, actionsSeen: [...seen] };
  }
  return { ok: true, value: { entries } };
}

/** Registra um confronto do mundo: cada criatura do encontro conta; o oponente principal mostra suas ações. */
export function recordBestiaryCombat(
  state: BestiaryState | undefined,
  encounter: EncounterDefinition,
  combat: { outcome: string; foeActionIds: readonly string[] },
  catalog: IndexedCombat = INITIAL_COMBAT,
): BestiaryState {
  const next = copyBestiaryState(state ?? createInitialBestiaryState());
  for (const combatantId of [encounter.opponentId, ...(encounter.additionalOpponentIds ?? [])]) {
    const record = next.entries[combatantId] ?? { encounters: 0, victories: 0, actionsSeen: [] };
    record.encounters = Math.min(COUNTER_LIMIT, record.encounters + 1);
    if (combat.outcome === 'victory') record.victories = Math.min(record.encounters, record.victories + 1);
    if (combatantId === encounter.opponentId) {
      const known = catalog.combatantById.get(combatantId)?.actionIds ?? [];
      for (const actionId of combat.foeActionIds) {
        if (known.includes(actionId) && !record.actionsSeen.includes(actionId)) record.actionsSeen.push(actionId);
      }
    }
    next.entries[combatantId] = record;
  }
  return next;
}

/** Algum encontro com a criatura já foi revelado pelo mundo (pistas descobertas). */
export function isCreatureSighted(state: Pick<GameState, 'sandbox'>, combatantId: string, combat: IndexedCombat = INITIAL_COMBAT): boolean {
  const revealed = new Set(state.sandbox.exploration.locations.flatMap((location) => location.revealedDiscoveryIds));
  return combat.encounters.some(
    (encounter) =>
      (encounter.opponentId === combatantId || (encounter.additionalOpponentIds ?? []).includes(combatantId)) &&
      encounter.requiredDiscoveryIds.every((id) => revealed.has(id)),
  );
}

/** Nível de conhecimento: avistada, enfrentada, estudada (viu todas as ações) e dominada. */
export function bestiaryLevel(
  state: Pick<GameState, 'sandbox' | 'system'> & { bestiary?: BestiaryState },
  combatantId: string,
  catalog: IndexedBestiary = INITIAL_BESTIARY,
  combat: IndexedCombat = INITIAL_COMBAT,
): BestiaryLevel {
  const record = state.bestiary?.entries[combatantId];
  if (!record || record.encounters === 0) return isCreatureSighted(state, combatantId, combat) ? 1 : 0;
  const actions = combat.combatantById.get(combatantId)?.actionIds ?? [];
  const studied = actions.every((actionId) => record.actionsSeen.includes(actionId));
  const senses = state.system.entries.some((entry) => entry.skillId === 'sharpened-senses');
  if (studied && (record.victories >= catalog.masteryVictories || (record.victories >= 1 && senses))) return 4;
  return studied ? 3 : 2;
}

/** O que o Bestiário muda no confronto: quem domina a criatura lê uma ação a mais. */
export function bestiaryFieldEffects(
  state: Pick<GameState, 'sandbox' | 'system'> & { bestiary?: BestiaryState },
  encounter: EncounterDefinition,
  catalog: IndexedBestiary = INITIAL_BESTIARY,
  combat: IndexedCombat = INITIAL_COMBAT,
): CombatFieldEffect[] {
  if (bestiaryLevel(state, encounter.opponentId, catalog, combat) < 4) return [];
  const name = combat.combatantById.get(encounter.opponentId)?.name ?? encounter.opponentId;
  return [{ id: 'bestiary-pattern', label: `Bestiário: você conhece o padrão de ${name} — a leitura mostra uma ação a mais`, side: 'player', intent: 1 }];
}

/** Ambiente do confronto com o que o Bestiário acrescenta. */
export function withBestiary(
  environment: CombatEnvironment,
  state: Pick<GameState, 'sandbox' | 'system'> & { bestiary?: BestiaryState },
  encounter: EncounterDefinition,
): CombatEnvironment {
  const extra = bestiaryFieldEffects(state, encounter);
  return extra.length === 0 ? environment : { label: environment.label, effects: [...environment.effects, ...extra] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
