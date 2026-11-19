import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BASES, MATERIAIS, RELIQUIAS } from '../motor/dados/itens';
import { MAPAS, MONSTROS } from '../motor/dados/mapas';
import { ORDEM_PERSONAGENS } from '../motor/dados/personagens';
import extras from './extras.json';
import manifesto from './folhas.json';

const publico = (caminho: string) => new URL(`../../public/${caminho}`, import.meta.url);

/** Largura e altura de um PNG, lidas do cabeçalho. */
function tamanhoPng(caminho: string): [number, number] {
  const b = readFileSync(publico(caminho));
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

describe('arte', () => {
  it('todo herói, monstro e mapa tem a sua imagem', () => {
    for (const id of ORDEM_PERSONAGENS) expect(manifesto, id).toHaveProperty(`heroi-${id}`);
    expect(manifesto).toHaveProperty('heroi-leao-chamas');
    for (const id of Object.keys(MONSTROS)) expect(manifesto, id).toHaveProperty(`monstro-${id}`);
    for (const m of MAPAS) expect(extras.cenarios, m.id).toHaveProperty(m.cenario);
  });

  it('as folhas existem e as animações apontam para quadros que cabem na imagem', () => {
    for (const [nome, f] of Object.entries(manifesto)) {
      expect(existsSync(publico(f.imagem)), nome).toBe(true);
      const [w, h] = tamanhoPng(f.imagem);
      expect(w, nome).toBe(f.largura * f.colunas);
      expect(h, nome).toBe(f.altura * Math.ceil(f.quadros / f.colunas));
      for (const lista of Object.values(f.animacoes)) for (const q of lista) expect(q, nome).toBeLessThan(f.quadros);
    }
    for (const c of Object.values(extras.cenarios)) expect(tamanhoPng(c.imagem)).toEqual([320, 180]);
  });

  it('relíquias e materiais têm ícone, e todo índice cabe na folha', () => {
    const folha = extras.icones['icones-reliquias'];
    const [w, h] = tamanhoPng(folha.imagem);
    const capacidade = (w / folha.tamanho) * (h / folha.tamanho);
    for (const r of RELIQUIAS) expect(folha.indices, r.id).toHaveProperty(r.id);
    for (const m of Object.keys(MATERIAIS)) expect(folha.indices, m).toHaveProperty(m);
    for (const [id, i] of Object.entries(folha.indices)) {
      expect(i, id).toBeLessThan(capacidade);
      expect(id in BASES || id in MATERIAIS, id).toBe(true);
    }
  });
});
