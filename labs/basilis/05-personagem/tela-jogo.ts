// A aba Jogo (parte 4): o personagem da receita da criação andando e cortando numa arena pequena, com o
// movimento e os controles do Lab 04 (joystick e botões no celular, teclado no computador), e, acima, o
// boneco do menu comparado lado a lado: o desenho próprio de 64 × 96 e o sprite do jogo ampliado ×3.
// As duas leituras saem da mesma receita pelo `Montador` (cache da parte 2): trocar a receita na criação
// reflete aqui sem recarregar, e trocar só cores repinta.

import type { Vec } from '../01-controles/input.ts';
import { createPlayer, stepPlayer, type Intent } from '../01-controles/movement.ts';
import { loadSettings, movementSettings } from '../01-controles/settings.ts';
import { createWorld, moveWithCollision } from '../01-controles/world.ts';
import { PixelRenderer } from '../02-cenario/renderer.ts';
import { loadSceneSettings } from '../02-cenario/settings.ts';
import { Controls, watchCanvas } from '../02-cenario/stage.ts';
import { GENERATED_LAYOUT, TILE_SIZE, generateSheet, generatedCells, sliceSheet, type TileImages } from '../02-cenario/tileset.ts';
import { Animator, clipFrame, directionOf } from '../04-animacao/animation.ts';
import { sliceClips } from '../04-animacao/sheets.ts';
import { button } from '../04-animacao/viewer.ts';
import { Montador, drawCharacter, drawShadow, type WeaponImages } from './compor.ts';
import { DURACAO_DO_CORTE, clipNaArena } from './jogo.ts';
import type { ManequimOptions } from './manequim.ts';
import { MENU_DESENHOS, MENU_FORMAT, comporFolhaDoBoneco, pecasComMenu } from './menu.ts';
import { MOLDE_FORMAT } from './molde.ts';
import { PECAS } from './pecas.ts';
import { paintIndexed } from './pintura.ts';
import type { Receita } from './receita.ts';

const PLAYER_RADIUS = 0.3;
const TRAIL_LENGTH = 5;
/** Uma arena pequena: a água na borda e o lago do Lab 01, o resto grama, flores, pedras e árvores. */
const ARENA = { width: 26, height: 22, seed: 5 };
const SPAWN = { x: ARENA.width / 2, y: ARENA.height / 2 };
/** Margem em volta do quadro de 32 × 32 no desenho do personagem (a espada sai do quadro). */
const PAD = 16;

interface Pintada {
  sheet: HTMLCanvasElement;
  frames: Record<string, HTMLCanvasElement[]>;
}

export interface TelaDeJogoOpcoes {
  receita: Receita;
  manequim: () => ManequimOptions;
  fundo: () => string;
  sombra: () => boolean;
  weapon: WeaponImages;
  /** Se a aba está na tela (o teclado só vale nela). */
  ativa: () => boolean;
}

export interface TelaDeJogoElementos {
  menu: HTMLElement;
  /** Onde ficam a ampliação e a contagem de cores (embaixo, longe da arena). */
  detalhes: HTMLElement;
  arena: HTMLCanvasElement;
}

export class TelaDeJogo {
  private receita: Receita;
  private sujo = true;
  private time = 0;
  private escala = 0;
  private sprite!: Pintada;
  private boneco!: HTMLCanvasElement;
  private readonly spriteMontador = new Montador<Pintada>((sheet, palette) => {
    const canvas = paintIndexed(sheet, palette);
    return { sheet: canvas, frames: sliceClips(canvas, MOLDE_FORMAT) };
  });
  private readonly bonecoMontador = new Montador<HTMLCanvasElement>((sheet, palette) => paintIndexed(sheet, palette), undefined, comporFolhaDoBoneco);
  private readonly proprio = document.createElement('canvas');
  private readonly ampliado = document.createElement('canvas');
  private readonly ampliadoQuadro = document.createElement('canvas');
  private readonly status = document.createElement('p');
  private readonly custo = document.createElement('span');
  private readonly escalaBotoes = new Map<number, HTMLButtonElement>();

