import { vidaMaxima } from '../motor/regras';
import type { Heroi, ZonaId } from '../motor/tipos';
import { desenhar, type Sprite } from './sprite';
import { CENARIO, MAO, MONSTROS, spriteArma, spriteHeroi } from './sprites';

export const CENA_LARGURA = 112;
export const CENA_ALTURA = 48;
const CHAO = 38;

interface Ambiente {
  ceu: [string, string];
  chao: string;
  borda: string;
  enfeites: { s: Sprite; x: number; espelhar?: boolean }[];
}

const AMBIENTES: Record<ZonaId | 'pedreira' | 'acampamento', Ambiente> = {
  campina: {
    ceu: ['#8fd3ff', '#cdeeff'],
    chao: '#5aa84a',
    borda: '#7cc85a',
    enfeites: [
      { s: CENARIO.arvore, x: 2 },
      { s: CENARIO.tufo, x: 40 },
      { s: CENARIO.flor, x: 56 },
      { s: CENARIO.tufo, x: 92 },
      { s: CENARIO.arvore, x: 98, espelhar: true },
    ],
  },
  bosque: {
    ceu: ['#2b3f4f', '#4c6a6a'],
    chao: '#2f5a3a',
    borda: '#3f7048',
    enfeites: [
      { s: CENARIO.pinheiro, x: 0 },
      { s: CENARIO.pinheiro, x: 12 },
      { s: CENARIO.pinheiro, x: 48 },
      { s: CENARIO.pinheiro, x: 88 },
      { s: CENARIO.pinheiro, x: 100 },
    ],
  },
  ruinas: {
    ceu: ['#3a2a4f', '#8a5a7a'],
    chao: '#5e5a66',
    borda: '#7a7684',
    enfeites: [
      { s: CENARIO.pilar, x: 4 },
      { s: CENARIO.pilarQuebrado, x: 48 },
      { s: CENARIO.pilar, x: 100 },
    ],
  },
  pedreira: {
    ceu: ['#c9a27a', '#f0d9b0'],
    chao: '#8a6a4a',
    borda: '#a5835e',
    enfeites: [{ s: CENARIO.rochaMinerio, x: 84 }, { s: CENARIO.tufo, x: 10 }],
  },
  acampamento: {
    ceu: ['#141a33', '#2c3560'],
    chao: '#2f4a33',
    borda: '#3f5f42',
    enfeites: [{ s: CENARIO.pinheiro, x: 2 }, { s: CENARIO.pinheiro, x: 98 }],
  },
};

function fundo(ctx: CanvasRenderingContext2D, amb: Ambiente): void {
  const faixas = 6;
  for (let i = 0; i < faixas; i++) {
    ctx.fillStyle = i < faixas / 2 ? amb.ceu[0] : amb.ceu[1];
    ctx.fillRect(0, Math.floor((i * CHAO) / faixas), CENA_LARGURA, Math.ceil(CHAO / faixas));
  }
  ctx.fillStyle = amb.chao;
  ctx.fillRect(0, CHAO, CENA_LARGURA, CENA_ALTURA - CHAO);
  ctx.fillStyle = amb.borda;
  ctx.fillRect(0, CHAO, CENA_LARGURA, 1);
  for (let x = 3; x < CENA_LARGURA; x += 9) ctx.fillRect(x, CHAO + 4 + ((x * 7) % 5), 2, 1);
  for (const e of amb.enfeites) {
    desenhar(ctx, e.s, e.x, CHAO - e.s.linhas.length, { espelhar: e.espelhar });
  }
}

function estrelas(ctx: CanvasRenderingContext2D, t: number): void {
  const pontos = [[8, 4], [22, 10], [40, 3], [61, 8], [77, 5], [93, 12], [104, 3]];
  pontos.forEach(([x, y], i) => {
    ctx.fillStyle = Math.floor(t * 2 + i) % 3 === 0 ? '#6a75b0' : '#e6ecf2';
    ctx.fillRect(x, y, 1, 1);
  });
}

