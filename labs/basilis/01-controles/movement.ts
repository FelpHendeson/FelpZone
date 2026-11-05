// Movimento do personagem: aceleração, atrito, esquiva e ataque. Unidades em tiles e segundos.

import type { Vec } from './input.ts';

export interface MovementSettings {
  speed: number;
  acceleration: number;
  friction: number;
  dodgeDistance: number;
  dodgeDuration: number;
  dodgeCooldown: number;
  attackDuration: number;
  attackCooldown: number;
  /** Fração da velocidade mantida enquanto ataca. */
  attackMoveFactor: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: Vec;
  dodgeTimer: number;
  dodgeCooldown: number;
  dodgeDirection: Vec;
  attackTimer: number;
  attackCooldown: number;
}

export interface Intent {
  move: Vec;
  /** Ataque segurado: repete sozinho quando a recarga termina. */
  attack: boolean;
  /** Esquiva pedida neste quadro. */
  dodge: boolean;
}

export type MovementEvent = 'attack' | 'dodge';

/** Intenção mínima para mudar o rosto do personagem ou escolher a direção da esquiva. */
const TURN_THRESHOLD = 0.1;

export function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    facing: { x: 0, y: 1 },
    dodgeTimer: 0,
    dodgeCooldown: 0,
    dodgeDirection: { x: 0, y: 1 },
    attackTimer: 0,
    attackCooldown: 0,
  };
}

/**
 * Avança o estado em `dt` segundos e atualiza a velocidade. A posição fica para a colisão do mundo.
 * `aim` pode sugerir a direção do ataque (mira automática); sem sugestão, ataca para onde olha.
 */
export function stepPlayer(
  player: Player,
  intent: Intent,
  dt: number,
  settings: MovementSettings,
  aim?: () => Vec | null,
): MovementEvent[] {
  const events: MovementEvent[] = [];
  player.dodgeTimer = Math.max(0, player.dodgeTimer - dt);
  player.dodgeCooldown = Math.max(0, player.dodgeCooldown - dt);
  player.attackTimer = Math.max(0, player.attackTimer - dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);

  const moveLength = Math.hypot(intent.move.x, intent.move.y);

  if (intent.dodge && player.dodgeCooldown === 0 && player.dodgeTimer === 0) {
    player.dodgeDirection = moveLength > TURN_THRESHOLD ? normalize(intent.move) : { ...player.facing };
    player.facing = { ...player.dodgeDirection };
    player.dodgeTimer = settings.dodgeDuration;
    player.dodgeCooldown = settings.dodgeDuration + settings.dodgeCooldown;
    player.attackTimer = 0;
    events.push('dodge');
  }

  if (intent.attack && player.attackCooldown === 0 && player.dodgeTimer === 0) {
    const target = aim?.();
    if (target && (target.x !== 0 || target.y !== 0)) player.facing = normalize(target);
    else if (moveLength > TURN_THRESHOLD) player.facing = normalize(intent.move);
    player.attackTimer = settings.attackDuration;
    player.attackCooldown = settings.attackCooldown;
    events.push('attack');
  }

  if (player.dodgeTimer > 0) {
    const dashSpeed = settings.dodgeDistance / settings.dodgeDuration;
    player.vx = player.dodgeDirection.x * dashSpeed;
    player.vy = player.dodgeDirection.y * dashSpeed;
    return events;
  }

  const factor = player.attackTimer > 0 ? settings.attackMoveFactor : 1;
  const targetX = intent.move.x * settings.speed * factor;
  const targetY = intent.move.y * settings.speed * factor;
  const rate = moveLength > 0 ? settings.acceleration : settings.friction;
  const next = approach({ x: player.vx, y: player.vy }, { x: targetX, y: targetY }, rate * dt);
  player.vx = next.x;
  player.vy = next.y;

  if (player.attackTimer === 0 && moveLength > TURN_THRESHOLD) player.facing = normalize(intent.move);
  return events;
}

/** Aproxima `from` de `to` sem passar, mudando no máximo `maxDelta`. */
export function approach(from: Vec, to: Vec, maxDelta: number): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= maxDelta || distance === 0) return { x: to.x, y: to.y };
  return { x: from.x + (dx / distance) * maxDelta, y: from.y + (dy / distance) * maxDelta };
}

function normalize(v: Vec): Vec {
  const magnitude = Math.hypot(v.x, v.y);
  return magnitude === 0 ? { x: 0, y: 1 } : { x: v.x / magnitude, y: v.y / magnitude };
}
