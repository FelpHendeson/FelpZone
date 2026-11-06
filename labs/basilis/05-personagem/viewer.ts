// Visualizador do molde: escolhe direção e animação, toca, pausa e avança quadro a quadro,
// mostra os pontos por quadro (com a orientação da arma e se ela vai na frente ou atrás),
// as quatro direções no tamanho do jogo e a folha inteira (tocar num quadro da folha abre esse quadro).

import { clipDuration, clipFrame, frameRect, isActiveFrame, type Clip } from '../04-animacao/animation.ts';
import { button, labeled } from '../04-animacao/viewer.ts';
import { drawCharacter, type WeaponImages } from './compor.ts';
import { FACINGS, FACING_LABELS, MOLDE_ACTIONS, MOLDE_FORMAT, facingRow, moldeClipName, type Facing, type MoldeAction } from './molde.ts';
import { POINT_LABELS, POINT_NAMES, orientationVector, pointsAt, type PointName } from './pontos.ts';
import type { Background, MoldeSettings } from './settings.ts';

export interface MoldeImages {
  sheet: HTMLCanvasElement;
  frames: Record<string, HTMLCanvasElement[]>;
  weapon: WeaponImages;
}

const PREVIEW_SCALE = 10;
const GAME_SCALE = 2;

/** Cor de cada ponto no visualizador. */
export const POINT_COLORS: Record<PointName, string> = {
  'mao-principal': '#ffd23f',
  'mao-secundaria': '#3fd0ff',
  cabeca: '#ff5fd2',
  costas: '#ff8a3d',
  pes: '#7dff6a',
};

const BACKGROUNDS: Record<Background, string> = {
  grama: '#5f9a43',
  terra: '#a9825a',
  escuro: '#1b2b22',
  xadrez: '',
};

export class MoldeViewer {
  private facing: Facing = 'down';
  private action: MoldeAction = 'idle';
  private time = 0;
  private speed = 1;
  private playing = true;
  private readonly facingButtons = new Map<Facing, HTMLButtonElement>();
  private readonly actionSelect = document.createElement('select');
  private readonly speedInput = document.createElement('input');
  private readonly speedOutput = document.createElement('output');
  private readonly playButton = button('Pausar', () => this.togglePlay());
  private readonly preview = document.createElement('canvas');
  private readonly game = document.createElement('canvas');
  private readonly sheetView = document.createElement('canvas');
  private readonly info = document.createElement('p');
  private readonly table = document.createElement('table');

  constructor(
    container: HTMLElement,
    private images: MoldeImages,
    private readonly settings: MoldeSettings,
  ) {
    this.build(container);
  }

  /** Troca as imagens (quando o manequim é refeito com outros ajustes). */
  setImages(images: MoldeImages): void {
    this.images = images;
  }

  private build(container: HTMLElement): void {
    const facings = document.createElement('div');
    facings.className = 'acoes direcoes';
    for (const facing of FACINGS) {
      const element = button(FACING_LABELS[facing], () => this.setFacing(facing));
      this.facingButtons.set(facing, element);
      facings.append(element);
    }

    for (const info of MOLDE_ACTIONS) this.actionSelect.add(new Option(`${info.label} (${info.frames} quadros)`, info.action));
    this.actionSelect.addEventListener('change', () => {
      this.action = this.actionSelect.value as MoldeAction;
      this.time = 0;
      this.updateFacingButtons();
    });

    Object.assign(this.speedInput, { type: 'range', min: '0.25', max: '2', step: '0.25', value: '1' });
    this.speedInput.addEventListener('input', () => {
      this.speed = Number(this.speedInput.value);
      this.speedOutput.textContent = `×${this.speed}`;
    });
    this.speedOutput.textContent = '×1';

    const playback = document.createElement('div');
    playback.className = 'acoes';
    playback.append(button('◀ Quadro', () => this.step(-1)), this.playButton, button('Quadro ▶', () => this.step(1)));

    this.preview.className = 'previa-molde';
    this.game.className = 'previa-jogo';
    this.sheetView.className = 'folha';
    this.info.className = 'ajuda';
    this.table.className = 'pontos';
    this.sheetView.addEventListener('click', (event) => this.pickFromSheet(event));

    const gameTitle = document.createElement('p');
    gameTitle.className = 'ajuda';
    gameTitle.textContent = 'No tamanho do jogo (2 pixels de tela por pixel): baixo, cima, direita e esquerda.';
    const sheetTitle = document.createElement('p');
    sheetTitle.className = 'ajuda';
    sheetTitle.textContent = 'A folha inteira: uma animação por linha. Toque num quadro para abri-lo.';

    container.append(
      this.preview,
      facings,
      labeled('Animação', this.actionSelect),
      labeled('Velocidade', this.speedInput, this.speedOutput),
      playback,
      this.info,
      this.table,
      gameTitle,
      this.game,
      sheetTitle,
      this.sheetView,
    );
    this.updateFacingButtons();
  }

