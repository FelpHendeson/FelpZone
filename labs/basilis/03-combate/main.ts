import '../01-controles/style.css';
import '../02-cenario/style.css';
import './style.css';
import type { Vec } from '../01-controles/input.ts';
import { createPlayer, stepPlayer, type Intent } from '../01-controles/movement.ts';
import { mountPanel } from '../01-controles/panel.ts';
import { loadSettings, movementSettings } from '../01-controles/settings.ts';
import { createWorld, isSolid, moveWithCollision } from '../01-controles/world.ts';
import { PixelRenderer, type Frame } from '../02-cenario/renderer.ts';
import { loadSceneSettings } from '../02-cenario/settings.ts';
import { Controls, HeroView, element, setupPanels, silhouette, watchCanvas } from '../02-cenario/stage.ts';
import { GENERATED_LAYOUT, TILE_SIZE, generateSheet, generatedCells, sliceSheet, type TileImages } from '../02-cenario/tileset.ts';
import {
  applyHit,
  createEnemy,
  inCone,
  lungeConnects,
  separation,
  stepEnemy,
  tickHealth,
  type Body,
  type Enemy,
  type Health,
} from './combat.ts';
import { ATTACK_ARC, FIGHT_DEFAULTS, FIGHT_FIELDS, combatSettings, loadFightSettings, saveFightSettings } from './settings.ts';
import { generateFolhim } from './sprites.ts';

const PLAYER_RADIUS = 0.3;
const PLAYER_MAX_HP = 100;
const SPAWN = { x: 32, y: 32 };
const HITSTOP_SECONDS = 0.06;
const RESPAWN_SECONDS = 1.5;
/** Fração inicial do golpe em que ele acerta; o fim é só a animação terminando. */
const ACTIVE_FRACTION = 0.7;
const FOLHIM_FEET_Y = 14;

const canvas = element<HTMLCanvasElement>('palco');
const renderer = new PixelRenderer(canvas, canvas.getContext('2d')!);
const ratio = watchCanvas(canvas);
const hud = element<HTMLElement>('hud');
const lifeBar = element<HTMLElement>('vida-barra');
const lifeText = element<HTMLElement>('vida-texto');
const notice = element<HTMLElement>('aviso');
const attackButton = element<HTMLElement>('botao-ataque');
const dodgeButton = element<HTMLElement>('botao-esquiva');
setupPanels();

const controlSettings = loadSettings();
const scene = loadSceneSettings();
const fight = loadFightSettings();
mountPanel(element('ajustes-campos'), fight, FIGHT_FIELDS, FIGHT_DEFAULTS, saveFightSettings);
const controls = new Controls(canvas, controlSettings);
const hero = new HeroView();
const sheet = generateSheet();
const tiles: TileImages = sliceSheet(sheet, GENERATED_LAYOUT, generatedCells(), {} as TileImages);
const folhim = generateFolhim();
const folhimFlash = silhouette(folhim.idle, '#ffffff');

const world = createWorld(64, 64, 7);
const player = Object.assign(createPlayer(SPAWN.x, SPAWN.y), {
  radius: PLAYER_RADIUS,
  hp: PLAYER_MAX_HP,
  maxHp: PLAYER_MAX_HP,
  invulnerable: 0,
  stun: 0,
  flash: 0,
}) satisfies Body & Health;
const camera: Vec = { x: player.x * TILE_SIZE, y: player.y * TILE_SIZE };
const random = seeded(11);

let enemies: Enemy[] = [];
let swing = 0;
let hitstop = 0;
let deadTimer = 0;
let kills = 0;
let time = 0;

interface DamageNumber {
  x: number;
  y: number;
  value: number;
  life: number;
  hurtsPlayer: boolean;
}
const numbers: DamageNumber[] = [];

/** Lugares de nascimento fixos: tiles livres entre 4 e 10 tiles do início. */
const spawnPoints: Vec[] = (() => {
  const points: Vec[] = [];
  const pick = seeded(3);
  while (points.length < 12) {
    const angle = pick() * Math.PI * 2;
    const distance = 4 + pick() * 6;
    const x = Math.floor(SPAWN.x + Math.cos(angle) * distance) + 0.5;
    const y = Math.floor(SPAWN.y + Math.sin(angle) * distance) + 0.5;
    if (!isSolid(world, Math.floor(x), Math.floor(y))) points.push({ x, y });
  }
  return points;
})();

function resetEnemies(): void {
  const settings = combatSettings(fight);
  enemies = spawnPoints.slice(0, fight.enemyCount).map((point, index) => createEnemy(index, point.x, point.y, settings));
}
resetEnemies();

const frameTimes: number[] = [];
let previous = performance.now();
let hudTimer = 0;

function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, 1 / 30);
  previous = now;
  frameTimes.push(dt);
  if (frameTimes.length > 60) frameTimes.shift();

  // Ajustes de quantidade e vida valem na hora.
  if (enemies.length !== fight.enemyCount || enemies.some((enemy) => enemy.maxHp !== fight.enemyHp)) resetEnemies();

  const intent = controls.read();
  if (hitstop > 0) hitstop -= dt;
  else simulate(intent, dt);

  updateNumbers(dt);
  followCamera(dt);
  render(now / 1000);

  hudTimer -= dt;
  if (hudTimer <= 0) {
    hudTimer = 0.25;
    updateHud();
  }
}

