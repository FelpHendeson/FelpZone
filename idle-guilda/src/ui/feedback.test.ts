import { describe, expect, it } from 'vitest';
import { recrutar } from '../motor/acoes';
import { INVENTARIO_MAXIMO } from '../motor/dados/itens';
import { avancar, novoJogo } from '../motor/jogo';
import type { Estado } from '../motor/tipos';
import { diferencaDeTick } from './feedback';

function jogar(e: Estado, segundos: number): Estado {
  return avancar(e, segundos);
}

describe('diferencaDeTick', () => {
  it('encontra itens novos e não conta a renovação da Loja como venda', () => {
    const a = novoJogo(7);
    const b = jogar(a, 20 * 60);
    const d = diferencaDeTick(a, b);
    const antigos = new Set(a.inventario.map((i) => i.uid));
    expect(d.novos.every((i) => !antigos.has(i.uid))).toBe(true);
    expect(d.novos.length).toBe(b.inventario.length - a.inventario.length);
    expect(d.vendidos).toBe(0);
  });

  it('com a mochila cheia, conta os itens vendidos na hora', () => {
    let a = jogar(novoJogo(3), 30 * 60);
    while (a.inventario.length < INVENTARIO_MAXIMO) a.inventario.push({ ...(a.inventario[0] ?? a.loja.itens[0]), uid: `x${a.inventario.length}` });
    const b = jogar(a, 10 * 60);
    const d = diferencaDeTick(a, b);
    expect(d.novos).toEqual([]);
    expect(d.vendidos).toBeGreaterThan(0);
  });

  it('detecta quem subiu de nível', () => {
    let a = novoJogo(5);
    a.ouro = 1e6;
    const r = recrutar(a, 'quentin');
    if (r.ok) a = r.estado;
    const b = jogar(a, 30 * 60);
    const d = diferencaDeTick(a, b);
    expect(d.niveis.find((x) => x.id === 'leao')?.nivel).toBe(b.herois[0].nivel);
    expect(d.niveis.length).toBeGreaterThan(0);
  });
});