function barra(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, fracao: number, cor: string): void {
  ctx.fillStyle = '#1b1b2a';
  ctx.fillRect(x - 1, y - 1, w + 2, 4);
  ctx.fillStyle = '#4a2030';
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = cor;
  ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, fracao))), 2);
}

function heroiComArma(
  ctx: CanvasRenderingContext2D,
  h: Heroi,
  x: number,
  y: number,
  arma: ReturnType<typeof spriteArma> | null,
  baixarArma = 0,
  olhosFechados = false,
): void {
  desenhar(ctx, spriteHeroi(h.classe), x, y, olhosFechados ? { trocas: { e: 'S' } } : {});
  if (arma) desenhar(ctx, arma.sprite, x + MAO.x - arma.pega.x, y + MAO.y - arma.pega.y + baixarArma);
}

/**
 * Desenha a cena do herói conforme a tarefa. `t` é o tempo em segundos,
 * usado só para animar (2 quadros por ciclo).
 */
export function desenharCena(ctx: CanvasRenderingContext2D, h: Heroi, t: number): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CENA_LARGURA, CENA_ALTURA);
  const quadro = Math.floor(t * 4) % 2;
  const tarefa = h.tarefa;

  if (tarefa.tipo === 'cacar') {
    fundo(ctx, AMBIENTES[tarefa.zona]);
    const ataque = quadro === 1;
    heroiComArma(ctx, h, 26 + (ataque ? 3 : 0), CHAO - 16, spriteArma(h.arma), ataque ? 3 : 0);

    const nomeMonstro = ({ campina: 'gosma', bosque: 'lobo', ruinas: 'esqueleto' } as const)[tarefa.zona];
    const monstro = MONSTROS[nomeMonstro];
    const pulo = nomeMonstro === 'gosma' && quadro === 0 ? -1 : 0;
    const recuo = ataque ? 1 : 0;
    const mx = 66 + recuo;
    desenhar(ctx, monstro, mx, CHAO - 16 + pulo);
    if (ataque) {
      desenhar(ctx, CENARIO.faisca, mx + 1, CHAO - 10);
    }
    barra(ctx, mx + 2, CHAO - 21, 12, 1 - h.progressoAbate, '#e04a4a');
  } else if (tarefa.tipo === 'minerar') {
    fundo(ctx, AMBIENTES.pedreira);
    const golpe = quadro === 1;
    heroiComArma(ctx, h, 64, CHAO - 16, spriteArma('picareta'), golpe ? 2 : -1);
    if (golpe) desenhar(ctx, CENARIO.faisca, 82, CHAO - 7);
  } else {
    fundo(ctx, AMBIENTES.acampamento);
    estrelas(ctx, t);
    const fogo = CENARIO.fogueira;
    desenhar(ctx, fogo, 60, CHAO - fogo.linhas.length, { espelhar: quadro === 1 });
    heroiComArma(ctx, h, 36, CHAO - 16, null, 0, true);
    const subida = (t * 3) % 6;
    desenhar(ctx, CENARIO.zz, 48, CHAO - 20 - subida);
    const proporcao = h.vida / vidaMaxima(h);
    barra(ctx, 38, CHAO - 21, 12, proporcao, '#5fcf5a');
  }
}

/** Desenho do herói sozinho, para retratos e escolha de classe. */
export function desenharRetrato(ctx: CanvasRenderingContext2D, h: Pick<Heroi, 'classe' | 'arma'>, t: number): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 24, 20);
  const pulo = Math.floor(t * 2) % 2;
  const arma = spriteArma(h.arma);
  desenhar(ctx, spriteHeroi(h.classe), 2, 2 + pulo);
  desenhar(ctx, arma.sprite, 2 + MAO.x - arma.pega.x, 2 + pulo + MAO.y - arma.pega.y);
}
