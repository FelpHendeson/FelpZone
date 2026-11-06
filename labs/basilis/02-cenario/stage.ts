// Peças comuns dos labs com cenário: painéis, tela cheia, tamanho da tela, entradas e o herói.

import { length, snapDirection, type Vec } from '../01-controles/input.ts';
import type { Player } from '../01-controles/movement.ts';
import { drawJoystick } from '../01-controles/render.ts';
import type { Settings } from '../01-controles/settings.ts';
import { GamepadSource, KeyboardSource, TouchSource, type SourceName, type SourceReading } from '../01-controles/sources.ts';
import type { Frame, PixelRenderer } from './renderer.ts';
import { drawSlash, type SlashStyle } from './slash.ts';
import { PLAYER_WIDTH, TILE_SIZE, WALK_CYCLE, facingFromVector, generateHero, type Facing } from './tileset.ts';

export const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** Botões com `data-painel="id"` abrem e fecham o painel; só um painel fica aberto por vez. */
export function setupPanels(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-painel]').forEach((button) =>
    button.addEventListener('click', () => {
      const panel = element(button.dataset.painel!);
      const wasHidden = panel.hidden;
      document.querySelectorAll<HTMLElement>('.painel').forEach((other) => (other.hidden = true));
      panel.hidden = !wasHidden;
    }),
  );
  document.querySelectorAll<HTMLButtonElement>('.fechar').forEach((close) =>
    close.addEventListener('click', () => {
      close.closest<HTMLElement>('.painel')!.hidden = true;
    }),
  );
  const fullscreen = element<HTMLButtonElement>('tela-cheia');
  fullscreen.hidden = !document.fullscreenEnabled;
  fullscreen.addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  });
}

/** Mantém o canvas em pixels físicos. Devolve a razão atual entre pixels físicos e CSS. */
export function watchCanvas(canvas: HTMLCanvasElement): () => number {
  let ratio = 1;
  const resize = () => {
    ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  return () => ratio;
}

export interface Intent {
  move: Vec;
  attack: boolean;
  dodge: boolean;
}

/** Toque, teclado e controle juntos, com os ajustes calibrados no Lab 01. */
export class Controls {
  readonly touch: TouchSource;
  readonly gamepad: GamepadSource;
  private readonly keyboard: KeyboardSource;
  lastSource: SourceName = 'teclado';

  /** `active`: o teclado só vale enquanto o jogo está na tela (padrão: sempre). */
  constructor(
    canvas: HTMLCanvasElement,
    private readonly settings: Settings,
    active: () => boolean = () => true,
  ) {
    this.keyboard = new KeyboardSource(window, active);
    this.touch = new TouchSource(canvas, element('botao-ataque'), element('botao-esquiva'), () => settings);
    this.gamepad = new GamepadSource(() => settings);
  }

  read(): Intent {
    const readings: [SourceName, SourceReading][] = [
      ['toque', this.touch.read()],
      ['controle', this.gamepad.read()],
      ['teclado', this.keyboard.read()],
    ];
    const active = readings.find(([, reading]) => length(reading.move) > 0 || reading.attack || reading.dodge);
    if (active) this.lastSource = active[0];
    const moving = readings.find(([, reading]) => length(reading.move) > 0);
    return {
      move: snapDirection(moving?.[1].move ?? { x: 0, y: 0 }, this.settings.directions),
      attack: readings.some(([, reading]) => reading.attack),
      dodge: readings.some(([, reading]) => reading.dodge),
    };
  }

  /** Joystick e botões na tela, depois do mundo. */
  drawOverlay(ctx: CanvasRenderingContext2D, ratio: number): void {
    const { settings, touch } = this;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const showIdle = settings.joystickMode === 'fixed' && touch.touched;
    drawJoystick(ctx, touch.joystick, settings.joystickRadius, showIdle ? touch.fixedOrigin() : null);
    const show = settings.buttons === 'always' || (settings.buttons === 'auto' && (touch.touched || window.matchMedia('(pointer: coarse)').matches));
    element('botoes').hidden = !show;
  }
}

/** Altura dos pés dentro do sprite de 24 px. */
export const FEET_Y = 22;
const TRAIL_LENGTH = 5;

export interface SlashOptions {
  style: SlashStyle;
  duration: number;
  /** Alcance em tiles e abertura em radianos. */
  reach: number;
  arc: number;
}

/** O herói gerado por código: animação de andar, rastro da esquiva, piscar ao levar dano e o golpe. */
export class HeroView {
  private readonly frames = generateHero();
  private readonly flashFrames = Object.fromEntries(
    Object.entries(this.frames).map(([facing, frames]) => [facing, frames.map((frame) => silhouette(frame, '#ffffff'))]),
  ) as Record<Facing, HTMLCanvasElement[]>;
  private walkTime = 0;
  private readonly trail: Vec[] = [];

  update(player: Player, dt: number): void {
    const speed = Math.hypot(player.vx, player.vy);
    this.walkTime = speed > 0.3 ? this.walkTime + dt * Math.max(speed, 2) * 1.6 : 0;
    if (player.dodgeTimer > 0) this.trail.push({ x: player.x, y: player.y });
    else this.trail.shift();
    while (this.trail.length > TRAIL_LENGTH) this.trail.shift();
  }

  /** `flash` faz o herói piscar em branco; `hidden` o esconde neste quadro (invulnerabilidade). */
  draw(renderer: PixelRenderer, frame: Frame, player: Player, slash: SlashOptions, flash = false, hidden = false): void {
    const facing = facingFromVector(player.facing.x, player.facing.y);
    const step = this.walkTime > 0 ? WALK_CYCLE[Math.floor(this.walkTime) % WALK_CYCLE.length] : 0;
    const sprite = (flash ? this.flashFrames : this.frames)[facing][step];
    const at = (x: number, y: number) => renderer.drawSprite(frame, sprite, x * TILE_SIZE - PLAYER_WIDTH / 2, y * TILE_SIZE - FEET_Y);
    const { ctx } = renderer;

    this.trail.forEach((point, index) => {
      ctx.globalAlpha = ((index + 1) / this.trail.length) * 0.35;
      at(point.x, point.y);
    });
    ctx.globalAlpha = 1;
    if (!hidden) at(player.x, player.y);

    if (player.attackTimer > 0) {
      const center = frame.toScreen(player.x * TILE_SIZE, player.y * TILE_SIZE - 6);
      drawSlash(ctx, slash.style, {
        x: center.x,
        y: center.y,
        reach: slash.reach * TILE_SIZE * frame.view.scale,
        angle: Math.atan2(player.facing.y, player.facing.x),
        arc: slash.arc,
        progress: 1 - player.attackTimer / slash.duration,
        scale: frame.view.scale,
      });
    }
  }
}

/** Cópia da imagem com todos os pixels visíveis numa cor só (piscar ao levar dano). */
export function silhouette(image: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}
