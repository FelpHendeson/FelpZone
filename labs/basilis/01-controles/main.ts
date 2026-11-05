import './style.css';
import { length, snapDirection, type Vec } from './input.ts';
import { createPlayer, stepPlayer } from './movement.ts';
import { mountPanel } from './panel.ts';
import { drawJoystick, drawScene, type Dummy } from './render.ts';
import { DEFAULTS, FIELDS, loadSettings, movementSettings, saveSettings } from './settings.ts';
import { GamepadSource, KeyboardSource, TouchSource, type SourceName, type SourceReading } from './sources.ts';
import { createWorld, moveWithCollision } from './world.ts';

const PLAYER_RADIUS = 0.3;
const ATTACK_REACH = 1.3;
const ATTACK_ARC = (Math.PI * 2) / 3;
const AIM_RANGE = 2.5;
const TRAIL_LENGTH = 6;

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = element<HTMLCanvasElement>('palco');
const ctx = canvas.getContext('2d')!;
const hud = element<HTMLElement>('hud');
const buttons = element<HTMLElement>('botoes');
const hint = element<HTMLElement>('dica');
const panel = element<HTMLElement>('ajustes');

const settings = loadSettings();
mountPanel(element('ajustes-campos'), settings, FIELDS, DEFAULTS, saveSettings);

const world = createWorld(64, 64, 7);
const player = createPlayer(32, 32);
const dummies: Dummy[] = [
  { x: 35.5, y: 30.5, flash: 0 },
  { x: 29, y: 34.5, flash: 0 },
  { x: 33.5, y: 35, flash: 0 },
];
const trail: Vec[] = [];
const camera: Vec = { x: player.x, y: player.y };

const touch = new TouchSource(canvas, element('botao-ataque'), element('botao-esquiva'), () => settings);
const keyboard = new KeyboardSource(window);
const gamepad = new GamepadSource(() => settings);
let lastSource: SourceName = 'teclado';

element('abrir-ajustes').addEventListener('click', () => {
  panel.hidden = !panel.hidden;
});
element('fechar-ajustes').addEventListener('click', () => {
  panel.hidden = true;
});
const fullscreen = element<HTMLButtonElement>('tela-cheia');
fullscreen.hidden = !document.fullscreenEnabled;
fullscreen.addEventListener('click', () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen().catch(() => undefined);
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

let viewWidth = 0;
let viewHeight = 0;
function resize(): void {
  const ratio = window.devicePixelRatio || 1;
  viewWidth = canvas.clientWidth;
  viewHeight = canvas.clientHeight;
  canvas.width = Math.round(viewWidth * ratio);
  canvas.height = Math.round(viewHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
new ResizeObserver(resize).observe(canvas);
resize();

/** Prioridade: quem está sendo usado agora. Ataque e esquiva de qualquer fonte valem. */
function readIntent(): { move: Vec; attack: boolean; dodge: boolean } {
  const readings: [SourceName, SourceReading][] = [
    ['toque', touch.read()],
    ['controle', gamepad.read()],
    ['teclado', keyboard.read()],
  ];
  const active = readings.find(([, reading]) => length(reading.move) > 0 || reading.attack || reading.dodge);
  if (active) lastSource = active[0];
  const moving = readings.find(([, reading]) => length(reading.move) > 0);
  return {
    move: snapDirection(moving?.[1].move ?? { x: 0, y: 0 }, settings.directions),
    attack: readings.some(([, reading]) => reading.attack),
    dodge: readings.some(([, reading]) => reading.dodge),
  };
}

function nearestDummyDirection(): Vec | null {
  if (!settings.autoAim) return null;
  let best: Vec | null = null;
  let bestDistance = AIM_RANGE;
  for (const dummy of dummies) {
    const distance = Math.hypot(dummy.x - player.x, dummy.y - player.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { x: dummy.x - player.x, y: dummy.y - player.y };
    }
  }
  return best;
}

function resolveHits(): void {
  const facing = Math.atan2(player.facing.y, player.facing.x);
  for (const dummy of dummies) {
    const dx = dummy.x - player.x;
    const dy = dummy.y - player.y;
    if (Math.hypot(dx, dy) > ATTACK_REACH + 0.2) continue;
    const difference = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - facing), Math.cos(Math.atan2(dy, dx) - facing)));
    if (difference <= ATTACK_ARC / 2) dummy.flash = 0.25;
  }
}

function vibrate(ms: number): void {
  if (settings.vibration) navigator.vibrate?.(ms);
}

const frameTimes: number[] = [];
let previous = performance.now();
let hudTimer = 0;
let hintHidden = false;

function frame(now: number): void {
  const dt = Math.min((now - previous) / 1000, 1 / 30);
  previous = now;
  frameTimes.push(dt);
  if (frameTimes.length > 60) frameTimes.shift();

  const intent = readIntent();
  if (!hintHidden && (length(intent.move) > 0 || intent.attack || intent.dodge)) {
    hintHidden = true;
    hint.classList.add('sumindo');
  }

  const movement = movementSettings(settings);
  const events = stepPlayer(player, intent, dt, movement, nearestDummyDirection);
  if (events.includes('attack')) {
    resolveHits();
    vibrate(15);
  }
  if (events.includes('dodge')) vibrate(10);
  moveWithCollision(world, player, player.vx * dt, player.vy * dt, PLAYER_RADIUS);

  if (player.dodgeTimer > 0) trail.push({ x: player.x, y: player.y });
  else trail.shift();
  while (trail.length > TRAIL_LENGTH) trail.shift();
  for (const dummy of dummies) dummy.flash = Math.max(0, dummy.flash - dt);

  // A câmera segue com um pequeno atraso, que suaviza mudanças bruscas de direção.
  const follow = 1 - Math.exp(-10 * dt);
  camera.x += (player.x - camera.x) * follow;
  camera.y += (player.y - camera.y) * follow;

  drawScene(ctx, viewWidth, viewHeight, {
    world,
    player,
    playerRadius: PLAYER_RADIUS,
    trail,
    dummies,
    camera,
    zoom: settings.zoom,
    attackDuration: movement.attackDuration,
    attackReach: ATTACK_REACH,
    attackArc: ATTACK_ARC,
    time: now / 1000,
  });
  const showIdleJoystick = settings.joystickMode === 'fixed' && touch.touched;
  drawJoystick(ctx, touch.joystick, settings.joystickRadius, showIdleJoystick ? touch.fixedOrigin() : null);

  const showButtons = settings.buttons === 'always' || (settings.buttons === 'auto' && (touch.touched || coarsePointer()));
  buttons.hidden = !showButtons;

  hudTimer -= dt;
  if (hudTimer <= 0) {
    hudTimer = 0.25;
    updateHud(intent.move);
  }
  requestAnimationFrame(frame);
}

function coarsePointer(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

function updateHud(move: Vec): void {
  hud.hidden = !settings.debug;
  if (!settings.debug) return;
  const average = frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length;
  const speed = Math.hypot(player.vx, player.vy);
  hud.textContent = [
    `${Math.round(1 / average)} fps`,
    `fonte: ${lastSource}${gamepad.name ? ' (controle conectado)' : ''}`,
    `intenção: ${move.x.toFixed(2)}, ${move.y.toFixed(2)} (${length(move).toFixed(2)})`,
    `velocidade: ${speed.toFixed(1)} tiles/s`,
  ].join('\n');
}

requestAnimationFrame(frame);
