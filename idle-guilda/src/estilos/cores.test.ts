import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DADOS_RARIDADE } from '../motor/dados/itens';
import { COR_ELEMENTO } from '../motor/dados/personagens';
import { variaveisDeCor } from './cores';

describe('variaveisDeCor', () => {
  const vars = variaveisDeCor();

  it('gera uma variável por raridade e por elemento', () => {
    for (const [id, r] of Object.entries(DADOS_RARIDADE)) expect(vars[`--r-${id}`]).toBe(r.cor);
    for (const [id, cor] of Object.entries(COR_ELEMENTO)) expect(vars[`--el-${id}`]).toBe(cor);
  });

  it('bate com os valores padrão de tokens.css', () => {
    const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
    for (const [nome, valor] of Object.entries(vars)) {
      expect(css, nome).toContain(`${nome}: ${valor};`);
    }
  });
});
