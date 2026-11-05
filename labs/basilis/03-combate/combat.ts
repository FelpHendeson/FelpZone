// Regras de combate: acerto em cone, dano, empurrão, invulnerabilidade, corpos que se empurram
// e inimigos que avisam antes de atacar. Unidades em tiles e segundos.

import type { Vec } from '../01-controles/input.ts';
import { approach } from '../01-controles/movement.ts';

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Health {
  hp: number;
  maxHp: number;
  /** Segundos sem poder levar dano. */
  invulnerable: number;
  /** Segundos sem controle depois de um golpe (o empurrão age sozinho). */
  stun: number;
  /** Segundos de brilho branco ao ser atingido. */
  flash: number;
}

export type EnemyState = 'wander' | 'chase' | 'windup' | 'lunge' | 'recover' | 'dead';

export interface Enemy extends Body, Health {
  id: number;
  state: EnemyState;
  stateTimer: number;
  home: Vec;
  heading: Vec;
  /** Golpe do jogador que já acertou este inimigo (cada golpe acerta uma vez só). */
  lastSwing: number;
  /** O bote atual já acertou o jogador. */
  lungeHit: boolean;
}

export interface CombatSettings {
  attackDamage: number;
  attackReach: number;
  attackArc: number;
  knockback: number;
  playerInvulnerability: number;
  enemyHp: number;
  enemyDamage: number;
  enemySpeed: number;
  aggroRange: number;
  windup: number;
  respawnSeconds: number;
}

export const ENEMY_RADIUS = 0.35;
const WANDER_SPEED_FACTOR = 0.45;
const LUNGE_SPEED = 9;
const LUNGE_SECONDS = 0.22;
const RECOVER_SECONDS = 0.7;
const LUNGE_RANGE = 1.8;
const ENEMY_ACCELERATION = 20;
const KNOCKBACK_FRICTION = 18;
const STUN_SECONDS = 0.18;

export function createEnemy(id: number, x: number, y: number, settings: CombatSettings): Enemy {
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: ENEMY_RADIUS,
    hp: settings.enemyHp,
    maxHp: settings.enemyHp,
    invulnerable: 0,
    stun: 0,
    flash: 0,
    state: 'wander',
    stateTimer: 0,
    home: { x, y },
    heading: { x: 1, y: 0 },
    lastSwing: -1,
    lungeHit: false,
  };
}

/** O alvo (um círculo) está dentro do cone? Conta a borda do alvo, não só o centro. */
export function inCone(origin: Vec, facing: Vec, reach: number, arc: number, target: Vec, targetRadius: number): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance > reach + targetRadius) return false;
  if (distance <= targetRadius) return true;
  const difference = Math.abs(angleBetween(Math.atan2(dy, dx), Math.atan2(facing.y, facing.x)));
  // Alvos grandes podem estar parcialmente dentro mesmo com o centro um pouco fora do arco.
  const slack = Math.asin(Math.min(1, targetRadius / distance));
  return difference <= arc / 2 + slack;
}

/**
 * Aplica um golpe vindo de `from`. Devolve falso se o alvo estava invulnerável.
 * O empurrão vira velocidade: quem é atingido desliza para longe e perde o controle por um instante.
 */
export function applyHit(target: Body & Health, damage: number, from: Vec, force: number, invulnerability: number): boolean {
  if (target.invulnerable > 0 || target.hp <= 0) return false;
  target.hp = Math.max(0, target.hp - damage);
  target.invulnerable = invulnerability;
  target.flash = 0.12;
  target.stun = STUN_SECONDS;
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  target.vx = (dx / distance) * force;
  target.vy = (dy / distance) * force;
  return true;
}

export function tickHealth(health: Health, dt: number): void {
  health.invulnerable = Math.max(0, health.invulnerable - dt);
  health.stun = Math.max(0, health.stun - dt);
  health.flash = Math.max(0, health.flash - dt);
}

/** Atrito do empurrão enquanto o corpo está atordoado. */
export function slide(body: Body, dt: number): void {
  const next = approach({ x: body.vx, y: body.vy }, { x: 0, y: 0 }, KNOCKBACK_FRICTION * dt);
  body.vx = next.x;
  body.vy = next.y;
}

export type EnemyEvent = 'windup' | 'lunge' | 'died' | 'respawned';

/**
 * Máquina de estados do inimigo: vaga perto de casa, persegue quem chega perto,
 * avisa (pisca e para), dá um bote rápido e descansa. Atordoado, só desliza.
 */
