// Como a moeda do site aparece na tela. Funcoins são moeda virtual de jogo:
// não se compram, não se sacam e não valem dinheiro.

export const FUNCOIN = "🪙";

/** "1.250 Funcoins", "1 Funcoin". */
export function funcoins(amount: number): string {
  return `${amount.toLocaleString("pt-BR")} ${Math.abs(amount) === 1 ? "Funcoin" : "Funcoins"}`;
}

/** Preço da jogada por pessoa, para o menu e o lobby. */
export function priceLabel(stake: number): string {
  return stake ? `${funcoins(stake)} por pessoa` : "Grátis";
}
