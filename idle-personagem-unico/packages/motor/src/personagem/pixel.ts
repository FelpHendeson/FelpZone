/** Arte modular em grade inteira; não altera personagem, tempo ou RNG. */
import { CATALOGO, obter } from "../dados";
import type { SimboloCore, TracoVisual } from "../dados/tipos";
import type { ParametrosMiniatura } from "./aparencia";

const CONTORNO = "#241b2b";
const OSSO = "#ece3d0";
const r = (x: number, y: number, w: number, h: number, cor: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${cor}"/>`;
function tom(hex: string, fator: number): string {
  return `#${[1, 3, 5].map((i) => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * fator)).toString(16).padStart(2, "0")).join("")}`;
}
export const PIXEL_CORE: Readonly<Record<SimboloCore, readonly string[]>> = {
  "lua-negra": ["..xxx..", ".xx....", "xx.....", "xx.....", "xx.....", ".xx....", "..xxx.."],
  chama: ["...x...", "..xx...", "..xxx..", ".xxxxx.", ".xx.xx.", "..xxx..", "...x..."],
  raio: ["...xxx.", "..xxx..", ".xxx...", "xxxxxx.", "...xx..", "..xx...", ".xx...."],
  montanha: ["...x...", "..xxx..", "..x.x..", ".xx.xx.", ".x...x.", "xx...xx", "xxxxxxx"],
  sol: ["...x...", ".x...x.", "..xxx..", "x.xxx.x", "..xxx..", ".x...x.", "...x..."],
  garra: [".x.x.x.", ".x.x.x.", ".x.x.x.", ".x.x.x.", ".x.x.x.", "..x.x..", "......."],
  olho: [".......", "..xxx..", ".x...x.", "x..x..x", ".x...x.", "..xxx..", "......."],
  espiral: [".xxxxx.", "xx...xx", "x.xxx.x", "x.x.x.x", "x...x.x", "xxxxx.x", "......x"],
  martelo: ["xxxxxx.", "xxxxxx.", "..xx...", "..xx...", "..xx...", "..xx...", "..xx..."],
  trilha: ["....xxx", "...xx..", "..xx...", "...xx..", "..xx...", ".xx....", "xx....."],
  pata: [".x.x.x.", "xx.x.xx", ".......", "..xxx..", ".xxxxx.", ".xxxxx.", "..x.x.."],
  vazio: ["..xxx..", ".x...x.", "x.....x", "x.....x", "x.....x", ".x...x.", "..xxx.."],
};
function glifo(simbolo: SimboloCore, x: number, y: number): string {
  return PIXEL_CORE[simbolo].flatMap((linha, j) => [...linha].map((v, i) => v === "x" ? r(x + i, y + j, 1, 1, OSSO) : "")).join("");
}
function cabeca(traco: TracoVisual, pele: string, cabelo: string): string {
  const escuro = tom(pele, .74), claro = tom(pele, 1.12), mecha = tom(cabelo, 1.3);
  const partes: string[] = [];
  if (traco === "orelhas-pontudas") partes.push(r(-4, 3, 5, 2, CONTORNO), r(-3, 4, 4, 2, pele), r(13, 3, 5, 2, CONTORNO), r(13, 4, 4, 2, pele));
  if (traco === "orelhas-de-lobo") partes.push(r(0, -5, 2, 7, CONTORNO), r(2, -3, 2, 5, cabelo), r(12, -5, 2, 7, CONTORNO), r(10, -3, 2, 5, cabelo), r(1, -3, 1, 3, escuro), r(12, -3, 1, 3, escuro));
  if (traco === "chifres") partes.push(r(-1, -4, 2, 6, CONTORNO), r(0, -3, 2, 5, OSSO), r(2, 0, 2, 3, OSSO), r(13, -4, 2, 6, CONTORNO), r(12, -3, 2, 5, OSSO), r(10, 0, 2, 3, OSSO));
  if (traco === "antenas") partes.push(r(2, -5, 1, 6, mecha), r(0, -6, 3, 2, claro), r(11, -5, 1, 6, mecha), r(11, -6, 3, 2, claro));
  partes.push(r(3, 0, 8, 1, CONTORNO), r(1, 1, 12, 2, CONTORNO), r(0, 3, 14, 8, CONTORNO), r(1, 11, 12, 2, CONTORNO), r(3, 13, 8, 1, CONTORNO));
  partes.push(r(1, 3, 12, 8, escuro), r(2, 3, 10, 9, pele), r(4, 12, 6, 1, pele), r(2, 5, 2, 4, claro), r(10, 8, 2, 3, escuro));
  partes.push(r(2, 1, 10, 3, cabelo), r(1, 3, 12, 2, cabelo), r(0, 4, 2, 3, cabelo), r(12, 4, 2, 3, cabelo), r(2, 4, 3, 2, cabelo), r(4, 1, 5, 1, mecha));
  partes.push(r(3, 6, 3, 1, tom(cabelo, .8)), r(9, 6, 3, 1, tom(cabelo, .8)), r(3, 7, 3, 2, OSSO), r(9, 7, 3, 2, OSSO), r(4, 7, 2, 2, CONTORNO), r(9, 7, 2, 2, CONTORNO), r(7, 9, 1, 1, escuro), r(5, 11, 4, 1, CONTORNO));
  if (traco === "barba") partes.push(r(1, 10, 3, 4, cabelo), r(10, 10, 3, 4, cabelo), r(2, 12, 10, 3, cabelo), r(4, 15, 6, 2, cabelo), r(5, 14, 2, 2, mecha), r(4, 10, 6, 1, tom(cabelo, .7)));
  if (traco === "presas" || traco === "caninos") partes.push(r(4, 10, 1, 3, OSSO), r(9, 10, 1, 3, OSSO));
  if (traco === "orelhas-de-lobo") partes.push(r(4, 9, 6, 2, claro), r(6, 9, 2, 1, CONTORNO), r(5, 12, 4, 1, escuro));
  if (traco === "chifres") partes.push(r(2, 9, 2, 2, escuro), r(10, 9, 2, 2, escuro), r(5, 10, 4, 1, claro));
  return partes.join("");
}
function paleta(p: ParametrosMiniatura) {
  return { raca: obter(CATALOGO.racas, p.racaId), core: obter(CATALOGO.cores, p.coreId), cabelo: obter(CATALOGO.coresCabelo, p.corCabeloId).hex, roupa: obter(CATALOGO.coresRoupa, p.corRoupaId).hex };
}
export function retratoPixel(p: ParametrosMiniatura): string {
  const { raca, core, cabelo, roupa } = paleta(p);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64" shape-rendering="crispEdges">${r(0, 0, 32, 32, tom(core.visual.cor, .55))}${r(1, 1, 30, 30, core.visual.cor)}${r(4, 25, 24, 7, CONTORNO)}${r(6, 25, 20, 7, roupa)}${r(8, 25, 3, 7, tom(roupa, 1.18))}${r(14, 20, 5, 6, raca.visual.pele)}<g transform="translate(9 7)">${cabeca(raca.visual.traco, raca.visual.pele, cabelo)}</g>${r(23, 0, 9, 9, CONTORNO)}${glifo(core.visual.simbolo, 24, 1)}</svg>`;
}

/** Duas células de 48×64 lado a lado; frame 1 mexe braços/pernas, sem arma inventada. */
export function gerarSpritePersonagemSvg(p: ParametrosMiniatura): string {
  const { raca, core, cabelo, roupa } = paleta(p);
  const quadros = [0, 1].map((n) => {
    const baixo = raca.id === "anao" || raca.id === "silfo";
    const y = baixo ? 16 : 11;
    const largura = raca.id === "orc" ? 22 : raca.id === "elfo" || raca.id === "silfo" ? 16 : 18;
    const x = 24 - largura / 2;
    const tronco = baixo ? 35 : 30;
    const braco = n ? -3 : 0;
    const corpo = [r(x - 1, tronco, largura + 2, 18, CONTORNO), r(x, tronco + 1, largura, 15, roupa), r(x + 2, tronco + 2, 3, 11, tom(roupa, 1.18)), r(x + largura - 3, tronco + 2, 3, 13, tom(roupa, .7)), r(21, y + 12, 6, tronco - y - 10, raca.visual.pele), r(x, 45, largura, 3, "#543b31"), r(23, 45, 3, 3, core.visual.cor), r(23, 45, 2, 1, OSSO)];
    corpo.push(r(x + 2, tronco - 1, largura - 4, 2, CONTORNO), r(x + 1, tronco + 2, 2, 10, tom(roupa, 1.25)), r(20, tronco + 1, 2, 3, "#b69a72"), r(26, tronco + 1, 2, 3, "#b69a72"), r(22, tronco + 4, 4, 1, "#b69a72"), r(23, tronco + 5, 1, 6, tom(roupa, .6)), r(24, tronco + 6, 1, 1, OSSO), r(24, tronco + 9, 1, 1, OSSO), r(x + 2, 42, 2, 2, tom(roupa, .7)), r(x + largura - 5, 41, 2, 3, tom(roupa, .6)), r(x, 44, largura, 4, "#543b31"), r(x, 44, largura, 1, "#8c6644"), r(23, 44, 4, 4, "#d9a441"), r(24, 45, 2, 2, core.visual.cor));
    corpo.push(r(17, 48, 6, 9, "#403143"), r(25, 48, 6, 9, "#403143"), r(16 + n, 56, 8, 4, CONTORNO), r(25 - n, 56, 8, 4, CONTORNO), r(17 + n, 56, 6, 2, "#70503b"), r(26 - n, 56, 6, 2, "#70503b"));
    corpo.push(r(x - 4, tronco + 3, 4, 10, CONTORNO), r(x - 3, tronco + 4, 3, 6, roupa), r(x - 3, tronco + 10, 3, 4, raca.visual.pele), r(x + largura, tronco + 3 + braco, 4, 10, CONTORNO), r(x + largura, tronco + 4 + braco, 3, 6, roupa), r(x + largura, tronco + 10 + braco, 3, 4, raca.visual.pele));
    if (raca.id === "draconato") corpo.unshift(r(32, 48, 6, 4, tom(raca.visual.pele, .7)), r(37, 49, 5, 3, raca.visual.pele), r(41, 46, 3, 5, raca.visual.pele));
    return `<g data-quadro="${n}" transform="translate(${n * 48} 0)">${corpo.join("")}<g transform="translate(17 ${y})">${cabeca(raca.visual.traco, raca.visual.pele, cabelo)}</g></g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 64" width="96" height="64" shape-rendering="crispEdges">${quadros.join("")}</svg>`;
}