function simulate(intent: Intent, dt: number): void {
  time += dt;
  const settings = combatSettings(fight);
  const movement = { ...movementSettings(controlSettings), attackCooldown: fight.attackCooldown };

  if (deadTimer > 0) {
    deadTimer -= dt;
    if (deadTimer <= 0) respawnPlayer();
    return;
  }

  tickHealth(player, dt);
  const stunned = player.stun > 0;
  const control: Intent = stunned ? { move: { x: 0, y: 0 }, attack: false, dodge: false } : intent;
  const events = stepPlayer(player, control, dt, movement, nearestEnemyDirection);
  if (events.includes('attack')) swing++;
  if (events.includes('dodge')) vibrate(10);
  hero.update(player, dt);

  if (player.attackTimer > movement.attackDuration * (1 - ACTIVE_FRACTION)) {
    for (const enemy of enemies) {
      if (enemy.state === 'dead' || enemy.lastSwing === swing) continue;
      if (!inCone(player, player.facing, fight.attackReach, ATTACK_ARC, enemy, enemy.radius)) continue;
      enemy.lastSwing = swing;
      if (applyHit(enemy, fight.attackDamage, player, fight.knockback, 0.1)) {
        addNumber(enemy, fight.attackDamage, false);
        impact(15);
      }
    }
  }
  moveWithCollision(world, player, player.vx * dt, player.vy * dt, PLAYER_RADIUS);

  for (const enemy of enemies) {
    const enemyEvents = stepEnemy(enemy, player, dt, settings, random);
    if (enemyEvents.includes('died')) kills++;
    if (enemy.state === 'dead') continue;
    moveWithCollision(world, enemy, enemy.vx * dt, enemy.vy * dt, enemy.radius);
    // A esquiva atravessa o bote: é o que torna o aviso útil.
    if (lungeConnects(enemy, player) && player.dodgeTimer === 0) {
      if (applyHit(player, fight.enemyDamage, enemy, fight.knockback * 1.2, fight.playerInvulnerability)) {
        addNumber(player, fight.enemyDamage, true);
        impact(40);
      }
    }
  }

  // Corpos se empurram: inimigos entre si por igual; o jogador cede menos.
  const alive = enemies.filter((enemy) => enemy.state !== 'dead');
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) push(alive[i], alive[j], 0.5);
    if (player.dodgeTimer === 0) push(player, alive[i], 0.25);
  }

  if (player.hp <= 0) {
    deadTimer = RESPAWN_SECONDS;
    notice.textContent = 'Você caiu';
    notice.hidden = false;
  }
}

function push(a: Body, b: Body, weightA: number): void {
  const result = separation(a, b, weightA);
  if (!result) return;
  moveWithCollision(world, a, result.a.x, result.a.y, a.radius);
  moveWithCollision(world, b, result.b.x, result.b.y, b.radius);
}

function respawnPlayer(): void {
  Object.assign(player, { x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, hp: PLAYER_MAX_HP, invulnerable: 1, stun: 0 });
  resetEnemies();
  notice.hidden = true;
}

function nearestEnemyDirection(): Vec | null {
  if (!controlSettings.autoAim) return null;
  let best: Vec | null = null;
  let bestDistance = fight.attackReach + 1.2;
  for (const enemy of enemies) {
    if (enemy.state === 'dead') continue;
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { x: enemy.x - player.x, y: enemy.y - player.y };
    }
  }
  return best;
}

function impact(vibration: number): void {
  if (fight.hitstop) hitstop = HITSTOP_SECONDS;
  if (controlSettings.vibration) navigator.vibrate?.(vibration);
}

function addNumber(target: Vec, value: number, hurtsPlayer: boolean): void {
  if (fight.damageNumbers) numbers.push({ x: target.x, y: target.y - 0.9, value, life: 0.7, hurtsPlayer });
}

function updateNumbers(dt: number): void {
  for (const number of numbers) {
    number.life -= dt;
    number.y -= dt * 1.2;
  }
  while (numbers.length && numbers[0].life <= 0) numbers.shift();
}

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

