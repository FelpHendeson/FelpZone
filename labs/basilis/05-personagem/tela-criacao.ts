// A tela de criação de personagem (parte 3): a prévia grande girando e animando, o personagem no tamanho
// do jogo, as escolhas da seção 6 em blocos grandes para o polegar (cada peça com a miniatura do próprio
// personagem), o botão de sortear e a receita resultante em JSON. Feita para o celular em retrato.

import { clipFrame } from '../04-animacao/animation.ts';
import { button } from '../04-animacao/viewer.ts';
import { Montador, comporQuadro, drawCharacter, type WeaponImages } from './compor.ts';
import { ESCOLHAS, GRUPOS, escolher, receitaDeCriacao, sortear, type Escolha, type GrupoDeCriacao } from './criacao.ts';
import type { ManequimOptions } from './manequim.ts';
import { FACINGS, FACING_LABELS, MOLDE_FORMAT, RAMP_BY_ID, facingRow, moldeClipName, paletteForRamps, type Facing, type MoldeAction } from './molde.ts';
import { downloadBlob, paintIndexed } from './pintura.ts';
import { rampasDaReceita, receitaJSON, type Receita } from './receita.ts';
import { sliceClips } from '../04-animacao/sheets.ts';

const PREVIEW_SCALE = 8;
const GAME_SCALE = 2;
/** Quanto tempo a prévia fica em cada direção quando está girando. */
const TURN_SECONDS = 1.6;
const TURN_ORDER: Facing[] = ['down', 'side', 'up', 'left'];

const ANIMACOES: { action: MoldeAction; nome: string }[] = [
  { action: 'idle', nome: 'Parado' },
  { action: 'walk', nome: 'Andar' },
  { action: 'slash-a', nome: 'Cortar' },
  { action: 'hurt', nome: 'Dano' },
];

/** Recorte da miniatura de cada escolha (no quadro de 32 × 32) e a animação de onde ela sai. */
interface Recorte {
  x: number;
  y: number;
  width: number;
  height: number;
  clip: string;
  scale: number;
}

const ROSTO: Recorte = { x: 9, y: 3, width: 14, height: 12, clip: 'idle-down', scale: 4 };
const CABECA: Recorte = { x: 6, y: 0, width: 20, height: 18, clip: 'idle-down', scale: 3 };
const RECORTES: Record<string, Recorte> = {
  corpo: { x: 6, y: 2, width: 20, height: 28, clip: 'idle-down', scale: 2 },
  'olhos-forma': ROSTO,
  sobrancelhas: ROSTO,
  marcas: ROSTO,
  'cabelo-estilo': CABECA,
  barba: CABECA,
  linhagem: { x: 4, y: 0, width: 24, height: 30, clip: 'idle-side', scale: 2 },
};

export interface TelaDeCriacaoOpcoes {
  receita: Receita;
  manequim: () => ManequimOptions;
  fundo: () => string;
  weapon: WeaponImages;
  onChange(receita: Receita): void;
  /** Leva a receita para a bancada da parte 2. */
  abrirNaBancada(receita: Receita): void;
}

interface Pintada {
  sheet: HTMLCanvasElement;
  frames: Record<string, HTMLCanvasElement[]>;
}

export class TelaDeCriacao {
  private receita: Receita;
  private grupo: GrupoDeCriacao = 'corpo';
  private action: MoldeAction = 'walk';
  private facing: Facing = 'down';
  private girando = true;
  private time = 0;
  private turnTime = 0;
  private images!: Pintada;
  private readonly montador = new Montador<Pintada>((sheet, palette) => {
    const canvas = paintIndexed(sheet, palette);
    return { sheet: canvas, frames: sliceClips(canvas, MOLDE_FORMAT) };
  });
  private readonly preview = document.createElement('canvas');
  private readonly game = document.createElement('canvas');
  private readonly facingLabel = document.createElement('span');
  private readonly turnButton = button('Girando', () => this.setGirando(!this.girando));
  private readonly actionButtons = new Map<MoldeAction, HTMLButtonElement>();
  private readonly groupButtons = new Map<GrupoDeCriacao, HTMLButtonElement>();
  private readonly palco = document.createElement('div');
  private readonly options = document.createElement('div');
  private readonly json = document.createElement('pre');
  private readonly status = document.createElement('p');
  private readonly tiles: { escolha: Escolha; valor: string; element: HTMLButtonElement; thumb: HTMLCanvasElement | null }[] = [];