  private get clipName(): string {
    return moldeClipName(this.action, facingRow(this.facing).direction);
  }

  private get clip(): Clip {
    return MOLDE_FORMAT.clips[this.clipName];
  }

  private get directional(): boolean {
    return MOLDE_ACTIONS.find((info) => info.action === this.action)!.directional;
  }

  private setFacing(facing: Facing): void {
    this.facing = facing;
    this.updateFacingButtons();
  }

  private updateFacingButtons(): void {
    for (const [facing, element] of this.facingButtons) {
      element.classList.toggle('selecionado', facing === this.facing);
      element.disabled = !this.directional;
    }
  }

  private togglePlay(): void {
    this.playing = !this.playing;
    this.playButton.textContent = this.playing ? 'Pausar' : 'Tocar';
  }

  private pause(): void {
    this.playing = false;
    this.playButton.textContent = 'Tocar';
  }

  private frameIndex(): number {
    const clip = this.clip;
    return clipFrame(clip.loop ? clip : { ...clip, loop: true }, this.time).index;
  }

  private setFrame(index: number): void {
    this.time = (index + 0.5) / this.clip.fps;
  }

  private step(direction: number): void {
    this.pause();
    const frames = this.clip.frames;
    this.setFrame((this.frameIndex() + direction + frames) % frames);
  }

  private pickFromSheet(event: MouseEvent): void {
    const rect = this.sheetView.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * this.images.sheet.width;
    const y = ((event.clientY - rect.top) / rect.height) * this.images.sheet.height;
    const row = Math.floor(y / MOLDE_FORMAT.frameHeight);
    const column = Math.floor(x / MOLDE_FORMAT.frameWidth);
    const entry = Object.entries(MOLDE_FORMAT.clips).find(([, clip]) => clip.row === row);
    if (!entry || column >= entry[1].frames) return;
    const [name] = entry;
    const info = MOLDE_ACTIONS.find((candidate) => name === candidate.action || name.startsWith(`${candidate.action}-`))!;
    this.action = info.action;
    this.actionSelect.value = info.action;
    if (info.directional) {
      const direction = name.slice(info.action.length + 1) as Facing;
      if (!(this.facing === 'left' && direction === 'side')) this.facing = direction;
    }
    this.updateFacingButtons();
    this.pause();
    this.setFrame(column);
  }

  /** Chamado a cada quadro da página. */
  tick(dt: number): void {
    if (this.playing) this.time += dt * this.speed;
    this.drawPreview();
    this.drawGame();
    this.drawSheet();
  }

