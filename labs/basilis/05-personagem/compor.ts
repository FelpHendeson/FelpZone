// Compõe um quadro do personagem: sombra, arma atrás, corpo, arma na frente.
// A arma é colocada pelo ponto `mao-principal` do quadro, na orientação que o molde manda,
// sem rotação. Feito para ser reaproveitado pelas próximas partes e pelos Labs 06 a 08.

import { frameRect } from '../04-animacao/animation.ts';
import { pilha, type CamadaId } from './camadas.ts';
import { MANEQUIM_DEFAULTS, type ManequimOptions } from './manequim.ts';
import { MOLDE_FORMAT, MOLDE_SIZE, paletteForRamps } from './molde.ts';
import { PECA_BY_ID, folhasDaPeca } from './pecas.ts';
import { MOLDE_POSES } from './poses.ts';
import { pointsAt } from './pontos.ts';
import { IndexedImage } from './raster.ts';
import { chaveDaForma, chaveDaPintura, pecasDaReceita, rampasDaReceita, type Receita } from './receita.ts';

// ---- Pilha de camadas: a receita montada numa folha só ----

export interface MontarOpcoes {
  manequim: ManequimOptions;
  /** Camadas desligadas no visualizador. */
  desligadas: ReadonlySet<CamadaId>;
}

/**
 * Empilha as peças da receita numa folha em tons-índice, linha por linha, na ordem de camadas da
 * direção daquela linha, sem as partes escondidas e sem as camadas desligadas.
 */
export function comporFolha(receita: Receita, opcoes: MontarOpcoes = { manequim: MANEQUIM_DEFAULTS, desligadas: new Set() }): IndexedImage {
  const pecas = pecasDaReceita(receita);
  const manequim = opcoesDoCorpo(receita, opcoes.manequim);
  const sheet = new IndexedImage(MOLDE_SIZE.width, MOLDE_SIZE.height);
  const { frameWidth, frameHeight } = MOLDE_FORMAT;
  for (const [name, clip] of Object.entries(MOLDE_FORMAT.clips)) {
    const direction = MOLDE_POSES[name][0].direction;
    const y = clip.row * frameHeight;
    for (const { peca, parte } of pilha(pecas, direction, opcoes.desligadas)) {
      sheet.overlayRect(folhasDaPeca(peca, manequim)[parte.id], 0, y, clip.frames * frameWidth, frameHeight);
    }
  }
  return sheet;
}

/** Os ajustes de desenho com o tipo de corpo da receita: a roupa e o cabelo seguem o corpo escolhido. */
export function opcoesDoCorpo(receita: Receita, manequim: ManequimOptions): ManequimOptions {
  return { ...manequim, silhueta: PECA_BY_ID[receita.corpo]?.silhueta ?? 'a' };
}

/**
 * Um quadro só da receita (32 × 32, em tons-índice), sem montar a folha inteira: para miniaturas
 * (as opções da tela de criação). Usa as mesmas folhas de peça, já guardadas, e a mesma pilha.
 */
export function comporQuadro(receita: Receita, clipName: string, index: number, manequim: ManequimOptions = MANEQUIM_DEFAULTS): IndexedImage {
  const clip = MOLDE_FORMAT.clips[clipName];
  const { x, y, width, height } = frameRect(MOLDE_FORMAT, clip, index);
  const opcoes = opcoesDoCorpo(receita, manequim);
  const frame = new IndexedImage(width, height);
  for (const { peca, parte } of pilha(pecasDaReceita(receita), MOLDE_POSES[clipName][0].direction)) {
    const source = folhasDaPeca(peca, opcoes)[parte.id];
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const value = source.get(x + i, y + j);
        if (value) frame.set(i, j, value);
      }
    }
  }
  return frame;
}

/** Quantas cores diferentes a folha pintada usa (sem a transparente). */
export function coresUsadas(sheet: IndexedImage, palette: (string | null)[]): number {
  const colors = new Set<string>();
  for (const code of sheet.colorsUsed()) if (palette[code]) colors.add(palette[code]!.toLowerCase());
  return colors.size;
}

