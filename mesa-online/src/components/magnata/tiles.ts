import type { Tile } from "@/games/magnata/board";

/** Linha e coluna (1 a 11) de cada casa no tabuleiro quadrado. */
export function gridPosition(index: number): { row: number; col: number } {
  if (index <= 10) return { row: 11, col: 11 - index };
  if (index <= 20) return { row: 11 - (index - 10), col: 1 };
  if (index <= 30) return { row: 1, col: 1 + (index - 20) };
  return { row: 1 + (index - 30), col: 11 };
}

export function tileIcon(tile: Tile): string | null {
  switch (tile.kind) {
    case "start":
      return "🏁";
    case "jail":
      return "🔒";
    case "free-parking":
      return "🅿️";
    case "go-to-jail":
      return "👮";
    case "tax":
      return "💰";
    case "card":
      return tile.deck === "sorte" ? "❓" : "🎁";
    case "station":
      return "🚆";
    case "utility":
      return tile.name.includes("Água") ? "🚰" : "💡";
    case "street":
      return null;
  }
}

const PREFIXES = /^(rua|av\.|avenida|praça|travessa|beco|alameda|largo|estação|rodovia)\s+((da|do|das|dos|de)\s+)?/i;

/** Rótulo curto que cabe numa casa do tabuleiro no celular, no tema da partida. */
export function tileLabel(tile: Tile, themedName: string): string {
  if (tile.kind === "go-to-jail") return "Prisão!";
  if (tile.kind === "free-parking") return "Livre";
  if (tile.kind === "tax") return `$${tile.amount}`;
  return themedName.replace(PREFIXES, "");
}

export const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
