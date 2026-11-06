// Fontes de entrada: toque (ou mouse), teclado e controle. Cada uma entrega movimento, ataque e esquiva.

import { keysVector, stickVector, type Vec } from './input.ts';
import type { Settings } from './settings.ts';

export type SourceName = 'toque' | 'teclado' | 'controle';

export interface SourceReading {
  move: Vec;
  attack: boolean;
  dodge: boolean;
}

export interface JoystickView {
  active: boolean;
  originX: number;
  originY: number;
  knobX: number;
  knobY: number;
}

/** Distância das bordas para o joystick fixo, em px. */
const FIXED_MARGIN = 40;

export class TouchSource {
  readonly joystick: JoystickView = { active: false, originX: 0, originY: 0, knobX: 0, knobY: 0 };
  /** Verdadeiro depois que algum dedo tocou a tela. */
  touched = false;
  private pointerId: number | null = null;
  private attackPointers = new Set<number>();
  private dodgeQueued = false;

  constructor(
    private readonly surface: HTMLElement,
    attackButton: HTMLElement,
    dodgeButton: HTMLElement,
    private readonly settings: () => Settings,
  ) {
    surface.addEventListener('pointerdown', (event) => this.start(event));
    surface.addEventListener('pointermove', (event) => this.move(event));
    surface.addEventListener('pointerup', (event) => this.end(event));
    surface.addEventListener('pointercancel', (event) => this.end(event));

    attackButton.addEventListener('pointerdown', (event) => {
      this.markTouch(event);
      capture(attackButton, event.pointerId);
      this.attackPointers.add(event.pointerId);
      attackButton.classList.add('pressionado');
    });
    const releaseAttack = (event: PointerEvent) => {
      this.attackPointers.delete(event.pointerId);
      if (this.attackPointers.size === 0) attackButton.classList.remove('pressionado');
    };
    attackButton.addEventListener('pointerup', releaseAttack);
    attackButton.addEventListener('pointercancel', releaseAttack);

    dodgeButton.addEventListener('pointerdown', (event) => {
      this.markTouch(event);
      this.dodgeQueued = true;
      dodgeButton.classList.add('pressionado');
    });
    const releaseDodge = () => dodgeButton.classList.remove('pressionado');
    dodgeButton.addEventListener('pointerup', releaseDodge);
    dodgeButton.addEventListener('pointercancel', releaseDodge);
    dodgeButton.addEventListener('pointerleave', releaseDodge);
  }

  read(): SourceReading {
    const settings = this.settings();
    const { joystick } = this;
    const move = joystick.active
      ? stickVector(
          joystick.knobX - joystick.originX,
          joystick.knobY - joystick.originY,
          settings.joystickRadius,
          settings.deadZone,
          settings.curve,
        )
      : { x: 0, y: 0 };
    const dodge = this.dodgeQueued;
    this.dodgeQueued = false;
    return { move, attack: this.attackPointers.size > 0, dodge };
  }

  /** Centro do joystick fixo, recalculado a cada uso porque a tela pode girar. */
  fixedOrigin(): { x: number; y: number } {
    const radius = this.settings().joystickRadius;
    const rect = this.surface.getBoundingClientRect();
    return { x: FIXED_MARGIN + radius, y: rect.height - FIXED_MARGIN - radius - 24 };
  }

  private start(event: PointerEvent): void {
    this.markTouch(event);
    const rect = this.surface.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (this.pointerId !== null || x > rect.width / 2) return;
    this.pointerId = event.pointerId;
    capture(this.surface, event.pointerId);
    const origin = this.settings().joystickMode === 'fixed' ? this.fixedOrigin() : { x, y };
    Object.assign(this.joystick, { active: true, originX: origin.x, originY: origin.y });
    this.placeKnob(x, y);
  }

  private move(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    const rect = this.surface.getBoundingClientRect();
    this.placeKnob(event.clientX - rect.left, event.clientY - rect.top);
  }

  private end(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.joystick.active = false;
  }

  /** O botão visual para na borda; o vetor continua vindo do dedo, limitado ao raio. */
  private placeKnob(x: number, y: number): void {
    const radius = this.settings().joystickRadius;
    const dx = x - this.joystick.originX;
    const dy = y - this.joystick.originY;
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    this.joystick.knobX = this.joystick.originX + dx * scale;
    this.joystick.knobY = this.joystick.originY + dy * scale;
  }

  private markTouch(event: PointerEvent): void {
    if (event.pointerType === 'touch') this.touched = true;
  }
}

/** A captura falha para ponteiros que já foram soltos; nesse caso, segue sem ela. */
function capture(element: HTMLElement, pointerId: number): void {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Ponteiro inativo.
  }
}

const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  attack: ['KeyJ', 'Space'],
  dodge: ['KeyK', 'ShiftLeft', 'ShiftRight'],
};

export class KeyboardSource {
  private held = new Set<string>();
  private dodgeQueued = false;

  /** `active` desliga o teclado quando o jogo não está na tela (numa página com outras abas). */
  constructor(
    target: Window,
    private readonly active: () => boolean = () => true,
  ) {
    target.addEventListener('keydown', (event) => {
      if (!this.active()) return;
      const field = event.target;
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) return;
      const handled = Object.values(KEYS).some((codes) => codes.includes(event.code));
      if (!handled) return;
      event.preventDefault();
      if (KEYS.dodge.includes(event.code) && !event.repeat) this.dodgeQueued = true;
      this.held.add(event.code);
    });
    target.addEventListener('keyup', (event) => this.held.delete(event.code));
    target.addEventListener('blur', () => this.held.clear());
  }

  read(): SourceReading {
    if (!this.active()) this.held.clear();
    const any = (codes: string[]) => codes.some((code) => this.held.has(code));
    const dodge = this.dodgeQueued;
    this.dodgeQueued = false;
    return {
      move: keysVector(any(KEYS.up), any(KEYS.down), any(KEYS.left), any(KEYS.right)),
      attack: any(KEYS.attack),
      dodge,
    };
  }
}

/** Botões no padrão "standard" da Gamepad API (Xbox: A=0, B=1, X=2; direcional 12 a 15). */
const PAD = { attack: [0, 2], dodge: [1, 5], up: 12, down: 13, left: 14, right: 15 };

export class GamepadSource {
  name: string | null = null;
  private dodgeWasDown = false;

  constructor(private readonly settings: () => Settings) {}

  read(): SourceReading {
    const pad = navigator.getGamepads?.().find((candidate) => candidate?.connected) ?? null;
    this.name = pad?.id ?? null;
    if (!pad) return { move: { x: 0, y: 0 }, attack: false, dodge: false };

    const pressed = (index: number) => pad.buttons[index]?.pressed ?? false;
    const settings = this.settings();
    let move = stickVector(pad.axes[0] ?? 0, pad.axes[1] ?? 0, 1, settings.deadZone, settings.curve);
    if (move.x === 0 && move.y === 0) {
      move = keysVector(pressed(PAD.up), pressed(PAD.down), pressed(PAD.left), pressed(PAD.right));
    }
    const dodgeDown = PAD.dodge.some(pressed);
    const dodge = dodgeDown && !this.dodgeWasDown;
    this.dodgeWasDown = dodgeDown;
    return { move, attack: PAD.attack.some(pressed), dodge };
  }
}
