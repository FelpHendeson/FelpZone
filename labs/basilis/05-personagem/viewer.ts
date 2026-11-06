// Visualizador do molde: escolhe direção e animação, toca, pausa e avança quadro a quadro,
// mostra os pontos por quadro (com a orientação da arma e se ela vai na frente ou atrás),
// as quatro direções no tamanho do jogo e a folha inteira (tocar num quadro da folha abre esse quadro).
// O painel da pilha (parte 2) liga e desliga camadas, troca peças e rampas e edita o JSON da receita.

import { clipDuration, clipFrame, frameRect, isActiveFrame, type Clip } from '../04-animacao/animation.ts';
import { button, labeled } from '../04-animacao/viewer.ts';
import { CAMADAS, partesEscondidas, type CamadaId, type Slot } from './camadas.ts';
import { drawCharacter, type Montagem, type WeaponImages } from './compor.ts';
import {
  CHANNELS,
  CHANNEL_LABELS,
  FACINGS,
  FACING_LABELS,
  MOLDE_ACTIONS,
  MOLDE_FORMAT,
  RAMP_BY_ID,
  facingRow,
  moldeClipName,
  rampsFor,
  type Channel,
  type Facing,
  type MoldeAction,
} from './molde.ts';
import { PECAS } from './pecas.ts';
import { RECEITA_PADRAO, lerReceita, pecasDaReceita, rampasDaReceita, receitaJSON, type Receita } from './receita.ts';
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

  /** Liga e desliga a camada da sombra (desenhada fora da folha). */
  shadowLayer = true;

  /** Troca as imagens (quando a receita é montada de novo). */
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
      shadow: this.settings.showShadow && this.shadowLayer,
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

// ---- Painel da pilha (parte 2) ----

export interface PilhaState {
  receita: Receita;
  desligadas: Set<CamadaId>;
}

export interface PilhaElements {
  camadas: HTMLElement;
  pecas: HTMLElement;
  rampas: HTMLElement;
  receita: HTMLElement;
  status: HTMLElement;
}

interface SlotChoice {
  slot: Slot;
  label: string;
  optional: boolean;
  get(receita: Receita): string | null;
  set(receita: Receita, value: string | null): Receita;
}

const SLOT_CHOICES: SlotChoice[] = [
  {
    slot: 'cabelo',
    label: 'Cabelo',
    optional: false,
    get: (r) => r.cabelo.estilo,
    set: (r, v) => ({ ...r, cabelo: { ...r.cabelo, estilo: v ?? 'careca' } }),
  },
  { slot: 'sobrancelhas', label: 'Sobrancelhas', optional: true, get: (r) => r.sobrancelhas, set: (r, v) => ({ ...r, sobrancelhas: v }) },
  { slot: 'marcas', label: 'Marcas', optional: true, get: (r) => r.marcas, set: (r, v) => ({ ...r, marcas: v }) },
  { slot: 'barba', label: 'Barba', optional: true, get: (r) => r.barba, set: (r, v) => ({ ...r, barba: v }) },
  { slot: 'linhagem', label: 'Linhagem', optional: true, get: (r) => r.linhagem, set: (r, v) => ({ ...r, linhagem: v }) },
  { slot: 'roupa', label: 'Roupa', optional: true, get: (r) => r.roupa, set: (r, v) => ({ ...r, roupa: v }) },
  {
    slot: 'equipamento.cabeca',
    label: 'Cabeça (equipamento)',
    optional: true,
    get: (r) => r.equipamento.cabeca ?? null,
    set: (r, v) => ({ ...r, equipamento: v ? { ...r.equipamento, cabeca: v } : {} }),
  },
];

/** Pele, olhos e cabelo têm campo próprio na receita; os outros canais vão em "rampas". */
function setRamp(receita: Receita, channel: Channel, ramp: string): Receita {
  if (channel === 'pele') return { ...receita, pele: ramp };
  if (channel === 'olhos') return { ...receita, olhos: { ...receita.olhos, cor: ramp } };
  if (channel === 'cabelo') return { ...receita, cabelo: { ...receita.cabelo, cor: ramp } };
  return { ...receita, rampas: { ...receita.rampas, [channel]: ramp } };
}

function swatch(colors: readonly string[]): HTMLElement {
  const element = document.createElement('span');
  element.className = 'amostra';
  for (const color of colors) {
    const tone = document.createElement('span');
    tone.style.background = color;
    element.append(tone);
  }
  return element;
}

/**
 * Liga e desliga camadas, troca as peças de exemplo e as rampas, e mostra a receita em JSON
 * (editável). Toda mudança passa por `onChange`, que monta a receita de novo (ou reaproveita o cache).
 */
export class PilhaPanel {
  private readonly layerRows = new Map<CamadaId, { input: HTMLInputElement; detail: HTMLElement }>();
  private readonly slotSelects = new Map<Slot, HTMLSelectElement>();
  private readonly rampSelects = new Map<Channel, { select: HTMLSelectElement; swatch: HTMLElement }>();
  private readonly text = document.createElement('textarea');
  private readonly errors = document.createElement('ul');
  private readonly status = document.createElement('p');

  constructor(
    elements: PilhaElements,
    private state: PilhaState,
    private readonly onChange: (state: PilhaState) => void,
  ) {
    this.buildLayers(elements.camadas);
    this.buildPieces(elements.pecas);
    this.buildRamps(elements.rampas);
    this.buildRecipe(elements.receita);
    this.status.className = 'ajuda status';
    elements.status.append(this.status);
    this.refresh();
  }

  get receita(): Receita {
    return this.state.receita;
  }

