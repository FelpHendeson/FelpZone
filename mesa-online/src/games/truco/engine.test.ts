import { describe, expect, it } from "vitest";
import { GameRuleError } from "../rules";
import { trucoBotAction, type TrucoBotKind } from "./bots";
import {
  applyTrucoAction,
  canCall,
  cardPower,
  createTrucoGame,
  fullDeck,
  handWinner,
  manilhaRank,
  trucoActorsNeeded,
  trucoView,
  type Card,
  type TrucoAction,
  type TrucoMode,
  type TrucoState,
} from "./engine";

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seats = (count: number) => ["ana", "bia", "caio", "duda"].slice(0, count).map((id, index) => ({ id, name: id, color: `#00000${index}` }));

/** Mão montada à mão: cartas e vira escolhidas pelo teste. */
function table(mode: TrucoMode, hands: Card[][], vira: Card | null = "7o"): TrucoState {
  const state = createTrucoGame(seats(hands.length), seeded(1), { mode });
  state.players.forEach((player, index) => (player.hand = [...hands[index]]));
  state.vira = mode === "paulista" ? vira : null;
  state.currentPlayerId = "ana";
  state.roundLeaderId = "ana";
  return state;
}

const act = (state: TrucoState, playerId: string, action: TrucoAction) => applyTrucoAction(state, playerId, action, seeded(2));
const play = (state: TrucoState, playerId: string, card: Card, covered = false) => act(state, playerId, { type: "play", card, covered });

describe("truco: cartas e manilhas", () => {
  it("baralho de 40 cartas sem 8, 9 e 10", () => {
    const deck = fullDeck();
    expect(deck).toHaveLength(40);
    expect(new Set(deck).size).toBe(40);
    expect(deck.some((card) => /^(8|9|10)/.test(card))).toBe(false);
  });

  it("paulista: a manilha é a carta seguinte à vira, e o naipe desempata", () => {
    expect(manilhaRank("7o")).toBe("Q");
    expect(manilhaRank("3c")).toBe("4");
    expect(cardPower("Qp", "paulista", "7o")).toBeGreaterThan(cardPower("Qc", "paulista", "7o"));
    expect(cardPower("Qo", "paulista", "7o")).toBeGreaterThan(cardPower("3p", "paulista", "7o"));
    expect(cardPower("3p", "paulista", "7o")).toBe(cardPower("3o", "paulista", "7o"));
  });

  it("mineiro: zap, copas, espadilha e pica-fumo fixos", () => {
    const order: Card[] = ["4p", "7c", "Ae", "7o", "3o"];
    const powers = order.map((card) => cardPower(card, "mineiro", null));
    expect([...powers].sort((a, b) => b - a)).toEqual(powers);
    expect(cardPower("4o", "mineiro", null)).toBe(0);
    expect(cardPower("Ao", "mineiro", null)).toBeLessThan(cardPower("2o", "mineiro", null));
  });
});

describe("truco: distribuição e visão", () => {
  it("dá 3 cartas, vira no paulista e nada de vira no mineiro", () => {
    const paulista = createTrucoGame(seats(4), seeded(3), { mode: "paulista" });
    expect(paulista.players.map((player) => player.hand.length)).toEqual([3, 3, 3, 3]);
    expect(paulista.vira).not.toBeNull();
    expect(paulista.deck).toHaveLength(40 - 12 - 1);
    expect(paulista.players.map((player) => player.team)).toEqual([0, 1, 0, 1]);
    const mineiro = createTrucoGame(seats(2), seeded(3), { mode: "mineiro" });
    expect(mineiro.vira).toBeNull();
    expect(mineiro.deck).toHaveLength(34);
    expect(() => createTrucoGame(seats(3), seeded(1), { mode: "paulista" })).toThrow(GameRuleError);
  });

  it("cada um vê só a própria mão; o baralho nunca sai", () => {
    const state = createTrucoGame(seats(4), seeded(4), { mode: "paulista" });
    const view = trucoView(state, "bia");
    expect(view.players.find((player) => player.id === "bia")!.hand).toHaveLength(3);
    expect(view.players.filter((player) => player.hand !== null)).toHaveLength(1);
    expect("deck" in view || "pile" in view).toBe(false);
  });
});

