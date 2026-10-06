import {
  INITIAL_COMBAT,
  createDuel,
  duelActionBank,
  resolveRound,
  type AllySnapshot,
  type CombatState,
  type CombatStyle,
  type IndexedCombat,
} from '../combat';
import { INITIAL_ARCHETYPES, archetypeRank, archetypeSignatureActions, type ArchetypeProgressState, type IndexedArchetypes } from '../archetypes';

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
export const ECHO_THANKS_PREFIX = 'AGR1.';
/** Até quantos Ecos aliados ficam guardados no Círculo. */
export const MAX_ECHO_ALLIES = 3;
export const ECHO_ALLY_ID = 'echo-ally';
/** Vitalidade igual para os dois lados: o duelo mede escolhas, não a saúde do momento. */
export const DUEL_HEALTH = 30;
/** O Eco aliado entra com parte da vitalidade de duelo: ajuda, mas não substitui o jogador. */
export const ECHO_ALLY_HEALTH = Math.round(DUEL_HEALTH * 0.6);
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
  /** Arquétipo de aprendiz do dono (a técnica de assinatura entra no banco do Eco). */
  archetypeId?: string;
  knownSkillIds: string[];
  actionIds: string[];
  style: CombatStyle;
  /** Técnicas do galho de arquétipo que o dono aprendeu (entram no banco do Eco). */
  techniqueIds?: string[];
  /** Patente: Iniciados duelam com um tempo a mais por rodada. */
  rank?: 'initiate';
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
  /** Círculo de Ecos: Selos (códigos) que podem ser chamados como aliados. */
  allies?: string[];
  /** Último dia de jogo em que um Eco aliado foi chamado (um por dia). */
  lastAllyDay?: number;
  /** Laços de Eco: quem chamou o seu Eco como aliado e quantas vezes lutaram juntos. */
  bonds?: EchoBondRecord[];
}

export interface EchoBondRecord {
  helperId: string;
  helperName: string;
  assists: number;
  victories: number;
  lastDay: number;
}

/** Agradecimento: quem chamou o Eco envia ao dono, que registra o laço. */
export interface EchoThanks {
  version: 1;
  helperName: string;
  helperId: string;
  allySealId: string;
  encounterName: string;
  outcome: 'victory' | 'defeat' | 'fled';
  day: number;
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
  return {
    records: state.records.map((entry) => ({ ...entry })),
    receivedResultIds: [...state.receivedResultIds],
    ...(state.allies ? { allies: [...state.allies] } : {}),
    ...(state.lastAllyDay !== undefined ? { lastAllyDay: state.lastAllyDay } : {}),
    ...(state.bonds ? { bonds: state.bonds.map((entry) => ({ ...entry })) } : {}),
  };
}

/** Guarda um Selo no Círculo de Ecos (o mais antigo sai quando passa do limite). */
export function addEchoAlly(state: EchoesState, code: string, catalog: IndexedCombat = INITIAL_COMBAT): EchoInspection<EchoesState> {
  const seal = decodeEchoSeal(code, catalog);
  if (!seal.ok) return seal;
  const id = echoSealId(seal.value);
  const trimmed = code.trim().replace(/\s+/g, '');
  const others = (state.allies ?? []).filter((entry) => {
    const decoded = decodeEchoSeal(entry, catalog);
    return !decoded.ok || echoSealId(decoded.value) !== id;
  });
  return { ok: true, value: { ...copyEchoesState(state), allies: [...others, trimmed].slice(-MAX_ECHO_ALLIES) } };
}

export function removeEchoAlly(state: EchoesState, code: string): EchoesState {
  return { ...copyEchoesState(state), allies: (state.allies ?? []).filter((entry) => entry !== code) };
}

/** Um Eco aliado pode ser chamado uma vez por dia de jogo. */
export function canCallEchoAlly(state: EchoesState | undefined, day: number): boolean {
  return (state?.allies?.length ?? 0) > 0 && state?.lastAllyDay !== day;
}

/** O Eco como companheiro de combate: vitalidade reduzida, banco do Selo e o estilo do dono. */
export function echoAllySnapshot(seal: EchoSeal, archetypes: IndexedArchetypes = INITIAL_ARCHETYPES): AllySnapshot {
  const roundTicks = sealRoundTicks(seal, archetypes);
  return {
    id: ECHO_ALLY_ID,
    name: `Eco de ${seal.name}`,
    maxHealth: ECHO_ALLY_HEALTH,
    actionIds: [...seal.actionIds],
    style: seal.style,
    ...(roundTicks ? { roundTicks } : {}),
  };
}

export function encodeEchoThanks(thanks: Omit<EchoThanks, 'version'>): string {
  return encode(ECHO_THANKS_PREFIX, { version: 1, ...thanks });
}

