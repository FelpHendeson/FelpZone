import { vidaMaximaInimigo } from '../motor/combate';
import { mapaPorId, type Mapa } from '../motor/dados/mapas';
import { COR_ELEMENTO, PERSONAGENS } from '../motor/dados/personagens';
import type { Combatente, Estado, PersonagemId } from '../motor/tipos';
import { desenharQuadro, folha, quadroDa, type Animacao } from './folhas';
import { HEROIS, JUBA } from './herois';
import { spriteMonstro } from './monstros';
import { desenhar, largura, type Sprite } from './sprite';
import { CENARIO } from './sprites';

export const BATALHA_LARGURA = 160;
export const BATALHA_ALTURA = 90;
/** Resolução real do canvas em relação às unidades da cena. */
export const BATALHA_ESCALA = 2;
const CHAO = 80;

/* ---------- Fonte de pixels para números (3×5) ---------- */

const DIGITOS: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  k: ['#..', '#.#', '##.', '#.#', '#.#'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
};

function numeroCurto(n: number): string {
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  if (n >= 10000) return `${Math.round(n / 100) / 10}`.replace('.', '') + 'k';
  return String(Math.round(n));
}

export function textoPixel(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, cor: string) {
  let cx = Math.round(x - (texto.length * 4) / 2);
  for (const ch of texto) {
    const g = DIGITOS[ch];
    if (g) {
      for (let py = 0; py < 5; py++) {
        for (let px = 0; px < 3; px++) {
          if (g[py][px] !== '#') continue;
          ctx.fillStyle = '#1b1b2a';
          ctx.fillRect(cx + px + 1, y + py + 1, 1, 1);
          ctx.fillStyle = cor;
          ctx.fillRect(cx + px, y + py, 1, 1);
        }
      }
    }
    cx += 4;
  }
}

/* ---------- Cenários ---------- */

function faixas(ctx: CanvasRenderingContext2D, cores: string[], ate: number) {
  const h = Math.ceil(ate / cores.length);
  cores.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, i * h, BATALHA_LARGURA, h + 1);
  });
}

function ilhaFlutuante(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, cor: string, base: string) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = base;
  for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 2, y + 2 + i, w - i * 4, 1);
}

function nuvem(ctx: CanvasRenderingContext2D, x: number, y: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.fillRect(x + 2, y, 8, 2);
  ctx.fillRect(x, y + 2, 14, 2);
  ctx.fillRect(x + 4, y - 1, 4, 1);
}

