/** Paletas fixas de aparência (GDD §4.1) [Proposta]. */
import type { CorPaleta } from "./tipos";

export const CORES_CABELO: readonly CorPaleta[] = [
  { id: "preto", nome: "Preto", hex: "#1b1a1f" },
  { id: "castanho-escuro", nome: "Castanho-escuro", hex: "#3b2618" },
  { id: "castanho", nome: "Castanho", hex: "#6b4226" },
  { id: "ruivo", nome: "Ruivo", hex: "#a8431f" },
  { id: "acobreado", nome: "Acobreado", hex: "#c06a2b" },
  { id: "loiro", nome: "Loiro", hex: "#d9b45a" },
  { id: "platinado", nome: "Platinado", hex: "#e8e2cf" },
  { id: "grisalho", nome: "Grisalho", hex: "#9a9a9e" },
  { id: "branco", nome: "Branco", hex: "#f4f2ee" },
  { id: "azul-noite", nome: "Azul-noite", hex: "#2a3a6b" },
  { id: "verde-musgo", nome: "Verde-musgo", hex: "#4a6b3a" },
  { id: "vinho", nome: "Vinho", hex: "#6b1f35" },
];

export const CORES_ROUPA: readonly CorPaleta[] = [
  { id: "linho", nome: "Linho", hex: "#d8cbb0" },
  { id: "couro", nome: "Couro", hex: "#7a5233" },
  { id: "carvao", nome: "Carvão", hex: "#33313a" },
  { id: "musgo", nome: "Musgo", hex: "#4f6a3c" },
  { id: "floresta", nome: "Floresta", hex: "#2f5a3f" },
  { id: "oceano", nome: "Oceano", hex: "#2b5d7a" },
  { id: "anil", nome: "Anil", hex: "#36407a" },
  { id: "ameixa", nome: "Ameixa", hex: "#5b3566" },
  { id: "carmesim", nome: "Carmesim", hex: "#8f2430" },
  { id: "ocre", nome: "Ocre", hex: "#b5832d" },
  { id: "cinza-pedra", nome: "Cinza-pedra", hex: "#76767c" },
  { id: "osso", nome: "Osso", hex: "#ece3d0" },
];