  // Arena
  private readonly renderer: PixelRenderer;
  private readonly ratio: () => number;
  private readonly controls: Controls;
  private readonly settings = loadSettings();
  private readonly scene = loadSceneSettings();
  private readonly tiles: TileImages = sliceSheet(generateSheet(), GENERATED_LAYOUT, generatedCells(), {} as TileImages);
  private readonly world = createWorld(ARENA.width, ARENA.height, ARENA.seed);
  private readonly player = createPlayer(SPAWN.x, SPAWN.y);
  private readonly animator = new Animator();
  private readonly camera: Vec = { x: SPAWN.x * TILE_SIZE, y: SPAWN.y * TILE_SIZE };
  private readonly trail: Vec[] = [];
  private readonly heroCanvas = document.createElement('canvas');
  private golpes = 0;

  constructor(
    private readonly elementos: TelaDeJogoElementos,
    private readonly opcoes: TelaDeJogoOpcoes,
  ) {
    this.receita = opcoes.receita;
    this.buildMenu(elementos.menu, elementos.detalhes);
    const canvas = elementos.arena;
    this.renderer = new PixelRenderer(canvas, canvas.getContext('2d')!);
    this.ratio = watchCanvas(canvas);
    this.controls = new Controls(canvas, this.settings, opcoes.ativa);
    this.heroCanvas.width = MOLDE_FORMAT.frameWidth + PAD * 2;
    this.heroCanvas.height = MOLDE_FORMAT.frameHeight + PAD * 2;
    this.animator.play('idle-down');
  }

  /** A receita da criação mudou: monta de novo na próxima vez que a aba desenhar (sem recarregar). */
  definirReceita(receita: Receita): void {
    this.receita = receita;
    this.sujo = true;
  }

  /** Os ajustes de contorno ou de fundo mudaram. */
  ajustesMudaram(): void {
    this.sujo = true;
  }

  // ---- Menu: os dois bonecos lado a lado ----

  private buildMenu(container: HTMLElement, detalhes: HTMLElement): void {
    const comparar = document.createElement('div');
    comparar.className = 'menu-comparar';
    const cartao = (canvas: HTMLCanvasElement, titulo: string, detalhe: string | HTMLElement) => {
      const figure = document.createElement('figure');
      figure.className = 'menu-cartao';
      canvas.width = MENU_FORMAT.width;
      canvas.height = MENU_FORMAT.height;
      const caption = document.createElement('figcaption');
      const strong = document.createElement('b');
      strong.textContent = titulo;
      caption.append(strong, ' ', detalhe);
      figure.append(canvas, caption);
      return figure;
    };
    this.ampliadoQuadro.width = MOLDE_FORMAT.frameWidth;
    this.ampliadoQuadro.height = MOLDE_FORMAT.frameHeight;
    const proprias = PECAS.filter((peca) => MENU_DESENHOS[peca.id]).length;
    this.custo.textContent = `64 × 96 · ${proprias} desenhos`;
    comparar.append(cartao(this.proprio, 'A · próprio', this.custo), cartao(this.ampliado, 'B · sprite ×3', '32 × 32 · grátis'));

    const escala = document.createElement('div');
    escala.className = 'menu-escala';
    const label = document.createElement('span');
    label.textContent = 'Ampliação';
    escala.append(label);
    for (const value of [1, 2, 3, 4]) {
      const element = button(`${value}×`, () => this.setEscala(value));
      this.escalaBotoes.set(value, element);
      escala.append(element);
    }
    this.status.className = 'menu-status';
    container.append(comparar);
    detalhes.append(escala, this.status);
    new ResizeObserver(() => {
      if (this.escala === 0) this.applyEscala(this.autoEscala());
    }).observe(container);
    this.applyEscala(this.autoEscala());
  }

  /** A maior ampliação inteira em que os dois cabem lado a lado. */
  private autoEscala(): number {
    const width = this.elementos.menu.closest('main')?.clientWidth || 340;
    let best = 1;
    for (const value of [2, 3]) if (2 * MENU_FORMAT.width * value + 44 <= width) best = value;
    return best;
  }

  private setEscala(value: number): void {
    this.escala = value;
    this.applyEscala(value);
  }

