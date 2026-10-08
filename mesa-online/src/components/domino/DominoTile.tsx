import type { Tile } from "@/games/domino/engine";

/** Posições dos pontos numa grade 3×3 (0 = canto de cima à esquerda). */
const PIPS_VERTICAL: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
/** Na pedra deitada, o 6 fica em duas fileiras. */
const PIPS_HORIZONTAL: Record<number, number[]> = { ...PIPS_VERTICAL, 2: [2, 6], 3: [2, 4, 6], 6: [0, 1, 2, 6, 7, 8] };

function Half({ value, horizontal }: { value: number; horizontal: boolean }) {
  const on = new Set((horizontal ? PIPS_HORIZONTAL : PIPS_VERTICAL)[value]);
  return (
    <span className="domino-half">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} className={on.has(index) ? "pip on" : "pip"} />
      ))}
    </span>
  );
}

/** Pedra de dominó desenhada com CSS: deitada na mesa, em pé na mão. */
export function DominoTile({
  tile,
  horizontal,
  size = "m",
  className = "",
}: {
  tile: Tile;
  horizontal: boolean;
  size?: "s" | "m" | "l";
  className?: string;
}) {
  return (
    <span className={`domino-tile ${horizontal ? "horizontal" : "vertical"} size-${size} ${className}`} aria-hidden>
      <Half value={tile[0]} horizontal={horizontal} />
      <span className="domino-bar" />
      <Half value={tile[1]} horizontal={horizontal} />
    </span>
  );
}