  constructor(
    container: HTMLElement,
    private readonly opcoes: TelaDeCriacaoOpcoes,
  ) {
    this.receita = receitaDeCriacao(opcoes.receita);
    this.build(container);
    this.montar();
    this.showGroup(this.grupo);
  }

  // ---- Montagem ----

  private build(container: HTMLElement): void {
    const palco = this.palco;
    palco.className = 'criacao-palco';

    this.preview.className = 'criacao-previa';
    this.preview.width = MOLDE_FORMAT.frameWidth * PREVIEW_SCALE;
    this.preview.height = MOLDE_FORMAT.frameHeight * PREVIEW_SCALE;
    this.preview.title = 'Toque para virar';
    this.preview.addEventListener('click', () => this.nextFacing());
    this.game.className = 'criacao-jogo';
    this.game.width = MOLDE_FORMAT.frameWidth * 2;
    this.game.height = MOLDE_FORMAT.frameHeight * 2;
    this.game.style.width = `${this.game.width * GAME_SCALE}px`;

    const lado = document.createElement('div');
    lado.className = 'criacao-lado';
    const gameCaption = document.createElement('span');
    gameCaption.className = 'legenda-jogo';
    gameCaption.textContent = 'Tamanho do jogo';
    const sortearButton = button('Sortear', () => this.setReceita(sortear(this.receita)));
    sortearButton.className = 'sortear';
    lado.append(this.game, gameCaption, sortearButton);

    const topo = document.createElement('div');
    topo.className = 'criacao-topo';
    const previewBox = document.createElement('div');
    previewBox.className = 'criacao-previa-caixa';
    this.facingLabel.className = 'criacao-direcao';
    previewBox.append(this.preview, this.facingLabel);
    topo.append(previewBox, lado);

    const controls = document.createElement('div');
    controls.className = 'criacao-controles';
    this.turnButton.classList.add('selecionado');
    controls.append(this.turnButton);
    for (const { action, nome } of ANIMACOES) {
      const element = button(nome, () => this.setAction(action));
      this.actionButtons.set(action, element);
      controls.append(element);
    }

    const abas = document.createElement('div');
    abas.className = 'criacao-abas';
    abas.setAttribute('role', 'tablist');
    for (const grupo of GRUPOS) {
      const element = button(grupo.nome, () => this.showGroup(grupo.id));
      element.setAttribute('role', 'tab');
      this.groupButtons.set(grupo.id, element);
      abas.append(element);
    }
    palco.append(topo, controls, abas);

    this.options.className = 'criacao-opcoes';

    const receita = document.createElement('section');
    receita.className = 'bloco';
    const title = document.createElement('h2');
    title.textContent = 'Receita (JSON)';
    this.json.className = 'receita';
    this.status.className = 'ajuda status';
    const acoes = document.createElement('div');
    acoes.className = 'acoes';
    acoes.append(
      button('Copiar', () => void navigator.clipboard?.writeText(receitaJSON(this.receita))),
      button('Baixar', () => downloadBlob(new Blob([receitaJSON(this.receita)], { type: 'application/json' }), 'basilis-receita.json')),
      button('Abrir na bancada', () => this.opcoes.abrirNaBancada(this.receita)),
    );
    receita.append(title, this.status, this.json, acoes);

    container.append(palco, this.options, receita);
    this.updateControls();
  }

  /** Monta a receita (ou reaproveita a montagem, se só a cor mudou) e atualiza o JSON. */
  montar(): void {
    const montagem = this.montador.montar(this.receita, { manequim: this.opcoes.manequim(), desligadas: new Set() });
    this.images = montagem.pintada;
    this.json.textContent = receitaJSON(this.receita);
    const limite = montagem.cores > 15 ? ' — passa do limite de 15!' : ' (limite 15)';
    const etapa = montagem.refeito.composicao ? `montada em ${(montagem.tempos.composicao + montagem.tempos.pintura).toFixed(0)} ms` : `só repintada, ${montagem.tempos.pintura.toFixed(0)} ms`;
    this.status.textContent = `${montagem.cores} cores${limite} · ${etapa}`;
    this.status.classList.toggle('alerta', montagem.cores > 15);
  }

