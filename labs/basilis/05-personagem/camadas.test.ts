import { describe, expect, it } from 'vitest';
import { frameRect } from '../04-animacao/animation.ts';
import { CAMADAS, CAMADA_BY_ID, ordemDasCamadas, partesEscondidas, pilha, type CamadaId } from './camadas.ts';
import { Montador, comporFolha, coresUsadas, type MontarOpcoes } from './compor.ts';
import { MANEQUIM_DEFAULTS } from './manequim.ts';
import {
  CHANNELS,
  DEFAULT_RAMPS,
  MASTER_RAMPS,
  MOLDE_FORMAT,
  RAMP_BY_ID,
  TONES,
  decodeTone,
  paletteForRamps,
  rampsFor,
  toneCode,
  type Channel,
} from './molde.ts';
import { PECAS, PECA_BY_ID, canaisDesenhados, folhasDaPeca } from './pecas.ts';
import { MOLDE_POSES } from './poses.ts';
import type { IndexedImage } from './raster.ts';
import { RECEITA_PADRAO, chaveDaForma, lerReceita, pecasDaReceita, rampasDaReceita, receitaJSON, type Receita } from './receita.ts';

const OPCOES: MontarOpcoes = { manequim: MANEQUIM_DEFAULTS, desligadas: new Set() };
const sheets = (id: string) => folhasDaPeca(PECA_BY_ID[id], MANEQUIM_DEFAULTS);
const channelAt = (image: IndexedImage, x: number, y: number) => decodeTone(image.get(x, y))?.channel ?? null;
const rowsOf = (direction: 'down' | 'up' | 'side') =>
  Object.entries(MOLDE_FORMAT.clips).filter(([name]) => MOLDE_POSES[name][0].direction === direction).map(([, clip]) => clip);

/** Um pixel da folha onde as duas imagens têm algo, nas linhas de uma direção. */
function overlap(a: IndexedImage, b: IndexedImage, direction: 'down' | 'up' | 'side'): { x: number; y: number } | null {
  for (const clip of rowsOf(direction)) {
    for (let j = 0; j < 32; j++) {
      for (let x = 0; x < clip.frames * 32; x++) {
        const y = clip.row * 32 + j;
        if (a.get(x, y) && b.get(x, y)) return { x, y };
      }
    }
  }
  return null;
}

const COMPLETA: Receita = {
  ...RECEITA_PADRAO,
  pele: 'pele-6',
  olhos: { forma: 'olhos-1', cor: 'ambar' },
  cabelo: { estilo: 'cabelo-comprido', cor: 'ruivo' },
  barba: 'barba-curta',
  marcas: 'sardas',
  linhagem: 'lobo-de-mykol',
  equipamento: { cabeca: 'chapeu-de-palha' },
  rampas: { 'tecido-principal': 'mostarda', 'tecido-secundario': 'marrom-terra', couro: 'couro-escuro', metal: 'bronze' },
};

