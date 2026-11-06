import { describe, expect, it } from 'vitest';
import { pilha } from './camadas.ts';
import { Montador, comporFolha, comporQuadro, coresUsadas } from './compor.ts';
import { combinacoesDeForma, escolher, sortear } from './criacao.ts';
import { acaoNaArena, clipNaArena, DURACAO_DO_CORTE } from './jogo.ts';
import { MANEQUIM_DEFAULTS, type ManequimOptions } from './manequim.ts';
import {
  MENU_DESENHOS,
  MENU_FORMAT,
  MENU_SHEET,
  ampliarQuadro,
  camadasDoBoneco,
  comporBoneco,
  comporFolhaDoBoneco,
  desenhoDeMenu,
  menuGeometry,
} from './menu.ts';
import { decodeTone, paletteForRamps, type Channel } from './molde.ts';
import { PECAS, PECA_BY_ID, canaisDesenhados, folhasDaPeca } from './pecas.ts';
import type { IndexedImage } from './raster.ts';
import { RECEITA_PADRAO, pecasDaReceita, rampasDaReceita, type Receita } from './receita.ts';

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

const COM_LOBO: Receita = { ...RECEITA_PADRAO, linhagem: 'lobo-de-mykol' };
const OPCOES_DE_CONTORNO: ManequimOptions[] = [
  MANEQUIM_DEFAULTS,
  { selectiveOutline: false, innerLines: false },
];

function codes(images: Iterable<IndexedImage>): Set<number> {
  const all = new Set<number>();
  for (const image of images) for (const code of image.colorsUsed()) all.add(code);
  return all;
}

function channelsOf(image: IndexedImage): Set<Channel> {
  return new Set([...image.colorsUsed()].map((code) => decodeTone(code)!.channel));
}

function rows(image: IndexedImage): { top: number; bottom: number } {
  const bounds = image.bounds()!;
  return { top: bounds.y, bottom: bounds.y + bounds.height - 1 };
}

describe('boneco do menu: camadas de menu por peça', () => {
  it('toda peça do catálogo tem camada de menu própria', () => {
    expect(PECAS.filter((peca) => !MENU_DESENHOS[peca.id]).map((peca) => peca.id)).toEqual([]);
  });

  it('cada camada de menu desenha só as partes da peça, em 64 × 96, nos 4 quadros', () => {
    for (const peca of PECAS) {
      for (const silhueta of ['a', 'b'] as const) {
        const frames = desenhoDeMenu(peca, { ...MANEQUIM_DEFAULTS, silhueta });
        expect(frames).toHaveLength(MENU_FORMAT.frames);
        for (const frame of frames) {
          const partes = new Set(peca.partes.map((parte) => parte.id));
          for (const [id, image] of Object.entries(frame)) {
            expect(partes.has(id), `${peca.id}: parte ${id}`).toBe(true);
            expect([image.width, image.height]).toEqual([MENU_FORMAT.width, MENU_FORMAT.height]);
          }
        }
      }
    }
  });

  it('cada peça usa no menu só os tons-índice que ela já usa na folha do jogo (as mesmas cores)', () => {
    for (const peca of PECAS) {
      for (const base of OPCOES_DE_CONTORNO) {
        for (const silhueta of ['a', 'b'] as const) {
          const options = { ...base, silhueta };
          const sprite = codes(Object.values(folhasDaPeca(peca, options)));
          const menu = codes(desenhoDeMenu(peca, options).flatMap((frame) => Object.values(frame)));
          const extra = [...menu].filter((code) => !sprite.has(code)).map((code) => decodeTone(code));
          expect(extra, `${peca.id} (${silhueta}, contorno seletivo ${base.selectiveOutline})`).toEqual([]);
          for (const channel of canaisDesenhados(desenhoDeMenu(peca, options)[0])) expect(peca.canais).toContain(channel);
        }
      }
    }
  });

  it('cada parte que aparece de frente no jogo aparece no menu', () => {
    for (const peca of PECAS) {
      const sprite = folhasDaPeca(peca, MANEQUIM_DEFAULTS);
      const menu = desenhoDeMenu(peca, MANEQUIM_DEFAULTS)[0];
      for (const parte of peca.partes) {
        const sheet = sprite[parte.id];
        let shown = false;
        for (let y = 0; y < 32 && !shown; y++) for (let x = 0; x < 32 && !shown; x++) shown = sheet.get(x, 32 * 0 + y) !== 0;
        // A linha "parado de frente" é a primeira da folha.
        if (shown) expect(menu[parte.id]?.bounds(), `${peca.id}/${parte.id}`).not.toBeNull();
      }
    }
  });
});

