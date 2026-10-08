import { describe, expect, it } from "vitest";
import { GameRuleError } from "../rules";
import { DOMINO_BOT_KINDS, dominoBotAction, type DominoBotKind } from "./bots";
import {
  DOMINO_TARGETS,
  applyDominoAction,
  batidaKind,
  createDominoGame,
  dominoActorsNeeded,
  dominoView,
  endsCount,
  pips,
  type DominoMode,
  type DominoState,
  type Placed,
  type Tile,
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

/** Mesa montada à mão: mãos, linha e monte definidos pelo teste (fora da primeira mão). */
function table(mode: DominoMode, hands: Tile[][], options: { line?: Placed[]; boneyard?: Tile[]; target?: number | null; current?: string } = {}): DominoState {
  const state = createDominoGame(seats(hands.length), seeded(1), { mode, target: options.target === undefined ? DOMINO_TARGETS[mode][0] : options.target });
  state.players.forEach((player, index) => (player.hand = hands[index]));
  state.line = options.line ?? [];
  state.boneyard = options.boneyard ?? [];
  state.forcedTile = null;
  state.hand = 2;
  state.currentPlayerId = options.current ?? "ana";
  return state;
}

const play = (state: DominoState, playerId: string, tile: Tile, side?: "left" | "right") =>
  applyDominoAction(state, playerId, { type: "play", tile, ...(side ? { side } : {}) }, seeded(2));

const countTiles = (state: DominoState) =>
  state.players.reduce((sum, player) => sum + player.hand.length, 0) + state.line.length + state.boneyard.length + state.sleeping;

describe("dominó: distribuição e início", () => {
  it("dá as pedras de cada modalidade e guarda o resto no monte ou dormindo", () => {
    const bloqueio = createDominoGame(seats(3), seeded(3), { mode: "bloqueio", target: 50 });
    expect(bloqueio.players.map((player) => player.hand.length)).toEqual([7, 7, 7]);
    expect(bloqueio.boneyard).toHaveLength(0);
    expect(bloqueio.sleeping).toBe(7);

    const compra = createDominoGame(seats(3), seeded(3), { mode: "compra", target: 50 });
    expect(compra.players.map((player) => player.hand.length)).toEqual([5, 5, 5]);
    expect(compra.boneyard).toHaveLength(13);

    const dupla = createDominoGame(seats(2), seeded(3), { mode: "pontos", target: 100 });
    expect(dupla.players.map((player) => player.hand.length)).toEqual([7, 7]);
    expect(dupla.boneyard).toHaveLength(14);

    const duplas = createDominoGame(seats(4), seeded(3), { mode: "duplas", target: 6 });
    expect(duplas.players.map((player) => player.team)).toEqual([0, 1, 0, 1]);
    expect(countTiles(duplas)).toBe(28);
    expect(duplas.boneyard).toHaveLength(0);
  });

  it("duplas exigem exatamente 4 pessoas", () => {
    expect(() => createDominoGame(seats(3), seeded(1), { mode: "duplas", target: 6 })).toThrow(GameRuleError);
  });

  it("a maior carroça começa e é obrigatória na primeira mão", () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const state = createDominoGame(seats(4), seeded(seed), { mode: "duplas", target: 6 });
      // Com as 28 pedras distribuídas, alguém sempre tem o 6|6.
      const starter = state.players.find((player) => player.id === state.currentPlayerId)!;
      expect(state.forcedTile).toEqual([6, 6]);
      expect(starter.hand).toContainEqual([6, 6]);
      const other = starter.hand.find((tile) => !(tile[0] === 6 && tile[1] === 6))!;
      expect(() => play(state, starter.id, other)).toThrow(/primeira pedra/);
      expect(play(state, starter.id, [6, 6]).line).toEqual([{ a: 6, b: 6 }]);
    }
  });

  it("cada um só vê a própria mão", () => {
    const state = createDominoGame(seats(3), seeded(4), { mode: "compra", target: 50 });
    const view = dominoView(state, "bia");
    expect(view.players.find((player) => player.id === "bia")!.hand).toHaveLength(5);
    expect(view.players.find((player) => player.id === "ana")!.hand).toBeNull();
    expect(view.players.find((player) => player.id === "ana")!.handCount).toBe(5);
    expect("boneyard" in view).toBe(false);
    expect(view.boneyardCount).toBe(13);
  });
});