  private fillBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const color = BACKGROUNDS[this.settings.background];
    ctx.clearRect(0, 0, width, height);
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
  }

  private compose(ctx: CanvasRenderingContext2D, clipName: string, index: number, flip: boolean, x: number, y: number): void {
    drawCharacter(ctx, this.images.frames, clipName, index, flip, x, y, {
      shadow: this.settings.showShadow,
      weapon: this.settings.showWeapon ? this.images.weapon : null,
    });
  }

  private drawPreview(): void {
    const { frameWidth, frameHeight } = MOLDE_FORMAT;
    const scale = PREVIEW_SCALE;
    this.preview.width = frameWidth * scale;
    this.preview.height = frameHeight * scale;
    const ctx = this.preview.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    this.preview.dataset.fundo = this.settings.background;
    this.fillBackground(ctx, this.preview.width, this.preview.height);

    const index = this.frameIndex();
    const flip = this.directional && facingRow(this.facing).flip;
    ctx.save();
    ctx.scale(scale, scale);
    this.compose(ctx, this.clipName, index, flip, 0, 0);
    ctx.restore();

    const points = pointsAt(this.clipName, index, flip);
    if (this.settings.showPoints) {
      for (const name of POINT_NAMES) drawMarker(ctx, name, points[name], scale, name === 'mao-principal' ? points[name].orientation : undefined);
    }

    const clip = this.clip;
    const active = isActiveFrame(clip, index) ? ' · golpe ativo' : '';
    this.info.textContent = `${this.clipName}${flip ? ' (espelhada)' : ''} · quadro ${index + 1} de ${clip.frames} · ${clip.fps} quadros/s · ${clipDuration(clip).toFixed(2)} s · ${clip.loop ? 'repete' : 'uma vez'}${active}`;

    const rows = POINT_NAMES.map((name) => {
      const point = points[name];
      const extra = name === 'mao-principal' ? `orientação ${points['mao-principal'].orientation}` : '';
      return `<tr><td><span class="marca" style="background:${POINT_COLORS[name]}"></span>${POINT_LABELS[name]}</td><td>${point.x}, ${point.y}</td><td>${point.front ? 'frente' : 'atrás'}</td><td>${extra}</td></tr>`;
    });
    this.table.innerHTML = `<thead><tr><th>Ponto</th><th>x, y</th><th>Camada</th><th>Arma</th></tr></thead><tbody>${rows.join('')}</tbody>`;
  }

  private drawGame(): void {
    const { frameWidth, frameHeight } = MOLDE_FORMAT;
    this.game.width = frameWidth * FACINGS.length;
    this.game.height = frameHeight;
    this.game.style.width = `${this.game.width * GAME_SCALE}px`;
    const ctx = this.game.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    this.fillBackground(ctx, this.game.width, this.game.height);
    FACINGS.forEach((facing, slot) => {
      const { direction, flip } = facingRow(facing);
      const name = moldeClipName(this.action, direction);
      const clip = MOLDE_FORMAT.clips[name];
      const { index } = clipFrame(clip.loop ? clip : { ...clip, loop: true }, this.time);
      this.compose(ctx, name, index, this.directional && flip, slot * frameWidth, 0);
    });
  }

  private drawSheet(): void {
    const sheet = this.images.sheet;
    const zoom = 2;
    this.sheetView.width = sheet.width * zoom;
    this.sheetView.height = sheet.height * zoom;
    const ctx = this.sheetView.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, 0, 0, sheet.width * zoom, sheet.height * zoom);
    const rect = frameRect(MOLDE_FORMAT, this.clip, this.frameIndex());
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x * zoom + 1, rect.y * zoom + 1, rect.width * zoom - 2, rect.height * zoom - 2);
  }
}

/**
 * Marca de um ponto: cruz no canto de pixel; cheia se o que se prende ali vai na frente do corpo,
 * vazada se vai atrás. A mão principal ganha um traço na direção da arma.
 */
function drawMarker(
  ctx: CanvasRenderingContext2D,
  name: PointName,
  point: { x: number; y: number; front: boolean },
  scale: number,
  orientation?: number,
): void {
  const x = point.x * scale;
  const y = point.y * scale;
  const color = POINT_COLORS[name];
  ctx.save();
  ctx.lineWidth = 2;
  if (orientation !== undefined) {
    const v = orientationVector(orientation);
    ctx.strokeStyle = '#1b1405';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + v.x * scale * 6, y + v.y * scale * 6);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = point.front ? color : 'rgba(0, 0, 0, 0.55)';
  ctx.fill();
  ctx.strokeStyle = point.front ? '#1b1405' : color;
  ctx.stroke();
  ctx.restore();
}
