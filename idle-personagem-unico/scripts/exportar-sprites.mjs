/** Exporta a arte vetorial modular nativa para spritesheets SVG/PNG de exemplo. */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CATALOGO, gerarMiniaturaSvg, gerarSpritePersonagemSvg } from "../packages/motor/src/index.ts";

const destino = new URL("../apps/web/public/arte/sprites-v1/", import.meta.url);
await mkdir(destino, { recursive: true });
for (const racaId of CATALOGO.racas.keys()) {
  const parametros = { racaId, coreId: "andarilho", corCabeloId: "castanho", corRoupaId: "linho" };
  const svg = gerarSpritePersonagemSvg(parametros);
  await writeFile(new URL(`${racaId}.svg`, destino), svg);
  await sharp(Buffer.from(svg)).png({ palette: true }).toFile(fileURLToPath(new URL(`${racaId}.png`, destino)));
  await sharp(Buffer.from(gerarMiniaturaSvg(parametros))).png({ palette: true }).toFile(fileURLToPath(new URL(`${racaId}-retrato.png`, destino)));
}
console.log(`Exportadas ${CATALOGO.racas.size} raças: spritesheets 96×64 (2 quadros de 48×64) e retratos 64×64.`);

// Empacotamento lossless da arte gerada: dimensões, alpha e pixels visíveis intactos.
for (const nome of ["racas", "locais", "limiar"]) {
  const png = new URL(`../apps/web/public/arte/${nome}-v1.png`, import.meta.url);
  const webp = new URL(`../apps/web/public/arte/${nome}-v1.webp`, import.meta.url);
  await sharp(fileURLToPath(png)).webp({ lossless: true, effort: 6 }).toFile(fileURLToPath(webp));
  const a = await sharp(fileURLToPath(png)).ensureAlpha().raw().toBuffer();
  const b = await sharp(fileURLToPath(webp)).ensureAlpha().raw().toBuffer();
  if (a.length !== b.length) throw new Error(`Dimensões alteradas em ${nome}.`);
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] !== b[i + 3] || (a[i + 3] > 0 && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]))) throw new Error(`Pixels visíveis alterados em ${nome}.`);
  }
}
console.log("Arte WebP lossless conferida pixel a pixel; originais PNG preservados.");
