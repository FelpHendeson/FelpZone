import { describe, expect, it } from 'vitest';
import { largura, altura } from './sprite';
import { EMOJI_UI, NOMES_ICONE_UI, SPRITES_UI } from './ui';

describe('ícones de interface', () => {
  it('todo ícone tem emoji de reserva', () => {
    for (const nome of NOMES_ICONE_UI) expect(EMOJI_UI[nome], nome).toBeTruthy();
  });

  it('os sprites que existem têm o mesmo tamanho e são quadrados', () => {
    const sprites = Object.values(SPRITES_UI);
    const lados = new Set(sprites.map((s) => `${largura(s!)}x${altura(s!)}`));
    expect(lados.size).toBeLessThanOrEqual(1);
    for (const s of sprites) expect(largura(s!)).toBe(altura(s!));
  });
});