describe("truco: rodadas", () => {
  it("quem faz duas rodadas ganha a mão", () => {
    let state = table("paulista", [["3o", "2o", "4o"], ["Ko", "Jo", "5o"]]);
    state = play(state, "ana", "3o");
    state = play(state, "bia", "Ko");
    expect(state.rounds[0]).toMatchObject({ team: 0, winnerId: "ana" });
    expect(state.currentPlayerId).toBe("ana");
    state = play(state, "ana", "2o");
    state = play(state, "bia", "Jo");
    expect(state.lastHand).toMatchObject({ team: 0, points: 1, reason: "rodadas" });
    expect(state.scores).toEqual([1, 0]);
    expect(state.phase).toBe("hand-over");
    // Quem dá as cartas gira: agora dá a Ana, e quem começa (e chama a próxima mão) é a Bia.
    expect(trucoActorsNeeded(state)).toEqual(["bia"]);
  });

  it("empates: a primeira empatada decide a próxima; empate depois da primeira vale a primeira", () => {
    expect(handWinner([{ team: null }, { team: 1 }])).toEqual({ done: true, team: 1 });
    expect(handWinner([{ team: 0 }, { team: null }])).toEqual({ done: true, team: 0 });
    expect(handWinner([{ team: 0 }, { team: 1 }, { team: null }])).toEqual({ done: true, team: 0 });
    expect(handWinner([{ team: null }, { team: null }, { team: null }])).toEqual({ done: true, team: null });
    expect(handWinner([{ team: null }, { team: null }])).toEqual({ done: false, team: null });
    expect(handWinner([{ team: 0 }, { team: 1 }])).toEqual({ done: false, team: null });
  });

  it("cartas iguais de duplas diferentes cangam; carta coberta só da segunda rodada e perde para todas", () => {
    let state = table("paulista", [["Ko", "4c", "5o"], ["Kc", "5e", "6o"]]);
    expect(() => play(state, "ana", "Ko", true)).toThrow("segunda rodada");
    state = play(state, "ana", "Ko");
    state = play(state, "bia", "Kc");
    expect(state.rounds[0].team).toBeNull();
    // Depois do empate, quem abriu a rodada empatada começa de novo.
    expect(state.currentPlayerId).toBe("ana");
    state = play(state, "ana", "4c", true);
    state = play(state, "bia", "5e");
    expect(state.rounds[1]).toMatchObject({ team: 1, plays: [{ playerId: "ana", card: null }, { playerId: "bia", card: "5e" }] });
    expect(state.lastHand).toMatchObject({ team: 1, points: 1 });
  });

  it("em duplas, a carta do parceiro empata com a própria dupla e a mais alta vence", () => {
    let state = table("mineiro", [["Ko", "4o", "5o"], ["Jo", "4e", "5e"], ["Kc", "6c", "5c"], ["Qe", "6e", "6p"]]);
    state = play(state, "ana", "Ko");
    state = play(state, "bia", "Jo");
    state = play(state, "caio", "Kc");
    state = play(state, "duda", "Qe");
    expect(state.rounds[0]).toMatchObject({ team: 0, winnerId: "ana" });
  });
});

describe("truco: pedidos", () => {
  it("truco aceito vale 3; quem pediu não pede de novo até a outra dupla aumentar", () => {
    let state = table("paulista", [["3o", "2o", "4o"], ["Ko", "Jo", "5o"]]);
    expect(canCall(state, "bia")).toBe(false);
    state = act(state, "ana", { type: "call" });
    expect(state.call).toMatchObject({ fromTeam: 0, value: 3, responderId: "bia" });
    expect(trucoActorsNeeded(state)).toEqual(["bia"]);
    expect(() => play(state, "ana", "3o")).toThrow("Responda o truco");
    expect(() => act(state, "ana", { type: "accept" })).toThrow("outra dupla");
    state = act(state, "bia", { type: "accept" });
    expect(state.value).toBe(3);
    expect(canCall(state, "ana")).toBe(false);
    state = play(state, "ana", "3o");
    expect(canCall(state, "bia")).toBe(true);
  });

  it("correr dá à outra dupla o valor de antes do pedido; aumentar devolve a decisão", () => {
    let state = table("paulista", [["3o", "2o", "4o"], ["Ko", "Jo", "5o"]]);
    state = act(state, "ana", { type: "call" });
    state = act(state, "bia", { type: "raise" });
    expect(state.value).toBe(3);
    expect(state.call).toMatchObject({ fromTeam: 1, value: 6, responderId: "ana" });
    state = act(state, "ana", { type: "run" });
    expect(state.lastHand).toMatchObject({ team: 1, points: 3, reason: "correu" });
    expect(state.scores).toEqual([0, 3]);
  });

  it("doze é o máximo e ganhar a mão de doze vira feito", () => {
    let state = table("paulista", [["3o", "2o", "4o"], ["Ko", "Jo", "5o"]]);
    state = act(state, "ana", { type: "call" });
    state = act(state, "bia", { type: "raise" });
    state = act(state, "ana", { type: "raise" });
    state = act(state, "bia", { type: "raise" });
    expect(state.call?.value).toBe(12);
    expect(() => act(state, "ana", { type: "raise" })).toThrow("máximo");
    state = act(state, "ana", { type: "accept" });
    state = play(state, "ana", "3o");
    state = play(state, "bia", "Ko");
    state = play(state, "ana", "2o");
    state = play(state, "bia", "Jo");
    expect(state.phase).toBe("finished");
    expect(state.winnerIds).toEqual(["ana"]);
    expect(state.feats.ana).toEqual(["mao-de-doze"]);
  });
});

