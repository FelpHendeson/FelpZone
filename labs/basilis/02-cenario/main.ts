import '../01-controles/style.css';
import './style.css';
import { length, snapDirection, type Vec } from '../01-controles/input.ts';
import { createPlayer, stepPlayer } from '../01-controles/movement.ts';
import { mountPanel } from '../01-controles/panel.ts';
import { drawJoystick } from '../01-controles/render.ts';
import { loadSettings, movementSettings } from '../01-controles/settings.ts';
import { GamepadSource, KeyboardSource, TouchSource, type SourceName, type SourceReading } from '../01-controles/sources.ts';
import { TILE, createWorld, moveWithCollision, tileAt } from '../01-controles/world.ts';
import { SCENE_DEFAULTS, SCENE_FIELDS, loadSceneSettings, saveSceneSettings } from './settings.ts';
import { SheetEditor } from './sheet.ts';
import { PLAYER_HEIGHT, PLAYER_WIDTH, TILE_SIZE, WALK_CYCLE, facingFromVector, generateHero, type Role } from './tileset.ts';
import { cameraAxis, computeViewport } from './viewport.ts';

const PLAYER_RADIUS = 0.3;
/** Altura dos pés dentro do sprite de 24 px. */
const FEET_Y = 22;
const WATER_FRAME_SECONDS = 0.6;
const TRAIL_LENGTH = 5;

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = element<HTMLCanvasElement>('palco');
const ctx = canvas.getContext('2d')!;
const low = document.createElement('canvas');
const lowCtx = low.getContext('2d')!;
const hud = element<HTMLElement>('hud');
const buttons = element<HTMLElement>('botoes');
const hint = element<HTMLElement>('dica');

// Movimento e joystick seguem o que foi calibrado no Lab 01 (mesmo aparelho, mesmo armazenamento).
const controls = loadSettings();
const scene = loadSceneSettings();
mountPanel(element('ajustes-campos'), scene, SCENE_FIELDS, SCENE_DEFAULTS, saveSceneSettings);
const sheet = new SheetEditor(element('folha-campos'));
const hero = generateHero();

const world = createWorld(64, 64, 7);
const player = createPlayer(32, 32);
const camera: Vec = { x: player.x * TILE_SIZE, y: player.y * TILE_SIZE };
const trail: Vec[] = [];
let walkTime = 0;

const touch = new TouchSource(canvas, element('botao-ataque'), element('botao-esquiva'), () => controls);
const keyboard = new KeyboardSource(window);
const gamepad = new GamepadSource(() => controls);
let lastSource: SourceName = 'teclado';

for (const [open, panelId] of [
  ['abrir-ajustes', 'ajustes'],
  ['abrir-folha', 'folha'],
] as const) {
  element(open).addEventListener('click', () => {
    const panel = element(panelId);
    const wasHidden = panel.hidden;
    document.querySelectorAll<HTMLElement>('.painel').forEach((other) => (other.hidden = true));
    panel.hidden = !wasHidden;
  });
}
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
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

let ratio = 1;
function resize(): void {
  ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * ratio);
  canvas.height = Math.round(canvas.clientHeight * ratio);
}
new ResizeObserver(resize).observe(canvas);
resize();

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
    move: snapDirection(moving?.[1].move ?? { x: 0, y: 0 }, controls.directions),
    attack: readings.some(([, reading]) => reading.attack),
    dodge: readings.some(([, reading]) => reading.dodge),
  };
}

const ROLE_BY_TILE: Record<number, Role> = {
  [TILE.grass]: 'grass',
  [TILE.grassDark]: 'grassDark',
  [TILE.flower]: 'flower',
  [TILE.rock]: 'rock',
  [TILE.tree]: 'tree',
  [TILE.water]: 'water',
};

const frameTimes: number[] = [];
let previous = performance.now();
let hudTimer = 0;
let hintHidden = false;

