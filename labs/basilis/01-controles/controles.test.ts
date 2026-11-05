import { describe, expect, it } from 'vitest';
import { keysVector, length, snapDirection, stickVector } from './input.ts';
import { approach, createPlayer, stepPlayer, type Intent } from './movement.ts';
import { DEFAULTS, movementSettings, sanitize, type Settings } from './settings.ts';
import { TILE, createWorld, moveWithCollision, type World } from './world.ts';

const idle: Intent = { move: { x: 0, y: 0 }, attack: false, dodge: false };
const movement = movementSettings(DEFAULTS);

describe('stickVector', () => {
  it('ignora o polegar dentro da zona morta', () => {
    expect(stickVector(5, 0, 60, 0.15, 'linear')).toEqual({ x: 0, y: 0 });
  });

  it('recomeça do zero logo depois da zona morta, sem salto', () => {
    expect(length(stickVector(9.6, 0, 60, 0.15, 'linear'))).toBeCloseTo(0.0118, 3);
  });

  it('chega a 1 na borda e não passa dela', () => {
    expect(length(stickVector(60, 0, 60, 0.15, 'linear'))).toBeCloseTo(1);
    expect(length(stickVector(0, 300, 60, 0.15, 'linear'))).toBeCloseTo(1);
  });

  it('a curva suave dá mais precisão no meio do curso', () => {
    const linear = length(stickVector(30, 0, 60, 0, 'linear'));
    const smooth = length(stickVector(30, 0, 60, 0, 'smooth'));
    expect(linear).toBeCloseTo(0.5);
    expect(smooth).toBeCloseTo(0.25);
  });
});

describe('snapDirection', () => {
  it('prende a 4 direções mantendo a intensidade', () => {
    expect(snapDirection({ x: 0.5, y: 0.1 }, '4')).toEqual({ x: Math.hypot(0.5, 0.1), y: 0 });
  });

  it('prende a 8 direções', () => {
    const snapped = snapDirection({ x: 1, y: 0.9 }, '8');
    expect(snapped.x).toBeCloseTo(snapped.y);
  });

  it('não mexe no modo livre', () => {
    expect(snapDirection({ x: 0.3, y: 0.2 }, 'free')).toEqual({ x: 0.3, y: 0.2 });
  });
});

describe('keysVector', () => {
  it('a diagonal não é mais rápida', () => {
    expect(length(keysVector(true, false, false, true))).toBeCloseTo(1);
  });

  it('teclas opostas se anulam', () => {
    expect(keysVector(true, true, false, false)).toEqual({ x: 0, y: 0 });
  });
});

describe('stepPlayer', () => {
  it('acelera até a velocidade máxima sem passar', () => {
    const player = createPlayer(0, 0);
    const intent: Intent = { ...idle, move: { x: 1, y: 0 } };
    for (let i = 0; i < 60; i++) stepPlayer(player, intent, 1 / 60, movement);
    expect(player.vx).toBeCloseTo(movement.speed);
    expect(player.facing).toEqual({ x: 1, y: 0 });
  });

  it('freia até parar ao soltar', () => {
    const player = createPlayer(0, 0);
    player.vx = movement.speed;
    for (let i = 0; i < 60; i++) stepPlayer(player, idle, 1 / 60, movement);
    expect(player.vx).toBe(0);
  });

  it('esquiva para onde olha quando parado e respeita a recarga', () => {
    const player = createPlayer(0, 0);
    player.facing = { x: -1, y: 0 };
    expect(stepPlayer(player, { ...idle, dodge: true }, 1 / 60, movement)).toEqual(['dodge']);
    expect(player.vx).toBeCloseTo(-movement.dodgeDistance / movement.dodgeDuration);
    expect(stepPlayer(player, { ...idle, dodge: true }, 1 / 60, movement)).toEqual([]);
  });

  it('ataque segurado repete quando a recarga termina', () => {
    const player = createPlayer(0, 0);
    const holding: Intent = { ...idle, attack: true };
    let attacks = 0;
    for (let i = 0; i < 60; i++) attacks += stepPlayer(player, holding, 1 / 60, movement).filter((e) => e === 'attack').length;
    expect(attacks).toBe(Math.ceil(1 / movement.attackCooldown));
  });

  it('a mira automática vira o ataque para o alvo', () => {
    const player = createPlayer(0, 0);
    stepPlayer(player, { ...idle, attack: true }, 1 / 60, movement, () => ({ x: 0, y: -2 }));
    expect(player.facing).toEqual({ x: 0, y: -1 });
  });

  it('não ataca durante a esquiva', () => {
    const player = createPlayer(0, 0);
    stepPlayer(player, { ...idle, dodge: true }, 1 / 60, movement);
    expect(stepPlayer(player, { ...idle, attack: true }, 1 / 60, movement)).toEqual([]);
  });
});

describe('approach', () => {
  it('não ultrapassa o alvo', () => {
    expect(approach({ x: 0, y: 0 }, { x: 1, y: 0 }, 5)).toEqual({ x: 1, y: 0 });
  });
});

describe('moveWithCollision', () => {
  function worldWithWall(): World {
    const world = createWorld(10, 10, 1);
    world.tiles.fill(TILE.grass);
    world.tiles[5 * 10 + 6] = TILE.rock;
    return world;
  }

  it('para encostado na pedra e zera a velocidade naquele eixo', () => {
    const world = worldWithWall();
    const body = { x: 5, y: 5.5, vx: 4, vy: 0 };
    moveWithCollision(world, body, 2, 0, 0.3);
    expect(body.x).toBeCloseTo(5.7, 3);
    expect(body.vx).toBe(0);
  });

  it('desliza ao longo da parede na diagonal', () => {
    const world = worldWithWall();
    const body = { x: 5, y: 5.5, vx: 4, vy: 4 };
    moveWithCollision(world, body, 1, 1, 0.3);
    expect(body.y).toBeCloseTo(6.5);
  });

  it('não atravessa a pedra numa esquiva rápida', () => {
    const world = worldWithWall();
    const body = { x: 5, y: 5.5, vx: 0, vy: 0 };
    moveWithCollision(world, body, 3, 0, 0.3);
    expect(body.x).toBeLessThan(6);
  });

  it('a borda do mundo é água e não se atravessa', () => {
    const world = createWorld(64, 64, 7);
    const body = { x: 32, y: 32, vx: 0, vy: 0 };
    moveWithCollision(world, body, -100, 0, 0.3);
    expect(body.x).toBeGreaterThan(2);
  });
});

describe('sanitize', () => {
  it('troca valores fora dos limites pelo padrão', () => {
    const broken = { ...DEFAULTS, speed: 99, joystickMode: 'diagonal', vibration: 'sim' } as unknown as Settings;
    const clean = sanitize(broken);
    expect(clean.speed).toBe(DEFAULTS.speed);
    expect(clean.joystickMode).toBe(DEFAULTS.joystickMode);
    expect(clean.vibration).toBe(DEFAULTS.vibration);
  });
});