function cenario(ctx: CanvasRenderingContext2D, mapa: Mapa, t: number, noite: boolean) {
  const anima = Math.floor(t * 2) % 2;
  switch (mapa.cenario) {
    case 'ilha':
      faixas(ctx, noite ? ['#141a33', '#1c2445', '#24305a'] : ['#7fc4f0', '#9ed3f5', '#c4e6fa'], CHAO);
      ilhaFlutuante(ctx, 10, 22, 22, '#5aa84a', '#6b6f7a');
      ilhaFlutuante(ctx, 118, 14, 28, '#5aa84a', '#6b6f7a');
      ctx.fillStyle = '#6b7080';
      ctx.fillRect(128, 4, 4, 10);
      ctx.fillStyle = '#f2c14e';
      ctx.fillRect(128, 3, 4, 1);
      nuvem(ctx, 60 + (t % 40) * 0.2, 12, noite ? '#2c3560' : '#ffffff');
      ctx.fillStyle = noite ? '#2f4a33' : '#5aa84a';
      ctx.fillRect(0, CHAO - 6, BATALHA_LARGURA, 6);
      ctx.fillStyle = noite ? '#3a3d47' : '#7d8796';
      ctx.fillRect(0, CHAO, BATALHA_LARGURA, BATALHA_ALTURA - CHAO);
      break;
    case 'bosque':
      faixas(ctx, ['#4c8ab0', '#6fb0c8', '#a8dce0'], CHAO);
      nuvem(ctx, 20, 30, '#ffffff');
      nuvem(ctx, 120, 24, '#ffffff');
      desenhar(ctx, CENARIO.arvore, 4, CHAO - 18);
      desenhar(ctx, CENARIO.arvore, 140, CHAO - 20, { espelhar: true });
      ctx.fillStyle = '#3f8f45';
      ctx.fillRect(0, CHAO - 6, BATALHA_LARGURA, 6);
      ctx.fillStyle = '#e6f2ff';
      ctx.fillRect(0, CHAO, BATALHA_LARGURA, BATALHA_ALTURA - CHAO);
      break;
    case 'ruinas':
      faixas(ctx, ['#2a1f40', '#4a2f5a', '#7a4a6a'], CHAO);
      desenhar(ctx, CENARIO.pilar, 6, CHAO - 18);
      desenhar(ctx, CENARIO.pilarQuebrado, 74, CHAO - 12);
      desenhar(ctx, CENARIO.pilar, 146, CHAO - 18);
      ctx.fillStyle = '#5e5a66';
      ctx.fillRect(0, CHAO - 6, BATALHA_LARGURA, 6 + BATALHA_ALTURA - CHAO);
      ctx.fillStyle = '#4a4652';
      for (let x = 0; x < BATALHA_LARGURA; x += 12) ctx.fillRect(x, CHAO + 2, 10, 1);
      break;
    case 'vulcao':
      faixas(ctx, ['#2a0a08', '#4a140c', '#7a2410'], CHAO);
      ctx.fillStyle = '#3a1a10';
      ctx.fillRect(20, 30, 30, CHAO - 30);
      ctx.fillRect(110, 20, 40, CHAO - 20);
      ctx.fillStyle = anima ? '#ff7a2a' : '#ffb43a';
      ctx.fillRect(126, 20, 6, 2);
      ctx.fillStyle = '#2a1a14';
      ctx.fillRect(0, CHAO - 6, BATALHA_LARGURA, 6 + BATALHA_ALTURA - CHAO);
      ctx.fillStyle = anima ? '#e04a2a' : '#ff7a2a';
      ctx.fillRect(10, CHAO + 4, 30, 2);
      ctx.fillRect(100, CHAO + 6, 40, 2);
      break;
    case 'cidadela':
      faixas(ctx, ['#5b9bff', '#8fc0ff', '#c4defa'], CHAO);
      ctx.fillStyle = '#e6ecf2';
      ctx.fillRect(12, 18, 10, CHAO - 18);
      ctx.fillRect(138, 10, 12, CHAO - 10);
      ctx.fillStyle = '#ffe36a';
      ctx.fillRect(15, 15, 4, 3);
      ctx.fillRect(142, 7, 4, 3);
      nuvem(ctx, 50 + (t % 30) * 0.3, 20, '#ffffff');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, CHAO - 4, BATALHA_LARGURA, 4 + BATALHA_ALTURA - CHAO);
      ctx.fillStyle = '#dbe6f5';
      for (let x = 4; x < BATALHA_LARGURA; x += 16) ctx.fillRect(x, CHAO + 2, 10, 2);
      break;
  }
}

/* ---------- Lutadores ---------- */

function barraVida(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, fracao: number, escudo: number, cor: string) {
  ctx.fillStyle = '#1b1b2a';
  ctx.fillRect(x - 1, y - 1, w + 2, 4);
  ctx.fillStyle = '#4a2030';
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = cor;
  ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, fracao))), 2);
  if (escudo > 0) {
    ctx.fillStyle = '#8fd3ff';
    ctx.fillRect(x, y - 1, Math.round(w * Math.min(1, escudo)), 1);
  }
}

/** Canto superior esquerdo de cada posição (os pés ficam 9 à direita e 17 abaixo). */
const POSICOES_HEROIS: Record<'frente' | 'tras', [number, number][]> = {
  frente: [
    [64, CHAO - 17],
    [47, CHAO - 25],
  ],
  tras: [
    [33, CHAO - 16],
    [20, CHAO - 25],
    [8, CHAO - 17],
  ],
};

const POSICOES_INIMIGOS: [number, number][] = [
  [96, CHAO - 18],
  [114, CHAO - 12],
  [128, CHAO - 22],
  [142, CHAO - 14],
];

export function posicoesDaParty(ids: PersonagemId[]): Map<PersonagemId, [number, number]> {
  const r = new Map<PersonagemId, [number, number]>();
  const usados = { frente: 0, tras: 0 };
  // O tanque pega a posição mais à frente; quem sobrar na frente vai para trás.
  const ordem = [...ids].sort((a, b) => Number(PERSONAGENS[b].papel === 'tanque') - Number(PERSONAGENS[a].papel === 'tanque'));
  for (const id of ordem) {
    let linha = PERSONAGENS[id].linha;
    if (usados[linha] >= POSICOES_HEROIS[linha].length) linha = linha === 'frente' ? 'tras' : 'frente';
    r.set(id, POSICOES_HEROIS[linha][usados[linha]++]);
  }
  return r;
}

