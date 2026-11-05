import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;
const SECTIONS = ['basilis', 'geral'];

// Cada lab é uma pasta <seção>/<lab>/ com index.html; o build encontra todos sozinho.
function labPages(): Record<string, string> {
  const pages: Record<string, string> = { index: resolve(root, 'index.html') };
  for (const section of SECTIONS) {
    const dir = join(root, section);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const page = join(dir, entry.name, 'index.html');
      if (entry.isDirectory() && existsSync(page)) pages[`${section}/${entry.name}`] = page;
    }
  }
  return pages;
}

export default defineConfig({
  build: { rollupOptions: { input: labPages() } },
});
