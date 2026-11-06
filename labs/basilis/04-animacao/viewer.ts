// Visualizador de animações: escolhe personagem e animação, controla velocidade e quadro,
// mostra a folha inteira e permite baixar a folha gerada ou carregar outra no mesmo formato.

import { clipDuration, clipFrame, frameRect, isActiveFrame, sheetSize, type SheetFormat } from './animation.ts';
import { sliceClips } from './sheets.ts';

export interface Character {
  id: string;
  name: string;
  format: SheetFormat;
  sheet: CanvasImageSource & { width: number; height: number };
  frames: Record<string, HTMLCanvasElement[]>;
  generate: () => HTMLCanvasElement;
}

const PREVIEW_SCALE = 6;

export class Viewer {
  private character: Character;
  private clipName: string;
  private time = 0;
  private speed = 1;
  private playing = true;
  private readonly characterSelect = document.createElement('select');
  private readonly clipSelect = document.createElement('select');
  private readonly speedInput = document.createElement('input');
  private readonly speedOutput = document.createElement('output');
  private readonly playButton = button('Pausar', () => this.togglePlay());
  private readonly preview = document.createElement('canvas');
  private readonly sheetView = document.createElement('canvas');
  private readonly info = document.createElement('p');
  private readonly status = document.createElement('p');

  constructor(
    container: HTMLElement,
    private readonly characters: Character[],
    private readonly onSheetChange: (character: Character) => void,
  ) {
    this.character = characters[0];
    this.clipName = Object.keys(this.character.format.clips)[0];
    this.build(container);
  }

  private build(container: HTMLElement): void {
    for (const character of this.characters) this.characterSelect.add(new Option(character.name, character.id));
    this.characterSelect.addEventListener('change', () => {
      this.character = this.characters.find((character) => character.id === this.characterSelect.value)!;
      this.fillClips();
    });
    this.clipSelect.addEventListener('change', () => {
      this.clipName = this.clipSelect.value;
      this.time = 0;
    });
    Object.assign(this.speedInput, { type: 'range', min: '0.25', max: '2', step: '0.25', value: '1' });
    this.speedInput.addEventListener('input', () => {
      this.speed = Number(this.speedInput.value);
      this.speedOutput.textContent = `×${this.speed}`;
    });
    this.speedOutput.textContent = '×1';

    const controls = document.createElement('div');
    controls.className = 'acoes';
    controls.append(
      button('◀ Quadro', () => this.step(-1)),
      this.playButton,
      button('Quadro ▶', () => this.step(1)),
    );

    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/png,image/webp';
    file.hidden = true;
    file.addEventListener('change', () => {
      const chosen = file.files?.[0];
      if (chosen) void this.load(chosen);
      file.value = '';
    });
    const sheetActions = document.createElement('div');
    sheetActions.className = 'acoes';
    sheetActions.append(
      button('Baixar folha (PNG)', () => this.download()),
      button('Carregar folha', () => file.click()),
      button('Usar folha gerada', () => this.useGenerated()),
      file,
    );

    this.preview.className = 'previa-animacao';
    this.sheetView.className = 'folha';
    this.info.className = 'ajuda';
    this.status.className = 'ajuda';

    container.append(
      labeled('Personagem', this.characterSelect),
      labeled('Animação', this.clipSelect),
      labeled('Velocidade', this.speedInput, this.speedOutput),
      controls,
      this.preview,
      this.info,
      this.sheetView,
      sheetActions,
      this.status,
    );
    this.fillClips();
  }

  private fillClips(): void {
    this.clipSelect.replaceChildren(...Object.keys(this.character.format.clips).map((name) => new Option(name, name)));
    this.clipName = this.clipSelect.value;
    this.time = 0;
    const { width, height } = sheetSize(this.character.format);
    this.status.textContent = `Formato: quadros de ${this.character.format.frameWidth} × ${this.character.format.frameHeight}, folha de ${width} × ${height} px, uma animação por linha, a esquerda é a direita espelhada.`;
  }

  /** Chamado pelo laço do jogo enquanto o painel está aberto. */
  tick(dt: number): void {
    if (this.playing) this.time += dt * this.speed;
    this.draw();
  }

