import '../01-controles/style.css';
import './style.css';
import { length, type Vec } from '../01-controles/input.ts';
import { createPlayer, stepPlayer } from '../01-controles/movement.ts';
import { mountPanel } from '../01-controles/panel.ts';
import { loadSettings, movementSettings } from '../01-controles/settings.ts';
import { createWorld, moveWithCollision } from '../01-controles/world.ts';
import { PixelRenderer } from './renderer.ts';
import { SCENE_DEFAULTS, SCENE_FIELDS, loadSceneSettings, saveSceneSettings } from './settings.ts';
import { SheetEditor } from './sheet.ts';
import { Controls, HeroView, element, setupPanels, watchCanvas } from './stage.ts';
import { TILE_SIZE } from './tileset.ts';

const PLAYER_RADIUS = 0.3;
const ATTACK_REACH = 1.3;
const ATTACK_ARC = (Math.PI * 2) / 3;

const canvas = element<HTMLCanvasElement>('palco');
const renderer = new PixelRenderer(canvas, canvas.getContext('2d')!);
const ratio = watchCanvas(canvas);
const hud = element<HTMLElement>('hud');
const hint = element<HTMLElement>('dica');
setupPanels();

// Movimento e joystick seguem o que foi calibrado no Lab 01 (mesmo aparelho, mesmo armazenamento).
const controlSettings = loadSettings();
const scene = loadSceneSettings();
mountPanel(element('ajustes-campos'), scene, SCENE_FIELDS, SCENE_DEFAULTS, saveSceneSettings);
const sheet = new SheetEditor(element('folha-campos'));
const controls = new Controls(canvas, controlSettings);
const hero = new HeroView();

const world = createWorld(64, 64, 7);
const player = createPlayer(32, 32);
const camera: Vec = { x: player.x * TILE_SIZE, y: player.y * TILE_SIZE };

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

  const intent = controls.read();
  if (!hintHidden && (length(intent.move) > 0 || intent.attack || intent.dodge)) {
    hintHidden = true;
    hint.classList.add('sumindo');
  }

  const movement = movementSettings(controlSettings);
  stepPlayer(player, intent, dt, movement);
  moveWithCollision(world, player, player.vx * dt, player.vy * dt, PLAYER_RADIUS);
  hero.update(player, dt);
  followCamera(dt);

  const portrait = canvas.height > canvas.width;
  const view = renderer.begin(camera, world, {
    safeTiles: portrait ? scene.safeTilesPortrait : scene.safeTilesLandscape,
    scaleMode: scene.scaleMode,
    snap: scene.scroll === 'pixel',
  });
  // Durante um redimensionamento a tela pode medir zero por um instante; pula o desenho.
  if (!view) return;
  renderer.drawWorld(view, world, sheet.tiles, now / 1000);
  hero.draw(renderer, view, player, { style: scene.slash, duration: movement.attackDuration, reach: ATTACK_REACH, arc: ATTACK_ARC });
  if (scene.showSafeArea) renderer.drawSafeArea(view, ratio());
  controls.drawOverlay(renderer.ctx, ratio());

  hudTimer -= dt;
  if (hudTimer <= 0) {
    hudTimer = 0.25;
    updateHud(view.view.scale, view.view.width, view.view.height);
  }
}

/** A câmera persegue o personagem em pixels do jogo, presa ou com atraso. */
function followCamera(dt: number): void {
  const targetX = player.x * TILE_SIZE;
  const targetY = player.y * TILE_SIZE;
  if (scene.camera === 'locked') {
    camera.x = targetX;
    camera.y = targetY;
    return;
  }
  const follow = 1 - Math.exp(-10 * dt);
  camera.x += (targetX - camera.x) * follow;
  camera.y += (targetY - camera.y) * follow;
}

function updateHud(scale: number, width: number, height: number): void {
  hud.hidden = !scene.debug;
  if (!scene.debug) return;
  const average = frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length;
  hud.textContent = [
    `${Math.round(1 / average)} fps · fonte: ${controls.lastSource}`,
    `escala: ×${(scale / ratio()).toFixed(2)} (×${scale.toFixed(2)} em px físicos)`,
    `resolução interna: ${width} × ${height}`,
    `tiles visíveis: ${(width / TILE_SIZE).toFixed(1)} × ${(height / TILE_SIZE).toFixed(1)}`,
    `folha: ${sheet.source}`,
  ].join('\n');
}

requestAnimationFrame(frame);
