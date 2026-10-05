import {
  createDuel,
  duelActionBank,
  resolveRound,
  type CombatState,
  type CombatStyle,
  type IndexedCombat,
} from '../combat';

/**
 * Ecos — interação entre jogadores pela lore do Sistema. Cada Desperto deixa um *Eco*: o
 * Selo do Desperto guarda nome, habilidades conhecidas, banco de ações e estilo tático. Outro
 * jogador importa o Selo e enfrenta o Eco (a IA joga pelas táticas do dono) ou, na mesma tela,
 * os dois montam as rodadas. O resultado volta como código verificável por replay.
 *
 * Os códigos não são seguros contra edição: servem a rivalidade e reconhecimento, nunca a
 * recompensas que alterem o equilíbrio do jogo.
 */
export const ECHO_SEAL_PREFIX = 'ECO1.';
export const ECHO_RESULT_PREFIX = 'RES1.';
/** Vitalidade igual para os dois lados: o duelo mede escolhas, não a saúde do momento. */
export const DUEL_HEALTH = 30;
export const ECHO_STYLES = ['balanced', 'aggressive', 'defensive'] as const satisfies readonly CombatStyle[];
export const MAX_ECHO_RECORDS = 50;
const MAX_NAME = 40;
const MAX_SKILLS = 32;
const MAX_ROUNDS = 40;

export const ECHO_STYLE_LABELS: Record<CombatStyle, string> = {
  balanced: 'Equilibrado',
  aggressive: 'Agressivo',
  defensive: 'Defensivo',
};

export interface EchoSeal {
  version: 1;
  name: string;
  knownSkillIds: string[];
  actionIds: string[];
  style: CombatStyle;
}

export type EchoDuelKind = 'challenge' | 'hot-seat' | 'received';

export interface EchoDuelRecord {
  rivalId: string;
  rivalName: string;
  /** Desfecho do ponto de vista deste save. */
  outcome: 'victory' | 'defeat' | 'fled';
  kind: EchoDuelKind;
  day: number;
}

export interface EchoesState {
  records: EchoDuelRecord[];
  /** Resultados recebidos já registrados (evita contar o mesmo código duas vezes). */
  receivedResultIds: string[];
}

export interface EchoResult {
  version: 1;
  challenger: EchoSeal;
  rivalId: string;
  plans: string[][];
  outcome: 'victory' | 'defeat' | 'fled';
}

export type EchoInspection<T> = { ok: true; value: T } | { ok: false; reason: string };

/** O Eco nasce da primeira vitória reconhecida pelo Sistema em um confronto do mundo. */
export function hasWonAnyConfrontation(flags: Readonly<Record<string, boolean>>): boolean {
  return Object.entries(flags).some(([flag, value]) => value === true && flag.startsWith('combat.') && flag.endsWith('.resolved'));
}

export function createInitialEchoesState(): EchoesState {
  return { records: [], receivedResultIds: [] };
}

export function copyEchoesState(state: EchoesState): EchoesState {
  return { records: state.records.map((entry) => ({ ...entry })), receivedResultIds: [...state.receivedResultIds] };
}

/** O Selo do Desperto a partir do que o Sistema já reconhece no personagem. */
export function createEchoSeal(
  catalog: IndexedCombat,
  input: { name: string; knownSkillIds: readonly string[] },
  style: CombatStyle = 'balanced',
): EchoSeal {
  const knownSkillIds = [...new Set(input.knownSkillIds)].sort();
  return {
    version: 1,
    name: input.name.trim().slice(0, MAX_NAME) || 'Desperto',
    knownSkillIds,
    actionIds: duelActionBank(catalog, knownSkillIds),
    style,
  };
}

export function encodeEchoSeal(seal: EchoSeal): string {
  return encode(ECHO_SEAL_PREFIX, seal);
}

export function decodeEchoSeal(code: string, catalog: IndexedCombat): EchoInspection<EchoSeal> {
  const raw = decode(code, ECHO_SEAL_PREFIX);
  if (!raw.ok) return raw;
  return inspectSeal(raw.value, catalog);
}

/** Identidade estável de um Selo (mesmo conteúdo, mesmo id). */
export function echoSealId(seal: EchoSeal): string {
  return fnv1a(canonical(seal));
}

