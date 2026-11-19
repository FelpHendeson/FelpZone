import { describe, expect, it } from 'vitest';
import { novoJogo } from '../motor/jogo';
import type { Estado, Item } from '../motor/tipos';
import { diferencaStats, espacoAlvo, FILTRO_PADRAO, filtrarItens, heroisParaItem, lerPreferencias, ordenarItens, pedeConfirmacao } from './mochila';

let n = 0;
function item(base: string, extra: Partial<Item> = {}): Item {
  n += 1;
  return { uid: `t${n}`, base, raridade: 'comum', nivel: 1, melhoria: 0, afixos: [], ...extra };
}

function estado(): Estado {
  const e = novoJogo(1);
  e.herois[0].equipamento = {};
  e.inventario = [];
  return e;
}

describe('heroisParaItem', () => {
  it('espaço vazio: qualquer peça usável é possível melhoria', () => {
    const e = estado();
    expect(heroisParaItem(e, item('espada'))).toEqual(['leao']);
  });

  it('não sugere o que o herói não pode usar', () => {
    const e = estado();
    expect(heroisParaItem(e, item('cajado'))).toEqual([]);
    expect(heroisParaItem(e, item('espada', { nivel: 40 }))).toEqual([]);
  });

  it('compara a soma dos atributos com a peça equipada', () => {
    const e = estado();
    e.herois[0].equipamento.arma = item('espada', { raridade: 'raro' });
    expect(heroisParaItem(e, item('espada'))).toEqual([]);
    expect(heroisParaItem(e, item('espada', { raridade: 'lendario' }))).toEqual(['leao']);
  });

  it('acessórios usam o espaço vazio ou o mais fraco', () => {
    const e = estado();
    const fraco = item('anel');
    e.herois[0].equipamento.acessorio1 = item('anel', { raridade: 'epico' });
    e.herois[0].equipamento.acessorio2 = fraco;
    expect(espacoAlvo(e.herois[0], item('anel'))).toEqual({ slot: 'acessorio2', atual: fraco });
    expect(heroisParaItem(e, item('anel', { raridade: 'raro' }))).toEqual(['leao']);
  });
});

describe('diferencaStats', () => {
  it('sem peça equipada, a diferença é o próprio item', () => {
    const d = diferencaStats(item('espada'));
    expect(Object.values(d).every((v) => v! > 0)).toBe(true);
  });

  it('mostra perda quando a peça nova é pior', () => {
    const d = diferencaStats(item('espada'), item('espada', { raridade: 'lendario' }));
    expect(Object.values(d).every((v) => v! < 0)).toBe(true);
  });
});

describe('filtros e ordenação', () => {
  const a = item('espada', { raridade: 'comum', nivel: 3 });
  const b = item('peitoral-pesada', { raridade: 'epico', nivel: 1, melhoria: 2 });
  const c = item('anel', { raridade: 'raro', nivel: 5 });
  const lista = [a, b, c];

  it('filtra por espaço e raridade', () => {
    const e = estado();
    expect(filtrarItens(e, lista, { ...FILTRO_PADRAO, espaco: 'armadura' })).toEqual([b]);
    expect(filtrarItens(e, lista, { ...FILTRO_PADRAO, raridades: ['raro', 'comum'] })).toEqual([a, c]);
  });

  it('filtra pelo que o herói pode usar', () => {
    const e = estado();
    const cajado = item('cajado');
    expect(filtrarItens(e, [...lista, cajado], { ...FILTRO_PADRAO, heroi: 'leao' })).not.toContain(cajado);
  });

  it('ordena por recentes, raridade, nível e melhoria', () => {
    expect(ordenarItens(lista, 'recentes')).toEqual([c, b, a]);
    expect(ordenarItens(lista, 'raridade')).toEqual([b, c, a]);
    expect(ordenarItens(lista, 'nivel')).toEqual([c, a, b]);
    expect(ordenarItens(lista, 'melhoria')[0]).toBe(b);
    expect(lista).toEqual([a, b, c]);
  });

  it('raro ou melhor pede confirmação', () => {
    expect(pedeConfirmacao(a)).toBe(false);
    expect(pedeConfirmacao(c)).toBe(true);
  });
});

describe('lerPreferencias', () => {
  it('ignora texto quebrado e valores desconhecidos', () => {
    expect(lerPreferencias('{')).toEqual({ filtro: FILTRO_PADRAO, ordem: 'recentes' });
    const p = lerPreferencias(JSON.stringify({ ordem: 'xyz', filtro: { espaco: 'arma', raridades: ['raro', 'mitico'], soMelhorias: true } }));
    expect(p.ordem).toBe('recentes');
    expect(p.filtro).toEqual({ espaco: 'arma', raridades: ['raro'], heroi: null, soMelhorias: true });
  });
});