describe("dominó: jogadas", () => {
  it("vira a pedra para encaixar e pede o lado quando servem as duas pontas", () => {
    let state = table("bloqueio", [[[1, 3], [2, 3], [0, 0]], [[3, 4], [5, 6], [6, 6]]], { line: [{ a: 3, b: 5 }] });
    expect(() => play(state, "ana", [5, 6])).toThrow(/não está na sua mão/);
    expect(() => play(state, "ana", [0, 0])).toThrow(/não encaixa/);
    state = play(state, "ana", [1, 3]);
    expect(state.line).toEqual([{ a: 1, b: 3 }, { a: 3, b: 5 }]);
    expect(state.currentPlayerId).toBe("bia");
    state = play(state, "bia", [5, 6]);
    expect(state.line.at(-1)).toEqual({ a: 5, b: 6 });
    // Pontas 1 e 6: Ana não tem jogada e passa; a vez volta para Bia.
    expect(state.events.at(-1)).toMatchObject({ type: "pass", playerId: "ana" });
    state = play(state, "bia", [6, 6]);
    expect(state.line.at(-1)).toEqual({ a: 6, b: 6 });
  });

  it("pede a ponta quando a pedra serve nas duas", () => {
    const state = table("bloqueio", [[[2, 4], [0, 1]], [[6, 6]]], { line: [{ a: 2, b: 4 }] });
    expect(() => play(state, "ana", [2, 4])).toThrow(/Escolha em qual ponta/);
    expect(play(state, "ana", [2, 4], "left").line[0]).toEqual({ a: 4, b: 2 });
  });

  it("na Compra, quem não tem jogada compra até poder jogar", () => {
    let state = table("compra", [[[1, 2], [0, 0]], [[5, 5], [6, 6]]], {
      line: [{ a: 1, b: 1 }],
      boneyard: [[4, 4], [3, 4], [2, 6], [0, 3]],
    });
    state = play(state, "ana", [1, 2], "right");
    // Pontas 1 e 2: Bia compra [4,4], [3,4] e [2,6], que serve.
    expect(state.currentPlayerId).toBe("bia");
    expect(state.boneyard).toEqual([[0, 3]]);
    expect(state.events.at(-1)).toMatchObject({ type: "draw", playerId: "bia", count: 3 });
    expect(state.players[1].hand).toContainEqual([2, 6]);
  });

  it("no Bloqueio, quem não tem jogada passa sozinho", () => {
    let state = table("bloqueio", [[[1, 2], [1, 5], [0, 0]], [[6, 6], [4, 4]], [[2, 3], [3, 3]]], { line: [{ a: 1, b: 1 }] });
    state = play(state, "ana", [1, 2], "right");
    expect(state.events.at(-1)).toMatchObject({ type: "pass", playerId: "bia" });
    expect(state.currentPlayerId).toBe("caio");
  });

  it("mão trancada: ganha quem tem menos pontos e leva os pontos dos outros", () => {
    // Ninguém tem 0 nem 4 depois da jogada da Ana.
    let state = table("bloqueio", [[[0, 4], [1, 1]], [[6, 6], [5, 5]], [[2, 3], [3, 5]]], { line: [{ a: 0, b: 0 }] });
    state = play(state, "ana", [0, 4], "right");
    expect(state.lastHand).toMatchObject({ reason: "trancada", winnerIds: ["ana"], points: 22 + 13 });
    expect(state.players[0].score).toBe(35);
    expect(state.phase).toBe("hand-over");
    expect(state.nextStarterId).toBe("ana");
    expect(dominoActorsNeeded(state)).toEqual(["ana"]);
  });

  it("mão trancada empatada: ninguém marca", () => {
    let state = table("bloqueio", [[[0, 4], [1, 1]], [[1, 1], [6, 6]], [[0, 2], [5, 5]]], { line: [{ a: 0, b: 0 }] });
    state.players[1].hand = [[1, 1]];
    state.players[2].hand = [[1, 1]];
    state = play(state, "ana", [0, 4], "right");
    expect(state.lastHand).toMatchObject({ reason: "trancada", winnerIds: [], points: 0 });
  });

  it("quem bate leva a soma das mãos dos outros", () => {
    let state = table("compra", [[[1, 2]], [[6, 6], [5, 4]], [[3, 3]]], { line: [{ a: 1, b: 1 }], target: 50 });
    state = play(state, "ana", [1, 2], "right");
    expect(state.lastHand).toMatchObject({ reason: "batida", batedorId: "ana", winnerIds: ["ana"], points: 21 + 6 });
    expect(state.phase).toBe("hand-over");
    state = applyDominoAction(state, "bia", { type: "next-hand" }, seeded(9));
    expect(state.hand).toBe(3);
    expect(state.currentPlayerId).toBe("ana");
    expect(state.forcedTile).toBeNull();
    expect(countTiles(state)).toBe(28);
  });

  it("mão única: quem ganha a mão ganha a partida", () => {
    let state = table("bloqueio", [[[1, 2]], [[6, 6]]], { line: [{ a: 1, b: 1 }], target: null });
    state = play(state, "ana", [1, 2], "right");
    expect(state.phase).toBe("finished");
    expect(state.winnerIds).toEqual(["ana"]);
    expect(state.events.at(-1)).toMatchObject({ type: "game-end", winnerIds: ["ana"] });
  });
});

