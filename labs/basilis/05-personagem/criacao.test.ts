import { describe, expect, it } from 'vitest';
import { frameRect } from '../04-animacao/animation.ts';
import { CAMADA_BY_ID, partesEscondidas, pilha, type Peca } from './camadas.ts';
import { comporFolha, comporQuadro, opcoesDoCorpo } from './compor.ts';
import { ESCOLHAS, ESCOLHA_BY_ID, combinacoesDeForma, escolher, receitaDeCriacao, sortear } from './criacao.ts';
import { MANEQUIM_DEFAULTS, bodyGeometry, type ManequimOptions } from './manequim.ts';
import { MOLDE_FORMAT, decodeTone } from './molde.ts';
import { PECA_BY_ID, folhasDaPeca, pecasDoSlot } from './pecas.ts';
import { MOLDE_POSES } from './poses.ts';
import type { IndexedImage } from './raster.ts';
import { RECEITA_PADRAO, lerReceita, pecasDaReceita, receitaJSON, type Receita } from './receita.ts';

const opcoes = (id: string) => ESCOLHA_BY_ID[id].opcoes.map((opcao) => opcao.valor);
const ESTILOS = opcoes('cabelo-estilo');

/** Um sorteio repetível (gerador congruencial). */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

/** Os pixels de um quadro de uma folha. */
function frameOf(sheet: IndexedImage, clipName: string, index = 0): number[] {
  const { x, y, width, height } = frameRect(MOLDE_FORMAT, MOLDE_FORMAT.clips[clipName], index);
  const pixels: number[] = [];
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) pixels.push(sheet.get(x + i, y + j));
  return pixels;
}