describe('boneco do menu: montado pela receita', () => {
  const receitas: Receita[] = [RECEITA_PADRAO, COM_LOBO];
  const random = seeded(7);
  for (let i = 0; i < 40; i++) receitas.push(sortear(i % 3 === 0 ? COM_LOBO : RECEITA_PADRAO, random));
  receitas.push({ ...COM_LOBO, equipamento: { cabeca: 'chapeu-de-palha' } }, { ...COM_LOBO, cabelo: { ...COM_LOBO.cabelo, estilo: 'cabelo-comprido' }, equipamento: { cabeca: 'capuz' } });

  it('as camadas na ordem da pilha de frente do jogo, sem as partes escondidas', () => {
    for (const receita of receitas) {
      const esperado = pilha(pecasDaReceita(receita), 'down').map(({ peca, parte }) => `${peca.id}/${parte.id}`);
      const boneco = camadasDoBoneco(receita, 0).map(({ peca, parte }) => `${peca.id}/${parte.id}`);
      // Partes vazias de frente (careca, rabo de cavalo atrás) podem faltar; a ordem é a mesma.
      expect(esperado.filter((id) => boneco.includes(id))).toEqual(boneco);
      expect(boneco.filter((id) => !esperado.includes(id))).toEqual([]);
    }
  });

  it('esconde como no jogo: o capuz tira o cabelo e as orelhas, o chapéu só o topo, o lobo tira os olhos', () => {
    const capuz = camadasDoBoneco({ ...COM_LOBO, cabelo: { ...COM_LOBO.cabelo, estilo: 'cabelo-comprido' }, equipamento: { cabeca: 'capuz' } }, 0).map((c) => c.parte.id);
    expect(capuz).not.toContain('cabelo-topo');
    expect(capuz).not.toContain('franja');
    expect(capuz).not.toContain('cabelo-tras');
    expect(capuz).not.toContain('orelhas');
    expect(capuz).toContain('capuz');
    const chapeu = camadasDoBoneco({ ...RECEITA_PADRAO, equipamento: { cabeca: 'chapeu-de-palha' } }, 0).map((c) => c.parte.id);
    expect(chapeu).not.toContain('cabelo-topo');
    expect(chapeu).toContain('franja');
    const lobo = camadasDoBoneco(COM_LOBO, 0).map((c) => c.parte.id);
    expect(lobo).not.toContain('olhos');
    expect(lobo).toContain('olhos-de-lobo');
    expect(lobo).toContain('cauda');
  });

  it('usa os mesmos canais do sprite parado de frente e nenhum tom que a folha do jogo não use', () => {
    const forms = [...combinacoesDeForma(RECEITA_PADRAO)].filter((_, i) => i % 23 === 0);
    for (const receita of [...receitas, ...forms]) {
      const sprite = comporQuadro(receita, 'idle-down', 0, MANEQUIM_DEFAULTS);
      const boneco = comporBoneco(receita, 0);
      expect(channelsOf(boneco), JSON.stringify(receita)).toEqual(channelsOf(sprite));
      const folha = comporFolha(receita);
      const doJogo = folha.colorsUsed();
      for (const code of boneco.colorsUsed()) expect(doJogo.has(code), `${decodeTone(code)?.channel} ${decodeTone(code)?.tone}`).toBe(true);
      // Por isso o boneco nunca passa das cores do sprite (até 15 sem equipamento; o capuz, do Lab 06, passa).
      const paleta = paletteForRamps(rampasDaReceita(receita));
      expect(coresUsadas(boneco, paleta)).toBeLessThanOrEqual(coresUsadas(folha, paleta));
      if (!receita.equipamento.cabeca) expect(coresUsadas(boneco, paleta)).toBeLessThanOrEqual(15);
    }
  });

  it('as orelhas de lobo saem de qualquer cabelo (pelo menos um terço delas aparece) e inteiras na careca', () => {
    for (const estilo of ['cabelo-curto', 'cabelo-comprido', 'cabelo-rente', 'cabelo-arrepiado', 'cabelo-rabo', 'cabelo-coque', 'cabelo-cacheado', 'careca']) {
      const camadas = camadasDoBoneco({ ...COM_LOBO, cabelo: { ...COM_LOBO.cabelo, estilo } }, 0);
      const orelhas = camadas.find((camada) => camada.parte.id === 'orelhas')!.image;
      const final = new Int16Array(orelhas.data.length).fill(-1);
      camadas.forEach((camada, index) => camada.image.data.forEach((code, i) => code && (final[i] = index)));
      const indice = camadas.findIndex((camada) => camada.parte.id === 'orelhas');
      let total = 0;
      let visivel = 0;
      orelhas.data.forEach((code, i) => {
        if (!code) return;
        total++;
        if (final[i] === indice) visivel++;
      });
      if (estilo === 'careca') expect(visivel).toBe(total);
      else expect(visivel / total, estilo).toBeGreaterThan(1 / 3);
    }
  });

  it('cabe no quadro: nada encosta nas bordas e os pés terminam acima da âncora', () => {
    for (const receita of receitas) {
      for (let quadro = 0; quadro < MENU_FORMAT.frames; quadro++) {
        const image = comporBoneco(receita, quadro);
        const bounds = image.bounds()!;
        expect(bounds.x).toBeGreaterThan(0);
        expect(bounds.y).toBeGreaterThan(0);
        expect(bounds.x + bounds.width).toBeLessThan(MENU_FORMAT.width);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(MENU_FORMAT.anchorY);
      }
    }
  });

  it('respira: a cabeça desce até 2 pixels e volta; os pés não mexem', () => {
    const tops = [0, 1, 2, 3].map((quadro) => rows(comporBoneco(COM_LOBO, quadro)).top);
    expect(tops.map((top) => top - tops[0])).toEqual([0, 1, 2, 1]);
    const bottoms = [0, 1, 2, 3].map((quadro) => rows(comporBoneco(RECEITA_PADRAO, quadro)).bottom);
    expect(new Set(bottoms).size).toBe(1);
  });

  it('o corpo B tem o tronco mais estreito e a mesma cabeça, mãos e pés do A', () => {
    const a = menuGeometry(0, 'a');
    const b = menuGeometry(0, 'b');
    expect(b.torso.width).toBeLessThan(a.torso.width);
    expect(b.head).toEqual(a.head);
    expect(b.arms.map((arm) => arm.hand)).toEqual(a.arms.map((arm) => arm.hand));
    expect(b.feet).toEqual(a.feet);
    expect(comporBoneco(escolher(RECEITA_PADRAO, 'corpo', 'corpo-b'), 0).data).not.toEqual(comporBoneco(RECEITA_PADRAO, 0).data);
  });

  it('é um desenho próprio: não é o sprite ampliado', () => {
    const ampliado = ampliarQuadro(comporQuadro(RECEITA_PADRAO, 'idle-down', 0));
    const boneco = comporBoneco(RECEITA_PADRAO, 0);
    let diferentes = 0;
    for (let i = 0; i < boneco.data.length; i++) if (boneco.data[i] !== ampliado.data[i]) diferentes++;
    expect(diferentes).toBeGreaterThan(500);
  });

  it('cada opção da criação muda o boneco', () => {
    const pecas = ['olhos-1', 'olhos-2', 'olhos-3', 'olhos-4'].map((forma) => comporBoneco({ ...RECEITA_PADRAO, olhos: { ...RECEITA_PADRAO.olhos, forma } }, 0).data.join());
    expect(new Set(pecas).size).toBe(4);
    const estilos = Object.keys(MENU_DESENHOS)
      .filter((id) => PECA_BY_ID[id].slot === 'cabelo')
      .map((estilo) => comporBoneco({ ...RECEITA_PADRAO, cabelo: { ...RECEITA_PADRAO.cabelo, estilo } }, 0).data.join());
    expect(new Set(estilos).size).toBe(8);
  });
});

