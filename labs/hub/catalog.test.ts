import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECTIONS } from './catalog.ts';

const root = join(import.meta.dirname, '..');

describe('catálogo', () => {
  it('cada lab listado tem a sua página', () => {
    for (const lab of SECTIONS.flatMap((section) => section.labs)) {
      expect(existsSync(join(root, lab.path, 'index.html')), lab.path).toBe(true);
    }
  });

  it('cada lab fica dentro da pasta da sua seção', () => {
    for (const section of SECTIONS) {
      for (const lab of section.labs) expect(lab.path.startsWith(`${section.id}/`), lab.path).toBe(true);
    }
  });
});
