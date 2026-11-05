import '../01-controles/style.css';
import '../02-cenario/style.css';
import '../03-combate/style.css';
import './style.css';
import type { Vec } from '../01-controles/input.ts';
import { createPlayer, stepPlayer, type Intent } from '../01-controles/movement.ts';
import { mountPanel } from '../01-controles/panel.ts';
import { loadSettings, movementSettings } from '../01-controles/settings.ts';
import { createWorld, isSolid, moveWithCollision } from '../01-controles/world.ts';
import { PixelRenderer, type Frame } from '../02-cenario/renderer.ts';
import { loadSceneSettings } from '../02-cenario/settings.ts';
import { drawSlash } from '../02-cenario/slash.ts';
import { Controls, element, setupPanels, silhouette, watchCanvas } from '../02-cenario/stage.ts';
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
} from '../03-combate/combat.ts';
import { ATTACK_ARC, combatSettings, loadFightSettings } from '../03-combate/settings.ts';
import { Animator, clipDuration, clipFrame, directionOf, heroAction, heroClipName, isActiveFrame, type Clip } from './animation.ts';
import { ANIM_DEFAULTS, ANIM_FIELDS, loadAnimSettings, saveAnimSettings } from './settings.ts';
import { FOLHIM_FORMAT, HERO_FORMAT, generateFolhimSheet, generateHeroSheet, sliceClips } from './sheets.ts';
import { Viewer, type Character } from './viewer.ts';

const PLAYER_RADIUS = 0.3;
const PLAYER_MAX_HP = 100;
const SPAWN = { x: 32, y: 32 };
const HITSTOP_SECONDS = 0.06;
const RESPAWN_SECONDS = 2.2;
/** No modo "pelo tempo", a fração inicial do golpe em que ele acerta (como no Lab 03). */
const ACTIVE_FRACTION = 0.7;

const canvas = element<HTMLCanvasElement>('palco');
const renderer = new PixelRenderer(canvas, canvas.getContext('2d')!);
const ratio = watchCanvas(canvas);
const hud = element<HTMLElement>('hud');
const lifeBar = element<HTMLElement>('vida-barra');
const lifeText = element<HTMLElement>('vida-texto');
const notice = element<HTMLElement>('aviso');
const attackButton = element<HTMLElement>('botao-ataque');
const dodgeButton = element<HTMLElement>('botao-esquiva');
const viewerPanel = element<HTMLElement>('animacoes');
setupPanels();

const controlSettings = loadSettings();
const scene = loadSceneSettings();
const fight = loadFightSettings();
const anim = loadAnimSettings();
mountPanel(element('ajustes-campos'), anim, ANIM_FIELDS, ANIM_DEFAULTS, saveAnimSettings);
const controls = new Controls(canvas, controlSettings);
const tiles: TileImages = sliceSheet(generateSheet(), GENERATED_LAYOUT, generatedCells(), {} as TileImages);

function character(id: string, name: string, format: Character['format'], generate: () => HTMLCanvasElement): Character {
  const sheet = generate();
  return { id, name, format, sheet, frames: sliceClips(sheet, format), generate };
}
const hero = character('heroi', 'Herói', HERO_FORMAT, generateHeroSheet);
const folhim = character('folhim', 'Folhim selvagem', FOLHIM_FORMAT, generateFolhimSheet);
const viewer = new Viewer(element('animacoes-campos'), [hero, folhim], () => flashCache.clear());

/** Silhuetas brancas para o piscar de dano, criadas sob demanda. */
const flashCache = new Map<HTMLCanvasElement, HTMLCanvasElement>();
const flashOf = (image: HTMLCanvasElement) => {
  let flash = flashCache.get(image);
  if (!flash) {
    flash = silhouette(image, '#ffffff');
    flashCache.set(image, flash);
  }
  return flash;
};