/** Tamanho dos monstros de folha: chefes aparecem maiores. */
const ESCALA_MONSTRO = 0.5;
const ESCALA_CHEFE = 0.7;
const DURACAO_MORTE = 0.6;

/** Memória só de desenho: onde cada inimigo estava, para animar a morte depois que ele sai do estado. */
const ultimosInimigos = new Map<number, { monstro: string; chefe: boolean; x: number; y: number }>();
const morrendo: { monstro: string; chefe: boolean; x: number; y: number; inicio: number }[] = [];

function desenharMonstroFolha(
  ctx: CanvasRenderingContext2D,
  monstro: string,
  chefe: boolean,
  barra: number,
  atingidoAgora: boolean,
  x: number,
  y: number,
  t: number,
): boolean {
  const nome = `monstro-${monstro}`;
  const f = folha(nome);
  if (!f) return false;
  let animacao: Animacao = 'parado';
  let progresso = t * 0.8;
  let repetir = true;
  if (chefe && f.animacoes.chefe) animacao = 'chefe';
  else if (barra < 0.3) {
    animacao = 'ataque';
    progresso = barra / 0.3;
    repetir = false;
  } else if (atingidoAgora) {
    animacao = 'dano';
    progresso = (t * 4) % 1;
  }
  const escala = chefe ? ESCALA_CHEFE : ESCALA_MONSTRO;
  // Pés no mesmo ponto do sprite em texto (16×16, ou 32×32 no chefe); voadores flutuam e oscilam.
  const voo = f.elevacao ? f.elevacao + Math.round(Math.sin(t * 3)) : 0;
  const [pX, pY] = chefe ? [x + 16, y + 32 - voo] : [x + 8, y + 16 - voo];
  return desenharQuadro(ctx, nome, quadroDa(f, animacao, progresso, repetir), pX, pY, escala);
}

/** Inimigos que acabaram de sumir do estado tocam a animação de morte por um instante. */
function desenharMortes(ctx: CanvasRenderingContext2D, vivos: { uid: number }[], t: number) {
  const atuais = new Set(vivos.map((i) => i.uid));
  for (const [uid, dados] of ultimosInimigos) {
    if (atuais.has(uid)) continue;
    ultimosInimigos.delete(uid);
    if (folha(`monstro-${dados.monstro}`)?.animacoes.morte) morrendo.push({ ...dados, inicio: t });
  }
  for (let k = morrendo.length - 1; k >= 0; k--) {
    const m = morrendo[k];
    const idade = t - m.inicio;
    if (idade > DURACAO_MORTE || idade < 0) {
      morrendo.splice(k, 1);
      continue;
    }
    const f = folha(`monstro-${m.monstro}`)!;
    // Voadores caem até o chão enquanto morrem.
    const queda = (f.elevacao ?? 0) * (1 - Math.min(1, idade / (DURACAO_MORTE * 0.6)));
    const [pX, pY] = m.chefe ? [m.x + 16, m.y + 32 - queda] : [m.x + 8, m.y + 16 - queda];
    ctx.globalAlpha = 1 - idade / DURACAO_MORTE / 2;
    desenharQuadro(ctx, `monstro-${m.monstro}`, quadroDa(f, 'morte', idade / DURACAO_MORTE, false), pX, pY, m.chefe ? ESCALA_CHEFE : ESCALA_MONSTRO);
    ctx.globalAlpha = 1;
  }
}

const GOLPES_DE_INVESTIDA = ['investidaDoLeao', 'golpeJusto', 'julgamentoDoLeao'];

/**
 * Herói com spritesheet: escolhe a animação pelo que está acontecendo.
 * Prioridade: caído, descansando, atacando, lançando habilidade, levando dano, parado.
 */
