import { describe, expect, it } from "vitest";
import { BOARD, groupTiles, type OwnableTile } from "@/games/magnata/board";
import {
  GameRuleError,
  applyMagnataAction,
  createMagnataGame,
  getPlayer,
  legalActions,
  netWorth,
  type MagnataAction,
  type MagnataState,
} from "@/games/magnata/engine";
import { actorsNeeded } from "@/rooms/room";
import { BOTS, BOT_KINDS, botAction } from "./strategies";
import type { BotKind } from "./types";

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALL_TILE_ACTIONS: MagnataAction["type"][] = ["build", "sell-building", "mortgage", "unmortgage"];

function checkInvariants(state: MagnataState) {
  for (const player of state.players) {
    if (player.bankrupt) {
      expect(Object.values(state.properties).some((p) => p.owner === player.id)).toBe(false);
    } else if (!(state.phase === "debt" && state.currentPlayerId === player.id)) {
      expect(player.cash).toBeGreaterThanOrEqual(0);
    }
  }
  for (const [index, property] of Object.entries(state.properties)) {
    expect(property.houses).toBeGreaterThanOrEqual(0);
    expect(property.houses).toBeLessThanOrEqual(5);
    if (property.mortgaged) expect(property.houses).toBe(0);
    const tile = BOARD[Number(index)];
    if (tile.kind === "street") {
      const houses = groupTiles(tile.group).map((i) => state.properties[i].houses);
      expect(Math.max(...houses) - Math.min(...houses)).toBeLessThanOrEqual(1);
    }
  }
  if (state.phase === "finished") expect(state.winnerId).not.toBeNull();
}

function play(kinds: BotKind[], seed: number, turnLimit: number | null, verify = false, credit = false) {
  const rng = seeded(seed);
  const seats = kinds.map((kind, index) => ({ id: `${kind}-${index}`, name: kind, color: "#000" }));
  const kindOf = new Map(seats.map((seat, index) => [seat.id, kinds[index]]));
  let state = createMagnataGame(seats, rng, { turnLimit, credit });
  let actions = 0;
  let illegal = 0;
  while (state.phase !== "finished" && actions < 50_000) {
    const me = state.currentPlayerId;
    const legal = legalActions(state, me);
    const chosen = BOTS[kindOf.get(me)!].decide({ state, me, legal, rng });
    // Lances e propostas de troca não são enumerados em `legal`: vale o que o motor aceita.
    try {
      applyMagnataAction(state, me, chosen, seeded(1));
    } catch {
      illegal += 1;
    }
    if (verify) {
      for (const action of legal) expect(() => applyMagnataAction(state, me, action, seeded(1))).not.toThrow();
      for (const type of ALL_TILE_ACTIONS) {
        for (const tile of [1, 5, 12, 39]) {
          const listed = legal.some((a) => a.type === type && "tile" in a && a.tile === tile);
          if (!listed) {
            expect(() => applyMagnataAction(state, me, { type, tile } as MagnataAction, seeded(1))).toThrow(GameRuleError);
          }
        }
      }
    }
    state = applyMagnataAction(state, me, botAction(kindOf.get(me)!, state, me, rng), rng);
    if (verify) checkInvariants(state);
    actions += 1;
  }
  return { state, actions, illegal, kindOf };
}

describe("motor para robôs", () => {
  it("legalActions concorda com o motor e as invariantes se mantêm", () => {
    for (let seed = 1; seed <= 6; seed += 1) {
      const { state, illegal } = play(["investidor", "conservador", "colecionador", "investidor"], seed, 120, true);
      expect(state.phase).toBe("finished");
      expect(illegal).toBe(0);
    }
  }, 120_000);

  it("limite de turnos termina a partida e premia o maior patrimônio", () => {
    const { state } = play(["conservador", "conservador", "conservador", "conservador"], 3, 8);
    expect(state.phase).toBe("finished");
    expect(state.endReason).toBe("turn-limit");
    expect(state.turnNumber).toBe(8);
    const best = Math.max(...state.players.map((p) => netWorth(state, p.id)));
    expect(netWorth(state, state.winnerId!)).toBe(best);
  });

  it("netWorth soma dinheiro, propriedades, hipotecas e construções", () => {
    const state = createMagnataGame(
      [
        { id: "a", name: "A", color: "#000" },
        { id: "b", name: "B", color: "#000" },
      ],
      seeded(1),
    );
    state.properties[1] = { owner: "a", houses: 2, mortgaged: false };
    state.properties[39] = { owner: "a", houses: 0, mortgaged: true };
    const tile39 = BOARD[39] as OwnableTile;
    expect(netWorth(state, "a")).toBe(getPlayer(state, "a").cash + 60 + 2 * 50 + (tile39.price - 220));
  });
});