describe('opções da criação (seção 6)', () => {
  it('tem as opções do documento: 2 corpos, 8 peles, 4 olhos em 8 cores, 3 sobrancelhas, 8 cabelos com careca em 10 cores, barba e marcas', () => {
    expect(opcoes('corpo')).toEqual(['corpo-a', 'corpo-b']);
    expect(opcoes('pele')).toHaveLength(8);
    expect(opcoes('olhos-forma')).toHaveLength(4);
    expect(opcoes('olhos-cor')).toHaveLength(8);
    expect(opcoes('sobrancelhas')).toHaveLength(3);
    expect(ESTILOS).toHaveLength(8);
    expect(ESTILOS).toContain('careca');
    expect(opcoes('cabelo-cor')).toHaveLength(10);
    expect(opcoes('barba')).toEqual(['', 'barba-curta', 'bigode', 'barba-cheia']);
    expect(opcoes('marcas')).toEqual(['', 'sardas', 'cicatriz', 'pintura']);
    // A roupa da Terra é fixa: só as cores dela se escolhem.
    expect(ESCOLHAS.filter((escolha) => escolha.grupo === 'roupa').every((escolha) => escolha.tipo === 'rampa')).toBe(true);
    expect(opcoes('linhagem')).toEqual(['', 'lobo-de-mykol']);
  });

  it('toda opção de peça é uma peça do slot certo, e toda opção de cor é uma rampa do canal certo', () => {
    for (const escolha of ESCOLHAS) {
      for (const { valor } of escolha.opcoes) {
        if (!valor) continue;
        const receita = escolher(RECEITA_PADRAO, escolha.id, valor);
        expect(escolha.ler(receita), `${escolha.id}=${valor}`).toBe(valor);
        expect(lerReceita(receitaJSON(receita)).erros, `${escolha.id}=${valor}`).toEqual([]);
      }
    }
    expect(() => escolher(RECEITA_PADRAO, 'cabelo-estilo', 'moicano')).toThrow(/opção desconhecida/);
  });

  it('todas as combinações de opção geram receita válida, com a roupa da Terra, e voltam iguais pelo JSON', () => {
    const cores = ESCOLHAS.filter((escolha) => escolha.tipo === 'rampa');
    let count = 0;
    for (const forma of combinacoesDeForma()) {
      // As cores andam junto com as formas: cada opção de cor aparece em centenas de combinações.
      let receita = forma;
      cores.forEach((escolha, k) => {
        receita = escolha.escrever(receita, escolha.opcoes[(count + k * 3) % escolha.opcoes.length].valor);
      });
      const text = receitaJSON(receita);
      const back = lerReceita(text);
      expect(back.erros).toEqual([]);
      expect(back.receita).toEqual(receita);
      expect(receitaJSON(back.receita!)).toBe(text);
      expect(receita.roupa).toBe('roupa-da-terra');
      expect(receita.equipamento).toEqual({});
      count++;
    }
    expect(count).toBe(2 * 4 * 3 * 4 * 8 * 4 * 2);
  });

  it('nenhuma combinação passa de 15 cores (as partes que aparecem, com qualquer rampa)', () => {
    // Os códigos de tom de cada parte, por tipo de corpo; uma combinação usa a união das partes visíveis.
    const codes = new Map<string, Set<number>>();
    const codesOf = (peca: Peca, parte: string, manequim: ManequimOptions) => {
      const key = `${peca.id}/${parte}/${manequim.silhueta}`;
      if (!codes.has(key)) codes.set(key, folhasDaPeca(peca, manequim)[parte].colorsUsed());
      return codes.get(key)!;
    };
    let worst = 0;
    for (const receita of combinacoesDeForma()) {
      const pecas = pecasDaReceita(receita);
      const manequim = opcoesDoCorpo(receita, MANEQUIM_DEFAULTS);
      const hidden = partesEscondidas(pecas);
      const used = new Set<number>();
      for (const peca of pecas) {
        for (const parte of peca.partes) if (!hidden.has(`${peca.id}/${parte.id}`)) for (const code of codesOf(peca, parte.id, manequim)) used.add(code);
      }
      worst = Math.max(worst, used.size);
    }
    expect(worst).toBeLessThanOrEqual(15);
  });

  it('cada opção de peça se distingue das outras do mesmo slot no tamanho do jogo', () => {
    for (const escolha of ESCOLHAS.filter((candidate) => candidate.tipo === 'peca')) {
      // A linhagem e o rabo de cavalo se veem melhor de lado; o resto, de frente.
      const seen = new Map<string, string>();
      for (const { valor } of escolha.opcoes) {
        const receita = escolha.escrever(RECEITA_PADRAO, valor);
        const key = ['idle-down', 'idle-side'].map((clip) => comporQuadro(receita, clip, 0).data.join(',')).join('|');
        expect(seen.get(key), `${escolha.id}: "${valor}" igual a "${seen.get(key)}"`).toBeUndefined();
        seen.set(key, valor);
      }
    }
  });

  it('o quadro avulso das miniaturas é o mesmo quadro da folha montada', () => {
    for (const receita of [RECEITA_PADRAO, { ...RECEITA_PADRAO, corpo: 'corpo-b', linhagem: 'lobo-de-mykol', cabelo: { estilo: 'cabelo-rabo', cor: 'ruivo' } }]) {
      const sheet = comporFolha(receita);
      for (const clip of ['idle-down', 'walk-up', 'slash-a-side', 'death']) {
        expect(Array.from(comporQuadro(receita, clip, 1).data), clip).toEqual(frameOf(sheet, clip, 1));
      }
    }
  });
});