function desenharHeroiFolha(
  ctx: CanvasRenderingContext2D,
  e: Estado,
  id: PersonagemId,
  comb: Combatente | undefined,
  x: number,
  y: number,
  t: number,
  caido: boolean,
  descansando: boolean,
): boolean {
  // Transformado, o Sir LionHearth usa a folha do Leão das Chamas.
  const transformado = !!comb?.buffs.some((b) => b.id.startsWith('transf:'));
  const nome = id === 'leao' && transformado && !caido && !descansando && folha('heroi-leao-chamas') ? 'heroi-leao-chamas' : `heroi-${id}`;
  const f = folha(nome);
  if (!f) return false;
  let animacao: Animacao = 'parado';
  let progresso = t * 0.9;
  let repetir = true;
  const lancada = e.batalha.lancadas.find((l) => l.heroi === id && e.tempo - l.t <= 0.5);
  const lancou = !!lancada;
  if (caido) {
    animacao = 'caido';
    progresso = 1;
    repetir = false;
  } else if (descansando) {
    animacao = 'caido';
    progresso = 0;
    repetir = false;
  } else if (comb && comb.barra < 0.3) {
    animacao = 'ataque';
    progresso = comb.barra / 0.3;
    repetir = false;
  } else if (lancou) {
    // Golpes diretos usam a investida, se a folha tiver; o resto, a pose de habilidade.
    animacao = f.animacoes.investida && GOLPES_DE_INVESTIDA.includes(lancada!.habilidade) ? 'investida' : 'habilidade';
    progresso = (t * 2.5) % 1;
  } else if (atingido(e, `h:${id}`)) {
    animacao = 'dano';
    progresso = (t * 4) % 1;
  }
  // Pés no mesmo ponto em que o sprite em texto pisa.
  return desenharQuadro(ctx, nome, quadroDa(f, animacao, progresso, repetir), x + 9, y + 17);
}

function atingido(e: Estado, chave: string): boolean {
  return e.batalha.visuais.some((v) => v.alvo === chave && (v.tipo === 'dano' || v.tipo === 'critico') && v.t > e.tempo - 0.5);
}

/**
 * Desenha a batalha. `vidaMax` informa a vida máxima de cada herói (calculada fora,
 * porque depende de equipamentos e buffs). `t` é o relógio da animação.
 */