export interface Montagem<T> {
  /** A folha em tons-índice (só muda quando mudam as peças ou as camadas). */
  folha: IndexedImage;
  paleta: (string | null)[];
  /** A folha pintada (no navegador, um canvas fora da tela). */
  pintada: T;
  cores: number;
  /** Milissegundos gastos nesta chamada (0 quando veio do cache). */
  tempos: { composicao: number; pintura: number };
  refeito: { composicao: boolean; pintura: boolean };
}

/**
 * Monta a receita uma vez e guarda. Trocar peças ou camadas refaz a composição e a pintura; trocar só
 * rampas repinta a folha já composta, sem redesenhar; a mesma receita devolve o que já estava pronto.
 */
export class Montador<T> {
  /** Quantas vezes cada etapa rodou (para conferir o cache). */
  readonly contagem = { composicoes: 0, pinturas: 0 };
  private forma = '';
  private pintura = '';
  private atual: Montagem<T> | null = null;

  constructor(
    private readonly pintar: (sheet: IndexedImage, palette: (string | null)[]) => T,
    private readonly agora: () => number = () => performance.now(),
  ) {}

  montar(receita: Receita, opcoes: MontarOpcoes): Montagem<T> {
    const forma = [chaveDaForma(receita), opcoes.manequim.selectiveOutline, opcoes.manequim.innerLines, [...opcoes.desligadas].sort().join(',')].join('|');
    const pintura = chaveDaPintura(receita);
    const atual = this.atual;
    if (atual && forma === this.forma && pintura === this.pintura) {
      return { ...atual, tempos: { composicao: 0, pintura: 0 }, refeito: { composicao: false, pintura: false } };
    }
    const recompor = !atual || forma !== this.forma;
    let start = this.agora();
    const folha = recompor ? comporFolha(receita, opcoes) : atual.folha;
    const composicao = recompor ? this.agora() - start : 0;
    if (recompor) this.contagem.composicoes++;
    start = this.agora();
    const paleta = paletteForRamps(rampasDaReceita(receita));
    const pintada = this.pintar(folha, paleta);
    const tempoPintura = this.agora() - start;
    this.contagem.pinturas++;
    this.forma = forma;
    this.pintura = pintura;
    this.atual = {
      folha,
      paleta,
      pintada,
      cores: coresUsadas(folha, paleta),
      tempos: { composicao, pintura: tempoPintura },
      refeito: { composicao: recompor, pintura: true },
    };
    return this.atual;
  }
}

// ---- Desenhar um quadro ----

export interface WeaponImages {
  /** Uma imagem por orientação (16). */
  orientations: CanvasImageSource[];
  gripX: number;
  gripY: number;
}

export interface ComposeOptions {
  weapon?: WeaponImages | null;
  shadow?: boolean;
}

const SHADOW = 'rgba(16, 32, 20, 0.38)';

/** Sombra em pixels, embaixo dos pés: uma elipse achatada em volta da âncora. */
export function drawShadow(ctx: CanvasRenderingContext2D, anchorX: number, anchorY: number): void {
  ctx.fillStyle = SHADOW;
  ctx.fillRect(anchorX - 4, anchorY - 2, 8, 1);
  ctx.fillRect(anchorX - 6, anchorY - 1, 12, 1);
  ctx.fillRect(anchorX - 5, anchorY, 10, 1);
}

/**
 * Desenha o quadro `index` da animação `clipName` com o canto do quadro em (x, y), em pixels do contexto.
 * `flip` espelha para a esquerda (corpo e pontos).
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  frames: Record<string, CanvasImageSource[]>,
  clipName: string,
  index: number,
  flip: boolean,
  x: number,
  y: number,
  options: ComposeOptions = {},
): void {
  const { frameWidth, anchorX, anchorY } = MOLDE_FORMAT;
  if (options.shadow) drawShadow(ctx, x + anchorX, y + anchorY);
  const hand = pointsAt(clipName, index, flip)['mao-principal'];
  const weapon = options.weapon;
  const drawWeapon = () => {
    if (!weapon) return;
    ctx.drawImage(weapon.orientations[hand.orientation], x + hand.x - weapon.gripX, y + hand.y - weapon.gripY);
  };
  if (!hand.front) drawWeapon();
  const image = frames[clipName][index];
  if (flip) {
    ctx.save();
    ctx.translate(x + frameWidth, y);
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
  } else ctx.drawImage(image, x, y);
  if (hand.front) drawWeapon();
}