  private applyEscala(value: number): void {
    for (const canvas of [this.proprio, this.ampliado]) {
      canvas.style.width = `${MENU_FORMAT.width * value}px`;
      canvas.style.height = `${MENU_FORMAT.height * value}px`;
    }
    for (const [key, element] of this.escalaBotoes) element.classList.toggle('selecionado', key === value);
  }

  private montar(): void {
    const opcoes = { manequim: this.opcoes.manequim(), desligadas: new Set<never>() };
    const sprite = this.spriteMontador.montar(this.receita, opcoes);
    const boneco = this.bonecoMontador.montar(this.receita, opcoes);
    this.sprite = sprite.pintada;
    this.boneco = boneco.pintada;
    const ms = (montagem: typeof sprite | typeof boneco) =>
      !montagem.refeito.pintura
        ? 'do cache'
        : montagem.refeito.composicao
          ? `montado em ${(montagem.tempos.composicao + montagem.tempos.pintura).toFixed(0)} ms`
          : `só repintado (${montagem.tempos.pintura.toFixed(0)} ms)`;
    const { ampliadas } = pecasComMenu(this.receita);
    this.status.textContent =
      `Mesma receita, mesmas rampas: ${boneco.cores} cores no boneco, ${sprite.cores} no sprite. ` +
      `Boneco ${ms(boneco)}; sprite ${ms(sprite)}.` +
      (ampliadas ? ` ${ampliadas} peça(s) sem camada de menu, mostradas ampliadas.` : '');
    this.sujo = false;
  }

  private drawMenu(): void {
    const fundo = this.opcoes.fundo();
    const sombra = this.opcoes.sombra();
    const quadro = Math.floor(this.time * MENU_FORMAT.fps) % MENU_FORMAT.frames;

    // A: o boneco próprio, com uma sombra própria do tamanho dele.
    const a = this.proprio.getContext('2d')!;
    a.imageSmoothingEnabled = false;
    a.fillStyle = fundo;
    a.fillRect(0, 0, MENU_FORMAT.width, MENU_FORMAT.height);
    if (sombra) {
      a.fillStyle = 'rgba(16, 32, 20, 0.38)';
      const { anchorX: x, anchorY: y } = MENU_FORMAT;
      a.fillRect(x - 11, y - 4, 22, 1);
      a.fillRect(x - 15, y - 3, 30, 2);
      a.fillRect(x - 17, y - 1, 34, 2);
      a.fillRect(x - 13, y + 1, 26, 1);
    }
    a.drawImage(this.boneco, quadro * MENU_FORMAT.width, 0, MENU_FORMAT.width, MENU_FORMAT.height, 0, 0, MENU_FORMAT.width, MENU_FORMAT.height);

    // B: o quadro parado de frente do jogo (com a sombra do jogo), ampliado por inteiro e centrado nos pés.
    const q = this.ampliadoQuadro.getContext('2d')!;
    q.clearRect(0, 0, MOLDE_FORMAT.frameWidth, MOLDE_FORMAT.frameHeight);
    const clip = MOLDE_FORMAT.clips['idle-down'];
    drawCharacter(q, this.sprite.frames, 'idle-down', clipFrame(clip, this.time).index, false, 0, 0, { shadow: sombra });
    const b = this.ampliado.getContext('2d')!;
    b.imageSmoothingEnabled = false;
    b.fillStyle = fundo;
    b.fillRect(0, 0, MENU_FORMAT.width, MENU_FORMAT.height);
    const k = MENU_FORMAT.height / MOLDE_FORMAT.frameHeight;
    b.drawImage(
      this.ampliadoQuadro,
      MENU_FORMAT.anchorX - MOLDE_FORMAT.anchorX * k,
      MENU_FORMAT.anchorY - MOLDE_FORMAT.anchorY * k,
      MOLDE_FORMAT.frameWidth * k,
      MOLDE_FORMAT.frameHeight * k,
    );
  }

  // ---- Arena ----

  tick(dt: number): void {
    if (this.sujo) this.montar();
    this.time += dt;
    this.simulate(this.controls.read(), dt);
    this.followCamera(dt);
    this.drawMenu();
    this.drawArena();
  }