describe("dominó: batidas e duplas", () => {
  it("reconhece simples, carroça, lá-e-lô e cruzada", () => {
    expect(batidaKind([2, 5], [5, 6])).toBe("simples");
    expect(batidaKind([2, 5], [5, 5])).toBe("carroca");
    expect(batidaKind([2, 5], [2, 5])).toBe("la-e-lo");
    expect(batidaKind([4, 4], [4, 4])).toBe("cruzada");
    // Pontas iguais e pedra comum: serve dos dois lados, mas é simples.
    expect(batidaKind([4, 4], [4, 6])).toBe("simples");
  });

  it("duplas: a dupla de quem bate marca pela batida e registra o feito", () => {
    const hands: Tile[][] = [[[4, 4]], [[6, 6]], [[0, 1]], [[2, 2]]];
    let state = table("duplas", hands, { line: [{ a: 4, b: 3 }, { a: 3, b: 4 }], target: 6 });
    state = play(state, "ana", [4, 4]);
    expect(state.lastHand).toMatchObject({ batida: "cruzada", points: 4, winnerIds: ["ana", "caio"] });
    expect(state.teamScores).toEqual([4, 0]);
    expect(state.feats.ana).toEqual(["batida-cruzada"]);
    expect(state.phase).toBe("hand-over");
  });

  it("duplas: lá-e-lô vale 3 e a meta encerra a partida", () => {
    const hands: Tile[][] = [[[1, 1]], [[2, 5]], [[0, 0]], [[6, 6]]];
    let state = table("duplas", hands, { line: [{ a: 2, b: 3 }, { a: 3, b: 5 }], target: 6, current: "bia" });
    state.teamScores = [0, 4];
    state = play(state, "bia", [2, 5], "left");
    expect(state.lastHand).toMatchObject({ batida: "la-e-lo", points: 3, winnerIds: ["bia", "duda"] });
    expect(state.phase).toBe("finished");
    expect(state.winnerIds).toEqual(["bia", "duda"]);
    expect(state.feats.bia).toEqual(["batida-la-e-lo", "venceu-duplas"]);
    expect(state.feats.duda).toEqual(["venceu-duplas"]);
  });

  it("duplas: mão trancada dá 1 ponto à dupla com menos pontos", () => {
    const hands: Tile[][] = [[[0, 4], [6, 6]], [[5, 5]], [[1, 1]], [[3, 3]]];
    let state = table("duplas", hands, { line: [{ a: 0, b: 0 }] });
    state = play(state, "ana", [0, 4], "right");
    // Pontas 0 e 4: todos passam. Dupla 0: 12 + 2 = 14; dupla 1: 10 + 6 = 16.
    expect(state.lastHand).toMatchObject({ reason: "trancada", winnerIds: ["ana", "caio"], points: 1 });
    expect(state.teamScores).toEqual([1, 0]);
    expect(state.nextStarterId).toBe("caio");
  });

  it("desistir nas duplas entrega a partida à outra dupla", () => {
    const state = createDominoGame(seats(4), seeded(5), { mode: "duplas", target: 6 });
    const next = applyDominoAction(state, "bia", { type: "resign" }, seeded(1));
    expect(next.phase).toBe("finished");
    expect(next.winnerIds).toEqual(["ana", "caio"]);
  });

  it("desistir no individual tira a pessoa e segue com os outros", () => {
    let state = table("bloqueio", [[[1, 2], [6, 6]], [[2, 3], [5, 5]], [[0, 0]]], { line: [{ a: 1, b: 1 }] });
    state = applyDominoAction(state, "ana", { type: "resign" }, seeded(1));
    expect(state.players[0].out).toBe(true);
    expect(state.currentPlayerId).not.toBe("ana");
    state = applyDominoAction(state, "bia", { type: "resign" }, seeded(1));
    expect(state.phase).toBe("finished");
    expect(state.winnerIds).toEqual(["caio"]);
  });
});