function render(seconds: number): void {
  const portrait = canvas.height > canvas.width;
  const view = renderer.begin(camera, world, {
    safeTiles: portrait ? scene.safeTilesPortrait : scene.safeTilesLandscape,
    scaleMode: scene.scaleMode,
    snap: scene.scroll === 'pixel',
  });
  if (!view) return;
  renderer.drawWorld(view, world, tiles, seconds);

  // Quem está mais abaixo na tela é desenhado por cima.
  const movement = movementSettings(controlSettings);
  const blink = player.invulnerable > 0 && Math.floor(seconds * 16) % 2 === 0;
  const drawables: { y: number; draw: () => void }[] = enemies
    .filter((enemy) => enemy.state !== 'dead')
    .map((enemy) => ({ y: enemy.y, draw: () => drawEnemy(view, enemy, seconds) }));
  if (deadTimer <= 0) {
    drawables.push({
      y: player.y,
      draw: () =>
        hero.draw(
          renderer,
          view,
          player,
          { style: fight.slash, duration: movement.attackDuration, reach: fight.attackReach, arc: ATTACK_ARC },
          player.flash > 0,
          blink && player.flash === 0,
        ),
    });
  }
  drawables.sort((a, b) => a.y - b.y).forEach((item) => item.draw());

  if (fight.showHitboxes) drawHitboxes(view);
  drawNumbers(view);
  controls.drawOverlay(renderer.ctx, ratio());

  attackButton.style.setProperty('--recarga', String(player.attackCooldown / fight.attackCooldown));
  const dodgeTotal = movement.dodgeDuration + movement.dodgeCooldown;
  dodgeButton.style.setProperty('--recarga', String(dodgeTotal > 0 ? player.dodgeCooldown / dodgeTotal : 0));
}

function drawEnemy(view: Frame, enemy: Enemy, seconds: number): void {
  const moving = Math.hypot(enemy.vx, enemy.vy) > 0.3;
  let sprite = moving && Math.floor(seconds * 8 + enemy.id) % 2 === 0 ? folhim.hop : folhim.idle;
  // O aviso pisca: é o sinal para esquivar.
  if (enemy.state === 'windup') sprite = Math.floor(seconds * 14) % 2 === 0 ? folhim.windup : folhim.idle;
  if (enemy.state === 'lunge') sprite = folhim.windup;
  if (enemy.flash > 0) sprite = folhimFlash;
  renderer.drawSprite(view, sprite, enemy.x * TILE_SIZE - 8, enemy.y * TILE_SIZE - FOLHIM_FEET_Y);

  if (enemy.hp < enemy.maxHp) {
    const { ctx } = renderer;
    const scale = view.view.scale;
    const p = view.toScreen(enemy.x * TILE_SIZE - 6, enemy.y * TILE_SIZE - FOLHIM_FEET_Y - 4);
    ctx.fillStyle = '#1f1a12';
    ctx.fillRect(p.x - scale, p.y - scale, Math.round(14 * scale), Math.round(4 * scale));
    ctx.fillStyle = '#e04848';
    ctx.fillRect(p.x, p.y, Math.round(12 * scale * (enemy.hp / enemy.maxHp)), Math.round(2 * scale));
  }
}

function drawHitboxes(view: Frame): void {
  const { ctx } = renderer;
  const scale = view.view.scale;
  const circle = (body: Body, color: string) => {
    const p = view.toScreen(body.x * TILE_SIZE, body.y * TILE_SIZE);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, body.radius * TILE_SIZE * scale, 0, Math.PI * 2);
    ctx.stroke();
  };
  circle(player, '#5ad1ff');
  for (const enemy of enemies) if (enemy.state !== 'dead') circle(enemy, enemy.state === 'lunge' ? '#ff4d4d' : '#ffd24d');
  if (player.attackTimer > 0) {
    const p = view.toScreen(player.x * TILE_SIZE, player.y * TILE_SIZE);
    const angle = Math.atan2(player.facing.y, player.facing.x);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, fight.attackReach * TILE_SIZE * scale, angle - ATTACK_ARC / 2, angle + ATTACK_ARC / 2);
    ctx.closePath();
    ctx.stroke();
  }
}

function drawNumbers(view: Frame): void {
  const { ctx } = renderer;
  const size = Math.round(7 * view.view.scale);
  ctx.font = `700 ${size}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.lineWidth = Math.max(2, view.view.scale);
  for (const number of numbers) {
    const p = view.toScreen(number.x * TILE_SIZE, number.y * TILE_SIZE);
    ctx.globalAlpha = Math.min(1, number.life / 0.3);
    ctx.strokeStyle = '#1f1a12';
    ctx.fillStyle = number.hurtsPlayer ? '#ff6b6b' : '#fff4c8';
    ctx.strokeText(String(number.value), p.x, p.y);
    ctx.fillText(String(number.value), p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start';
}

function updateHud(): void {
  const share = Math.max(0, player.hp / player.maxHp);
  lifeBar.style.width = `${share * 100}%`;
  lifeBar.classList.toggle('baixa', share <= 0.3);
  lifeText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

  hud.hidden = !fight.debug;
  if (!fight.debug) return;
  const average = frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length;
  const alive = enemies.filter((enemy) => enemy.state !== 'dead').length;
  hud.textContent = [
    `${Math.round(1 / average)} fps · fonte: ${controls.lastSource}`,
    `inimigos: ${alive} de ${enemies.length} · abates: ${kills}`,
    `recarga: ataque ${player.attackCooldown.toFixed(2)}s · esquiva ${player.dodgeCooldown.toFixed(2)}s`,
    `estados: ${enemies.map((enemy) => enemy.state).join(', ')}`,
    `velocidade: ${Math.hypot(player.vx, player.vy).toFixed(1)} tiles/s`,
  ].join('\n');
}

function vibrate(ms: number): void {
  if (controlSettings.vibration) navigator.vibrate?.(ms);
}

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

requestAnimationFrame(frame);
