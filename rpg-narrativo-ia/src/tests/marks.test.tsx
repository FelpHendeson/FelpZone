import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  INITIAL_MARKS,
  encodeMark,
  encodeMarkAnswer,
  inspectMarksCatalog,
  isChallengeDone,
  markAuthorId,
  markText,
  receiveMark,
  receiveMarkAnswer,
} from '../modules/marks';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { describeSandboxFeedback } from '../ui/sandbox/feedback';
import { MarksSection } from '../ui/screens/exploration/MarksSection';
import marksJson from '../../content/first-day/system/marks.json' with { type: 'json' };
import { freshState, now } from './helpers';

const context = createSandboxContext();
const world = { locationIds: new Set(context.map.locations.keys()) };
const names = {
  location: (id: string) => context.map.locations.get(id)?.name ?? id,
  creature: (id: string) => context.combat?.combatantById.get(id)?.name ?? id,
};

function explored(firstName = 'Ana', seed = 1): GameState {
  const base = freshState();
  let state: GameState = { ...base, narrativeSession: null, character: { ...base.character, firstName }, rng: { ...base.rng, seed } };
  for (let count = 0; count < 3; count += 1) state = executeSandboxAction(state, { type: 'exploration.explore' }, { now }).current;
  return state;
}

describe('Marcas: catálogo', () => {
  it('frases pré-montadas por tipo; desafios sempre apontam para uma criatura', () => {
    expect(INITIAL_MARKS.types.map((type) => type.id)).toEqual(['warning', 'tip', 'challenge', 'greeting']);
    const raw = JSON.parse(JSON.stringify(marksJson)) as { phrases: Record<string, unknown>[] };
    expect(inspectMarksCatalog({ ...raw, phrases: [{ id: 'x', type: 'challenge', text: 'Vença {alvo}', target: 'location' }] }).ok).toBe(false);
    expect(inspectMarksCatalog({ ...raw, phrases: [{ id: 'x', type: 'tip', text: 'Sem alvo', target: 'creature' }] }).ok).toBe(false);
  });
});

describe('Marcas: deixar e receber', () => {
  it('deixar uma marca custa 5 minutos e só aceita o que já se conhece', () => {
    const state = explored();
    const result = executeSandboxAction(state, { type: 'mark.leave', phraseId: 'danger-creature', targetId: 'wary-predator' }, { now });
    expect(result.timeCost.minutes).toBe(5);
    expect(result.current.marks?.left).toHaveLength(1);
    expect(result.current.marks!.left[0]).toMatchObject({ locationId: state.sandbox.navigation.currentLocationId, phraseId: 'danger-creature', targetId: 'wary-predator' });
    expect(describeSandboxFeedback(result, context).message).toContain('Marca deixada');
    expect(() => executeSandboxAction(state, { type: 'mark.leave', phraseId: 'danger-creature', targetId: 'thorn-boar' }, { now })).toThrow('avistou');
    expect(() => executeSandboxAction(state, { type: 'mark.leave', phraseId: 'shelter', targetId: 'hidden-cave' }, { now })).toThrow('conhece');
    expect(() => executeSandboxAction(state, { type: 'mark.leave', phraseId: 'inventada' }, { now })).toThrow();
    expect(parseGameState(serializeGameState(result.current))).toEqual({ status: 'ok', state: result.current });
  });

  it('o código leva a marca ao mesmo local do mundo de outro Desperto; alterações e repetições são recusadas', () => {
    const author = executeSandboxAction(explored('Caio', 7), { type: 'mark.leave', phraseId: 'not-alone' }, { now }).current;
    const mark = author.marks!.left[0]!;
    const code = encodeMark(mark, 'Caio Cruz', markAuthorId(author));
    const reader = explored('Ana', 3);
    const received = receiveMark(reader.marks, code, world, { day: 2, myAuthorId: markAuthorId(reader), victoriesOver: () => 0 });
    expect(received.ok).toBe(true);
    if (!received.ok) return;
    expect(received.value.received[0]).toMatchObject({ authorName: 'Caio Cruz', locationId: mark.locationId, importedDay: 2 });
    expect(markText(received.value.received[0]!, names)).toBe('Você não está só.');
    expect(receiveMark(received.value, code, world, { day: 2, myAuthorId: markAuthorId(reader), victoriesOver: () => 0 }).ok).toBe(false);
    expect(receiveMark(reader.marks, code, world, { day: 2, myAuthorId: markAuthorId(author), victoriesOver: () => 0 }).ok).toBe(false);
    expect(receiveMark(reader.marks, code.slice(0, -2), world, { day: 2, myAuthorId: 'x', victoriesOver: () => 0 }).ok).toBe(false);
  });

  it('o desafio exige uma vitória nova sobre a criatura; a resposta conta uma vez para o autor', () => {
    const author = executeSandboxAction(explored('Caio', 7), { type: 'mark.leave', phraseId: 'beat-creature', targetId: 'wary-predator' }, { now }).current;
    const code = encodeMark(author.marks!.left[0]!, 'Caio Cruz', markAuthorId(author));
    const received = receiveMark(undefined, code, world, { day: 2, myAuthorId: 'ana', victoriesOver: () => 1 });
    if (!received.ok) throw new Error(received.reason);
    const mark = received.value.received[0]!;
    expect(mark.baselineVictories).toBe(1);
    expect(isChallengeDone(mark, () => 1)).toBe(false);
    expect(isChallengeDone(mark, () => 2)).toBe(true);
    const answer = encodeMarkAnswer(mark, 'Ana Cruz', 'ana');
    const registered = receiveMarkAnswer(author.marks, answer, markAuthorId(author));
    expect(registered.ok && registered.value.left[0]!.answers).toEqual([{ responderId: 'ana', responderName: 'Ana Cruz' }]);
    if (!registered.ok) return;
    expect(receiveMarkAnswer(registered.value, answer, markAuthorId(author)).ok).toBe(false);
    expect(receiveMarkAnswer(author.marks, answer, 'outro').ok).toBe(false);
  });

  it('o save recusa marca com frase ou local inexistente', () => {
    const state = executeSandboxAction(explored(), { type: 'mark.leave', phraseId: 'keep-going' }, { now }).current;
    const raw = JSON.parse(serializeGameState(state));
    expect(parseGameState(JSON.stringify({ ...raw, marks: { ...raw.marks, left: [{ ...raw.marks.left[0], phraseId: 'x' }] } })).status).toBe('corrupt');
    expect(parseGameState(JSON.stringify({ ...raw, marks: { ...raw.marks, left: [{ ...raw.marks.left[0], locationId: 'lugar-nenhum' }] } })).status).toBe('corrupt');
  });

  it('a tela do local mostra as marcas recebidas aqui e a sua', () => {
    const author = executeSandboxAction(explored('Caio', 7), { type: 'mark.leave', phraseId: 'danger-creature', targetId: 'wary-predator' }, { now }).current;
    const code = encodeMark(author.marks!.left[0]!, 'Caio Cruz', markAuthorId(author));
    const reader = explored('Ana', 3);
    const received = receiveMark(reader.marks, code, world, { day: 1, myAuthorId: markAuthorId(reader), victoriesOver: () => 0 });
    if (!received.ok) throw new Error(received.reason);
    const html = renderToStaticMarkup(<MarksSection state={{ ...reader, marks: received.value }} names={names} onAction={() => undefined} />);
    expect(html).toContain('Perigo adiante: Predador Arisco.');
    expect(html).toContain('marca de Caio Cruz');
  });
});