  private simulate(intent: Intent, dt: number): void {
    const moves = {
      ...movementSettings(this.settings),
      attackDuration: DURACAO_DO_CORTE,
      attackCooldown: Math.max(movementSettings(this.settings).attackCooldown, DURACAO_DO_CORTE),
    };
    const events = stepPlayer(this.player, intent, dt, moves);
    if (events.includes('attack')) this.golpes++;
    if (events.includes('dodge') && this.settings.vibration) navigator.vibrate?.(10);
    moveWithCollision(this.world, this.player, this.player.vx * dt, this.player.vy * dt, PLAYER_RADIUS);

    const { player } = this;
    const speed = Math.hypot(player.vx, player.vy);
    const { name } = clipNaArena({ dodging: player.dodgeTimer > 0, attacking: player.attackTimer > 0, speed, golpes: this.golpes }, player.facing);
    this.animator.play(name, events.includes('attack') || events.includes('dodge'));
    // Andar mais rápido anima mais rápido, como no Lab 04.
    const walk = name.startsWith('walk') ? Math.max(0.6, speed / this.settings.speed) : 1;
    this.animator.update(dt, walk);

    if (player.dodgeTimer > 0) this.trail.push({ x: player.x, y: player.y });
    else this.trail.shift();
    while (this.trail.length > TRAIL_LENGTH) this.trail.shift();
  }

  private followCamera(dt: number): void {
    const x = this.player.x * TILE_SIZE;
    const y = this.player.y * TILE_SIZE;
    if (this.scene.camera === 'locked') {
      this.camera.x = x;
      this.camera.y = y;
      return;
    }
    const follow = 1 - Math.exp(-10 * dt);
    this.camera.x += (x - this.camera.x) * follow;
    this.camera.y += (y - this.camera.y) * follow;
  }

  private drawArena(): void {
    const canvas = this.elementos.arena;
    const portrait = canvas.height > canvas.width;
    const view = this.renderer.begin(this.camera, this.world, {
      safeTiles: portrait ? this.scene.safeTilesPortrait : this.scene.safeTilesLandscape,
      scaleMode: this.scene.scaleMode,
      snap: this.scene.scroll === 'pixel',
    });
    if (!view) return;
    this.renderer.drawWorld(view, this.world, this.tiles, this.time);

    // O personagem num quadro com margem (a espada sai dos 32 × 32), desenhado na escala do mundo.
    const name = this.animator.name;
    const clip = MOLDE_FORMAT.clips[name];
    const { index } = clipFrame(clip, this.animator.time);
    const { flip } = directionOf(this.player.facing);
    const ctx = this.heroCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.heroCanvas.width, this.heroCanvas.height);
    drawCharacter(ctx, this.sprite.frames, name, index, flip, PAD, PAD, { weapon: this.opcoes.weapon, shadow: false });
    const at = (x: number, y: number) =>
      this.renderer.drawSprite(view, this.heroCanvas, x * TILE_SIZE - MOLDE_FORMAT.anchorX - PAD, y * TILE_SIZE - MOLDE_FORMAT.anchorY - PAD);

    // A sombra fica no chão, embaixo do rastro e do personagem.
    if (this.opcoes.sombra()) {
      const shadow = this.shadowCanvas();
      this.renderer.drawSprite(view, shadow, this.player.x * TILE_SIZE - MOLDE_FORMAT.anchorX, this.player.y * TILE_SIZE - MOLDE_FORMAT.anchorY);
    }
    const r = this.renderer.ctx;
    this.trail.forEach((point, i) => {
      r.globalAlpha = ((i + 1) / this.trail.length) * 0.35;
      at(point.x, point.y);
    });
    r.globalAlpha = 1;
    at(this.player.x, this.player.y);
    this.controls.drawOverlay(r, this.ratio());
  }

  private shadow: HTMLCanvasElement | null = null;
  private shadowCanvas(): HTMLCanvasElement {
    if (this.shadow) return this.shadow;
    const canvas = document.createElement('canvas');
    canvas.width = MOLDE_FORMAT.frameWidth;
    canvas.height = MOLDE_FORMAT.frameHeight;
    drawShadow(canvas.getContext('2d')!, MOLDE_FORMAT.anchorX, MOLDE_FORMAT.anchorY);
    this.shadow = canvas;
    return canvas;
  }
}
