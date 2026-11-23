import { NOME_RARIDADE, type Compatibilidade, type Raridade } from "@idle-pu/motor";

export const ROTULO_COMPATIBILIDADE: Record<Compatibilidade, string> = {
  alta: "Afinidade alta",
  media: "Afinidade média",
  excentrica: "Excêntrica",
};

export function rotuloRaridade(r: Raridade): string {
  return NOME_RARIDADE[r];
}

export const ROTULO_NATUREZA: Record<string, string> = {
  fisica: "Física",
  magica: "Mágica",
  espiritual: "Espiritual",
  mental: "Mental",
  oficio: "Ofício",
};

export const ROTULO_MODO: Record<string, string> = { passiva: "Passiva", ativa: "Ativa" };