describe('ordem das camadas', () => {
  it('são as 15 camadas da seção 3, na ordem', () => {
    expect(CAMADAS.map((camada) => camada.id)).toEqual([
      'sombra',
      'atras-do-corpo',
      'cabelo-de-tras',
      'corpo-base',
      'rosto',
      'linhagem',
      'roupa',
      'pernas-pes-maos',
      'tronco',
      'ombros-e-cinto',
      'cabelo-da-frente',
      'barba',
      'cabeca',
      'na-frente-do-corpo',
      'efeitos',
    ]);
    CAMADAS.forEach((camada, index) => expect(camada.ordem).toBe(index + 1));
  });

  it('de frente e de lado vale a tabela; de costas, o que fica atrás passa para a frente e o cabelo comprido cai sobre as costas', () => {
    const table = CAMADAS.map((camada) => camada.id);
    expect(ordemDasCamadas('down')).toEqual(table);
    expect(ordemDasCamadas('side')).toEqual(table);
    const up = ordemDasCamadas('up');
    expect([...up].sort()).toEqual([...table].sort());
    expect(up.indexOf('atras-do-corpo')).toBe(13);
    expect(up.indexOf('na-frente-do-corpo')).toBe(1);
    expect(up.indexOf('cabelo-de-tras')).toBe(up.indexOf('cabelo-da-frente') - 1);
    expect(up.indexOf('cabelo-de-tras')).toBeGreaterThan(up.indexOf('roupa'));
  });

  it('a pilha segue a ordem da direção', () => {
    const pecas = pecasDaReceita(COMPLETA);
    for (const direction of ['down', 'up', 'side'] as const) {
      const order = ordemDasCamadas(direction);
      const positions = pilha(pecas, direction).map(({ parte }) => order.indexOf(parte.camada));
      expect(positions, direction).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  it('toda peça tem partes em camadas que existem; o corpo base é o corpo A', () => {
    for (const peca of PECAS) for (const parte of peca.partes) expect(CAMADA_BY_ID[parte.camada], `${peca.id}/${parte.id}`).toBeDefined();
    expect(PECA_BY_ID['corpo-a'].partes.every((parte) => parte.camada === 'corpo-base')).toBe(true);
  });

  it('há peça de exemplo em cada camada de que a criação de personagem precisa', () => {
    const used = new Set(PECAS.flatMap((peca) => peca.partes.map((parte) => parte.camada)));
    for (const camada of ['atras-do-corpo', 'cabelo-de-tras', 'corpo-base', 'rosto', 'linhagem', 'roupa', 'cabelo-da-frente', 'barba', 'cabeca'] as CamadaId[]) {
      expect(used.has(camada), camada).toBe(true);
    }
  });

  it('na folha montada, a camada de cima ganha: os olhos sobre o rosto, o cabelo sobre a cabeça', () => {
    const sheet = comporFolha(RECEITA_PADRAO);
    const idle = frameRect(MOLDE_FORMAT, MOLDE_FORMAT.clips['idle-down'], 0);
    // Olho de frente (o mesmo lugar da parte 1) e o topo da cabeça.
    expect(channelAt(sheet, idle.x + 13, idle.y + 9)).toBe('olhos');
    expect(channelAt(sheet, idle.x + 16, idle.y + 4)).toBe('cabelo');
  });

  it('o cabelo comprido fica atrás do corpo de frente e sobre as costas olhando para cima', () => {
    const sheet = comporFolha(COMPLETA);
    const tras = sheets('cabelo-comprido')['cabelo-tras'];
    const body = sheets('corpo-a').corpo;
    const shirt = sheets('roupa-da-terra').camiseta;
    const down = overlap(tras, body, 'down')!;
    expect(down).not.toBeNull();
    expect(channelAt(sheet, down.x, down.y)).toBe('pele');
    const up = overlap(tras, shirt, 'up')!;
    expect(up).not.toBeNull();
    expect(channelAt(sheet, up.x, up.y)).toBe('cabelo');
  });

  it('a cauda fica atrás do corpo de lado e na frente da calça de costas', () => {
    const sheet = comporFolha({ ...COMPLETA, cabelo: { estilo: 'cabelo-curto', cor: 'ruivo' } });
    const cauda = sheets('lobo-de-mykol').cauda;
    const calca = sheets('roupa-da-terra').calca;
    const camiseta = sheets('roupa-da-terra').camiseta;
    const up = overlap(cauda, calca, 'up')!;
    expect(channelAt(sheet, up.x, up.y)).toBe('cabelo');
    const side = overlap(cauda, camiseta, 'side') ?? overlap(cauda, calca, 'side');
    expect(side).not.toBeNull();
    expect(channelAt(sheet, side!.x, side!.y)).not.toBe('cabelo');
  });

  it('desligar uma camada tira as peças dela da folha', () => {
    const off = comporFolha(RECEITA_PADRAO, { ...OPCOES, desligadas: new Set<CamadaId>(['cabelo-da-frente', 'rosto']) });
    const used = new Set([...off.colorsUsed()].map((code) => decodeTone(code)!.channel));
    expect(used.has('cabelo')).toBe(false);
    expect(used.has('olhos')).toBe(false);
    expect(used.has('pele')).toBe(true);
  });
});

describe('regras de esconder', () => {
  it('cada parte escondida existe e fica numa camada mais funda que a parte mais alta da peça que esconde', () => {
    // Peças de uma camada só (equipamentos, roupa) escondem só o que fica embaixo delas; uma linhagem,
    // que tem partes em várias camadas, esconde o que fica embaixo da sua parte mais alta.
    const order = CAMADAS.map((camada) => camada.id);
    for (const peca of PECAS) {
      const highest = Math.max(...peca.partes.map((parte) => order.indexOf(parte.camada)));
      for (const target of peca.esconde) {
        const owners = PECAS.flatMap((other) => other.partes.filter((parte) => parte.id === target));
        expect(owners.length, `${peca.id} esconde ${target}`).toBeGreaterThan(0);
        for (const parte of owners) expect(order.indexOf(parte.camada), `${peca.id} esconde ${target}`).toBeLessThan(highest);
      }
    }
  });

  it('um capuz esconde todo o cabelo e as orelhas; um chapéu, só o topo do cabelo', () => {
    const shown = (receita: Receita) => new Set(pilha(pecasDaReceita(receita), 'down').map(({ parte }) => parte.id));
    const capuz = shown({ ...COMPLETA, equipamento: { cabeca: 'capuz' } });
    for (const parte of ['cabelo-topo', 'franja', 'cabelo-tras', 'orelhas']) expect(capuz.has(parte), parte).toBe(false);
    expect(capuz.has('barba')).toBe(true);
    const chapeu = shown(COMPLETA);
    expect(chapeu.has('cabelo-topo')).toBe(false);
    for (const parte of ['franja', 'cabelo-tras', 'orelhas', 'barba']) expect(chapeu.has(parte), parte).toBe(true);
    const nada = shown({ ...COMPLETA, equipamento: {} });
    expect(nada.has('cabelo-topo')).toBe(true);
  });

  it('a roupa da Terra esconde a roupa de baixo e cobre cada pixel dela, em todos os quadros', () => {
    const hidden = partesEscondidas(pecasDaReceita(RECEITA_PADRAO));
    expect(hidden.get('corpo-a/roupa-de-baixo')).toBe('roupa-da-terra');
    const shorts = sheets('corpo-a')['roupa-de-baixo'];
    const roupa = Object.values(sheets('roupa-da-terra'));
    let holes = 0;
    for (let i = 0; i < shorts.data.length; i++) if (shorts.data[i] && roupa.every((sheet) => !sheet.data[i])) holes++;
    expect(holes).toBe(0);
  });

  it('sem roupa, a roupa de baixo aparece; uma peça não esconde as próprias partes', () => {
    expect(partesEscondidas(pecasDaReceita({ ...RECEITA_PADRAO, roupa: null })).size).toBe(0);
    const capuz = PECA_BY_ID.capuz;
    expect(partesEscondidas([capuz]).size).toBe(0);
  });

  it('uma peça com a camada desligada não esconde nada', () => {
    const shown = pilha(pecasDaReceita(RECEITA_PADRAO), 'down', new Set<CamadaId>(['roupa'])).map(({ parte }) => parte.id);
    expect(shown).toContain('roupa-de-baixo');
    expect(shown).not.toContain('camiseta');
  });

  it('o que está escondido não chega à folha', () => {
    const comCapuz = comporFolha({ ...COMPLETA, equipamento: { cabeca: 'capuz' } });
    const topo = sheets('cabelo-comprido')['cabelo-topo'];
    const capuz = sheets('capuz').capuz;
    // Onde só o topo do cabelo tinha pixel (sem o capuz por cima), a folha não pode ter cabelo.
    let leaked = 0;
    for (let i = 0; i < topo.data.length; i++) {
      if (topo.data[i] && !capuz.data[i] && decodeTone(comCapuz.data[i])?.channel === 'cabelo') leaked++;
    }
    const ears = sheets('lobo-de-mykol').orelhas;
    for (let i = 0; i < ears.data.length; i++) if (ears.data[i] && !capuz.data[i] && comCapuz.data[i] === ears.data[i]) leaked++;
    expect(leaked).toBe(0);
  });
});

describe('pintura por rampa', () => {
  it('cada tom de cada canal tem um código próprio que cabe em 1 byte e volta ao mesmo canal e tom', () => {
    const codes = new Set<number>();
    for (const channel of CHANNELS) {
      for (let tone = 0; tone < TONES; tone++) {
        const code = toneCode(channel, tone);
        expect(code).toBeGreaterThan(0);
        expect(code).toBeLessThan(256);
        expect(decodeTone(code)).toEqual({ channel, tone });
        codes.add(code);
      }
    }
    expect(codes.size).toBe(CHANNELS.length * TONES);
    expect(decodeTone(0)).toBeNull();
  });

  it('a paleta-mestra tem rampas de 4 tons, do contorno à luz, sem preto puro', () => {
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const ramp of MASTER_RAMPS) {
      expect(ramp.colors, ramp.id).toHaveLength(4);
      for (const color of ramp.colors) {
        expect(color, ramp.id).toMatch(/^#[0-9a-f]{6}$/);
        expect(color, ramp.id).not.toBe('#000000');
      }
      const values = ramp.colors.map(luminance);
      expect(values, ramp.id).toEqual([...values].sort((a, b) => a - b));
    }
    expect(new Set(MASTER_RAMPS.map((ramp) => ramp.id)).size).toBe(MASTER_RAMPS.length);
  });

  it('tem as rampas da criação de personagem: 8 de pele, 8 de olhos, 10 de cabelo; e uma padrão por canal', () => {
    expect(rampsFor('pele')).toHaveLength(8);
    expect(rampsFor('olhos')).toHaveLength(8);
    expect(rampsFor('cabelo')).toHaveLength(10);
    expect(rampsFor('tecido-principal')).toEqual(rampsFor('tecido-secundario'));
    for (const channel of CHANNELS) expect(rampsFor(channel).map((ramp) => ramp.id)).toContain(DEFAULT_RAMPS[channel]);
  });

  it('a paleta pinta cada tom com a cor da rampa escolhida para o canal', () => {
    const choice = { ...DEFAULT_RAMPS, cabelo: 'loiro', 'tecido-principal': 'vermelho-desbotado' };
    const palette = paletteForRamps(choice);
    expect(palette[0]).toBeNull();
    for (const channel of CHANNELS) {
      for (let tone = 0; tone < TONES; tone++) expect(palette[toneCode(channel, tone)]).toBe(RAMP_BY_ID[choice[channel]].colors[tone]);
    }
  });

  it('trocar uma rampa muda só as cores daquele canal', () => {
    const before = paletteForRamps(DEFAULT_RAMPS);
    const after = paletteForRamps({ ...DEFAULT_RAMPS, metal: 'ouro' });
    for (const channel of CHANNELS) {
      for (let tone = 0; tone < TONES; tone++) {
        const code = toneCode(channel, tone);
        if (channel === 'metal') expect(after[code]).not.toBe(before[code]);
        else expect(after[code]).toBe(before[code]);
      }
    }
  });

  it('a receita padrão cabe em 15 cores mais a transparente', () => {
    const sheet = comporFolha(RECEITA_PADRAO);
    expect(coresUsadas(sheet, paletteForRamps(rampasDaReceita(RECEITA_PADRAO)))).toBeLessThanOrEqual(15);
  });

  it('cada peça pinta só os canais que declara', () => {
    const poses = ['idle-down', 'idle-up', 'idle-side', 'death'].map((name) => MOLDE_POSES[name][0]);
    for (const peca of PECAS) {
      for (const pose of poses) {
        for (const channel of canaisDesenhados(peca.desenhar(pose, MANEQUIM_DEFAULTS))) expect(peca.canais, peca.id).toContain(channel as Channel);
      }
    }
  });
});

describe('receita em JSON', () => {
  it('ida e volta pelo JSON devolve a mesma receita e o mesmo texto', () => {
    for (const receita of [RECEITA_PADRAO, COMPLETA, { ...RECEITA_PADRAO, roupa: null, sobrancelhas: null }]) {
      const text = receitaJSON(receita);
      const back = lerReceita(text);
      expect(back.erros).toEqual([]);
      expect(back.receita).toEqual(receita);
      expect(receitaJSON(back.receita!)).toBe(text);
    }
  });

  it('lê o formato da seção 5 e diz o que falta ou está errado', () => {
    const doc = {
      corpo: 'corpo-a',
      pele: 'pele-4',
      olhos: { forma: 'olhos-1', cor: 'ambar' },
      cabelo: { estilo: 'cabelo-curto', cor: 'castanho-2' },
      roupa: 'roupa-da-terra',
      rampas: { 'tecido-principal': 'azul-gasto', couro: 'couro-claro' },
    };
    const ok = lerReceita(JSON.stringify(doc));
    expect(ok.erros).toEqual([]);
    expect(ok.receita!.barba).toBeNull();
    expect(rampasDaReceita(ok.receita!)['tecido-secundario']).toBe(DEFAULT_RAMPS['tecido-secundario']);

    const bad = lerReceita(
      JSON.stringify({ ...doc, chapeu: 'x', cabelo: { estilo: 'moicano', cor: 'azul-gasto' }, equipamento: { tronco: 'gibao-de-couro' }, rampas: { pele: 'pele-1' } }),
    );
    expect(bad.receita).toBeNull();
    const text = bad.erros.join('\n');
    expect(text).toContain('"chapeu"');
    expect(text).toContain('moicano');
    expect(text).toContain('azul-gasto');
    expect(text).toContain('Lab 06');
    expect(text).toContain('"pele"');
    expect(lerReceita('{ corpo: ').erros[0]).toContain('JSON inválido');
  });

  it('só a troca de peças muda a chave da forma; a troca de rampas, não', () => {
    expect(chaveDaForma({ ...RECEITA_PADRAO, pele: 'pele-1', rampas: { couro: 'couro-escuro' } })).toBe(chaveDaForma(RECEITA_PADRAO));
    expect(chaveDaForma({ ...RECEITA_PADRAO, barba: 'barba-curta' })).not.toBe(chaveDaForma(RECEITA_PADRAO));
  });
});

describe('montagem com cache', () => {
  const make = () => {
    let clock = 0;
    const painted: unknown[] = [];
    const montador = new Montador<{ id: number }>(
      (_sheet, palette) => {
        painted.push(palette);
        return { id: painted.length };
      },
      () => (clock += 5),
    );
    return { montador, painted };
  };

  it('a mesma receita não é refeita, nem escrita de outro jeito', () => {
    const { montador } = make();
    const first = montador.montar(RECEITA_PADRAO, OPCOES);
    expect(first.refeito).toEqual({ composicao: true, pintura: true });
    expect(first.tempos.composicao).toBeGreaterThan(0);
    const reordered = lerReceita(JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(receitaJSON(RECEITA_PADRAO))).reverse()))).receita!;
    const second = montador.montar(reordered, { ...OPCOES, desligadas: new Set() });
    expect(second.refeito).toEqual({ composicao: false, pintura: false });
    expect(second.pintada).toBe(first.pintada);
    expect(montador.contagem).toEqual({ composicoes: 1, pinturas: 1 });
  });

  it('trocar só uma rampa repinta a mesma folha, sem redesenhar', () => {
    const { montador } = make();
    const first = montador.montar(RECEITA_PADRAO, OPCOES);
    const second = montador.montar({ ...RECEITA_PADRAO, rampas: { ...RECEITA_PADRAO.rampas, 'tecido-principal': 'roxo' } }, OPCOES);
    expect(second.refeito).toEqual({ composicao: false, pintura: true });
    expect(second.folha).toBe(first.folha);
    expect(second.pintada).not.toBe(first.pintada);
    expect(montador.contagem).toEqual({ composicoes: 1, pinturas: 2 });
  });

  it('trocar uma peça, desligar uma camada ou mudar o contorno refaz a folha', () => {
    const { montador } = make();
    montador.montar(RECEITA_PADRAO, OPCOES);
    expect(montador.montar({ ...RECEITA_PADRAO, barba: 'barba-curta' }, OPCOES).refeito.composicao).toBe(true);
    expect(montador.montar({ ...RECEITA_PADRAO, barba: 'barba-curta' }, { ...OPCOES, desligadas: new Set<CamadaId>(['barba']) }).refeito.composicao).toBe(true);
    expect(
      montador.montar({ ...RECEITA_PADRAO, barba: 'barba-curta' }, { manequim: { ...MANEQUIM_DEFAULTS, innerLines: false }, desligadas: new Set<CamadaId>(['barba']) })
        .refeito.composicao,
    ).toBe(true);
    expect(montador.contagem.composicoes).toBe(4);
  });
});