/** Confere um agradecimento: precisa ter sido dado ao Eco deste Selo. */
export function verifyEchoThanks(code: string, mine: EchoSeal): EchoInspection<EchoThanks & { thanksId: string }> {
  const raw = decode(code, ECHO_THANKS_PREFIX);
  if (!raw.ok) return raw;
  const value = raw.value;
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !nonEmpty(value.helperName) ||
    value.helperName.length > MAX_NAME ||
    !nonEmpty(value.helperId) ||
    !nonEmpty(value.allySealId) ||
    !nonEmpty(value.encounterName) ||
    value.encounterName.length > 80 ||
    (value.outcome !== 'victory' && value.outcome !== 'defeat' && value.outcome !== 'fled') ||
    !Number.isSafeInteger(value.day) ||
    (value.day as number) < 1
  ) {
    return fail('O agradecimento está incompleto.');
  }
  if (value.allySealId !== echoSealId(mine)) return fail('Este agradecimento é para outro Eco, não para o seu.');
  return {
    ok: true,
    value: {
      version: 1,
      helperName: value.helperName,
      helperId: value.helperId,
      allySealId: value.allySealId,
      encounterName: value.encounterName,
      outcome: value.outcome,
      day: value.day as number,
      thanksId: fnv1a(code.trim().replace(/\s+/g, '')),
    },
  };
}

/** Registra o laço de quem lutou ao lado do seu Eco (o mesmo código não conta duas vezes). */
export function recordEchoBond(state: EchoesState, thanks: EchoThanks & { thanksId: string }, day: number): EchoesState {
  if (state.receivedResultIds.includes(thanks.thanksId)) return copyEchoesState(state);
  const bonds = (state.bonds ?? []).map((entry) => ({ ...entry }));
  const bond = bonds.find((entry) => entry.helperId === thanks.helperId);
  if (bond) {
    bond.helperName = thanks.helperName;
    bond.assists += 1;
    if (thanks.outcome === 'victory') bond.victories += 1;
    bond.lastDay = day;
  } else {
    bonds.unshift({ helperId: thanks.helperId, helperName: thanks.helperName, assists: 1, victories: thanks.outcome === 'victory' ? 1 : 0, lastDay: day });
  }
  return {
    ...copyEchoesState(state),
    receivedResultIds: [...state.receivedResultIds, thanks.thanksId].slice(-MAX_ECHO_RECORDS * 2),
    bonds: bonds.slice(0, MAX_ECHO_RECORDS),
  };
}

/** O Selo do Desperto a partir do que o Sistema já reconhece no personagem. */
export function createEchoSeal(
  catalog: IndexedCombat,
  input: { name: string; knownSkillIds: readonly string[]; archetypeId?: string; progress?: ArchetypeProgressState },
  style: CombatStyle = 'balanced',
  archetypes: IndexedArchetypes = INITIAL_ARCHETYPES,
): EchoSeal {
  const knownSkillIds = [...new Set(input.knownSkillIds)].sort();
  const archetypeId = input.archetypeId && archetypes.byId.has(input.archetypeId) ? input.archetypeId : undefined;
  const techniqueIds = [...new Set(input.progress?.techniqueIds ?? [])].filter((id) => archetypes.techniqueByActionId.has(id)).sort();
  const rank = input.progress ? archetypeRank(archetypes, { archetypeId, progress: input.progress }).rank : 'apprentice';
  return {
    version: 1,
    name: input.name.trim().slice(0, MAX_NAME) || 'Desperto',
    ...(archetypeId ? { archetypeId } : {}),
    knownSkillIds,
    actionIds: duelActionBank(catalog, knownSkillIds, [...archetypeSignatureActions(archetypes, archetypeId), ...techniqueIds]),
    style,
    ...(techniqueIds.length > 0 ? { techniqueIds } : {}),
    ...(rank === 'initiate' ? { rank: 'initiate' as const } : {}),
  };
}

