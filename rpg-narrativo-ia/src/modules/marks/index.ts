import catalogJson from '../../../content/first-day/system/marks.json' with { type: 'json' };
import { INITIAL_COMBAT, type IndexedCombat } from '../combat';
import { decodeCode, encodeCode, fnv1a, type CodeInspection } from '../codes';

/**
 * Marcas no mundo: um Desperto deixa um aviso, dica, desafio ou saudação num local e compartilha
 * por código; quem importa encontra a marca no mesmo local do próprio mundo. As frases são
 * pré-montadas (sem texto livre). Desafios cumpridos geram uma resposta para o autor — só
 * reconhecimento, nunca itens.
 */
export const MARK_PREFIX = 'MRC1.';
export const MARK_ANSWER_PREFIX = 'RSP1.';
export const MARK_TYPES = ['warning', 'tip', 'challenge', 'greeting'] as const;
export type MarkType = (typeof MARK_TYPES)[number];
export type MarkTarget = 'creature' | 'location' | 'none';

export interface MarkPhraseDefinition {
  id: string;
  type: MarkType;
  /** `{alvo}` vira o nome da criatura ou do local escolhido. */
  text: string;
  target: MarkTarget;
}

export interface IndexedMarks {
  readonly types: readonly { id: MarkType; name: string; icon: string }[];
  readonly phrases: readonly MarkPhraseDefinition[];
  readonly phraseById: ReadonlyMap<string, MarkPhraseDefinition>;
  readonly limits: { left: number; received: number };
}

export interface MarkContent {
  locationId: string;
  phraseId: string;
  targetId?: string;
}

export interface LeftMark extends MarkContent {
  id: string;
  day: number;
  /** Respostas a um desafio desta marca (cada Desperto conta uma vez). */
  answers: { responderId: string; responderName: string }[];
}

export interface ReceivedMark extends MarkContent {
  id: string;
  authorName: string;
  authorId: string;
  day: number;
  importedDay: number;
  /** Vitórias sobre a criatura do desafio no momento da importação (o desafio exige uma nova). */
  baselineVictories?: number;
}

export interface MarksState {
  left: LeftMark[];
  received: ReceivedMark[];
}

export interface MarkWorld {
  locationIds: ReadonlySet<string>;
  combat?: IndexedCombat;
}

const MAX_NAME = 40;

export function inspectMarksCatalog(value: unknown): CodeInspection<IndexedMarks> {
  const fail = (reason: string) => ({ ok: false as const, reason });
  if (!isRecord(value) || !Array.isArray(value.types) || !Array.isArray(value.phrases) || !isRecord(value.limits)) {
    return fail('O catálogo de marcas é inválido.');
  }
  const types: { id: MarkType; name: string; icon: string }[] = [];
  for (const entry of value.types) {
    if (!isRecord(entry) || !(MARK_TYPES as readonly unknown[]).includes(entry.id) || !nonEmpty(entry.name) || !nonEmpty(entry.icon)) {
      return fail('Um tipo de marca é inválido.');
    }
    types.push({ id: entry.id as MarkType, name: entry.name, icon: entry.icon });
  }
  const phrases: MarkPhraseDefinition[] = [];
  for (const entry of value.phrases) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      phrases.some((phrase) => phrase.id === entry.id) ||
      !types.some((type) => type.id === entry.type) ||
      !nonEmpty(entry.text) ||
      (entry.target !== 'creature' && entry.target !== 'location' && entry.target !== 'none') ||
      (entry.target === 'none') === entry.text.includes('{alvo}') ||
      (entry.type === 'challenge' && entry.target !== 'creature')
    ) {
      return fail('Uma frase de marca é inválida.');
    }
    phrases.push({ id: entry.id, type: entry.type as MarkType, text: entry.text, target: entry.target });
  }
  const left = value.limits.left;
  const received = value.limits.received;
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(received) || (left as number) < 1 || (received as number) < 1) {
    return fail('Os limites de marcas são inválidos.');
  }
  return {
    ok: true,
    value: Object.freeze({
      types: Object.freeze(types),
      phrases: Object.freeze(phrases),
      phraseById: new Map(phrases.map((phrase) => [phrase.id, phrase])),
      limits: { left: left as number, received: received as number },
    }),
  };
}

export function indexMarksCatalog(value: unknown): IndexedMarks {
  const inspected = inspectMarksCatalog(value);
  if (!inspected.ok) throw new Error(inspected.reason);
  return inspected.value;
}

export const INITIAL_MARKS = indexMarksCatalog(catalogJson);

export function createInitialMarksState(): MarksState {
  return { left: [], received: [] };
}

export function copyMarksState(state: MarksState): MarksState {
  return {
    left: state.left.map((mark) => ({ ...mark, answers: mark.answers.map((answer) => ({ ...answer })) })),
    received: state.received.map((mark) => ({ ...mark })),
  };
}