  private setReceita(receita: Receita): void {
    this.receita = receitaDeCriacao(receita);
    this.montar();
    this.refreshTiles();
    this.opcoes.onChange(this.receita);
  }

  /** Troca a receita por fora (por exemplo, ao voltar da bancada). */
  definirReceita(receita: Receita): void {
    this.setReceita(receita);
  }

  get receitaAtual(): Receita {
    return this.receita;
  }

  // ---- Controles ----

  private setGirando(on: boolean): void {
    this.girando = on;
    this.turnTime = 0;
    this.updateControls();
  }

  private nextFacing(): void {
    this.facing = TURN_ORDER[(TURN_ORDER.indexOf(this.facing) + 1) % TURN_ORDER.length];
    this.setGirando(false);
  }

  private setAction(action: MoldeAction): void {
    this.action = action;
    this.time = 0;
    this.updateControls();
  }

  private updateControls(): void {
    this.turnButton.textContent = this.girando ? 'Girando' : 'Girar';
    this.turnButton.classList.toggle('selecionado', this.girando);
    for (const [action, element] of this.actionButtons) element.classList.toggle('selecionado', action === this.action);
    this.facingLabel.textContent = FACING_LABELS[this.facing];
  }

  private showGroup(grupo: GrupoDeCriacao): void {
    this.grupo = grupo;
    for (const [id, element] of this.groupButtons) {
      element.classList.toggle('selecionado', id === grupo);
      element.setAttribute('aria-selected', String(id === grupo));
    }
    this.tiles.length = 0;
    const blocks: HTMLElement[] = [];
    if (grupo === 'roupa') blocks.push(note('Todo mundo chega com a roupa da Terra: camiseta, calça e tênis gastos. Aqui só se escolhem as cores.'));
    if (grupo === 'linhagem') {
      blocks.push(
        note(
          'A linhagem não se escolhe na criação: o jogo dá, ao virar Marcado ou Transformado. Este exemplo prova a camada: as orelhas e os olhos de lobo de Mykol entram na camada da linhagem (os olhos de lobo escondem os olhos escolhidos) e a cauda vai atrás do corpo (de costas, na frente). O cabelo cobre a base das orelhas; careca, elas aparecem inteiras.',
        ),
      );
    }
    for (const escolha of ESCOLHAS.filter((candidate) => candidate.grupo === grupo)) blocks.push(this.buildChoice(escolha));
    this.options.replaceChildren(...blocks);
    this.refreshTiles();
    // Com a página rolada, o começo do grupo novo ficaria escondido atrás da prévia presa no topo.
    const hidden = this.palco.getBoundingClientRect().bottom - this.options.getBoundingClientRect().top;
    if (hidden > 0) window.scrollBy(0, -hidden);
  }

  private buildChoice(escolha: Escolha): HTMLElement {
    const section = document.createElement('section');
    section.className = 'escolha';
    const title = document.createElement('h3');
    title.textContent = escolha.nome;
    const grid = document.createElement('div');
    grid.className = `opcoes ${escolha.tipo === 'rampa' ? 'opcoes-cor' : 'opcoes-peca'}`;
    for (const opcao of escolha.opcoes) {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'opcao';
      element.setAttribute('aria-label', `${escolha.nome}: ${opcao.nome}`);
      let thumb: HTMLCanvasElement | null = null;
      if (escolha.tipo === 'rampa') {
        const colors = RAMP_BY_ID[opcao.valor].colors;
        const sample = document.createElement('span');
        sample.className = 'bolinha';
        sample.style.background = `linear-gradient(135deg, ${colors[3]} 0 30%, ${colors[2]} 30% 70%, ${colors[1]} 70%)`;
        sample.style.borderColor = colors[0];
        element.append(sample);
      } else {
        const recorte = RECORTES[escolha.id];
        thumb = document.createElement('canvas');
        thumb.width = recorte.width;
        thumb.height = recorte.height;
        thumb.style.width = `${recorte.width * recorte.scale}px`;
        thumb.style.height = `${recorte.height * recorte.scale}px`;
        element.append(thumb);
      }
      const name = document.createElement('span');
      name.className = 'nome';
      name.textContent = opcao.nome;
      element.append(name);
      element.addEventListener('click', () => this.setReceita(escolher(this.receita, escolha.id, opcao.valor)));
      grid.append(element);
      this.tiles.push({ escolha, valor: opcao.valor, element, thumb });
    }
    section.append(title, grid);
    return section;
  }