describe("estratégias", () => {
  it("toda mesa de robôs termina com um vencedor e sem ações ilegais", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const kinds = BOT_KINDS.concat(BOT_KINDS[seed % 3]);
      const { state, illegal } = play(kinds, seed, 400);
      expect(state.phase).toBe("finished");
      expect(state.winnerId).not.toBeNull();
      expect(illegal).toBe(0);
    }
  }, 120_000);

  it("com empréstimos ligados, continuam legais e as partidas terminam", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const { state, illegal } = play(BOT_KINDS.concat("investidor"), seed, 400, seed <= 3, true);
      expect(state.phase).toBe("finished");
      expect(illegal).toBe(0);
    }
  }, 120_000);

  it("pegam empréstimo só para completar uma cor", () => {
    const state = createMagnataGame(
      [
        { id: "bot", name: "Bot", color: "#000" },
        { id: "x", name: "X", color: "#000" },
      ],
      seeded(4),
      { credit: true },
    );
    state.currentPlayerId = "bot";
    state.phase = "buy";
    for (const tile of [37, 21, 23]) state.properties[tile].owner = "bot";
    getPlayer(state, "bot").position = 39;
    getPlayer(state, "bot").cash = 250;
    const ctx = { state, me: "bot", legal: legalActions(state, "bot"), rng: seeded(1) };
    expect(BOTS.colecionador.decide(ctx)).toEqual({ type: "take-loan", amount: 200 });
    expect(BOTS.investidor.decide(ctx)).toEqual({ type: "take-loan", amount: 200 });
    expect(BOTS.conservador.decide(ctx)).toEqual({ type: "decline" });
  });

  it("com leilão e trocas, cada um age na hora certa e as partidas terminam", () => {
    let trades = 0;
    let auctions = 0;
    for (let seed = 1; seed <= 15; seed += 1) {
      const rng = seeded(seed);
      const kinds = BOT_KINDS.concat("colecionador");
      const kindOf = (id: string) => id.split("-")[0] as BotKind;
      let state = createMagnataGame(kinds.map((kind, i) => ({ id: `${kind}-${i}`, name: kind, color: "#000" })), rng, {
        roundLimit: 40,
        auctions: true,
      });
      let seen = 0;
      for (let step = 0; step < 30_000 && state.phase !== "finished"; step += 1) {
        const me = actorsNeeded(state)[0];
        const chosen = BOTS[kindOf(me)].decide({ state, me, legal: legalActions(state, me), rng });
        // O que o robô escolhe tem que ser aceito pelo motor.
        expect(() => applyMagnataAction(state, me, chosen, seeded(1))).not.toThrow();
        state = applyMagnataAction(state, me, botAction(kindOf(me), state, me, rng), rng);
        for (const event of state.events) {
          if (event.seq <= seen) continue;
          if (event.type === "trade-accepted") trades += 1;
          if (event.type === "auction-end" && event.winnerId) auctions += 1;
        }
        seen = state.eventSeq;
        checkInvariants(state);
      }
      expect(state.phase).toBe("finished");
    }
    expect(trades).toBeGreaterThan(0);
    expect(auctions).toBeGreaterThan(0);
  }, 120_000);

  it("aceitam troca em que os dois completam uma cor e recusam entregar cor de graça", () => {
    const state = createMagnataGame(
      [
        { id: "bot", name: "Bot", color: "#000" },
        { id: "x", name: "X", color: "#000" },
      ],
      seeded(5),
    );
    // Bot tem 1 e 39; X tem 3 e 37: cada um completa uma cor com a rua do outro.
    for (const [tile, owner] of [[1, "bot"], [39, "bot"], [3, "x"], [37, "x"]] as const) state.properties[tile].owner = owner;
    state.currentPlayerId = "x";
    state.phase = "trade";
    state.trade = { fromId: "x", toId: "bot", give: { tiles: [3], cash: 0 }, get: { tiles: [39], cash: 0 }, resumePhase: "roll" };
    const ctx = () => ({ state, me: "bot", legal: legalActions(state, "bot"), rng: seeded(1) });
    // Troca desigual: entrega Av. Diamante (cor azul) por Beco do Sol (cor marrom).
    expect(BOTS.conservador.decide(ctx())).toEqual({ type: "reject-trade" });
    state.trade = { fromId: "x", toId: "bot", give: { tiles: [], cash: 10 }, get: { tiles: [39], cash: 0 }, resumePhase: "roll" };
    for (const kind of BOT_KINDS) expect(BOTS[kind].decide(ctx())).toEqual({ type: "reject-trade" });
  });

  it("pagam a dívida hipotecando em vez de falir", () => {
    for (const kind of BOT_KINDS) {
      const state = createMagnataGame(
        [
          { id: "bot", name: "Bot", color: "#000" },
          { id: "x", name: "X", color: "#000" },
        ],
        seeded(2),
      );
      state.currentPlayerId = "bot";
      state.phase = "debt";
      state.debt = { amount: 100, creditorId: "x", resume: null };
      getPlayer(state, "bot").cash = 50;
      state.properties[39].owner = "bot";
      const legal = legalActions(state, "bot");
      expect(BOTS[kind].decide({ state, me: "bot", legal, rng: seeded(1) })).toEqual({ type: "mortgage", tile: 39 });
    }
  });

  it("Colecionador compra a rua que completa a cor; Conservador guarda caixa", () => {
    const state = createMagnataGame(
      [
        { id: "bot", name: "Bot", color: "#000" },
        { id: "x", name: "X", color: "#000" },
      ],
      seeded(3),
    );
    state.currentPlayerId = "bot";
    state.phase = "buy";
    state.properties[1].owner = "bot";
    getPlayer(state, "bot").position = 3;
    getPlayer(state, "bot").cash = 70;
    const ctx = { state, me: "bot", legal: legalActions(state, "bot"), rng: seeded(1) };
    expect(BOTS.colecionador.decide(ctx)).toEqual({ type: "buy" });
    expect(BOTS.conservador.decide(ctx)).toEqual({ type: "decline" });
  });
});