/** Prepara o duelo: você contra o Eco (ou contra outra pessoa na mesma tela). */
export function startEchoDuel(catalog: IndexedCombat, mine: EchoSeal, rival: EchoSeal): CombatState {
  return createDuel(
    catalog,
    { name: mine.name, maxHealth: DUEL_HEALTH, actionIds: mine.actionIds, knownSkillIds: mine.knownSkillIds },
    { name: rival.name, maxHealth: DUEL_HEALTH, actionIds: rival.actionIds, knownSkillIds: rival.knownSkillIds },
  );
}

/** Código de resultado que o desafiante envia ao dono do Eco. */
export function encodeEchoResult(challenger: EchoSeal, rival: EchoSeal, finalState: CombatState): string {
  if (finalState.outcome === 'ongoing') throw new Error('O duelo ainda não terminou.');
  const result: EchoResult = {
    version: 1,
    challenger,
    rivalId: echoSealId(rival),
    plans: (finalState.rounds ?? []).map((round) => [...round.player]),
    outcome: finalState.outcome,
  };
  return encode(ECHO_RESULT_PREFIX, result);
}

/**
 * Verifica um resultado recebido contra o próprio Eco: refaz o duelo rodada a rodada com as
 * táticas do Eco e só aceita se o desfecho bater. Devolve o desfecho do ponto de vista do dono.
 */
export function verifyEchoResult(
  code: string,
  mine: EchoSeal,
  catalog: IndexedCombat,
): EchoInspection<{ resultId: string; challengerName: string; challengerId: string; outcomeForMe: EchoDuelRecord['outcome'] }> {
  const raw = decode(code, ECHO_RESULT_PREFIX);
  if (!raw.ok) return raw;
  const value = raw.value;
  if (!isRecord(value) || value.version !== 1 || typeof value.rivalId !== 'string' || !Array.isArray(value.plans)) {
    return fail('O código de resultado está incompleto.');
  }
  if (value.rivalId !== echoSealId(mine)) {
    return fail('Este resultado é de um duelo contra outro Eco, não contra o seu.');
  }
  const challenger = inspectSeal(value.challenger, catalog);
  if (!challenger.ok) return challenger;
  if (value.plans.length === 0 || value.plans.length > MAX_ROUNDS) return fail('O resultado não traz rodadas válidas.');
  let duel = startEchoDuel(catalog, challenger.value, mine);
  try {
    for (const plan of value.plans) {
      if (duel.outcome !== 'ongoing' || !Array.isArray(plan) || plan.some((id) => typeof id !== 'string')) {
        return fail('As rodadas do resultado não conferem.');
      }
      duel = resolveRound(catalog, duel, plan as string[], { opponentStyle: mine.style });
    }
  } catch {
    return fail('As rodadas do resultado não conferem.');
  }
  if (duel.outcome === 'ongoing' || duel.outcome !== value.outcome) {
    return fail('O desfecho declarado não confere com as rodadas.');
  }
  const outcomeForMe = duel.outcome === 'victory' ? 'defeat' : duel.outcome === 'defeat' ? 'victory' : 'fled';
  return {
    ok: true,
    value: {
      resultId: fnv1a(code.trim()),
      challengerName: challenger.value.name,
      challengerId: echoSealId(challenger.value),
      outcomeForMe,
    },
  };
}

export function recordEchoDuel(state: EchoesState, record: EchoDuelRecord, resultId?: string): EchoesState {
  if (resultId && state.receivedResultIds.includes(resultId)) return copyEchoesState(state);
  return {
    records: [{ ...record }, ...state.records.map((entry) => ({ ...entry }))].slice(0, MAX_ECHO_RECORDS),
    receivedResultIds: resultId ? [...state.receivedResultIds, resultId].slice(-MAX_ECHO_RECORDS * 2) : [...state.receivedResultIds],
  };
}

/** Rivalidade resumida por Eco: vitórias e derrotas acumuladas. */
export function summarizeRivals(state: EchoesState): { rivalId: string; rivalName: string; wins: number; losses: number }[] {
  const byId = new Map<string, { rivalId: string; rivalName: string; wins: number; losses: number }>();
  for (const record of [...state.records].reverse()) {
    const entry = byId.get(record.rivalId) ?? { rivalId: record.rivalId, rivalName: record.rivalName, wins: 0, losses: 0 };
    entry.rivalName = record.rivalName;
    if (record.outcome === 'victory') entry.wins += 1;
    if (record.outcome === 'defeat') entry.losses += 1;
    byId.set(record.rivalId, entry);
  }
  return [...byId.values()].sort((left, right) => right.wins + right.losses - (left.wins + left.losses));
}

