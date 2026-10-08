import { SUIT_SYMBOLS } from "@/games/truco/describe";
import { rankOf, suitOf, type Card } from "@/games/truco/engine";

/** Carta de baralho desenhada com CSS; `null` é uma carta coberta (de costas). */
export function PlayingCard({ card, size = "m" }: { card: Card | null; size?: "s" | "m" | "l" }) {
  if (!card) {
    return <span className={`playing-card back size-${size}`} aria-hidden />;
  }
  const suit = suitOf(card);
  const red = suit === "o" || suit === "c";
  return (
    <span className={`playing-card size-${size}${red ? " red" : ""}`} aria-hidden>
      <span className="card-rank">{rankOf(card)}</span>
      <span className="card-suit">{SUIT_SYMBOLS[suit]}</span>
    </span>
  );
}