describe("truco: mão de onze e fim", () => {
  it("a dupla com 11 vê as cartas do parceiro e decide; jogar vale 3, correr dá 1", () => {
    const base = createTrucoGame(seats(4), seeded(6), { mode: "paulista" });
    base.scores = [11, 5];
    base.phase = "hand-over";
    let state = act(base, "bia", { type: "next-hand" });
    expect(state.phase).toBe("eleven");
    expect(state.elevenTeam).toBe(0);
    const decider = trucoActorsNeeded(state)[0];
    expect(state.players.find((player) => player.id === decider)!.team).toBe(0);
    const view = trucoView(state, "ana");
    expect(view.players.find((player) => player.id === "caio")!.hand).toHaveLength(3);
    expect(view.players.find((player) => player.id === "bia")!.hand).toBeNull();
    expect(() => act(state, "bia", { type: "eleven", play: true })).toThrow("dupla com 11");

    const played = act(state, decider, { type: "eleven", play: true });
    expect(played).toMatchObject({ phase: "playing", value: 3 });
    expect(canCall(played, played.currentPlayerId)).toBe(false);

    state = act(state, decider, { type: "eleven", play: false });
    expect(state.scores).toEqual([11, 6]);
  });

  it("as duas duplas com 11: mão de ferro, sem truco", () => {
    const base = createTrucoGame(seats(2), seeded(7), { mode: "mineiro" });
    base.scores = [11, 11];
    base.phase = "hand-over";
    const state = act(base, "ana", { type: "next-hand" });
    expect(state).toMatchObject({ phase: "playing", iron: true, value: 1 });
    expect(canCall(state, state.currentPlayerId)).toBe(false);
  });

  it("desistir entrega a partida para a outra dupla", () => {
    const state = act(createTrucoGame(seats(4), seeded(8), { mode: "paulista" }), "caio", { type: "resign" });
    expect(state.phase).toBe("finished");
    expect(state.winnerIds).toEqual(["bia", "duda"]);
  });
});

describe("truco: robôs", () => {
  it("partidas só de robôs sempre terminam em 12, sem jogada recusada e sem perder cartas", () => {
    let games = 0;
    for (const mode of ["paulista", "mineiro"] as TrucoMode[]) {
      for (const count of [2, 4]) {
        for (let seed = 1; seed <= 25; seed += 1) {
          const rng = seeded(seed * 31 + count);
          let state = createTrucoGame(seats(count), rng, { mode });
          const kinds: TrucoBotKind[] = ["facil", "medio", "dificil", "medio"];
          for (let step = 0; state.phase !== "finished"; step += 1) {
            expect(step).toBeLessThan(5000);
            const [actor] = trucoActorsNeeded(state);
            const kind = kinds[(state.players.findIndex((player) => player.id === actor) + seed) % kinds.length];
            state = applyTrucoAction(state, actor, trucoBotAction(kind, state, actor, rng), rng);
            if (state.phase === "playing") {
              const inHands = state.players.reduce((sum, player) => sum + player.hand.length, 0);
              expect(inHands + state.pile.length + state.deck.length + (state.vira ? 1 : 0)).toBe(40);
            }
          }
          expect(Math.max(...state.scores)).toBe(12);
          expect(state.winnerIds.length).toBe(count / 2);
          games += 1;
        }
      }
    }
    expect(games).toBe(100);
  }, 60_000);

  it("o robô difícil ganha mais que o fácil", () => {
    let hard = 0;
    for (let seed = 1; seed <= 60; seed += 1) {
      const rng = seeded(seed);
      let state = createTrucoGame(seats(2), rng, { mode: seed % 2 ? "paulista" : "mineiro" });
      const kinds: TrucoBotKind[] = seed % 4 < 2 ? ["dificil", "facil"] : ["facil", "dificil"];
      while (state.phase !== "finished") {
        const [actor] = trucoActorsNeeded(state);
        state = applyTrucoAction(state, actor, trucoBotAction(kinds[actor === "ana" ? 0 : 1], state, actor, rng), rng);
      }
      if (kinds[state.winnerIds[0] === "ana" ? 0 : 1] === "dificil") hard += 1;
    }
    expect(hard).toBeGreaterThan(30);
  }, 30_000);
});
