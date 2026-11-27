import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ORDEM_RACAS_ARTE } from "./arte";
import { aplicarPaleta } from "./paletaPersonagem";

describe("folhas de animação produzidas", () => {
  it("oito raças têm 16 poses distintas, margens, apoio consistente e paleta preservando alpha", async () => {
    for (const id of ORDEM_RACAS_ARTE) {
      const arquivo = fileURLToPath(new URL(`../../public/arte/animacoes-v1/${id}.webp`, import.meta.url));
      const folha = sharp(arquivo), meta = await folha.metadata();
      expect([meta.width, meta.height, meta.hasAlpha]).toEqual([1024, 1024, true]);
      const medidas = JSON.parse(await readFile(arquivo.replace(".webp", ".json"), "utf8"));
      expect(medidas.quadros).toHaveLength(16);
      for (const q of medidas.quadros) { expect(q.x).toBeGreaterThan(3); expect(q.x + q.largura).toBeLessThan(253); expect(q.y + q.altura).toBe(244); }
      for (let linha = 0; linha < 4; linha++) {
        const hashes = new Set<string>();
        for (let quadro = 0; quadro < 4; quadro++) {
          const data = await folha.clone().extract({ left: quadro * 256, top: linha * 256, width: 256, height: 256 }).ensureAlpha().raw().toBuffer();
          hashes.add(createHash("sha256").update(data).digest("hex"));
          const base = new Uint8ClampedArray(data), personalizada = aplicarPaleta(base, 256, "#1b1a1f", "#d8cbb0", id);
          let cabelo = 0, tecido = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (personalizada[i] !== base[i] || personalizada[i+1] !== base[i+1] || personalizada[i+2] !== base[i+2]) {
              if (base[i]! > base[i+1]!) cabelo++; else tecido++;
            }
            if (personalizada[i+3] !== base[i+3]) throw new Error(`Alpha alterado: ${id}/${linha}/${quadro}`);
          }
          expect(cabelo).toBeGreaterThan(150); expect(tecido).toBeGreaterThan(300);
        }
        expect(hashes.size).toBe(4);
      }
    }
  }, 30000);
});