/** Confere o conteúdo de uma marca: frase do pack, local que existe e alvo do tipo certo. */
export function inspectMarkContent(value: unknown, world: MarkWorld, catalog: IndexedMarks = INITIAL_MARKS): MarkContent | undefined {
  if (!isRecord(value) || typeof value.locationId !== 'string' || !world.locationIds.has(value.locationId)) return undefined;
  const phrase = typeof value.phraseId === 'string' ? catalog.phraseById.get(value.phraseId) : undefined;
  if (!phrase) return undefined;
  const combat = world.combat ?? INITIAL_COMBAT;
  if (phrase.target === 'none') {
    if (value.targetId !== undefined) return undefined;
    return { locationId: value.locationId, phraseId: phrase.id };
  }
  if (typeof value.targetId !== 'string') return undefined;
  const valid = phrase.target === 'creature' ? combat.combatantById.has(value.targetId) : world.locationIds.has(value.targetId);
  return valid ? { locationId: value.locationId, phraseId: phrase.id, targetId: value.targetId } : undefined;
}

/** Identidade estável do Desperto como autor de marcas (nome e semente da partida). */
export function markAuthorId(state: { character: { firstName: string; lastName: string }; rng: { seed: number } }): string {
  return fnv1a(`${state.character.firstName} ${state.character.lastName}|${state.rng.seed}`);
}

export function markId(content: MarkContent, authorId: string, day: number): string {
  return fnv1a(`${authorId}|${content.locationId}|${content.phraseId}|${content.targetId ?? ''}|${day}`);
}

/** Deixa uma marca (a mais antiga sai quando passa do limite). */
export function leaveMark(
  state: MarksState | undefined,
  content: MarkContent,
  authorId: string,
  day: number,
  catalog: IndexedMarks = INITIAL_MARKS,
): MarksState {
  const next = copyMarksState(state ?? createInitialMarksState());
  const id = markId(content, authorId, day);
  if (next.left.some((mark) => mark.id === id)) return next;
  next.left = [...next.left, { id, ...content, day, answers: [] }].slice(-catalog.limits.left);
  return next;
}

export function encodeMark(mark: LeftMark, authorName: string, authorId: string): string {
  return encodeCode(MARK_PREFIX, {
    version: 1,
    id: mark.id,
    authorName,
    authorId,
    locationId: mark.locationId,
    phraseId: mark.phraseId,
    ...(mark.targetId ? { targetId: mark.targetId } : {}),
    day: mark.day,
  });
}

export function decodeMark(
  code: string,
  world: MarkWorld,
  catalog: IndexedMarks = INITIAL_MARKS,
): CodeInspection<Omit<ReceivedMark, 'importedDay' | 'baselineVictories'>> {
  const raw = decodeCode(code, MARK_PREFIX, 'Isto não parece uma marca (começa com MRC1.).');
  if (!raw.ok) return raw;
  const value = raw.value;
  if (!isRecord(value) || value.version !== 1 || !nonEmpty(value.id) || !nonEmpty(value.authorName) || value.authorName.length > MAX_NAME || !nonEmpty(value.authorId)) {
    return { ok: false, reason: 'A marca está incompleta.' };
  }
  if (!Number.isSafeInteger(value.day) || (value.day as number) < 1) return { ok: false, reason: 'A marca está incompleta.' };
  const content = inspectMarkContent(value, world, catalog);
  if (!content) return { ok: false, reason: 'A marca aponta para um lugar, criatura ou frase que não existe neste mundo.' };
  if (markId(content, value.authorId, value.day as number) !== value.id) return { ok: false, reason: 'A marca foi alterada.' };
  return { ok: true, value: { id: value.id, authorName: value.authorName, authorId: value.authorId, day: value.day as number, ...content } };
}

/** Importa uma marca recebida; desafios guardam as vitórias atuais sobre a criatura. */
export function receiveMark(
  state: MarksState | undefined,
  code: string,
  world: MarkWorld,
  context: { day: number; myAuthorId: string; victoriesOver: (combatantId: string) => number },
  catalog: IndexedMarks = INITIAL_MARKS,
): CodeInspection<MarksState> {
  const decoded = decodeMark(code, world, catalog);
  if (!decoded.ok) return decoded;
  if (decoded.value.authorId === context.myAuthorId) return { ok: false, reason: 'Esta marca é sua.' };
  const next = copyMarksState(state ?? createInitialMarksState());
  if (next.received.some((mark) => mark.id === decoded.value.id)) return { ok: false, reason: 'Esta marca já foi recebida.' };
  const phrase = catalog.phraseById.get(decoded.value.phraseId)!;
  const received: ReceivedMark = {
    ...decoded.value,
    importedDay: context.day,
    ...(phrase.type === 'challenge' && decoded.value.targetId ? { baselineVictories: context.victoriesOver(decoded.value.targetId) } : {}),
  };
  next.received = [...next.received, received].slice(-catalog.limits.received);
  return { ok: true, value: next };
}

