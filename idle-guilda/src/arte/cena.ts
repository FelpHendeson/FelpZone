import { CLASSES } from '../motor/dados';
import { vidaMaxima } from '../motor/regras';
import type { Estado, Heroi, ZonaId } from '../motor/tipos';
import { desenhar, type Sprite } from './sprite';
import { CENARIO, MAO, MONSTROS, spriteArma, spriteHeroi } from './sprites';

export const CENA_LARGURA = 128;
export const CENA_ALTURA = 56;
const CHAO = 44;

interface Ambiente {
  ceu: [string, string];
  chao: string;
  borda: string;
  enfeites: { s: Sprite; x: number; espelhar?: boolean }[];
}

const AMBIENTES: Record<ZonaId | 'acampamento', Ambiente> = {
  campina: {
    ceu: ['#8fd3ff', '#cdeeff'],
    chao: '#5aa84a',
    borda: '#7cc85a',
    enfeites: [
      { s: CENARIO.arvore, x: 2 },
      { s: CENARIO.tufo, x: 60 },
      { s: CENARIO.flor, x: 70 },
      { s: CENARIO.tufo, x: 104 },
      { s: CENARIO.arvore, x: 114, espelhar: true },
    ],
  },
  bosque: {
    ceu: ['#2b3f4f', '#4c6a6a'],
    chao: '#2f5a3a',
    borda: '#3f7048',
    enfeites: [
      { s: CENARIO.pinheiro, x: 0 },
      { s: CENARIO.pinheiro, x: 56 },
      { s: CENARIO.pinheiro, x: 104 },
      { s: CENARIO.pinheiro, x: 116 },
    ],
  },
  ruinas: {
    ceu: ['#3a2a4f', '#8a5a7a'],
    chao: '#5e5a66',
    borda: '#7a7684',
    enfeites: [
      { s: CENARIO.pilar, x: 2 },
      { s: CENARIO.pilarQuebrado, x: 60 },
      { s: CENARIO.pilar, x: 118 },
    ],
  },
  acampamento: {
    ceu: ['#141a33', '#2c3560'],
    chao: '#2f4a33',
    borda: '#3f5f42',
    enfeites: [
      { s: CENARIO.pinheiro, x: 2 },
      { s: CENARIO.pinheiro, x: 114 },
    ],
  },
};

const MONSTRO_DA_ZONA = { campina: 'gosma', bosque: 'lobo', ruinas: 'esqueleto' } as const;

function fundo(ctx: CanvasRenderingContext2D, amb: Ambiente): void {
  const faixas = 6;
  for (let i = 0; i < faixas; i++) {
    ctx.fillStyle = i < faixas / 2 ? amb.ceu[0] : amb.ceu[1];
    ctx.fillRect(0, Math.floor((i * CHAO) / faixas), CENA_LARGURA, Math.ceil(CHAO / faixas) + 1);
  }
  ctx.fillStyle = amb.chao;
  ctx.fillRect(0, CHAO, CENA_LARGURA, CENA_ALTURA - CHAO);
  ctx.fillStyle = amb.borda;
  ctx.fillRect(0, CHAO, CENA_LARGURA, 1);
  for (let x = 3; x < CENA_LARGURA; x += 9) ctx.fillRect(x, CHAO + 4 + ((x * 7) % 6), 2, 1);
  for (const e of amb.enfeites) {
    desenhar(ctx, e.s, e.x, CHAO - e.s.linhas.length, { espelhar: e.espelhar });
  }
}