function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, 1 / 30);
  previous = now;
  frameTimes.push(dt);
  if (frameTimes.length > 60) frameTimes.shift();

  const intent = readIntent();
  if (!hintHidden && (length(intent.move) > 0 || intent.attack || intent.dodge)) {
    hintHidden = true;
    hint.classList.add('sumindo');
  }

  const movement = movementSettings(controls);
  stepPlayer(player, intent, dt, movement);
  moveWithCollision(world, player, player.vx * dt, player.vy * dt, PLAYER_RADIUS);
  const speed = Math.hypot(player.vx, player.vy);
  walkTime = speed > 0.3 ? walkTime + dt * Math.max(speed, 2) * 1.6 : 0;
  if (player.dodgeTimer > 0) trail.push({ x: player.x, y: player.y });
  else trail.shift();
  while (trail.length > TRAIL_LENGTH) trail.shift();

  // Tudo em pixels do jogo: o personagem, a câmera e o mundo.
  const targetX = player.x * TILE_SIZE;
  const targetY = player.y * TILE_SIZE;
  if (scene.camera === 'locked') {
    camera.x = targetX;
    camera.y = targetY;
  } else {
    const follow = 1 - Math.exp(-10 * dt);
    camera.x += (targetX - camera.x) * follow;
    camera.y += (targetY - camera.y) * follow;
  }

  // Durante um redimensionamento a tela pode medir zero por um instante; pula o desenho.
  if (canvas.width === 0 || canvas.height === 0) return;
  const portrait = canvas.height > canvas.width;
  const safeTiles = portrait ? scene.safeTilesPortrait : scene.safeTilesLandscape;
  const safeSize = safeTiles * TILE_SIZE;
  const view = computeViewport(canvas.width, canvas.height, safeSize, scene.scaleMode);
  // Um pixel a mais em cada eixo para cobrir o deslocamento fracionário da rolagem lisa.
  if (low.width !== view.width + 1 || low.height !== view.height + 1) {
    low.width = view.width + 1;
    low.height = view.height + 1;
  }
  const snap = scene.scroll === 'pixel';
  const cameraX = cameraAxis(camera.x, view.width, world.width * TILE_SIZE, snap);
  const cameraY = cameraAxis(camera.y, view.height, world.height * TILE_SIZE, snap);
  drawWorld({ x: cameraX.origin, y: cameraY.origin }, now / 1000);

  // O mundo é ampliado sem suavização e deslocado pela fração da câmera em pixels de tela inteiros:
  // os pixels continuam do mesmo tamanho, mas a rolagem anda em passos de tela, não de jogo.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0f1a14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const offsetX = Math.round((canvas.width - view.width * view.scale) / 2);
  const offsetY = Math.round((canvas.height - view.height * view.scale) / 2);
  ctx.drawImage(
    low,
    offsetX - Math.round(cameraX.fraction * view.scale),
    offsetY - Math.round(cameraY.fraction * view.scale),
    low.width * view.scale,
    low.height * view.scale,
  );

  // Sprites vão direto na tela, na mesma escala, posicionados pela mesma câmera: andam lisos e sem tremer.
  const toScreen = (worldX: number, worldY: number): Vec => ({
    x: Math.round(offsetX + ((snap ? Math.round(worldX) : worldX) - cameraX.left) * view.scale),
    y: Math.round(offsetY + ((snap ? Math.round(worldY) : worldY) - cameraY.left) * view.scale),
  });
  drawHero(toScreen, view.scale, movement.attackDuration);

  if (scene.showSafeArea) {
    // A área central acompanha a câmera; perto da borda do mundo, o personagem sai do meio dela.
    const side = safeSize * view.scale;
    const centerX = offsetX + (view.width / 2) * view.scale;
    const centerY = offsetY + (view.height / 2) * view.scale;
    ctx.setLineDash([8 * ratio, 6 * ratio]);
    ctx.lineWidth = 2 * ratio;
    ctx.strokeStyle = 'rgba(255, 224, 102, 0.8)';
    ctx.strokeRect(Math.round(centerX - side / 2), Math.round(centerY - side / 2), Math.round(side), Math.round(side));
    ctx.setLineDash([]);
  }

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const showIdleJoystick = controls.joystickMode === 'fixed' && touch.touched;
  drawJoystick(ctx, touch.joystick, controls.joystickRadius, showIdleJoystick ? touch.fixedOrigin() : null);

  const showButtons = controls.buttons === 'always' || (controls.buttons === 'auto' && (touch.touched || window.matchMedia('(pointer: coarse)').matches));
  buttons.hidden = !showButtons;

  hudTimer -= dt;
  if (hudTimer <= 0) {
    hudTimer = 0.25;
    updateHud(view.scale, view.width, view.height);
  }
}

