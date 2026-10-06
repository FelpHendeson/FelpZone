import { describe, expect, it } from "vitest";
import { BOARD, isOwnable } from "./board";
import { applyMagnataAction, createMagnataGame, legalActions } from "./engine";
import { THEMES, THEME_IDS, themeOf, tileNameIn } from "./themes";

describe("temas", () => {
  it("cada tema nomeia todas as propriedades, sem repetir nomes", () => {
    const ownable = BOARD.map((tile, index) => (isOwnable(tile) ? index : -1)).filter((index) => index >= 0);
    for (const id of THEME_IDS) {
      const names = ownable.map((index) => THEMES[id].tiles[index]);
      expect(names.every(Boolean), id).toBe(true);
      expect(new Set(names).size, id).toBe(names.length);
    }
  });

  it("tema desconhecido cai para o Clássico", () => {
    expect(themeOf("naruto").id).toBe("classico");
    expect(tileNameIn(themeOf("maceio"), 39)).toBe("Ponta Verde");
    expect(tileNameIn(themeOf("maceio"), 0)).toBe("Partida");
  });

  it("mesma semente e mesmas ações dão o mesmo jogo em qualquer tema", () => {
    const play = (themeId: string) => {
      let seed = 42;
      const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
      const seats = ["a", "b", "c"].map((id) => ({ id, name: id, color: "#000" }));
      let game = createMagnataGame(seats, rng, { themeId, roundLimit: 15 });
      while (game.phase !== "finished") {
        const legal = legalActions(game, game.currentPlayerId).filter((a) => a.type !== "resign");
        game = applyMagnataAction(game, game.currentPlayerId, legal[0], rng);
      }
      return game;
    };
    const classic = play("classico");
    for (const id of THEME_IDS) {
      expect({ ...play(id), themeId: "x" }).toEqual({ ...classic, themeId: "x" });
    }
  });
});