export function desenharBatalha(ctx: CanvasRenderingContext2D, e: Estado, vidaMax: Partial<Record<PersonagemId, number>>, t: number) {
  // O canvas tem o dobro da resolução: a cena usa unidades de 160×90 e as
  // spritesheets aproveitam o detalhe extra (1 pixel da folha = meia unidade).
  ctx.setTransform(BATALHA_ESCALA, 0, 0, BATALHA_ESCALA, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const b = e.batalha;
  const mapa = mapaPorId(b.mapa);
  const descansando = b.situacao === 'descansando';
  cenario(ctx, mapa, t, descansando);

  const ids = e.herois.filter((h) => h.atividade.tipo === 'batalha').map((h) => h.id);
  const pos = posicoesDaParty(ids);

  if (descansando) {
    desenhar(ctx, CENARIO.fogueira, 84, CHAO - 8, { espelhar: Math.floor(t * 4) % 2 === 1 });
    desenhar(ctx, CENARIO.zz, 70, CHAO - 34 - ((t * 3) % 6));
  }

  // De trás para a frente: quem está mais abaixo (mais perto) é desenhado por cima.
  const ordemDesenho = [...ids].sort((a, b) => pos.get(a)![1] - pos.get(b)![1]);
  for (const id of ordemDesenho) {
    const [x0, y] = pos.get(id)!;
    const comb: Combatente | undefined = b.herois[id];
    const max = vidaMax[id] ?? 1;
    const caido = comb ? comb.vida <= 0 : false;
    const golpe = !descansando && comb && comb.barra < 0.15 && !caido;
    const x = x0 + (golpe ? 2 : 0) + (descansando ? 10 : 0);
    const transformado = comb?.buffs.some((x) => x.id.startsWith('transf:'));
    // A folha do Leão das Chamas já traz a juba; a de texto é só para o sprite antigo.
    if (transformado && !descansando && !(id === 'leao' && folha('heroi-leao-chamas'))) {
      desenhar(ctx, JUBA, x + 1, y - 6 - (Math.floor(t * 6) % 2));
    }
    if (desenharHeroiFolha(ctx, e, id, comb, x, y, t, caido, descansando)) {
      // Desenhado pela spritesheet.
    } else if (caido) {
      ctx.globalAlpha = 0.35;
      desenhar(ctx, HEROIS[id], x, y + 2, { trocas: { e: 'S' } });
      ctx.globalAlpha = 1;
    } else {
      desenhar(ctx, HEROIS[id], x, y, descansando ? { trocas: { e: 'S' } } : {});
      if (atingido(e, `h:${id}`) && Math.floor(t * 10) % 2 === 0) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 2, 8, 12);
        ctx.globalAlpha = 1;
      }
    }
    // Sprites de folha são mais altos: a barra sobe para não cobrir o rosto.
    const alturaBarra = folha(`heroi-${id}`) ? 13 : 3;
    if (comb) barraVida(ctx, x + 2, y - alturaBarra, 12, comb.vida / max, comb.escudo / max, '#5fcf5a');
  }

  if (!descansando) {
    desenharMortes(ctx, b.inimigos, t);
    b.inimigos.forEach((i, n) => {
      const s: Sprite = spriteMonstro(i.monstro);
      const [px, py] = i.chefe ? [104, CHAO - 34] : POSICOES_INIMIGOS[n % POSICOES_INIMIGOS.length];
      const pulo = Math.floor(t * 3 + n) % 2;
      const flash = atingido(e, `i:${i.uid}`);
      const x = px + (flash ? 1 : 0);
      ultimosInimigos.set(i.uid, { monstro: i.monstro, chefe: i.chefe, x, y: py });
      const comFolha = desenharMonstroFolha(ctx, i.monstro, i.chefe, i.barra, flash, x, py, t + n * 0.3);
      if (comFolha) {
        // Desenhado pela spritesheet.
      } else if (i.chefe) {
        // Chefe em dobro: desenha cada pixel 2×2.
        const tmp = document.createElement('canvas');
        tmp.width = largura(s);
        tmp.height = s.linhas.length;
        desenhar(tmp.getContext('2d')!, s, 0, 0);
        ctx.drawImage(tmp, x, py - pulo, tmp.width * 2, tmp.height * 2);
      } else {
        desenhar(ctx, s, x, py - pulo);
      }
      if (i.buffs.length) {
        ctx.fillStyle = '#b48cff';
        ctx.fillRect(x + 6, py - 6, 2, 2);
      }
      if (i.dots.length) {
        ctx.fillStyle = COR_ELEMENTO[i.dots[0].elemento];
        ctx.fillRect(x + 9, py - 6, 2, 2);
      }
      const w = i.chefe ? 28 : 14;
      barraVida(ctx, x + 1, py - 4 - (i.chefe ? (comFolha ? 10 : 2) : 0), w, i.vida / vidaMaximaInimigo(i), i.escudo, i.chefe ? '#ff9a3a' : '#e04a4a');
    });
  }

  // Números flutuantes: os três mais recentes de cada alvo, empilhados.
  if (descansando) return;
  const porAlvo = new Map<string, typeof b.visuais>();
  for (const v of b.visuais) {
    if (e.tempo - v.t > 1.2) continue;
    porAlvo.set(v.alvo, [...(porAlvo.get(v.alvo) ?? []), v]);
  }
  for (const [chave, lista] of porAlvo) {
    let alvo: [number, number] | undefined;
    if (chave.startsWith('h:')) alvo = pos.get(chave.slice(2) as PersonagemId);
    else {
      const n = b.inimigos.findIndex((i) => `i:${i.uid}` === chave);
      if (n >= 0) alvo = b.inimigos[n].chefe ? [114, CHAO - 40] : POSICOES_INIMIGOS[n % POSICOES_INIMIGOS.length];
    }
    if (!alvo) continue;
    lista.slice(-3).reverse().forEach((v, k) => {
      const idade = Math.max(0, e.tempo - v.t);
      const cor =
        v.tipo === 'cura' ? '#7ef08a' : v.tipo === 'escudo' ? '#8fd3ff' : v.tipo === 'critico' ? '#ffe36a' : v.elemento === 'neutro' ? '#ffffff' : COR_ELEMENTO[v.elemento];
      const texto = (v.tipo === 'cura' || v.tipo === 'escudo' ? '+' : '') + numeroCurto(v.valor) + (v.tipo === 'critico' ? '!' : '');
      textoPixel(ctx, texto, alvo![0] + 8, alvo![1] - 10 - k * 6 - Math.round(idade * 4), cor);
    });
  }
}