describe('boneco do menu: montagem com cache', () => {
  it('a folha tem os 4 quadros lado a lado', () => {
    const sheet = comporFolhaDoBoneco(RECEITA_PADRAO);
    expect([sheet.width, sheet.height]).toEqual([MENU_SHEET.width, MENU_SHEET.height]);
    const frame = comporBoneco(RECEITA_PADRAO, 2);
    for (let y = 0; y < MENU_FORMAT.height; y++) for (let x = 0; x < MENU_FORMAT.width; x++) expect(sheet.get(2 * MENU_FORMAT.width + x, y)).toBe(frame.get(x, y));
  });

  it('o Montador da parte 2 guarda o boneco: trocar rampa só repinta, trocar peça recompõe', () => {
    const montador = new Montador((sheet) => sheet, () => 0, comporFolhaDoBoneco);
    const opcoes = { manequim: MANEQUIM_DEFAULTS, desligadas: new Set<never>() };
    const first = montador.montar(RECEITA_PADRAO, opcoes);
    montador.montar(RECEITA_PADRAO, opcoes);
    expect(montador.contagem).toEqual({ composicoes: 1, pinturas: 1 });
    const repintado = montador.montar(escolher(RECEITA_PADRAO, 'cabelo-cor', 'ruivo'), opcoes);
    expect(montador.contagem).toEqual({ composicoes: 1, pinturas: 2 });
    expect(repintado.folha).toBe(first.folha);
    montador.montar(escolher(RECEITA_PADRAO, 'cabelo-estilo', 'cabelo-coque'), opcoes);
    expect(montador.contagem).toEqual({ composicoes: 2, pinturas: 3 });
  });
});