const world = createWorld(64, 64, 7);
const player = Object.assign(createPlayer(SPAWN.x, SPAWN.y), {
  radius: PLAYER_RADIUS,
  hp: PLAYER_MAX_HP,
  maxHp: PLAYER_MAX_HP,
  invulnerable: 0,
  stun: 0,
  flash: 0,
}) satisfies Body & Health;
const heroAnimator = new Animator();
const camera: Vec = { x: player.x * TILE_SIZE, y: player.y * TILE_SIZE };
const random = seeded(11);

let enemies: Enemy[] = [];
const enemyAnimators = new Map<number, Animator>();
let swing = 0;
let hitstop = 0;
let deadTimer = 0;
let time = 0;

interface DamageNumber {
  x: number;
  y: number;
  value: number;
  life: number;
  hurtsPlayer: boolean;
}
const numbers: DamageNumber[] = [];

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
  enemyAnimators.clear();
  for (const enemy of enemies) enemyAnimators.set(enemy.id, new Animator());
}
resetEnemies();

/** Todas as direções do ataque têm a mesma duração; ela vira a duração do golpe no movimento. */
const attackClip: Clip = HERO_FORMAT.clips['attack-down'];

const frameTimes: number[] = [];
let previous = performance.now();
let hudTimer = 0;

function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, 1 / 30);
  previous = now;
  frameTimes.push(dt);
  if (frameTimes.length > 60) frameTimes.shift();

  const intent = controls.read();
  if (hitstop > 0) hitstop -= dt;
  else simulate(intent, dt);

  updateNumbers(dt);
  followCamera(dt);
  render(now / 1000);
  if (!viewerPanel.hidden) viewer.tick(dt);

  hudTimer -= dt;
  if (hudTimer <= 0) {
    hudTimer = 0.25;
    updateHud();
  }
}

function movement() {
  return {
    ...movementSettings(controlSettings),
    attackDuration: clipDuration(attackClip) / anim.animationSpeed,
    attackCooldown: Math.max(fight.attackCooldown, clipDuration(attackClip) / anim.animationSpeed),
  };
}

function simulate(intent: Intent, dt: number): void {
  time += dt;
  const settings = combatSettings(fight);
  const moves = movement();

  if (deadTimer > 0) {
    deadTimer -= dt;
    heroAnimator.update(dt, anim.animationSpeed);
    if (deadTimer <= 0) respawnPlayer();
    return;
  }

  tickHealth(player, dt);
  const control: Intent = player.stun > 0 ? { move: { x: 0, y: 0 }, attack: false, dodge: false } : intent;
  const events = stepPlayer(player, control, dt, moves, nearestEnemyDirection);
  if (events.includes('attack')) swing++;
  if (events.includes('dodge')) vibrate(10);
  animateHero(dt, events.includes('attack'));

  if (heroCanHit(moves.attackDuration)) {
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
    stepEnemy(enemy, player, dt, settings, random);
    animateEnemy(enemy, dt);
    if (enemy.state === 'dead') continue;
    moveWithCollision(world, enemy, enemy.vx * dt, enemy.vy * dt, enemy.radius);
    if (lungeConnects(enemy, player) && player.dodgeTimer === 0) {
      if (applyHit(player, fight.enemyDamage, enemy, fight.knockback * 1.2, fight.playerInvulnerability)) {
        addNumber(player, fight.enemyDamage, true);
        impact(40);
      }
    }
  }

  const alive = enemies.filter((enemy) => enemy.state !== 'dead');
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) push(alive[i], alive[j], 0.5);
    if (player.dodgeTimer === 0) push(player, alive[i], 0.25);
  }

  if (player.hp <= 0) {
    deadTimer = RESPAWN_SECONDS;
    heroAnimator.play('death', true);
    notice.textContent = 'Você caiu';
    notice.hidden = false;
  }
}

