// Desenho do campo, dos bonecos de treino, do personagem e do joystick. Formas simples: a arte é o Lab 3.

import type { Vec } from './input.ts';
import type { Player } from './movement.ts';
import type { JoystickView } from './sources.ts';
import { TILE, tileAt, type World } from './world.ts';

export interface Dummy {
  x: number;
  y: number;
  /** Segundos restantes do brilho de acerto. */
  flash: number;
}

export interface Scene {
  world: World;
  player: Player;
  playerRadius: number;
  trail: Vec[];
  dummies: Dummy[];
  camera: Vec;
  zoom: number;
  attackDuration: number;
  attackReach: number;
  attackArc: number;
  time: number;
}

const COLORS = {
  water: '#2b5d7a',
  waterLight: '#3f7898',
  grass: '#4b8a3f',
  grassDark: '#427c38',
  rock: '#8b8f86',
  rockShadow: '#6b6f68',
  trunk: '#6b4a2b',
  canopy: '#2f6b33',
  canopyLight: '#3d8240',
  flowers: ['#f2d14b', '#e86f8f', '#f4f1e6'],
  shadow: 'rgba(0, 0, 0, 0.25)',
  cloak: '#c9a227',
  skin: '#f0d2a8',
  dummy: '#a07a4c',
  hit: '#ffffff',
  slash: 'rgba(255, 244, 200, ',
  joystick: 'rgba(255, 255, 255, ',
};

export function drawScene(ctx: CanvasRenderingContext2D, width: number, height: number, scene: Scene): void {
  const { zoom, camera } = scene;
  const toScreen = (x: number, y: number) => ({ x: (x - camera.x) * zoom + width / 2, y: (y - camera.y) * zoom + height / 2 });

  ctx.fillStyle = COLORS.water;
  ctx.fillRect(0, 0, width, height);

  const left = Math.floor(camera.x - width / 2 / zoom) - 1;
  const right = Math.ceil(camera.x + width / 2 / zoom) + 1;
  const top = Math.floor(camera.y - height / 2 / zoom) - 1;
  const bottom = Math.ceil(camera.y + height / 2 / zoom) + 1;

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      const p = toScreen(tx, ty);
      drawGround(ctx, tileAt(scene.world, tx, ty), p.x, p.y, zoom, tx, ty, scene.time);
    }
  }
  // Árvores e pedras por cima do chão, de cima para baixo, para as copas se sobreporem direito.
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      const tile = tileAt(scene.world, tx, ty);
      if (tile !== TILE.tree && tile !== TILE.rock) continue;
      const p = toScreen(tx, ty);
      if (tile === TILE.rock) drawRock(ctx, p.x, p.y, zoom);
      else drawTree(ctx, p.x, p.y, zoom);
    }
  }

  for (const dummy of scene.dummies) {
    const p = toScreen(dummy.x, dummy.y);
    drawDummy(ctx, p.x, p.y, zoom, dummy.flash);
  }

  drawPlayer(ctx, scene, toScreen);
}

function drawGround(ctx: CanvasRenderingContext2D, tile: number, x: number, y: number, size: number, tx: number, ty: number, time: number): void {
  const cell = Math.ceil(size) + 1;
  if (tile === TILE.water) {
    const wave = Math.sin(time * 1.5 + tx * 0.8 + ty * 0.5);
    if (wave > 0.6) {
      ctx.fillStyle = COLORS.waterLight;
      ctx.fillRect(x + size * 0.2, y + size * 0.45, size * 0.35, Math.max(1, size * 0.06));
    }
    return;
  }
  ctx.fillStyle = tile === TILE.grassDark ? COLORS.grassDark : COLORS.grass;
  ctx.fillRect(x, y, cell, cell);
  if (tile === TILE.flower) {
    const hash = (tx * 73856093) ^ (ty * 19349663);
    ctx.fillStyle = COLORS.flowers[Math.abs(hash) % COLORS.flowers.length];
    const dot = Math.max(2, size * 0.09);
    ctx.fillRect(x + size * 0.25, y + size * 0.3, dot, dot);
    ctx.fillRect(x + size * 0.6, y + size * 0.55, dot, dot);
    ctx.fillRect(x + size * 0.4, y + size * 0.72, dot, dot);
  }
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillStyle = COLORS.rockShadow;
  ctx.beginPath();
  ctx.ellipse(x + size / 2, y + size * 0.62, size * 0.42, size * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.rock;
  ctx.beginPath();
  ctx.ellipse(x + size / 2, y + size * 0.52, size * 0.38, size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(x + size / 2, y + size * 0.85, size * 0.4, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.trunk;
  ctx.fillRect(x + size * 0.42, y + size * 0.45, size * 0.16, size * 0.4);
  ctx.fillStyle = COLORS.canopy;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size * 0.3, size * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.canopyLight;
  ctx.beginPath();
  ctx.arc(x + size * 0.4, y + size * 0.2, size * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function drawDummy(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, flash: number): void {
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.3, size * 0.3, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  const shake = flash > 0 ? Math.sin(flash * 80) * size * 0.05 : 0;
  ctx.fillStyle = flash > 0 ? COLORS.hit : COLORS.dummy;
  ctx.fillRect(x - size * 0.07 + shake, y - size * 0.5, size * 0.14, size * 0.8);
  ctx.fillRect(x - size * 0.35 + shake, y - size * 0.3, size * 0.7, size * 0.12);
  ctx.beginPath();
  ctx.arc(x + shake, y - size * 0.55, size * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx: CanvasRenderingContext2D, scene: Scene, toScreen: (x: number, y: number) => Vec): void {
  const { player, zoom } = scene;
  const radius = scene.playerRadius * zoom;

  // Rastro da esquiva.
  scene.trail.forEach((point, index) => {
    const p = toScreen(point.x, point.y);
    ctx.fillStyle = `rgba(201, 162, 39, ${((index + 1) / scene.trail.length) * 0.35})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  const p = toScreen(player.x, player.y);
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + radius * 0.8, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = player.dodgeTimer > 0 ? 0.7 : 1;
  ctx.fillStyle = COLORS.cloak;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
  // Rosto: um ponto claro deslocado para onde o personagem olha.
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(p.x + player.facing.x * radius * 0.45, p.y + player.facing.y * radius * 0.45, radius * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (player.attackTimer > 0) {
    const progress = 1 - player.attackTimer / scene.attackDuration;
    const angle = Math.atan2(player.facing.y, player.facing.x);
    const half = scene.attackArc / 2;
    const sweep = -half + scene.attackArc * progress;
    ctx.fillStyle = `${COLORS.slash}${0.55 * (1 - progress) + 0.15})`;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, scene.attackReach * zoom, angle - half, angle + sweep);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawJoystick(ctx: CanvasRenderingContext2D, joystick: JoystickView, radius: number, idleOrigin: Vec | null): void {
  if (joystick.active) {
    ctx.fillStyle = `${COLORS.joystick}0.14)`;
    ctx.strokeStyle = `${COLORS.joystick}0.45)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(joystick.originX, joystick.originY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = `${COLORS.joystick}0.6)`;
    ctx.beginPath();
    ctx.arc(joystick.knobX, joystick.knobY, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (idleOrigin) {
    ctx.strokeStyle = `${COLORS.joystick}0.25)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(idleOrigin.x, idleOrigin.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `${COLORS.joystick}0.2)`;
    ctx.beginPath();
    ctx.arc(idleOrigin.x, idleOrigin.y, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}