/** Tempos por rodada do Eco no duelo (Iniciados têm um a mais). */
export function sealRoundTicks(seal: EchoSeal, archetypes: IndexedArchetypes = INITIAL_ARCHETYPES): number | undefined {
  return seal.rank === 'initiate' ? archetypes.rules.initiate.roundTicks : undefined;
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
    { name: mine.name, maxHealth: DUEL_HEALTH, actionIds: mine.actionIds, knownSkillIds: mine.knownSkillIds, roundTicks: sealRoundTicks(mine) },
    { name: rival.name, maxHealth: DUEL_HEALTH, actionIds: rival.actionIds, knownSkillIds: rival.knownSkillIds, roundTicks: sealRoundTicks(rival) },
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
    ...copyEchoesState(state),
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

export function inspectEchoesState(value: unknown, catalog: IndexedCombat = INITIAL_COMBAT): EchoInspection<EchoesState> {
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
  const extras: Partial<EchoesState> = {};
  if (value.allies !== undefined) {
    if (!Array.isArray(value.allies) || value.allies.length > MAX_ECHO_ALLIES) return fail('O Círculo de Ecos é inválido.');
    for (const code of value.allies) {
      if (typeof code !== 'string' || !decodeEchoSeal(code, catalog).ok) return fail('O Círculo de Ecos traz um Selo inválido.');
    }
    extras.allies = [...(value.allies as string[])];
  }
  if (value.lastAllyDay !== undefined) {
    if (!Number.isSafeInteger(value.lastAllyDay) || (value.lastAllyDay as number) < 1) return fail('O registro de Ecos é inválido.');
    extras.lastAllyDay = value.lastAllyDay as number;
  }
  if (value.bonds !== undefined) {
    if (!Array.isArray(value.bonds) || value.bonds.length > MAX_ECHO_RECORDS) return fail('Os Laços de Eco são inválidos.');
    const bonds: EchoBondRecord[] = [];
    for (const entry of value.bonds) {
      const counter = (item: unknown) => Number.isSafeInteger(item) && (item as number) >= 0;
      if (
        !isRecord(entry) ||
        !nonEmpty(entry.helperId) ||
        !nonEmpty(entry.helperName) ||
        entry.helperName.length > MAX_NAME ||
        !counter(entry.assists) ||
        !counter(entry.victories) ||
        (entry.victories as number) > (entry.assists as number) ||
        !Number.isSafeInteger(entry.lastDay) ||
        (entry.lastDay as number) < 1
      ) {
        return fail('Os Laços de Eco são inválidos.');
      }
      bonds.push({
        helperId: entry.helperId,
        helperName: entry.helperName,
        assists: entry.assists as number,
        victories: entry.victories as number,
        lastDay: entry.lastDay as number,
      });
    }
    extras.bonds = bonds;
  }
  return { ok: true, value: { records, receivedResultIds: [...(value.receivedResultIds as string[])], ...extras } };
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
  if (value.archetypeId !== undefined && (typeof value.archetypeId !== 'string' || !INITIAL_ARCHETYPES.byId.has(value.archetypeId))) {
    return fail('O arquétipo do Selo não é reconhecido.');
  }
  const archetypeId = value.archetypeId as string | undefined;
  if (
    value.techniqueIds !== undefined &&
    (!Array.isArray(value.techniqueIds) ||
      value.techniqueIds.length === 0 ||
      value.techniqueIds.some((id) => typeof id !== 'string' || !INITIAL_ARCHETYPES.techniqueByActionId.has(id)))
  ) {
    return fail('O Selo traz técnicas de galho que não existem.');
  }
  const techniqueIds = [...new Set((value.techniqueIds as string[] | undefined) ?? [])].sort();
  if (value.rank !== undefined) {
    // A patente precisa ser coerente com as técnicas declaradas (a vitória de elite não viaja no Selo).
    const claimed = archetypeRank(INITIAL_ARCHETYPES, {
      archetypeId,
      progress: { techniqueIds, signatureUses: 0, victories: 1_000_000, eliteVictories: 1_000_000, affinity: {} },
    });
    if (value.rank !== 'initiate' || claimed.rank !== 'initiate') return fail('A patente do Selo não confere com as técnicas.');
  }
  const bank = new Set(
    duelActionBank(catalog, knownSkillIds, [...archetypeSignatureActions(INITIAL_ARCHETYPES, archetypeId), ...techniqueIds]),
  );
  if (!Array.isArray(value.actionIds) || value.actionIds.length === 0 || value.actionIds.some((id) => typeof id !== 'string' || !bank.has(id))) {
    return fail('O Selo traz ações que essas habilidades não liberam.');
  }
  return {
    ok: true,
    value: {
      version: 1,
      name: value.name.trim(),
      ...(archetypeId ? { archetypeId } : {}),
      knownSkillIds,
      actionIds: [...new Set(value.actionIds as string[])],
      style: value.style as CombatStyle,
      ...(techniqueIds.length > 0 ? { techniqueIds } : {}),
      ...(value.rank === 'initiate' ? { rank: 'initiate' as const } : {}),
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
    archetypeId: seal.archetypeId ?? null,
    knownSkillIds: [...seal.knownSkillIds].sort(),
    actionIds: [...seal.actionIds].sort(),
    style: seal.style,
    // Campos novos só entram quando presentes, para Selos antigos manterem a mesma identidade.
    ...(seal.techniqueIds ? { techniqueIds: [...seal.techniqueIds].sort() } : {}),
    ...(seal.rank ? { rank: seal.rank } : {}),
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

export * from './tournament';