  private togglePlay(): void {
    this.playing = !this.playing;
    this.playButton.textContent = this.playing ? 'Pausar' : 'Tocar';
  }

  private step(direction: number): void {
    const clip = this.character.format.clips[this.clipName];
    this.playing = false;
    this.playButton.textContent = 'Tocar';
    const { index } = clipFrame(clip, this.time);
    const next = (index + direction + clip.frames) % clip.frames;
    this.time = (next + 0.5) / clip.fps;
  }

  private draw(): void {
    const { format, frames } = this.character;
    const clip = format.clips[this.clipName];
    const { index } = clipFrame(clip.loop ? clip : { ...clip, loop: true }, this.time);

    this.preview.width = format.frameWidth * PREVIEW_SCALE;
    this.preview.height = format.frameHeight * PREVIEW_SCALE;
    const ctx = this.preview.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frames[this.clipName][index], 0, 0, this.preview.width, this.preview.height);
    // Âncora: o ponto que fica sobre a posição do personagem no mundo.
    ctx.fillStyle = '#ff4d8d';
    ctx.fillRect(format.anchorX * PREVIEW_SCALE - 1, format.anchorY * PREVIEW_SCALE - 6, 2, 12);
    ctx.fillRect(format.anchorX * PREVIEW_SCALE - 6, format.anchorY * PREVIEW_SCALE - 1, 12, 2);

    const active = isActiveFrame(clip, index) ? ' · golpe ativo' : '';
    this.info.textContent = `Quadro ${index + 1} de ${clip.frames} · ${clip.fps} quadros/s · ${clipDuration(clip).toFixed(2)} s · ${clip.loop ? 'repete' : 'uma vez'}${active}`;

    const sheet = this.character.sheet;
    const zoom = Math.max(1, Math.floor(320 / sheet.width));
    this.sheetView.width = sheet.width * zoom;
    this.sheetView.height = sheet.height * zoom;
    const sheetCtx = this.sheetView.getContext('2d')!;
    sheetCtx.imageSmoothingEnabled = false;
    sheetCtx.drawImage(sheet, 0, 0, sheet.width * zoom, sheet.height * zoom);
    const rect = frameRect(format, clip, index);
    sheetCtx.strokeStyle = '#ffe066';
    sheetCtx.lineWidth = 2;
    sheetCtx.strokeRect(rect.x * zoom + 1, rect.y * zoom + 1, rect.width * zoom - 2, rect.height * zoom - 2);
  }

  private download(): void {
    const { sheet, id } = this.character;
    const canvas = document.createElement('canvas');
    canvas.width = sheet.width;
    canvas.height = sheet.height;
    canvas.getContext('2d')!.drawImage(sheet, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `basilis-${id}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }, 'image/png');
  }

  private async load(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('Imagem inválida'));
        element.src = url;
      });
      const needed = sheetSize(this.character.format);
      if (image.naturalWidth < needed.width || image.naturalHeight < needed.height) {
        this.status.textContent = `A folha tem ${image.naturalWidth} × ${image.naturalHeight} px; este formato precisa de pelo menos ${needed.width} × ${needed.height}.`;
        return;
      }
      this.apply(image);
      this.status.textContent = `Folha carregada (${image.naturalWidth} × ${image.naturalHeight} px). Ela fica só neste aparelho e só até recarregar a página.`;
    } catch {
      this.status.textContent = 'Não foi possível abrir a imagem.';
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private useGenerated(): void {
    this.apply(this.character.generate());
    this.fillClips();
  }

  private apply(sheet: Character['sheet']): void {
    this.character.sheet = sheet;
    this.character.frames = sliceClips(sheet, this.character.format);
    this.onSheetChange(this.character);
  }
}

export function button(label: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.addEventListener('click', onClick);
  return element;
}

export function labeled(text: string, ...controls: HTMLElement[]): HTMLElement {
  const row = document.createElement('label');
  row.className = 'campo';
  const title = document.createElement('span');
  title.className = 'rotulo';
  title.textContent = text;
  row.append(title, ...controls);
  return row;
}
