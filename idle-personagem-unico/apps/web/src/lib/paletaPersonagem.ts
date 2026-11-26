import { CATALOGO, type ParametrosMiniatura } from "@idle-pu/motor";

export const BASE_PERSONAGEM = "/arte/personagens-material-v2.webp";
export const RECORTES_RETRATO: Readonly<Record<string, { x: number; y: number; lado: number }>> = {
  humano: { x: .2, y: 0, lado: .6 }, anao: { x: .13, y: .12, lado: .74 },
  elfo: { x: .2, y: 0, lado: .6 }, orc: { x: .16, y: 0, lado: .68 },
  lobisomem: { x: .12, y: .02, lado: .76 }, "sangue-palido": { x: .18, y: 0, lado: .64 },
  draconato: { x: .14, y: 0, lado: .72 }, silfo: { x: .12, y: 0, lado: .76 },
};
export function coresDoPersonagem(p: ParametrosMiniatura) {
  const cabelo = CATALOGO.coresCabelo.get(p.corCabeloId), roupa = CATALOGO.coresRoupa.get(p.corRoupaId);
  if (!CATALOGO.racas.has(p.racaId) || !CATALOGO.cores.has(p.coreId) || !cabelo || !roupa) throw new Error("Aparência desconhecida.");
  return { cabelo: cabelo.hex, roupa: roupa.hex, chave: `${p.racaId}:${p.corCabeloId}:${p.corRoupaId}` };
}
type Hsl = readonly [number, number, number];
function hsl(r: number, g: number, b: number): Hsl {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  if (!d) return [0, 0, l];
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? ((b - r) / d + 2) : ((r - g) / d + 4);
  return [h * 60, d / (1 - Math.abs(2 * l - 1)), l];
}
function daCor(hex: string): Hsl {
  if (!/^#[a-f\d]{6}$/i.test(hex)) throw new Error("Cor inválida.");
  return hsl(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
}
function rgb([h, s, l]: Hsl): readonly [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const v = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return v.map((n) => Math.round((n + m) * 255)) as unknown as readonly [number, number, number];
}
/** Palette swap do material: mantém volume/sombras; pixels de pele/couro/metal ficam intactos. */
export function aplicarPaleta(base: Uint8ClampedArray, largura: number, cabeloHex: string, roupaHex: string, racaId?: string): Uint8ClampedArray {
  if (!Number.isSafeInteger(largura) || largura < 1 || base.length % (largura * 4)) throw new Error("Quadro inválido.");
  const cabelo = daCor(cabeloHex), roupa = daCor(roupaHex), altura = base.length / (largura * 4);
  const saida = new Uint8ClampedArray(base);
  for (let i = 0; i < base.length; i += 4) {
    if (!base[i + 3]) continue;
    const [h, s, l] = hsl(base[i]!, base[i + 1]!, base[i + 2]!);
    const y = Math.floor(i / 4 / largura);
    const x = (i / 4) % largura;
    const tecidoPermitido = racaId !== "silfo" || (y >= altura * .43 && x > largura * .34 && x < largura * .72);
    const material = h >= 275 && h <= 335 && s > .35 && l > .1 ? cabelo : h >= 170 && h <= 225 && s > .22 && l > .08 && y >= altura * .25 && tecidoPermitido ? roupa : null;
    if (!material) continue;
    const referencia = material === cabelo ? .45 : .4;
    const luz = l <= referencia ? material[2] * (.35 + .65 * l / referencia) : material[2] + (1 - material[2]) * ((l - referencia) / (1 - referencia)) * .65;
    const cor = rgb([material[0], material[1], Math.max(.025, Math.min(.98, luz))]);
    saida[i] = cor[0]; saida[i + 1] = cor[1]; saida[i + 2] = cor[2];
  }
  return saida;
}