export function inspectEchoesState(value: unknown): EchoInspection<EchoesState> {
  if (!isRecord(value) || !Array.isArray(value.records) || !Array.isArray(value.receivedResultIds)) {
    return fail('O registro de Ecos é inválido.');
  }
  if (value.records.length > MAX_ECHO_RECORDS || value.receivedResultIds.length > MAX_ECHO_RECORDS * 2) {
    return fail('O registro de Ecos excede o limite.');
  }
  const records: EchoDuelRecord[] = [];
  for (const entry of value.records) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.rivalId) ||
      !nonEmpty(entry.rivalName) ||
      entry.rivalName.length > MAX_NAME ||
      (entry.outcome !== 'victory' && entry.outcome !== 'defeat' && entry.outcome !== 'fled') ||
      (entry.kind !== 'challenge' && entry.kind !== 'hot-seat' && entry.kind !== 'received') ||
      typeof entry.day !== 'number' ||
      !Number.isSafeInteger(entry.day) ||
      entry.day < 1
    ) {
      return fail('Um duelo do registro de Ecos é inválido.');
    }
    records.push({ rivalId: entry.rivalId, rivalName: entry.rivalName, outcome: entry.outcome, kind: entry.kind, day: entry.day });
  }
  if (value.receivedResultIds.some((id) => !nonEmpty(id))) return fail('O registro de Ecos é inválido.');
  return { ok: true, value: { records, receivedResultIds: [...(value.receivedResultIds as string[])] } };
}

// --- codificação ------------------------------------------------------------------------------

function inspectSeal(value: unknown, catalog: IndexedCombat): EchoInspection<EchoSeal> {
  if (!isRecord(value) || value.version !== 1) return fail('O Selo não é de uma versão reconhecida.');
  if (!nonEmpty(value.name) || value.name.length > MAX_NAME) return fail('O nome do Selo é inválido.');
  if (!(ECHO_STYLES as readonly unknown[]).includes(value.style)) return fail('O estilo tático do Selo é inválido.');
  if (!Array.isArray(value.knownSkillIds) || value.knownSkillIds.length > MAX_SKILLS || value.knownSkillIds.some((id) => !nonEmpty(id))) {
    return fail('As habilidades do Selo são inválidas.');
  }
  const knownSkillIds = [...new Set(value.knownSkillIds as string[])].sort();
  const bank = new Set(duelActionBank(catalog, knownSkillIds));
  if (!Array.isArray(value.actionIds) || value.actionIds.length === 0 || value.actionIds.some((id) => typeof id !== 'string' || !bank.has(id))) {
    return fail('O Selo traz ações que essas habilidades não liberam.');
  }
  return {
    ok: true,
    value: {
      version: 1,
      name: value.name.trim(),
      knownSkillIds,
      actionIds: [...new Set(value.actionIds as string[])],
      style: value.style as CombatStyle,
    },
  };
}

function encode(prefix: string, value: unknown): string {
  const payload = toBase64Url(JSON.stringify(value));
  return `${prefix}${payload}.${fnv1a(payload)}`;
}

function decode(code: string, prefix: string): EchoInspection<unknown> {
  const trimmed = typeof code === 'string' ? code.trim().replace(/\s+/g, '') : '';
  if (!trimmed.startsWith(prefix)) {
    return fail(prefix === ECHO_SEAL_PREFIX ? 'Isto não parece um Selo do Desperto (começa com ECO1.).' : 'Isto não parece um código de resultado (começa com RES1.).');
  }
  const body = trimmed.slice(prefix.length);
  const dot = body.lastIndexOf('.');
  if (dot <= 0 || body.length > 8_000) return fail('O código está incompleto.');
  const payload = body.slice(0, dot);
  if (fnv1a(payload) !== body.slice(dot + 1)) return fail('O código foi copiado pela metade ou alterado.');
  try {
    return { ok: true, value: JSON.parse(fromBase64Url(payload)) as unknown };
  } catch {
    return fail('O código não pôde ser lido.');
  }
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(payload: string): string {
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function canonical(seal: EchoSeal): string {
  return JSON.stringify({
    name: seal.name,
    knownSkillIds: [...seal.knownSkillIds].sort(),
    actionIds: [...seal.actionIds].sort(),
    style: seal.style,
  });
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}