/** A animação acompanha o estado do herói; um golpe novo sempre recomeça a animação de ataque. */
function animateHero(dt: number, attacked: boolean): void {
  const { direction } = directionOf(player.facing);
  const speed = Math.hypot(player.vx, player.vy);
  const action = heroAction({
    dead: player.hp <= 0,
    hurt: player.stun > 0,
    dodging: player.dodgeTimer > 0,
    attacking: player.attackTimer > 0,
    speed,
  });
  heroAnimator.play(heroClipName(action, direction), attacked && action === 'attack');
  // Andar mais rápido anima mais rápido.
  const walkSpeed = action === 'walk' ? Math.max(0.6, speed / controlSettings.speed) : 1;
  heroAnimator.update(dt, anim.animationSpeed * walkSpeed);
}

/** O golpe acerta nos quadros ativos da animação, ou na fração inicial do tempo, conforme o ajuste. */
function heroCanHit(attackDuration: number): boolean {
  if (player.attackTimer <= 0) return false;
  if (anim.hitTiming === 'time') return player.attackTimer > attackDuration * (1 - ACTIVE_FRACTION);
  const clip = HERO_FORMAT.clips[heroAnimator.name];
  if (!clip || !heroAnimator.name.startsWith('attack')) return false;
  return isActiveFrame(clip, clipFrame(clip, heroAnimator.time).index);
}

function animateEnemy(enemy: Enemy, dt: number): void {
  const animator = enemyAnimators.get(enemy.id)!;
  let name = Math.hypot(enemy.vx, enemy.vy) > 0.3 ? 'walk' : 'idle';
  if (enemy.state === 'windup') name = 'windup';
  if (enemy.state === 'lunge') name = 'lunge';
  if (enemy.stun > 0) name = 'hurt';
  if (enemy.state === 'dead') name = 'death';
  animator.play(name);
  animator.update(dt, anim.animationSpeed);
}

function push(a: Body, b: Body, weightA: number): void {
  const result = separation(a, b, weightA);
  if (!result) return;
  moveWithCollision(world, a, result.a.x, result.a.y, a.radius);
  moveWithCollision(world, b, result.b.x, result.b.y, b.radius);
}

function respawnPlayer(): void {
  Object.assign(player, { x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, hp: PLAYER_MAX_HP, invulnerable: 1, stun: 0 });
  heroAnimator.play('idle-down', true);
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
  vibrate(vibration);
}

function addNumber(target: Vec, value: number, hurtsPlayer: boolean): void {
  if (fight.damageNumbers) numbers.push({ x: target.x, y: target.y - 1.1, value, life: 0.7, hurtsPlayer });
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

  const drawables: { y: number; draw: () => void }[] = enemies
    .filter((enemy) => enemy.state !== 'dead' || !clipFrame(FOLHIM_FORMAT.clips.death, enemyAnimators.get(enemy.id)!.time).finished)
    .map((enemy) => ({ y: enemy.y, draw: () => drawEnemy(view, enemy) }));
  drawables.push({ y: player.y, draw: () => drawHero(view, seconds) });
  drawables.sort((a, b) => a.y - b.y).forEach((item) => item.draw());

  drawNumbers(view);
  controls.drawOverlay(renderer.ctx, ratio());

  const moves = movement();
  attackButton.style.setProperty('--recarga', String(player.attackCooldown / moves.attackCooldown));
  const dodgeTotal = moves.dodgeDuration + moves.dodgeCooldown;
  dodgeButton.style.setProperty('--recarga', String(dodgeTotal > 0 ? player.dodgeCooldown / dodgeTotal : 0));
}

