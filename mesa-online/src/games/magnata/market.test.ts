import type { MagnataView } from "./engine";
import { describe, expect, it } from "vitest";
import { STARTING_CASH } from "./board";
import { applyMagnataAction, createMagnataGame, getPlayer, legalActions, type MagnataAction, type MagnataState } from "./engine";
import { publicRoom } from "@/rooms/public";
import { createRoom } from "@/rooms/room";

const SEATS = ["ana", "bia", "caio"].map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1), color: "#000" }));
const rng = () => 0.5;

function game(auctions = true): MagnataState {
  const state = createMagnataGame(SEATS, () => 0.999, { auctions });
  state.players.sort((a, b) => SEATS.findIndex((s) => s.id === a.id) - SEATS.findIndex((s) => s.id === b.id));
  state.currentPlayerId = "ana";
  return state;
}
const act = (state: MagnataState, id: string, action: MagnataAction) => applyMagnataAction(state, id, action, rng);

function atAuction() {
  const state = game();
  state.players[0].position = 6;
  state.phase = "buy";
  return act(state, "ana", { type: "decline" });
}

describe("leilão", () => {
  it("recusar abre leilão para todos; o maior lance leva e paga ao banco", () => {
    let state = atAuction();
    expect(state.phase).toBe("auction");
    expect(state.auction!.pending).toEqual(["ana", "bia", "caio"]);
    state = act(state, "bia", { type: "bid", amount: 80 });
    state = act(state, "ana", { type: "bid", amount: 0 });
    expect(() => act(state, "bia", { type: "bid", amount: 90 })).toThrow("já deu");
    state = act(state, "caio", { type: "bid", amount: 120 });
    expect(state.properties[6].owner).toBe("caio");
    expect(getPlayer(state, "caio").cash).toBe(STARTING_CASH - 120);
    expect(state.phase).toBe("end");
    expect(state.events.at(-1)).toMatchObject({ type: "auction-end", winnerId: "caio", amount: 120 });
  });

  it("empate fica com quem vem primeiro a partir da vez", () => {
    let state = atAuction();
    state = act(state, "caio", { type: "bid", amount: 50 });
    state = act(state, "bia", { type: "bid", amount: 50 });
    state = act(state, "ana", { type: "bid", amount: 10 });
    expect(state.properties[6].owner).toBe("bia");
  });

  it("ninguém dá lance: a casa continua à venda", () => {
    let state = atAuction();
    for (const id of ["ana", "bia", "caio"]) state = act(state, id, { type: "bid", amount: 0 });
    expect(state.properties[6].owner).toBeNull();
    expect(state.phase).toBe("end");
  });

  it("lance acima do dinheiro é recusado; quem desiste sai do leilão", () => {
    let state = atAuction();
    expect(() => act(state, "bia", { type: "bid", amount: STARTING_CASH + 10 })).toThrow("dinheiro");
    state = act(state, "ana", { type: "bid", amount: 0 });
    state = act(state, "bia", { type: "bid", amount: 30 });
    state = act(state, "caio", { type: "resign" });
    expect(state.properties[6].owner).toBe("bia");
  });

  it("os lances ficam secretos na visão pública até o fim", () => {
    let state = atAuction();
    state = act(state, "bia", { type: "bid", amount: 777 > STARTING_CASH ? 1 : 777 });
    const room = { ...createRoom({ code: "AAAAA", gameId: "magnata", hostId: "ana", hostName: "Ana", now: 0 }), status: "playing" as const, game: state };
    const text = JSON.stringify(publicRoom(room));
    expect(text).not.toContain("777");
    expect((publicRoom(room).game as MagnataView).auction!.pending).toEqual(["ana", "caio"]);
  });

  it("sem a regra de leilão, recusar só passa adiante", () => {
    const state = game(false);
    state.players[0].position = 6;
    state.phase = "buy";
    expect(act(state, "ana", { type: "decline" }).phase).toBe("end");
  });
});

describe("trocas", () => {
  function withProperties() {
    const state = game();
    state.properties[1].owner = "ana";
    state.properties[3].owner = "bia";
    state.properties[39].owner = "bia";
    return state;
  }
  const offer = (give: number[], giveCash: number, get: number[], getCash: number) =>
    ({ type: "propose-trade", toId: "bia", give: { tiles: give, cash: giveCash }, get: { tiles: get, cash: getCash } }) as MagnataAction;

  it("proposta aceita troca casas e dinheiro e devolve a vez à fase anterior", () => {
    let state = withProperties();
    state = act(state, "ana", offer([1], 50, [3], 0));
    expect(state.phase).toBe("trade");
    expect(legalActions(state, "bia").map((a) => a.type)).toEqual(expect.arrayContaining(["accept-trade", "reject-trade"]));
    expect(() => act(state, "ana", { type: "roll" })).toThrow();
    state = act(state, "bia", { type: "accept-trade" });
    expect(state.properties[1].owner).toBe("bia");
    expect(state.properties[3].owner).toBe("ana");
    expect(getPlayer(state, "ana").cash).toBe(STARTING_CASH - 50);
    expect(getPlayer(state, "bia").cash).toBe(STARTING_CASH + 50);
    expect(state.phase).toBe("roll");
  });

  it("recusa e cancelamento não mudam nada", () => {
    let state = withProperties();
    state = act(state, "ana", offer([], 100, [39], 0));
    state = act(state, "bia", { type: "reject-trade" });
    expect(state.properties[39].owner).toBe("bia");
    state = act(state, "ana", offer([], 100, [39], 0));
    state = act(state, "ana", { type: "cancel-trade" });
    expect(state.trade).toBeNull();
    expect(state.phase).toBe("roll");
  });

  it("valida dono, dinheiro, construções e quem responde", () => {
    const state = withProperties();
    expect(() => act(state, "ana", offer([3], 0, [], 0))).toThrow("mudou de dono");
    expect(() => act(state, "ana", offer([1], STARTING_CASH + 1, [], 0))).toThrow("não tem esse dinheiro");
    expect(() => act(state, "ana", offer([], 0, [], 0))).toThrow("vazia");
    state.properties[37].owner = "bia";
    state.properties[39].houses = 1;
    expect(() => act(state, "ana", offer([], 500, [37], 0))).toThrow("construções");
    const pending = act(withProperties(), "ana", offer([1], 0, [3], 0));
    expect(() => act(pending, "caio", { type: "accept-trade" })).toThrow("não é para você");
  });

  it("revalida no aceite: se o dinheiro sumiu, a troca não acontece", () => {
    let state = withProperties();
    state = act(state, "ana", offer([1], 0, [3], 300));
    getPlayer(state, "bia").cash = 100;
    expect(() => act(state, "bia", { type: "accept-trade" })).toThrow("não tem esse dinheiro");
  });

  it("quem sai da partida cancela a proposta pendente", () => {
    let state = withProperties();
    state = act(state, "ana", offer([1], 0, [3], 0));
    state = act(state, "bia", { type: "resign" });
    expect(state.trade).toBeNull();
    expect(state.phase).toBe("roll");
  });
});
