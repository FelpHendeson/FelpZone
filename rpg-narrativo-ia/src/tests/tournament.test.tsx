import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INITIAL_COMBAT } from '../modules/combat';
import {
  createEchoSeal,
  createTournament,
  inspectTournamentDraft,
  nextMatch,
  recordTournamentDuel,
  roundName,
  startEchoDuel,
  tournamentChampion,
  tournamentRecord,
  type TournamentParticipant,
} from '../modules/echoes';
import { TournamentScreen } from '../ui/screens/exploration/TournamentScreen';

function people(count: number): TournamentParticipant[] {
  return Array.from({ length: count }, (_, index) => ({
    seal: createEchoSeal(INITIAL_COMBAT, { name: `Desperto ${index + 1}`, knownSkillIds: [], archetypeId: 'apprentice-swordsman' }),
    origin: 'quick' as const,
  }));
}

function playOut(count: number, seed = 7) {
  const created = createTournament(people(count), seed);
  if (!created.ok) throw new Error(created.reason);
  let state = created.value;
  let duels = 0;
  // O primeiro de cada confronto sempre vence: o torneio precisa terminar com um campeão.
  while (nextMatch(state)) {
    state = recordTournamentDuel(state, 'victory');
    duels += 1;
  }
  return { state, duels };
}

describe('Torneio na mesma tela', () => {
  it('aceita de 4 a 8 Despertos', () => {
    expect(createTournament(people(3), 1).ok).toBe(false);
    expect(createTournament(people(9), 1).ok).toBe(false);
    expect(createTournament(people(4), 1).ok).toBe(true);
  });

  it('com 5 a 8, a chave tem quartas, semifinal e final; folgas avançam direto', () => {
    const created = createTournament(people(5), 3);
    if (!created.ok) throw new Error(created.reason);
    expect(created.value.rounds.map((round) => round.length)).toEqual([4, 2, 1]);
    expect(created.value.rounds.map((_, round) => roundName(created.value, round))).toEqual(['Quartas de final', 'Semifinal', 'Final']);
    const byes = created.value.rounds[0]!.filter((match) => match.b === null);
    expect(byes).toHaveLength(3);
    expect(byes.every((match) => match.winner === match.a)).toBe(true);
  });

  it('cada torneio termina em um campeão com n − 1 duelos jogados', () => {
    for (const count of [4, 5, 6, 7, 8]) {
      const { state, duels } = playOut(count);
      expect(duels).toBe(count - 1);
      expect(tournamentChampion(state)).toBeDefined();
    }
  });

  it('o sorteio é reproduzível pela semente e muda com outra semente', () => {
    const one = createTournament(people(8), 11);
    const same = createTournament(people(8), 11);
    const other = createTournament(people(8), 12);
    if (!one.ok || !same.ok || !other.ok) throw new Error('chave inválida');
    expect(same.value.rounds[0]).toEqual(one.value.rounds[0]);
    expect(other.value.rounds[0]).not.toEqual(one.value.rounds[0]);
  });

  it('derrota ou desistência do primeiro faz o segundo avançar', () => {
    const created = createTournament(people(4), 5);
    if (!created.ok) throw new Error(created.reason);
    const first = nextMatch(created.value)!;
    const afterDefeat = recordTournamentDuel(created.value, 'defeat');
    expect(afterDefeat.rounds[first.round]![first.index]!.winner).toBe(first.match.b);
    const afterFlee = recordTournamentDuel(created.value, 'fled');
    expect(afterFlee.rounds[first.round]![first.index]!.winner).toBe(first.match.b);
  });

  it('cada duelo usa o duelo na mesma tela, com vitalidade igual', () => {
    const { seal: a } = people(2)[0]!;
    const { seal: b } = people(2)[1]!;
    const duel = startEchoDuel(INITIAL_COMBAT, a, b);
    expect(duel.player.maxHealth).toBe(duel.opponent.maxHealth);
  });

  it('o registro lista os duelos e o campeão; o rascunho no aparelho é conferido antes de retomar', () => {
    const { state } = playOut(6);
    const record = tournamentRecord(state);
    expect(record).toContain('6 participantes');
    expect(record).toContain(`Campeão: ${tournamentChampion(state)!.seal.name}`);
    expect(inspectTournamentDraft(JSON.parse(JSON.stringify(state))).ok).toBe(true);
    expect(inspectTournamentDraft({ ...state, rounds: [[{ a: 0, b: 1, winner: 5 }]] }).ok).toBe(false);
    expect(inspectTournamentDraft({ ...state, participants: state.participants.slice(0, 2) }).ok).toBe(false);
  });

  it('a montagem começa com o seu Selo e pede pelo menos quatro', () => {
    const mine = createEchoSeal(INITIAL_COMBAT, { name: 'Ana Cruz', knownSkillIds: [] });
    const html = renderToStaticMarkup(<TournamentScreen combat={INITIAL_COMBAT} mySeal={mine} onBack={() => undefined} />);
    expect(html).toContain('Ana Cruz');
    expect(html).toContain('Faltam 3 para começar');
    expect(html).toContain('Aprendiz criado na hora');
  });
});