describe("dominó: pontos (5 em 5)", () => {
  it("soma as pontas, com carroça na ponta contando dobrado", () => {
    expect(endsCount([{ a: 5, b: 5 }])).toBe(10);
    expect(endsCount([{ a: 6, b: 4 }])).toBe(10);
    expect(endsCount([{ a: 5, b: 5 }, { a: 5, b: 0 }])).toBe(10);
    expect(endsCount([{ a: 2, b: 3 }, { a: 3, b: 3 }])).toBe(2 + 6);
  });

  it("marca quem deixa múltiplo de 5 e termina na hora em que alguém chega à meta", () => {
    let state = table("pontos", [[[0, 5], [6, 6]], [[3, 3]], [[1, 1]]], { line: [{ a: 5, b: 5 }], target: 100 });
    state.players[0].score = 95;
    state = play(state, "ana", [0, 5], "right");
    // Pontas: carroça 5|5 à esquerda (10) + 0 = 10.
    expect(state.events.find((event) => event.type === "play")).toMatchObject({ points: 10 });
    expect(state.phase).toBe("finished");
    expect(state.winnerIds).toEqual(["ana"]);
  });

  it("na batida, leva os pontos dos outros arredondados para 5", () => {
    let state = table("pontos", [[[1, 2]], [[6, 6], [1, 0]], [[0, 0]]], { line: [{ a: 1, b: 1 }], target: 200 });
    state = play(state, "ana", [1, 2], "right");
    // Outros: 12 + 1 + 0 = 13 → 15. A jogada (1+2=3) não marca.
    expect(state.lastHand).toMatchObject({ reason: "batida", points: 15 });
    expect(state.players[0].score).toBe(15);
  });
});

describe("dominó: robôs", () => {
  const modes: [DominoMode, number][] = [
    ["bloqueio", 2],
    ["bloqueio", 4],
    ["compra", 3],
    ["pontos", 2],
    ["pontos", 4],
    ["duplas", 4],
  ];

  it("partidas só de robôs sempre terminam, sem jogadas recusadas e sem perder pedras", () => {
    let games = 0;
    for (const [mode, count] of modes) {
      for (const target of DOMINO_TARGETS[mode]) {
        for (let seed = 1; seed <= 8; seed += 1) {
          const rng = seeded(seed * 97 + count);
          let state = createDominoGame(seats(count), rng, { mode, target });
          const kinds = seats(count).map((_, index) => DOMINO_BOT_KINDS[(index + seed) % DOMINO_BOT_KINDS.length]) as DominoBotKind[];
          for (let step = 0; state.phase !== "finished"; step += 1) {
            expect(step).toBeLessThan(5000);
            const [actor] = dominoActorsNeeded(state);
            const kind = kinds[state.players.findIndex((player) => player.id === actor)];
            state = applyDominoAction(state, actor, dominoBotAction(kind, state, actor, rng), rng);
            if (state.phase === "playing") expect(countTiles(state)).toBe(28);
          }
          expect(state.winnerIds.length).toBeGreaterThan(0);
          if (target !== null && mode !== "duplas") {
            expect(Math.max(...state.players.map((player) => player.score))).toBeGreaterThanOrEqual(target);
          }
          games += 1;
        }
      }
    }
    expect(games).toBeGreaterThan(100);
  }, 60_000);

  it("o robô difícil ganha mais que o fácil no 5 em 5", () => {
    let hard = 0;
    let easy = 0;
    for (let seed = 1; seed <= 60; seed += 1) {
      const rng = seeded(seed);
      let state = createDominoGame(seats(2), rng, { mode: "pontos", target: 100 });
      const kinds: DominoBotKind[] = seed % 2 ? ["dificil", "facil"] : ["facil", "dificil"];
      while (state.phase !== "finished") {
        const [actor] = dominoActorsNeeded(state);
        state = applyDominoAction(state, actor, dominoBotAction(kinds[actor === "ana" ? 0 : 1], state, actor, rng), rng);
      }
      for (const id of state.winnerIds) {
        if (kinds[id === "ana" ? 0 : 1] === "dificil") hard += 1;
        else easy += 1;
      }
    }
    expect(hard).toBeGreaterThan(easy);
  }, 30_000);

  it("pips soma os pontos das pedras", () => {
    expect(pips([[1, 2], [6, 6]])).toBe(15);
  });
});
