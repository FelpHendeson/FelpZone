/** Bake técnico: preserva PNG fonte, remove ilhas de alpha e alinha os pés.
 * Uso: node scripts/preparar-animacoes.mjs [raça...]
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const pasta = fileURLToPath(new URL('../apps/web/public/arte/', import.meta.url));
const racas = process.argv.slice(2);
await mkdir(`${pasta}animacoes-v1`, { recursive: true });
for (const raca of racas) {
  const fonte = sharp(`${pasta}animacoes-fontes/${raca}-v1.png`);
  const meta = await fonte.metadata();
  const quadros = [];
  for (let i = 0; i < 16; i++) {
    const left = Math.round((i % 4) * meta.width / 4), top = Math.round(Math.floor(i / 4) * meta.height / 4);
    const width = Math.round((i % 4 + 1) * meta.width / 4) - left;
    const height = Math.round((Math.floor(i / 4) + 1) * meta.height / 4) - top;
    const data = await fonte.clone().extract({ left, top, width, height }).ensureAlpha().raw().toBuffer();
    // Alpha duro mantém os pixels nítidos; maior componente descarta poeira isolada.
    const visto = new Uint8Array(width * height); let maior = [];
    for (let p = 0; p < visto.length; p++) {
      if (visto[p] || data[p * 4 + 3] < 128) continue;
      const fila = [p]; visto[p] = 1;
      for (let n = 0; n < fila.length; n++) {
        const q = fila[n], x = q % width, y = Math.floor(q / width);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy, k = yy * width + xx;
          if (xx < 0 || xx >= width || yy < 0 || yy >= height || visto[k] || data[k * 4 + 3] < 128) continue;
          visto[k] = 1; fila.push(k);
        }
      }
      if (fila.length > maior.length) maior = fila;
    }
    if (maior.length < 1000) throw new Error(`Quadro vazio: ${raca}/${i}`);
    const corpo = new Set(maior);
    let x0 = width, y0 = height, x1 = 0, y1 = 0;
    for (let p = 0; p < visto.length; p++) {
      data[p * 4 + 3] = corpo.has(p) ? 255 : 0;
      if (!corpo.has(p)) continue;
      x0 = Math.min(x0, p % width); x1 = Math.max(x1, p % width);
      y0 = Math.min(y0, Math.floor(p / width)); y1 = Math.max(y1, Math.floor(p / width));
    }
    // Pivô na base dos pés, sem recentrar o quadro pelo braço estendido.
    const pes = maior.filter(p => Math.floor(p / width) >= y1 - (y1 - y0) * .08).map(p => p % width);
    const pivot = (Math.min(...pes) + Math.max(...pes)) / 2;
    quadros.push({ data, width, height, x0, y0, x1, y1, pivot });
  }
  const alvo = raca === 'anao' ? 192 : raca === 'silfo' ? 210 : 224;
  const escala = Math.min(alvo / Math.max(...quadros.map(q => q.y1 - q.y0 + 1)),
    ...quadros.map(q => 114 / Math.max(q.pivot - q.x0, q.x1 - q.pivot)));
  const composicoes = [], medidas = [];
  for (let i = 0; i < 16; i++) {
    const q = quadros[i], w = Math.max(1, Math.round((q.x1 - q.x0 + 1) * escala)), h = Math.round((q.y1 - q.y0 + 1) * escala);
    const x = Math.round(128 - (q.pivot - q.x0) * escala), y = 244 - h;
    const input = await sharp(q.data, { raw: { width: q.width, height: q.height, channels: 4 } }).extract({ left: q.x0, top: q.y0, width: q.x1 - q.x0 + 1, height: q.y1 - q.y0 + 1 }).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
    composicoes.push({ input, left: i % 4 * 256 + x, top: Math.floor(i / 4) * 256 + y });
    medidas.push({ x, y, largura: w, altura: h });
  }
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#00000000' } }).composite(composicoes).webp({ lossless: true }).toFile(`${pasta}animacoes-v1/${raca}.webp`);
  await writeFile(`${pasta}animacoes-v1/${raca}.json`, JSON.stringify({ versao: 1, celula: 256, colunas: 4, linhas: ['repouso', 'caminhada', 'ataque', 'trabalho'], quadros: medidas }, null, 2) + '\n');
  console.log(`${raca}: 16 quadros, escala ${escala.toFixed(3)}`);
}
