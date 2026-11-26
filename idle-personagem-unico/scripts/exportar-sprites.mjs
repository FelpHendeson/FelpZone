/** Empacota a base imagegen e exporta a aparência raster real, sem redesenhar personagens. */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { aplicarPaleta, RECORTES_RETRATO } from "../apps/web/src/lib/paletaPersonagem.ts";
import { ORDEM_RACAS_ARTE } from "../apps/web/src/lib/arte.ts";
const raiz = new URL("../apps/web/public/arte/", import.meta.url);
const base = fileURLToPath(new URL("personagens-material-v2.png", raiz));
const webp = fileURLToPath(new URL("personagens-material-v2.webp", raiz));
await sharp(base).webp({ lossless: true, effort: 6 }).toFile(webp);
const original = await sharp(base).ensureAlpha().raw().toBuffer();
const convertido = await sharp(webp).ensureAlpha().raw().toBuffer();
if (original.length !== convertido.length) throw new Error("Dimensões alteradas.");
for (let i = 0; i < original.length; i += 4) if (original[i + 3] !== convertido[i + 3] || (original[i + 3] && (original[i] !== convertido[i] || original[i + 1] !== convertido[i + 1] || original[i + 2] !== convertido[i + 2]))) throw new Error("WebP mudou a arte original.");
const { width, height } = await sharp(base).metadata();
const destino = new URL("personagens-v2/", raiz); await mkdir(destino, { recursive: true });
for (let i = 0; i < ORDEM_RACAS_ARTE.length; i++) {
  const id = ORDEM_RACAS_ARTE[i], col = i % 4, row = Math.floor(i / 4);
  const left = Math.round(col * width / 4), top = Math.round(row * height / 2);
  const w = Math.round((col + 1) * width / 4) - left, h = Math.round((row + 1) * height / 2) - top;
  const rgba = await sharp(base).extract({ left, top, width: w, height: h }).ensureAlpha().raw().toBuffer();
  const pixels = aplicarPaleta(new Uint8ClampedArray(rgba), w, "#1b1a1f", "#d8cbb0", id);
  const imagem = sharp(Buffer.from(pixels), { raw: { width: w, height: h, channels: 4 } });
  await imagem.clone().resize(256, 256, { kernel: "nearest" }).png().toFile(fileURLToPath(new URL(`${id}.png`, destino)));
  const q = RECORTES_RETRATO[id];
  await imagem.clone().extract({ left: Math.round(q.x * w), top: Math.round(q.y * h), width: Math.round(q.lado * w), height: Math.round(q.lado * h) }).resize(128, 128, { kernel: "nearest" }).png().toFile(fileURLToPath(new URL(`${id}-retrato.png`, destino)));
}
await writeFile(new URL("LEIA-ME.txt", destino), "Exemplos com cabelo preto e roupa linho. O jogo aplica a paleta pessoal do save. Retrato e corpo derivam da mesma base imagegen. Movimento de respiracao, sem spritesheet de caminhada.\n");
console.log("Exportadas oito raças, corpos/retratos detalhados e WebP lossless conferido.");