function drawHero(view: Frame, seconds: number): void {
  const clip = HERO_FORMAT.clips[heroAnimator.name] ?? HERO_FORMAT.clips['idle-down'];
  const frames = hero.frames[heroAnimator.name] ?? hero.frames['idle-down'];
  const { index } = clipFrame(clip, heroAnimator.time);
  const { flip } = directionOf(player.facing);
  const dying = heroAnimator.name === 'death';
  const blink = !dying && player.invulnerable > 0 && player.flash === 0 && Math.floor(seconds * 16) % 2 === 0;
  let image = frames[index];
  if (player.flash > 0) image = flashOf(image);
  const x = player.x * TILE_SIZE - HERO_FORMAT.anchorX;
  const y = player.y * TILE_SIZE - HERO_FORMAT.anchorY;
  if (!blink) renderer.drawSprite(view, image, x, y, flip && !dying);

  if (player.attackTimer > 0 && anim.slashTrail !== 'none') {
    const center = view.toScreen(player.x * TILE_SIZE, player.y * TILE_SIZE - 6);
    drawSlash(renderer.ctx, anim.slashTrail, {
      x: center.x,
      y: center.y,
      reach: fight.attackReach * TILE_SIZE * view.view.scale,
      angle: Math.atan2(player.facing.y, player.facing.x),
      arc: ATTACK_ARC,
      progress: 1 - player.attackTimer / movement().attackDuration,
      scale: view.view.scale,
    });
  }
  if (anim.showAnchors) drawFrameBox(view, x, y, HERO_FORMAT.frameWidth, HERO_FORMAT.frameHeight, heroCanHit(movement().attackDuration));
}

function drawEnemy(view: Frame, enemy: Enemy): void {
  const animator = enemyAnimators.get(enemy.id)!;
  const clip = FOLHIM_FORMAT.clips[animator.name] ?? FOLHIM_FORMAT.clips.idle;
  const { index } = clipFrame(clip, animator.time);
  let image = (folhim.frames[animator.name] ?? folhim.frames.idle)[index];
  if (enemy.flash > 0) image = flashOf(image);
  const x = enemy.x * TILE_SIZE - FOLHIM_FORMAT.anchorX;
  const y = enemy.y * TILE_SIZE - FOLHIM_FORMAT.anchorY;
  renderer.drawSprite(view, image, x, y, enemy.heading.x < 0);

  if (enemy.state !== 'dead' && enemy.hp < enemy.maxHp) {
    const { ctx } = renderer;
    const scale = view.view.scale;
    const p = view.toScreen(enemy.x * TILE_SIZE - 6, y - 4);
    ctx.fillStyle = '#1f1a12';
    ctx.fillRect(p.x - scale, p.y - scale, Math.round(14 * scale), Math.round(4 * scale));
    ctx.fillStyle = '#e04848';
    ctx.fillRect(p.x, p.y, Math.round(12 * scale * (enemy.hp / enemy.maxHp)), Math.round(2 * scale));
  }
  if (anim.showAnchors) drawFrameBox(view, x, y, FOLHIM_FORMAT.frameWidth, FOLHIM_FORMAT.frameHeight, false);
}

/** Depuração: contorno do quadro e a âncora (pés). Vermelho quando o golpe está ativo. */
function drawFrameBox(view: Frame, x: number, y: number, width: number, height: number, active: boolean): void {
  const { ctx } = renderer;
  const scale = view.view.scale;
  const p = view.toScreen(x, y);
  ctx.strokeStyle = active ? '#ff4d4d' : 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(p.x + 0.5, p.y + 0.5, Math.round(width * scale) - 1, Math.round(height * scale) - 1);
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

  hud.hidden = !anim.debug;
  if (!anim.debug) return;
  const average = frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length;
  const clip = HERO_FORMAT.clips[heroAnimator.name];
  const index = clip ? clipFrame(clip, heroAnimator.time).index + 1 : 0;
  hud.textContent = [
    `${Math.round(1 / average)} fps · fonte: ${controls.lastSource}`,
    `herói: ${heroAnimator.name} · quadro ${index} de ${clip?.frames ?? 0}`,
    `golpe: ${(movement().attackDuration * 1000).toFixed(0)} ms · acerto ${anim.hitTiming === 'frames' ? 'por quadro' : 'por tempo'}`,
    `folhins: ${enemies.map((enemy) => enemyAnimators.get(enemy.id)!.name).join(', ')}`,
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
