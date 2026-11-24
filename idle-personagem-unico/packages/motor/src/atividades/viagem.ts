/** Duração das viagens entre locais (GDD §8.1). */
import { CATALOGO, obter } from "../dados";
import { viagemBaseMs } from "../dados/mapa";
import type { Modificador } from "../modificadores";
import { fator } from "../personagem/progressao";

/** Duração da viagem entre locais, com `duracao-viagem` e, entre locais naturais, `duracao-viagem-natural`. */
export function duracaoViagemMs(origemId: string, destinoId: string, mods: readonly Modificador[]): number {
  if (!CATALOGO.locais.has(origemId) || !CATALOGO.locais.has(destinoId)) return 0;
  const base = viagemBaseMs(origemId, destinoId);
  if (base === 0) return 0;
  const naturais = obter(CATALOGO.locais, origemId).natural && obter(CATALOGO.locais, destinoId).natural;
  const f = fator(mods, "duracao-viagem") * (naturais ? fator(mods, "duracao-viagem-natural") : 1);
  return Math.max(1_000, Math.round(base * f));
}
