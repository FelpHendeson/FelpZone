import { describe, expect, it } from "vitest";
import { applyMagnataAction, createMagnataGame, type GameEvent, type MagnataState } from "./engine";
import { buildBeats } from "./beats";
import { THEMES } from "./themes";

const people = new Map([
  ["ana", { name: "Ana", avatar: "🦊" }],
  ["bia", { name: "Bia", avatar: "🐼" }],
]);
const ctx = (meId: string | null) => ({ theme: THEMES.classico, people, meId });
const cash = (state: MagnataState) => new Map(state.players.map((p) => [p.id, p.cash]));

function dice(...faces: number[]) {
  const queue = faces.map((face) => (face - 1) / 6 + 0.01);
  return () => queue.shift() ?? 0.5;
}

function game() {
  const state = createMagnataGame(
    [
      { id: "ana", name: "Ana", color: "#f00" },
      { id: "bia", name: "Bia", color: "#00f" },
    ],
    () => 0.999,
  );
  state.players.sort((a) => (a.id === "ana" ? -1 : 1));
  state.currentPlayerId = "ana";
  return state;
}

const fresh = (before: MagnataState, after: MagnataState) => after.events.filter((e) => e.seq > before.eventSeq);

describe("lances", () => {
  it("rolagem, movimento, salário e aluguel viram um lance só, com o dinheiro de cada um", () => {
    const before = game();
    before.properties[1].owner = "bia";
    before.players[0].position = 39;
    const after = applyMagnataAction(before, "ana", { type: "roll" }, dice(1, 1));
    const beats = buildBeats(fresh(before, after), ctx("bia"), cash(before), cash(after));
    expect(beats).toHaveLength(1);
    const [beat] = beats;
    expect(beat.actorId).toBe("ana");
    expect(beat.lines.map((l) => l.type)).toEqual(["roll", "move", "salary", "rent"]);
    expect(beat.cash).toEqual(expect.arrayContaining([
      { playerId: "ana", amount: 198 },
      { playerId: "bia", amount: 2 },
    ]));
    expect(beat.involvesMe).toBe(true);
  });

  it("passar a vez e a próxima rolagem ficam em lances separados", () => {
    let state = game();
    state.phase = "end";
    const before = state;
    state = applyMagnataAction(state, "ana", { type: "end-turn" }, dice());
    state = applyMagnataAction(state, "bia", { type: "roll" }, dice(1, 2));
    const beats = buildBeats(fresh(before, state), ctx("ana"), cash(before), cash(state));
    expect(beats).toHaveLength(1);
    expect(beats[0].startsTurn).toBe(true);
    expect(beats[0].actorId).toBe("bia");
    expect(beats[0].lines[0].type).toBe("roll");
  });

  it("compra seguida de passar a vez: o dinheiro fica com a compra", () => {
    const before = game();
    before.players[0].position = 6;
    before.phase = "buy";
    let after = applyMagnataAction(before, "ana", { type: "buy" }, dice());
    after = applyMagnataAction(after, "ana", { type: "end-turn" }, dice());
    const beats = buildBeats(fresh(before, after), ctx(null), cash(before), cash(after));
    expect(beats.map((b) => b.lines.map((l) => l.type))).toEqual([["buy"], []]);
    expect(beats[0].cash).toEqual([{ playerId: "ana", amount: -100 }]);
    expect(beats[1]).toMatchObject({ cash: [], silent: true });
  });

  it("só a vez de outra pessoa é silenciosa; a minha vez não", () => {
    const turn = { seq: 9, round: 1, type: "turn-start", playerId: "bia" } as GameEvent;
    expect(buildBeats([turn], ctx("ana"), new Map(), new Map())[0].silent).toBe(true);
    expect(buildBeats([turn], ctx("bia"), new Map(), new Map())[0].silent).toBe(false);
  });

  it("fim da partida é um lance de resultado", () => {
    let state = game();
    const before = state;
    state = applyMagnataAction(state, "bia", { type: "resign" }, dice());
    const beats = buildBeats(fresh(before, state), ctx("ana"), cash(before), cash(state));
    expect(beats.at(-1)!.level).toBe("result");
    expect(beats.at(-1)!.actorId).toBe("ana");
  });
});