export function stepEnemy(enemy: Enemy, target: Vec, dt: number, settings: CombatSettings, random: () => number): EnemyEvent[] {
  const events: EnemyEvent[] = [];
  tickHealth(enemy, dt);
  enemy.stateTimer = Math.max(0, enemy.stateTimer - dt);

  if (enemy.state === 'dead') {
    enemy.vx = 0;
    enemy.vy = 0;
    if (enemy.stateTimer === 0) {
      Object.assign(enemy, { x: enemy.home.x, y: enemy.home.y, hp: enemy.maxHp, state: 'wander', invulnerable: 0.5 });
      events.push('respawned');
    }
    return events;
  }
  if (enemy.hp <= 0) {
    enemy.state = 'dead';
    enemy.stateTimer = settings.respawnSeconds;
    events.push('died');
    return events;
  }
  if (enemy.stun > 0) {
    slide(enemy, dt);
    // Um golpe interrompe o aviso e o bote.
    if (enemy.state === 'windup' || enemy.state === 'lunge') setState(enemy, 'recover', RECOVER_SECONDS);
    return events;
  }

  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  const toTarget = distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 1 };
  let desired: Vec = { x: 0, y: 0 };

  switch (enemy.state) {
    case 'wander': {
      if (distance < settings.aggroRange) {
        setState(enemy, 'chase', 0);
        break;
      }
      if (enemy.stateTimer === 0) {
        // Escolhe um rumo novo, puxando de volta para casa quando se afasta demais.
        const homeX = enemy.home.x - enemy.x;
        const homeY = enemy.home.y - enemy.y;
        const angle = random() * Math.PI * 2;
        const pull = Math.min(1, Math.hypot(homeX, homeY) / 4);
        const hx = Math.cos(angle) * (1 - pull) + homeX * pull;
        const hy = Math.sin(angle) * (1 - pull) + homeY * pull;
        const length = Math.hypot(hx, hy) || 1;
        enemy.heading = random() < 0.3 ? { x: 0, y: 0 } : { x: hx / length, y: hy / length };
        enemy.stateTimer = 0.8 + random() * 1.4;
      }
      desired = scale(enemy.heading, settings.enemySpeed * WANDER_SPEED_FACTOR);
      break;
    }
    case 'chase':
      if (distance > settings.aggroRange * 1.5) {
        setState(enemy, 'wander', 0);
      } else if (distance < LUNGE_RANGE) {
        enemy.heading = toTarget;
        setState(enemy, 'windup', settings.windup);
        events.push('windup');
      } else {
        desired = scale(toTarget, settings.enemySpeed);
      }
      break;
    case 'windup':
      // Parado, mirando: é a janela para o jogador reagir.
      enemy.heading = toTarget;
      if (enemy.stateTimer === 0) {
        enemy.lungeHit = false;
        setState(enemy, 'lunge', LUNGE_SECONDS);
        enemy.vx = enemy.heading.x * LUNGE_SPEED;
        enemy.vy = enemy.heading.y * LUNGE_SPEED;
        events.push('lunge');
      }
      break;
    case 'lunge':
      desired = scale(enemy.heading, LUNGE_SPEED);
      if (enemy.stateTimer === 0) setState(enemy, 'recover', RECOVER_SECONDS);
      break;
    case 'recover':
      if (enemy.stateTimer === 0) setState(enemy, 'chase', 0);
      break;
  }

  const rate = enemy.state === 'lunge' ? Infinity : ENEMY_ACCELERATION;
  const next = approach({ x: enemy.vx, y: enemy.vy }, desired, rate * dt);
  enemy.vx = next.x;
  enemy.vy = next.y;
  return events;
}

/** O bote do inimigo encosta no alvo? Só acerta uma vez por bote. */
export function lungeConnects(enemy: Enemy, target: Body): boolean {
  if (enemy.state !== 'lunge' || enemy.lungeHit) return false;
  if (Math.hypot(target.x - enemy.x, target.y - enemy.y) > enemy.radius + target.radius + 0.1) return false;
  enemy.lungeHit = true;
  return true;
}

/**
 * Corpos não se atravessam: quanto cada um de dois círculos sobrepostos precisa andar para se separarem.
 * `weightA` é quanto do empurrão fica com A (0 = A não se mexe, 1 = só A se mexe).
 * Devolve deslocamentos, para quem chama passar pela colisão com o mundo.
 */
export function separation(a: Body, b: Body, weightA = 0.5): { a: Vec; b: Vec } | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const overlap = a.radius + b.radius - distance;
  if (overlap <= 0) return null;
  const nx = distance > 0 ? dx / distance : 1;
  const ny = distance > 0 ? dy / distance : 0;
  return {
    a: { x: -nx * overlap * weightA, y: -ny * overlap * weightA },
    b: { x: nx * overlap * (1 - weightA), y: ny * overlap * (1 - weightA) },
  };
}

function setState(enemy: Enemy, state: EnemyState, seconds: number): void {
  enemy.state = state;
  enemy.stateTimer = seconds;
}

function scale(v: Vec, factor: number): Vec {
  return { x: v.x * factor, y: v.y * factor };
}

function angleBetween(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