  /** Marca as opções escolhidas e redesenha as miniaturas (cada uma é o próprio personagem com aquela opção). */
  private refreshTiles(): void {
    const manequim = this.opcoes.manequim();
    const fundo = this.opcoes.fundo();
    for (const tile of this.tiles) {
      const selected = tile.escolha.ler(this.receita) === tile.valor;
      tile.element.classList.toggle('selecionado', selected);
      tile.element.setAttribute('aria-pressed', String(selected));
      if (!tile.thumb) continue;
      const recorte = RECORTES[tile.escolha.id];
      const receita = tile.escolha.escrever(this.receita, tile.valor);
      const frame = comporQuadro(receita, recorte.clip, 0, manequim);
      const painted = paintIndexed(frame, paletteForRamps(rampasDaReceita(receita)));
      const ctx = tile.thumb.getContext('2d')!;
      ctx.clearRect(0, 0, recorte.width, recorte.height);
      if (fundo) {
        ctx.fillStyle = fundo;
        ctx.fillRect(0, 0, recorte.width, recorte.height);
      }
      ctx.drawImage(painted, recorte.x, recorte.y, recorte.width, recorte.height, 0, 0, recorte.width, recorte.height);
    }
  }

  /** Os ajustes de contorno ou o fundo mudaram. */
  ajustesMudaram(): void {
    this.montar();
    this.refreshTiles();
  }

  // ---- Desenho ----

  tick(dt: number): void {
    this.time += dt;
    if (this.girando) {
      this.turnTime += dt;
      if (this.turnTime >= TURN_SECONDS) {
        this.turnTime -= TURN_SECONDS;
        this.facing = TURN_ORDER[(TURN_ORDER.indexOf(this.facing) + 1) % TURN_ORDER.length];
        this.updateControls();
      }
    }
    this.drawPreview();
    this.drawGame();
  }

  private frameAt(facing: Facing): { name: string; index: number; flip: boolean } {
    const { direction, flip } = facingRow(facing);
    const name = moldeClipName(this.action, direction);
    const clip = MOLDE_FORMAT.clips[name];
    // Golpe e dano repetem com uma pausa, para dar tempo de ver.
    const duration = clip.frames / clip.fps;
    const time = clip.loop ? this.time : Math.min(this.time % (duration + 0.5), duration - 1e-6);
    const { index } = clipFrame({ ...clip, loop: true }, time);
    return { name, index, flip };
  }

  private draw(ctx: CanvasRenderingContext2D, facing: Facing, x: number, y: number): void {
    const { name, index, flip } = this.frameAt(facing);
    drawCharacter(ctx, this.images.frames, name, index, flip, x, y, {
      shadow: true,
      weapon: this.action === 'slash-a' ? this.opcoes.weapon : null,
    });
  }

  private background(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);
    const fundo = this.opcoes.fundo();
    if (!fundo) return;
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, width, height);
  }

  private drawPreview(): void {
    const ctx = this.preview.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    this.background(ctx, this.preview.width, this.preview.height);
    ctx.save();
    ctx.scale(PREVIEW_SCALE, PREVIEW_SCALE);
    this.draw(ctx, this.facing, 0, 0);
    ctx.restore();
  }

  /** As quatro direções no tamanho do jogo, 2 × 2. */
  private drawGame(): void {
    const ctx = this.game.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    this.background(ctx, this.game.width, this.game.height);
    FACINGS.forEach((facing, slot) => this.draw(ctx, facing, (slot % 2) * MOLDE_FORMAT.frameWidth, Math.floor(slot / 2) * MOLDE_FORMAT.frameHeight));
  }
}

function note(text: string): HTMLElement {
  const element = document.createElement('p');
  element.className = 'ajuda';
  element.textContent = text;
  return element;
}
