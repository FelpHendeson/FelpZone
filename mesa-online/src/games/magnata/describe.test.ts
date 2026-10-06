import { describe, expect, it } from "vitest";
import { applyMagnataAction, createMagnataGame, legalActions, type GameEvent } from "./engine";
import { cardText, describeEvent } from "./describe";
import { THEMES } from "./themes";

const people = new Map([
  ["ana", { name: "Ana", avatar: "🦊" }],
  ["bia", { name: "Bia", avatar: "🐼" }],
]);
const ctx = (meId: string | null = "ana", theme = THEMES.classico) => ({ theme, people, meId });
const event = (payload: Record<string, unknown>) => ({ seq: 1, round: 1, ...payload }) as GameEvent;

describe("descrição dos acontecimentos", () => {
  it("compra e aluguel trazem nomes, casa no tema, valores e motivo", () => {
    const buy = describeEvent(event({ type: "buy", playerId: "ana", tile: 39, price: 400 }), ctx("bia", THEMES.maceio));
    expect(buy).toMatchObject({ level: "card", text: "Ana comprou Ponta Verde por $400.", involvesMe: false });
    const rent = describeEvent(
      event({ type: "rent", playerId: "ana", ownerId: "bia", tile: 1, amount: 4, basis: "group" }),
      ctx("bia"),
    );
    expect(rent.text).toBe("Ana parou em Rua das Flores, de Bia, e pagou $4 (aluguel dobrado: o dono tem a cor completa).");
    expect(rent.tone).toBe("good");
  });

  it("dívida com o banco e com pessoas usa a preposição certa", () => {
    expect(describeEvent(event({ type: "debt", playerId: "ana", creditorId: null, amount: 200, shortfall: 50 }), ctx()).text).toContain(
      "deve $200 ao banco",
    );
    expect(describeEvent(event({ type: "debt", playerId: "ana", creditorId: "bia", amount: 200, shortfall: 50 }), ctx()).text).toContain(
      "deve $200 a Bia",
    );
  });

  it("cartas com destino usam o nome da casa no tema", () => {
    expect(cardText("sorte", "sorte-diamante", THEMES.brasil)).toBe("Visite São Paulo.");
    expect(cardText("sorte", "sorte-diamante", THEMES.classico)).toBe("Visite Av. Diamante.");
  });

  it("todo acontecimento de uma partida real tem descrição", () => {
    let seed = 5;
    const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    let game = createMagnataGame(
      [
        { id: "ana", name: "Ana", color: "#000" },
        { id: "bia", name: "Bia", color: "#000" },
      ],
      rng,
      { roundLimit: 40, credit: true },
    );
    const seen = new Set<string>();
    while (game.phase !== "finished") {
      const legal = legalActions(game, game.currentPlayerId).filter((a) => a.type !== "resign");
      game = applyMagnataAction(game, game.currentPlayerId, legal[Math.floor(rng() * legal.length)], rng);
      for (const e of game.events) {
        const notice = describeEvent(e, ctx());
        expect(notice.title.length).toBeGreaterThan(0);
        expect(notice.text).not.toContain("undefined");
        seen.add(e.type);
      }
    }
    expect(seen.size).toBeGreaterThan(10);
  });
});