/** O desafio está cumprido quando houve uma vitória nova sobre a criatura depois da importação. */
export function isChallengeDone(mark: ReceivedMark, victoriesOver: (combatantId: string) => number): boolean {
  return mark.baselineVictories !== undefined && mark.targetId !== undefined && victoriesOver(mark.targetId) > mark.baselineVictories;
}

export function encodeMarkAnswer(mark: ReceivedMark, responderName: string, responderId: string): string {
  return encodeCode(MARK_ANSWER_PREFIX, { version: 1, markId: mark.id, authorId: mark.authorId, responderName, responderId });
}

/** O autor registra a resposta a um desafio seu (cada Desperto conta uma vez por marca). */
export function receiveMarkAnswer(state: MarksState | undefined, code: string, myAuthorId: string): CodeInspection<MarksState> {
  const raw = decodeCode(code, MARK_ANSWER_PREFIX, 'Isto não parece uma resposta de marca (começa com RSP1.).');
  if (!raw.ok) return raw;
  const value = raw.value;
  if (!isRecord(value) || value.version !== 1 || !nonEmpty(value.markId) || !nonEmpty(value.responderName) || value.responderName.length > MAX_NAME || !nonEmpty(value.responderId)) {
    return { ok: false, reason: 'A resposta está incompleta.' };
  }
  if (value.authorId !== myAuthorId) return { ok: false, reason: 'Esta resposta é para a marca de outro Desperto.' };
  const next = copyMarksState(state ?? createInitialMarksState());
  const mark = next.left.find((entry) => entry.id === value.markId);
  if (!mark) return { ok: false, reason: 'Esta marca não está entre as suas.' };
  if (mark.answers.some((answer) => answer.responderId === value.responderId)) return { ok: false, reason: 'Esta resposta já foi registrada.' };
  mark.answers.push({ responderId: value.responderId as string, responderName: value.responderName as string });
  return { ok: true, value: next };
}

/** Texto da marca com o alvo preenchido. */
export function markText(
  content: MarkContent,
  names: { location: (id: string) => string; creature: (id: string) => string },
  catalog: IndexedMarks = INITIAL_MARKS,
): string {
  const phrase = catalog.phraseById.get(content.phraseId);
  if (!phrase) return '';
  if (!content.targetId) return phrase.text;
  const name = phrase.target === 'creature' ? names.creature(content.targetId) : names.location(content.targetId);
  return phrase.text.replace('{alvo}', name);
}

export function inspectMarksState(value: unknown, world: MarkWorld, catalog: IndexedMarks = INITIAL_MARKS): CodeInspection<MarksState> {
  const fail = { ok: false as const, reason: 'As marcas do salvamento são inválidas.' };
  if (!isRecord(value) || !Array.isArray(value.left) || !Array.isArray(value.received)) return fail;
  if (value.left.length > catalog.limits.left || value.received.length > catalog.limits.received) return fail;
  const left: LeftMark[] = [];
  for (const entry of value.left) {
    const content = inspectMarkContent(entry, world, catalog);
    if (!content || !isRecord(entry) || !nonEmpty(entry.id) || !Number.isSafeInteger(entry.day) || (entry.day as number) < 1 || !Array.isArray(entry.answers)) return fail;
    const answers: LeftMark['answers'] = [];
    for (const answer of entry.answers) {
      if (!isRecord(answer) || !nonEmpty(answer.responderId) || !nonEmpty(answer.responderName) || answers.some((other) => other.responderId === answer.responderId)) return fail;
      answers.push({ responderId: answer.responderId, responderName: answer.responderName });
    }
    left.push({ id: entry.id, ...content, day: entry.day as number, answers });
  }
  const received: ReceivedMark[] = [];
  for (const entry of value.received) {
    const content = inspectMarkContent(entry, world, catalog);
    if (
      !content ||
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      !nonEmpty(entry.authorName) ||
      !nonEmpty(entry.authorId) ||
      !Number.isSafeInteger(entry.day) ||
      !Number.isSafeInteger(entry.importedDay) ||
      (entry.baselineVictories !== undefined && (!Number.isSafeInteger(entry.baselineVictories) || (entry.baselineVictories as number) < 0))
    ) {
      return fail;
    }
    received.push({
      id: entry.id,
      authorName: entry.authorName,
      authorId: entry.authorId,
      day: entry.day as number,
      importedDay: entry.importedDay as number,
      ...content,
      ...(entry.baselineVictories !== undefined ? { baselineVictories: entry.baselineVictories as number } : {}),
    });
  }
  return { ok: true, value: { left, received } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