describe('sortear', () => {
  it('sorteia receitas válidas, com a roupa da Terra, sem mexer na linhagem; toda opção pode sair', () => {
    const random = seeded(7);
    const seen = new Map(ESCOLHAS.map((escolha) => [escolha.id, new Set<string>()]));
    for (const linhagem of [null, 'lobo-de-mykol']) {
      let receita: Receita = { ...RECEITA_PADRAO, linhagem, equipamento: { cabeca: 'capuz' } };
      for (let i = 0; i < 400; i++) {
        receita = sortear(receita, random);
        expect(lerReceita(receitaJSON(receita)).erros).toEqual([]);
        expect(receita.linhagem).toBe(linhagem);
        expect(receita.roupa).toBe('roupa-da-terra');
        expect(receita.equipamento).toEqual({});
        for (const escolha of ESCOLHAS) seen.get(escolha.id)!.add(escolha.ler(receita));
      }
    }
    for (const escolha of ESCOLHAS) expect(seen.get(escolha.id)!.size, escolha.id).toBe(escolha.opcoes.length);
  });

  it('a criação sempre veste a roupa da Terra e tira os equipamentos', () => {
    const receita = receitaDeCriacao({ ...RECEITA_PADRAO, roupa: null, equipamento: { cabeca: 'chapeu-de-palha' }, rampas: {} });
    expect(receita.roupa).toBe('roupa-da-terra');
    expect(receita.equipamento).toEqual({});
    expect(receita.rampas).toEqual(RECEITA_PADRAO.rampas);
  });
});

describe('linhagem: lobo de Mykol', () => {
  const lobo = PECA_BY_ID['lobo-de-mykol'];
  const com = (estilo: string): Receita => ({ ...RECEITA_PADRAO, linhagem: 'lobo-de-mykol', cabelo: { estilo, cor: 'castanho-2' } });

  it('orelhas e olhos de lobo na camada da linhagem, cauda atrás do corpo', () => {
    const camadas = Object.fromEntries(lobo.partes.map((parte) => [parte.id, parte.camada]));
    expect(camadas).toEqual({ orelhas: 'linhagem', 'olhos-de-lobo': 'linhagem', cauda: 'atras-do-corpo' });
    expect(CAMADA_BY_ID.linhagem.grupo).toBe('personalização');
    // Na pilha de frente, as orelhas vêm depois do rosto e antes da roupa e do cabelo.
    const order = pilha(pecasDaReceita(com('cabelo-curto')), 'down').map(({ peca, parte }) => `${peca.id}/${parte.id}`);
    const at = (key: string) => order.indexOf(key);
    expect(at('lobo-de-mykol/cauda')).toBeLessThan(at('corpo-a/corpo'));
    expect(at('sobrancelhas-1/sobrancelhas')).toBeLessThan(at('lobo-de-mykol/orelhas'));
    expect(at('lobo-de-mykol/orelhas')).toBeLessThan(at('roupa-da-terra/camiseta'));
    expect(at('roupa-da-terra/camiseta')).toBeLessThan(at('cabelo-curto/cabelo-topo'));
  });

  it('os olhos de lobo escondem os olhos escolhidos (qualquer forma), mas não as sobrancelhas', () => {
    for (const forma of opcoes('olhos-forma')) {
      const shown = pilha(pecasDaReceita({ ...com('cabelo-curto'), olhos: { forma, cor: 'ambar' } }), 'down').map(({ parte }) => parte.id);
      expect(shown, forma).not.toContain('olhos');
      expect(shown).toContain('olhos-de-lobo');
      expect(shown).toContain('sobrancelhas');
    }
    // Sem a linhagem, os olhos voltam.
    expect(pilha(pecasDaReceita(RECEITA_PADRAO), 'down').map(({ parte }) => parte.id)).toContain('olhos');
  });

  it('com qualquer cabelo, as orelhas aparecem; o cabelo cobre a base delas e, careca, elas aparecem inteiras', () => {
    const ears = folhasDaPeca(lobo, MANEQUIM_DEFAULTS).orelhas;
    for (const estilo of ESTILOS) {
      const sheet = comporFolha(com(estilo));
      for (const clip of ['idle-down', 'idle-up', 'idle-side']) {
        const { x, y, width, height } = frameRect(MOLDE_FORMAT, MOLDE_FORMAT.clips[clip], 0);
        let total = 0;
        let visible = 0;
        for (let j = y; j < y + height; j++) {
          for (let i = x; i < x + width; i++) {
            if (!ears.get(i, j)) continue;
            total++;
            if (sheet.get(i, j) === ears.get(i, j)) visible++;
          }
        }
        expect(total).toBeGreaterThan(0);
        if (estilo === 'careca') expect(visible, `${clip} careca`).toBe(total);
        else {
          expect(visible, `${clip} ${estilo}`).toBeGreaterThanOrEqual(Math.ceil(total / 3));
          expect(visible, `${clip} ${estilo}: o cabelo cobre a base`).toBeLessThan(total);
        }
      }
    }
  });

  it('o capuz esconde as orelhas; o chapéu, não', () => {
    const shown = (cabeca: string) => pilha(pecasDaReceita({ ...com('cabelo-curto'), equipamento: { cabeca } }), 'down').map(({ parte }) => parte.id);
    expect(shown('capuz')).not.toContain('orelhas');
    expect(shown('chapeu-de-palha')).toContain('orelhas');
  });
});