function drawWorld(origin: Vec, time: number): void {
  const tiles = sheet.tiles;
  const waterRole: Role = Math.floor(time / WATER_FRAME_SECONDS) % 2 === 0 ? 'water' : 'water2';
  const firstX = Math.floor(origin.x / TILE_SIZE);
  const firstY = Math.floor(origin.y / TILE_SIZE);
  const lastX = Math.floor((origin.x + low.width) / TILE_SIZE);
  const lastY = Math.floor((origin.y + low.height) / TILE_SIZE);
  lowCtx.imageSmoothingEnabled = false;
  for (let ty = firstY; ty <= lastY; ty++) {
    for (let tx = firstX; tx <= lastX; tx++) {
      const tile = tileAt(world, tx, ty);
      const x = tx * TILE_SIZE - origin.x;
      const y = ty * TILE_SIZE - origin.y;
      const role = tile === TILE.water ? waterRole : ROLE_BY_TILE[tile];
      // Pedras e árvores vão sobre grama: folhas de IA costumam trazê-las com fundo transparente.
      if (role === 'rock' || role === 'tree') lowCtx.drawImage(tiles.grass, x, y);
      lowCtx.drawImage(tiles[role], x, y);
    }
  }
}

function drawHero(toScreen: (worldX: number, worldY: number) => Vec, scale: number, attackDuration: number): void {
  const facing = facingFromVector(player.facing.x, player.facing.y);
  const step = walkTime > 0 ? WALK_CYCLE[Math.floor(walkTime) % WALK_CYCLE.length] : 0;
  const sprite = hero[facing][step];
  const width = Math.round(PLAYER_WIDTH * scale);
  const height = Math.round(PLAYER_HEIGHT * scale);
  const draw = (x: number, y: number) => {
    const p = toScreen(x * TILE_SIZE - PLAYER_WIDTH / 2, y * TILE_SIZE - FEET_Y);
    ctx.drawImage(sprite, p.x, p.y, width, height);
  };

  trail.forEach((point, index) => {
    ctx.globalAlpha = ((index + 1) / trail.length) * 0.35;
    draw(point.x, point.y);
  });
  ctx.globalAlpha = 1;
  draw(player.x, player.y);

  if (player.attackTimer > 0) {
    // Golpe em pixels: um arco de quadradinhos claros que varre à frente.
    const progress = 1 - player.attackTimer / attackDuration;
    const angle = Math.atan2(player.facing.y, player.facing.x);
    const size = Math.round(2 * scale);
    ctx.fillStyle = '#fff4c8';
    for (let i = 0; i <= 6; i++) {
      const a = angle - Math.PI / 3 + ((Math.PI * 2) / 3) * (i / 6) * Math.min(1, progress * 1.5);
      const p = toScreen(player.x * TILE_SIZE + Math.cos(a) * 14, player.y * TILE_SIZE - 8 + Math.sin(a) * 14);
      ctx.fillRect(p.x, p.y, size, size);
    }
  }
}

function updateHud(scale: number, width: number, height: number): void {
  hud.hidden = !scene.debug;
  if (!scene.debug) return;
  const average = frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length;
  hud.textContent = [
    `${Math.round(1 / average)} fps · fonte: ${lastSource}`,
    `escala: ×${(scale / ratio).toFixed(2)} (×${scale.toFixed(2)} em px físicos)`,
    `resolução interna: ${width} × ${height}`,
    `tiles visíveis: ${(width / TILE_SIZE).toFixed(1)} × ${(height / TILE_SIZE).toFixed(1)}`,
    `folha: ${sheet.source}`,
  ].join('\n');
}

requestAnimationFrame(frame);
