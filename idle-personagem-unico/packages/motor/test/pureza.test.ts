// Garante que o motor continue portátil: sem DOM, React/Next, Node nem Math.random.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pastaSrc = fileURLToPath(new URL("../src", import.meta.url));

function arquivos(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? arquivos(join(pasta, e.name)) : e.name.endsWith(".ts") ? [join(pasta, e.name)] : [],
  );
}

const proibidos: [string, RegExp][] = [
  ["import de react/next", /from\s+["'](react|react-dom|next)(\/[^"']*)?["']/],
  ["import do Node", /from\s+["'](node:[^"']+|fs|path|os|crypto|child_process|http|https|url|util|buffer|stream|events)["']/],
  ["window", /\bwindow\b/],
  ["document", /\bdocument\b/],
  ["localStorage", /\blocalStorage\b/],
  ["process", /\bprocess\./],
  ["Buffer", /\bBuffer\b/],
  ["require", /\brequire\(/],
  ["Math.random", /Math\.random/],
];

describe("pureza do motor", () => {
  const lista = arquivos(pastaSrc);

  it("encontra os arquivos do motor", () => {
    expect(lista.length).toBeGreaterThan(0);
  });

  for (const arquivo of lista) {
    it(`${arquivo.slice(pastaSrc.length + 1)} não usa nada proibido`, () => {
      const codigo = readFileSync(arquivo, "utf8");
      for (const [nome, regex] of proibidos) {
        expect(regex.test(codigo), `${nome} em ${arquivo}`).toBe(false);
      }
    });
  }
});
