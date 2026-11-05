import { describe, expect, it } from 'vitest';
import { applyHit, createEnemy, inCone, lungeConnects, separation, stepEnemy, type CombatSettings, type Enemy } from './combat.ts';

const settings: CombatSettings = {
  attackDamage: 10,
  attackReach: 1.3,
  attackArc: (Math.PI * 2) / 3,
  knockback: 7,
  playerInvulnerability: 0.8,
  enemyHp: 30,
  enemyDamage: 15,
  enemySpeed: 2.6,
  aggroRange: 5,
  windup: 0.45,
  respawnSeconds: 4,
};
const random = () => 0.5;

function run(enemy: Enemy, target: { x: number; y: number }, seconds: number, step = 1 / 60): string[] {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += step) {
    events.push(...stepEnemy(enemy, target, step, settings, random));
    enemy.x += enemy.vx * step;
    enemy.y += enemy.vy * step;
  }
  return events;
}

describe('inCone', () => {
  const origin = { x: 0, y: 0 };
  const facing = { x: 1, y: 0 };

  it('acerta à frente, dentro do alcance', () => {
    expect(inCone(origin, facing, 1.3, settings.attackArc, { x: 1, y: 0.2 }, 0.35)).toBe(true);
  });

  it('não acerta atrás', () => {
    expect(inCone(origin, facing, 1.3, settings.attackArc, { x: -1, y: 0 }, 0.35)).toBe(false);
  });

  it('a borda do alvo conta no alcance', () => {
    expect(inCone(origin, facing, 1.3, settings.attackArc, { x: 1.6, y: 0 }, 0.35)).toBe(true);
    expect(inCone(origin, facing, 1.3, settings.attackArc, { x: 1.7, y: 0 }, 0.35)).toBe(false);
  });

  it('a borda do alvo conta no ângulo', () => {
    // Centro 65° fora do eixo (fora dos 60° do arco), mas a borda entra.
    const angle = (65 * Math.PI) / 180;
    expect(inCone(origin, facing, 1.3, settings.attackArc, { x: Math.cos(angle), y: Math.sin(angle) }, 0.35)).toBe(true);
  });

  it('alvo encostado sempre é atingido', () => {
    expect(inCone(origin, facing, 1.3, settings.attackArc, { x: -0.1, y: 0 }, 0.35)).toBe(true);
  });
});

describe('applyHit', () => {
  it('tira vida, empurra para longe e dá invulnerabilidade', () => {
    const enemy = createEnemy(0, 2, 0, settings);
    expect(applyHit(enemy, 10, { x: 0, y: 0 }, 7, 0.5)).toBe(true);
    expect(enemy.hp).toBe(20);
    expect(enemy.vx).toBeCloseTo(7);
    expect(enemy.vy).toBeCloseTo(0);
    expect(applyHit(enemy, 10, { x: 0, y: 0 }, 7, 0.5)).toBe(false);
    expect(enemy.hp).toBe(20);
  });

  it('a vida não fica negativa', () => {
    const enemy = createEnemy(0, 1, 0, settings);
    applyHit(enemy, 100, { x: 0, y: 0 }, 7, 0);
    expect(enemy.hp).toBe(0);
  });
});

describe('stepEnemy', () => {
  it('persegue, avisa e dá o bote quando o alvo chega perto', () => {
    const enemy = createEnemy(0, 0, 0, settings);
    const events = run(enemy, { x: 3, y: 0 }, 2);
    expect(events).toContain('windup');
    expect(events).toContain('lunge');
    expect(events.indexOf('windup')).toBeLessThan(events.indexOf('lunge'));
  });

  it('fica parado durante o aviso, pelo tempo configurado', () => {
    const enemy = createEnemy(0, 0, 0, settings);
    enemy.state = 'windup';
    enemy.stateTimer = settings.windup;
    run(enemy, { x: 1, y: 0 }, settings.windup - 0.05);
    expect(enemy.state).toBe('windup');
    expect(Math.hypot(enemy.vx, enemy.vy)).toBeLessThan(0.5);
  });

  it('ignora quem está longe', () => {
    const enemy = createEnemy(0, 0, 0, settings);
    run(enemy, { x: 20, y: 0 }, 2);
    expect(enemy.state).toBe('wander');
  });

  it('um golpe interrompe o bote', () => {
    const enemy = createEnemy(0, 0, 0, settings);
    enemy.state = 'lunge';
    enemy.stateTimer = 0.2;
    applyHit(enemy, 10, { x: 1, y: 0 }, 7, 0.1);
    stepEnemy(enemy, { x: 1, y: 0 }, 1 / 60, settings, random);
    expect(enemy.state).toBe('recover');
  });

  it('morre sem vida e renasce em casa depois do tempo', () => {
    const enemy = createEnemy(0, 5, 5, settings);
    enemy.x = 8;
    enemy.hp = 0;
    expect(stepEnemy(enemy, { x: 0, y: 0 }, 1 / 60, settings, random)).toEqual(['died']);
    expect(run(enemy, { x: 0, y: 0 }, settings.respawnSeconds + 0.1)).toContain('respawned');
    // Renasceu em casa e já começou a vagar um pouco.
    expect(Math.hypot(enemy.x - 5, enemy.y - 5)).toBeLessThan(0.3);
    expect(enemy.hp).toBe(settings.enemyHp);
  });
});

describe('lungeConnects', () => {
  it('acerta uma vez por bote, só encostando', () => {
    const enemy = createEnemy(0, 0, 0, settings);
    enemy.state = 'lunge';
    const target = { x: 0.6, y: 0, vx: 0, vy: 0, radius: 0.3 };
    expect(lungeConnects(enemy, target)).toBe(true);
    expect(lungeConnects(enemy, target)).toBe(false);
    enemy.lungeHit = false;
    expect(lungeConnects(enemy, { ...target, x: 2 })).toBe(false);
  });
});

describe('separation', () => {
  it('separa corpos sobrepostos na proporção pedida', () => {
    const a = { x: 0, y: 0, vx: 0, vy: 0, radius: 0.3 };
    const b = { x: 0.4, y: 0, vx: 0, vy: 0, radius: 0.3 };
    const result = separation(a, b, 0.25)!;
    expect(result.a.x).toBeCloseTo(-0.05);
    expect(result.b.x).toBeCloseTo(0.15);
  });

  it('não mexe em quem não se encosta', () => {
    expect(separation({ x: 0, y: 0, vx: 0, vy: 0, radius: 0.3 }, { x: 1, y: 0, vx: 0, vy: 0, radius: 0.3 })).toBeNull();
  });
});
