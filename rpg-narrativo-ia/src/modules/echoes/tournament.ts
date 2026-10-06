import type { CombatOutcome } from '../combat';
import { fnv1a } from '../codes';
import type { EchoSeal } from './index';

/**
 * Torneio na mesma tela: de 4 a 8 Despertos num aparelho só, em chave eliminatória simples.
 * Cada duelo é o duelo na mesma tela que já existe (sequência oculta até os dois declararem
 * pronto). Nada do torneio entra no save da partida.
 */
export const TOURNAMENT_MIN = 4;
export const TOURNAMENT_MAX = 8;

export interface TournamentParticipant {
  seal: EchoSeal;
  /** Criado na hora (aprendiz sem partida salva) ou trazido por Selo. */
  origin: 'seal' | 'quick';
}

/** Um confronto da chave: índices dos participantes; `null` é folga. */
export interface TournamentMatch {
  a: number | null;
  b: number | null;
  winner?: number;
}

export interface TournamentState {
  version: 1;
  participants: TournamentParticipant[];
  /** Rodadas da chave, da primeira à final. */
  rounds: TournamentMatch[][];
}

export type TournamentInspection<T> = { ok: true; value: T } | { ok: false; reason: string };

/** Sorteia a chave: embaralha com a semente e completa com folgas até a próxima potência de 2. */
export function createTournament(participants: readonly TournamentParticipant[], seed: number): TournamentInspection<TournamentState> {
  if (participants.length < TOURNAMENT_MIN || participants.length > TOURNAMENT_MAX) {
    return { ok: false, reason: `O torneio precisa de ${TOURNAMENT_MIN} a ${TOURNAMENT_MAX} Despertos.` };
  }
  const order = participants.map((_, index) => index);
  let random = seed >>> 0 || 1;
  for (let index = order.length - 1; index > 0; index -= 1) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const swap = random % (index + 1);
    [order[index], order[swap]] = [order[swap]!, order[index]!];
  }
  const size = order.length <= 4 ? 4 : 8;
  // Folgas vão para quem foi sorteado no topo de cada metade, nunca dois vazios juntos.
  const slots: (number | null)[] = [];
  const byes = size - order.length;
  let cursor = 0;
  for (let match = 0; match < size / 2; match += 1) {
    slots.push(order[cursor++] ?? null);
    slots.push(match < byes ? null : (order[cursor++] ?? null));
  }
  const first: TournamentMatch[] = [];
  for (let index = 0; index < slots.length; index += 2) {
    const a = slots[index] ?? null;
    const b = slots[index + 1] ?? null;
    first.push({ a, b, ...(b === null && a !== null ? { winner: a } : {}) });
  }
  const rounds: TournamentMatch[][] = [first];
  for (let count = first.length / 2; count >= 1; count /= 2) {
    rounds.push(Array.from({ length: count }, () => ({ a: null, b: null })));
  }
  return { ok: true, value: advance({ version: 1, participants: participants.map((entry) => ({ ...entry })), rounds }) };
}

/** Leva os vencedores para a rodada seguinte. */
function advance(state: TournamentState): TournamentState {
  const rounds = state.rounds.map((round) => round.map((match) => ({ ...match })));
  for (let round = 1; round < rounds.length; round += 1) {
    rounds[round]!.forEach((match, index) => {
      const left = rounds[round - 1]![index * 2]!;
      const right = rounds[round - 1]![index * 2 + 1]!;
      match.a = left.winner ?? null;
      match.b = right.winner ?? null;
    });
  }
  return { ...state, rounds };
}

/** O próximo duelo a jogar: rodada e posição, ou nada se o torneio acabou. */
export function nextMatch(state: TournamentState): { round: number; index: number; match: TournamentMatch } | undefined {
  for (const [round, matches] of state.rounds.entries()) {
    for (const [index, match] of matches.entries()) {
      if (match.winner === undefined && match.a !== null && match.b !== null) return { round, index, match };
    }
  }
  return undefined;
}

/**
 * Registra o fim do duelo do próximo confronto. O participante `a` joga como "player" no duelo:
 * vitória dele, ele avança; derrota ou desistência, avança `b`.
 */
export function recordTournamentDuel(state: TournamentState, outcome: Exclude<CombatOutcome, 'ongoing'>): TournamentState {
  const next = nextMatch(state);
  if (!next) return state;
  const rounds = state.rounds.map((round) => round.map((match) => ({ ...match })));
  rounds[next.round]![next.index]!.winner = outcome === 'victory' ? next.match.a! : next.match.b!;
  return advance({ ...state, rounds });
}

export function tournamentChampion(state: TournamentState): TournamentParticipant | undefined {
  const final = state.rounds[state.rounds.length - 1]![0]!;
  return final.winner === undefined ? undefined : state.participants[final.winner];
}

export const ROUND_NAMES: Record<number, string> = { 1: 'Final', 2: 'Semifinal', 4: 'Quartas de final' };

export function roundName(state: TournamentState, round: number): string {
  return ROUND_NAMES[state.rounds[round]!.length] ?? `Rodada ${round + 1}`;
}

/** Texto do registro do torneio, para compartilhar. */
export function tournamentRecord(state: TournamentState): string {
  const champion = tournamentChampion(state);
  const lines = state.rounds.flatMap((matches, round) =>
    matches
      .filter((match) => match.a !== null && match.b !== null && match.winner !== undefined)
      .map((match) => {
        const winner = state.participants[match.winner!]!.seal.name;
        const loser = state.participants[match.winner === match.a ? match.b! : match.a!]!.seal.name;
        return `${roundName(state, round)}: ${winner} venceu ${loser}`;
      }),
  );
  return [
    `Torneio de Despertos em Reset · ${state.participants.length} participantes`,
    ...lines,
    champion ? `Campeão: ${champion.seal.name}` : 'Torneio em andamento',
    `Registro ${fnv1a(lines.join('|'))}`,
  ].join('\n');
}

/** Confere um rascunho guardado no aparelho (para retomar um torneio interrompido). */
export function inspectTournamentDraft(value: unknown): TournamentInspection<TournamentState> {
  const fail = { ok: false as const, reason: 'O rascunho do torneio é inválido.' };
  if (typeof value !== 'object' || value === null) return fail;
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || !Array.isArray(record.participants) || !Array.isArray(record.rounds)) return fail;
  const count = record.participants.length;
  if (count < TOURNAMENT_MIN || count > TOURNAMENT_MAX) return fail;
  for (const participant of record.participants) {
    if (typeof participant !== 'object' || participant === null) return fail;
    const { seal, origin } = participant as Record<string, unknown>;
    if ((origin !== 'seal' && origin !== 'quick') || typeof seal !== 'object' || seal === null) return fail;
    const { name, actionIds } = seal as Record<string, unknown>;
    if (typeof name !== 'string' || !Array.isArray(actionIds) || actionIds.length === 0) return fail;
  }
  for (const round of record.rounds) {
    if (!Array.isArray(round)) return fail;
    for (const match of round) {
      if (typeof match !== 'object' || match === null) return fail;
      const { a, b, winner } = match as Record<string, unknown>;
      const index = (entry: unknown) => entry === null || (Number.isSafeInteger(entry) && (entry as number) >= 0 && (entry as number) < count);
      if (!index(a) || !index(b) || (winner !== undefined && (!index(winner) || (winner !== a && winner !== b)))) return fail;
    }
  }
  return { ok: true, value: value as TournamentState };
}