function estrelas(ctx: CanvasRenderingContext2D, t: number): void {
  const pontos = [[8, 4], [22, 10], [40, 3], [61, 8], [77, 5], [93, 12], [104, 3], [120, 9]];
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

/** Posição de cada herói: o tanque na frente, a cura atrás. */
function posicoes(herois: Heroi[]): { h: Heroi; x: number }[] {
  const ordem = { cura: 0, dano: 1, tanque: 2 } as const;
  const ordenados = [...herois].sort((a, b) => ordem[CLASSES[a.classe].papel] - ordem[CLASSES[b.classe].papel]);
  const frente = 48;
  return ordenados.map((h, i) => ({ h, x: frente - (ordenados.length - 1 - i) * 17 }));
}

function desenharHeroi(ctx: CanvasRenderingContext2D, h: Heroi, x: number, y: number, op: { golpe?: boolean; dormindo?: boolean }) {
  desenhar(ctx, spriteHeroi(h.classe), x, y, op.dormindo ? { trocas: { e: 'S' } } : {});
  if (op.dormindo) return;
  const arma = spriteArma(h.arma);
  desenhar(ctx, arma.sprite, x + MAO.x - arma.pega.x, y + MAO.y - arma.pega.y + (op.golpe ? 2 : 0));
}

/** Desenha a party lutando na zona atual ou descansando. `t` em segundos, só para animar. */
export function desenharCena(ctx: CanvasRenderingContext2D, e: Estado, t: number): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CENA_LARGURA, CENA_ALTURA);
  const quadro = Math.floor(t * 4) % 2;
  const party = posicoes(e.herois);

  if (e.situacao === 'lutando') {
    fundo(ctx, AMBIENTES[e.zona]);
    // Cada herói golpeia num tempo diferente, para a cena não marchar em uníssono.
    party.forEach(({ h, x }, i) => {
      const golpe = (Math.floor(t * 4) + i) % 2 === 1;
      desenharHeroi(ctx, h, x + (golpe ? 2 : 0), CHAO - 16, { golpe });
      barra(ctx, x + 3, CHAO - 20, 10, h.vida / vidaMaxima(h), '#5fcf5a');
    });
    const curandeira = e.herois.find((h) => CLASSES[h.classe].papel === 'cura');
    if (curandeira && quadro === 1) {
      const alvo = party.reduce((pior, p) => (p.h.vida / vidaMaxima(p.h) < pior.h.vida / vidaMaxima(pior.h) ? p : pior));
      desenhar(ctx, CENARIO.cura, alvo.x + 7, CHAO - 25 - (Math.floor(t * 8) % 2));
    }

    const monstro = MONSTROS[MONSTRO_DA_ZONA[e.zona]];
    const pulo = e.zona === 'campina' && quadro === 0 ? -1 : 0;
    const mx = 84 + (quadro === 1 ? 1 : 0);
    desenhar(ctx, monstro, mx, CHAO - 16 + pulo);
    if (quadro === 1) desenhar(ctx, CENARIO.faisca, mx + 1, CHAO - 10);
    barra(ctx, mx + 1, CHAO - 21, 14, 1 - e.progressoAbate, '#e04a4a');
  } else {
    fundo(ctx, AMBIENTES.acampamento);
    estrelas(ctx, t);
    const fogo = CENARIO.fogueira;
    desenhar(ctx, fogo, 76, CHAO - fogo.linhas.length, { espelhar: quadro === 1 });
    party.forEach(({ h, x }) => {
      desenharHeroi(ctx, h, x + 8, CHAO - 16, { dormindo: true });
      barra(ctx, x + 11, CHAO - 20, 10, h.vida / vidaMaxima(h), '#5fcf5a');
    });
    const subida = (t * 3) % 6;
    desenhar(ctx, CENARIO.zz, 62, CHAO - 22 - subida);
  }
}

/** Herói sozinho, para retratos (24×20). */
export function desenharRetrato(ctx: CanvasRenderingContext2D, h: Pick<Heroi, 'classe' | 'arma'>, t: number, animar = true): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 24, 20);
  const pulo = animar ? Math.floor(t * 2) % 2 : 0;
  const arma = spriteArma(h.arma);
  desenhar(ctx, spriteHeroi(h.classe), 2, 2 + pulo);
  desenhar(ctx, arma.sprite, 2 + MAO.x - arma.pega.x, 2 + pulo + MAO.y - arma.pega.y);
}