  private change(state: PilhaState): void {
    this.state = state;
    this.refresh();
    this.onChange(state);
  }

  private setReceita(receita: Receita): void {
    this.change({ ...this.state, receita });
  }

  private buildLayers(container: HTMLElement): void {
    const list = document.createElement('ul');
    list.className = 'lista-camadas';
    for (const camada of CAMADAS) {
      const item = document.createElement('li');
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.addEventListener('change', () => {
        const desligadas = new Set(this.state.desligadas);
        if (input.checked) desligadas.delete(camada.id);
        else desligadas.add(camada.id);
        this.change({ ...this.state, desligadas });
      });
      const name = document.createElement('span');
      name.textContent = `${camada.ordem}. ${camada.nome}`;
      const detail = document.createElement('span');
      detail.className = 'detalhe';
      label.append(input, name);
      item.append(label, detail);
      list.append(item);
      this.layerRows.set(camada.id, { input, detail });
    }
    const all = document.createElement('div');
    all.className = 'acoes';
    all.append(
      button('Ligar todas', () => this.change({ ...this.state, desligadas: new Set() })),
      button('Só o corpo', () => this.change({ ...this.state, desligadas: new Set(CAMADAS.map((c) => c.id).filter((id) => id !== 'corpo-base' && id !== 'sombra')) })),
    );
    container.append(list, all);
  }

  private buildPieces(container: HTMLElement): void {
    for (const choice of SLOT_CHOICES) {
      const select = document.createElement('select');
      if (choice.optional) select.add(new Option('Nenhuma', ''));
      for (const peca of PECAS.filter((candidate) => candidate.slot === choice.slot)) select.add(new Option(peca.nome, peca.id));
      select.addEventListener('change', () => this.setReceita(choice.set(this.state.receita, select.value || null)));
      this.slotSelects.set(choice.slot, select);
      container.append(labeled(choice.label, select));
    }
  }

  private buildRamps(container: HTMLElement): void {
    for (const channel of CHANNELS) {
      const select = document.createElement('select');
      for (const ramp of rampsFor(channel)) select.add(new Option(ramp.label, ramp.id));
      const sample = document.createElement('span');
      select.addEventListener('change', () => this.setReceita(setRamp(this.state.receita, channel, select.value)));
      this.rampSelects.set(channel, { select, swatch: sample });
      container.append(labeled(CHANNEL_LABELS[channel], select, sample));
    }
  }

  private buildRecipe(container: HTMLElement): void {
    this.text.className = 'receita';
    this.text.spellcheck = false;
    this.text.rows = 16;
    this.text.addEventListener('input', () => this.text.classList.add('editado'));
    this.errors.className = 'erros';
    const actions = document.createElement('div');
    actions.className = 'acoes';
    actions.append(
      button('Aplicar JSON', () => this.applyText()),
      button('Desfazer edição', () => this.refresh()),
      button('Receita padrão', () => this.setReceita(RECEITA_PADRAO)),
    );
    container.append(this.text, this.errors, actions);
  }

  private applyText(): void {
    const { receita, erros } = lerReceita(this.text.value);
    this.errors.replaceChildren(...erros.map((erro) => Object.assign(document.createElement('li'), { textContent: erro })));
    if (receita) this.setReceita(receita);
  }

  /** Põe os controles de acordo com o estado. */
  refresh(): void {
    const { receita, desligadas } = this.state;
    const pecas = pecasDaReceita(receita);
    const hidden = partesEscondidas(pecas, desligadas);
    for (const camada of CAMADAS) {
      const row = this.layerRows.get(camada.id)!;
      row.input.checked = !desligadas.has(camada.id);
      const parts = pecas.flatMap((peca) =>
        peca.partes
          .filter((parte) => parte.camada === camada.id)
          .map((parte) => {
            const by = hidden.get(`${peca.id}/${parte.id}`);
            return by ? `${parte.id} (escondida por ${by})` : `${peca.id}/${parte.id}`;
          }),
      );
      row.detail.textContent = camada.id === 'sombra' ? 'desenhada pela montagem, fora da folha' : parts.length ? parts.join(', ') : `— ${camada.exemplos.toLowerCase()}`;
      row.detail.classList.toggle('vazia', camada.id !== 'sombra' && parts.length === 0);
    }
    for (const choice of SLOT_CHOICES) this.slotSelects.get(choice.slot)!.value = choice.get(receita) ?? '';
    const rampas = rampasDaReceita(receita);
    for (const channel of CHANNELS) {
      const { select, swatch: sample } = this.rampSelects.get(channel)!;
      select.value = rampas[channel];
      sample.replaceChildren(swatch(RAMP_BY_ID[rampas[channel]].colors));
    }
    this.text.value = receitaJSON(receita);
    this.text.classList.remove('editado');
    this.errors.replaceChildren();
  }

  /** Tempo da última montagem, se veio do cache, quantas vezes cada etapa rodou e quantas cores a folha usa. */
  showStatus(montagem: Montagem<unknown>, contagem: { composicoes: number; pinturas: number }): void {
    const { tempos, refeito, cores } = montagem;
    const etapa = (feito: boolean, ms: number) => (feito ? `${ms.toFixed(1)} ms` : 'do cache');
    const limite = cores > 15 ? ' — passa do limite de 15!' : ' (limite 15)';
    this.status.textContent =
      `Composição: ${etapa(refeito.composicao, tempos.composicao)} · pintura: ${etapa(refeito.pintura, tempos.pintura)} · ` +
      `${contagem.composicoes} composições e ${contagem.pinturas} pinturas desde que a página abriu · ${cores} cores${limite}`;
    this.status.classList.toggle('alerta', cores > 15);
  }
}