describe('o personagem na arena', () => {
  it('prioridade do Lab 04: esquiva > corte > andar > parado', () => {
    expect(acaoNaArena({ dodging: true, attacking: true, speed: 5, golpes: 1 })).toBe('dash');
    expect(acaoNaArena({ dodging: false, attacking: true, speed: 5, golpes: 1 })).toBe('slash-a');
    expect(acaoNaArena({ dodging: false, attacking: false, speed: 5, golpes: 1 })).toBe('walk');
    expect(acaoNaArena({ dodging: false, attacking: false, speed: 0.1, golpes: 1 })).toBe('idle');
  });

  it('o corte alterna ida e volta a cada golpe', () => {
    const golpe = (golpes: number) => acaoNaArena({ dodging: false, attacking: true, speed: 0, golpes });
    expect([1, 2, 3, 4].map(golpe)).toEqual(['slash-a', 'slash-b', 'slash-a', 'slash-b']);
  });

  it('a esquerda é o lado espelhado, e o corte dura os 4 quadros a 16 q/s', () => {
    expect(clipNaArena({ dodging: false, attacking: false, speed: 2, golpes: 0 }, { x: -1, y: 0 })).toEqual({ name: 'walk-side', direction: 'side', flip: true });
    expect(clipNaArena({ dodging: false, attacking: false, speed: 0, golpes: 0 }, { x: 0, y: -1 }).name).toBe('idle-up');
    expect(DURACAO_DO_CORTE).toBeCloseTo(0.25);
  });
});