describe('corpo B', () => {
  it('o tronco e os ombros são mais estreitos de frente, com o mesmo quadril, a mesma cabeça e as mesmas mãos', () => {
    for (const name of ['idle-down', 'walk-up', 'slash-a-down']) {
      for (const pose of MOLDE_POSES[name]) {
        const a = bodyGeometry(pose, 'a');
        const b = bodyGeometry(pose, 'b');
        expect(b.torso.width).toBe(a.torso.width - 2);
        expect(b.shorts).toEqual(a.shorts);
        expect(b.head).toEqual(a.head);
        expect(b.mainArm.hand).toEqual(a.mainArm.hand);
        expect(Math.abs(b.mainArm.shoulder.x - 16)).toBeLessThan(Math.abs(a.mainArm.shoulder.x - 16));
      }
    }
  });

  it('a roupa da Terra segue o corpo B e cobre cada pixel da roupa de baixo dele', () => {
    const b = opcoesDoCorpo({ ...RECEITA_PADRAO, corpo: 'corpo-b' }, MANEQUIM_DEFAULTS);
    expect(b.silhueta).toBe('b');
    const shorts = folhasDaPeca(PECA_BY_ID['corpo-b'], b)['roupa-de-baixo'];
    const roupa = Object.values(folhasDaPeca(PECA_BY_ID['roupa-da-terra'], b));
    let holes = 0;
    for (let i = 0; i < shorts.data.length; i++) if (shorts.data[i] && roupa.every((sheet) => !sheet.data[i])) holes++;
    expect(holes).toBe(0);
    // E a camiseta do corpo B é outra (mais estreita) que a do corpo A.
    const shirtA = folhasDaPeca(PECA_BY_ID['roupa-da-terra'], MANEQUIM_DEFAULTS).camiseta.data.filter(Boolean).length;
    const shirtB = folhasDaPeca(PECA_BY_ID['roupa-da-terra'], b).camiseta.data.filter(Boolean).length;
    expect(shirtB).toBeLessThan(shirtA);
  });

  it('as peças de corpo dizem o tipo de corpo; o corpo B não deixa pele aparecer pela roupa no tronco', () => {
    expect(pecasDoSlot('corpo').map((peca) => peca.silhueta)).toEqual(['a', 'b']);
    const receita = { ...RECEITA_PADRAO, corpo: 'corpo-b' };
    const sheet = comporFolha(receita);
    const pose = MOLDE_POSES['idle-down'][0];
    const { torso } = bodyGeometry(pose, 'b');
    const { x, y } = frameRect(MOLDE_FORMAT, MOLDE_FORMAT.clips['idle-down'], 0);
    for (let j = torso.y + 1; j < torso.y + torso.height - 1; j++) {
      for (let i = torso.x + 1; i < torso.x + torso.width - 1; i++) expect(decodeTone(sheet.get(x + i, y + j))?.channel, `${i},${j}`).not.toBe('pele');
    }
  });
});
