import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { ORDEM_RACAS_ARTE } from "./arte";

describe("personagens raster produzidos", () => {
  it("oito corpos/retratos têm detalhe, transparência e dimensões válidas", async () => {
    for (const id of ORDEM_RACAS_ARTE) for (const retrato of [false, true]) {
      const path = fileURLToPath(new URL(`../../public/arte/personagens-v2/${id}${retrato ? "-retrato" : ""}.png`, import.meta.url));
      const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(info.width).toBe(retrato ? 128 : 256); expect(info.height).toBe(info.width);
      const cores = new Set<string>(); let opacos = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i + 3]! > 64) { opacos++; cores.add(`${data[i]},${data[i + 1]},${data[i + 2]}`); }
      expect(cores.size).toBeGreaterThan(64); expect(opacos).toBeGreaterThan(500); expect(opacos).toBeLessThan(info.width * info.height);
    }
  });
});
