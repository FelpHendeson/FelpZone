import { describe, expect, it } from 'vitest';
import {
  Animator,
  clipDuration,
  clipFrame,
  directionOf,
  frameRect,
  heroAction,
  heroClipName,
  isActiveFrame,
  sheetSize,
  type Clip,
} from './animation.ts';
import { FOLHIM_FORMAT, HERO_FORMAT } from './sheets.ts';

const walk: Clip = { row: 3, frames: 4, fps: 8, loop: true };
const attack: Clip = { row: 6, frames: 4, fps: 16, loop: false, active: [1, 2] };

describe('clipFrame', () => {
  it('avança um quadro a cada 1/fps segundos', () => {
    expect(clipFrame(walk, 0).index).toBe(0);
    expect(clipFrame(walk, 0.124).index).toBe(0);
    expect(clipFrame(walk, 0.125).index).toBe(1);
  });

  it('animações em repetição voltam ao início', () => {
    expect(clipFrame(walk, 0.5).index).toBe(0);
    expect(clipFrame(walk, 0.625).index).toBe(1);
  });

  it('sem repetição, para no último quadro e avisa que terminou', () => {
    expect(clipFrame(attack, 0.2)).toEqual({ index: 3, finished: false });
    expect(clipFrame(attack, 0.25)).toEqual({ index: 3, finished: true });
    expect(clipFrame(attack, 9)).toEqual({ index: 3, finished: true });
  });

  it('a duração é quadros ÷ velocidade', () => {
    expect(clipDuration(attack)).toBeCloseTo(0.25);
  });
});

describe('quadros ativos', () => {
  it('o golpe só acerta nos quadros marcados', () => {
    expect([0, 1, 2, 3].map((index) => isActiveFrame(attack, index))).toEqual([false, true, true, false]);
    expect(isActiveFrame(walk, 1)).toBe(false);
  });
});

describe('Animator', () => {
  it('trocar de animação recomeça; repetir a mesma não', () => {
    const animator = new Animator();
    animator.play('walk-down');
    animator.update(0.3);
    animator.play('walk-down');
    expect(animator.time).toBeCloseTo(0.3);
    animator.play('attack-down');
    expect(animator.time).toBe(0);
  });

  it('pode forçar o recomeço (golpe novo)', () => {
    const animator = new Animator();
    animator.play('attack-down');
    animator.update(0.2);
    animator.play('attack-down', true);
    expect(animator.time).toBe(0);
  });

  it('a velocidade multiplica o tempo', () => {
    const animator = new Animator();
    animator.play('walk-down');
    animator.update(0.1, 2);
    expect(animator.time).toBeCloseTo(0.2);
  });
});

describe('heroAction', () => {
  const base = { dead: false, hurt: false, dodging: false, attacking: false, speed: 0 };

  it('segue a prioridade: morrer, dano, esquiva, ataque, andar, parado', () => {
    expect(heroAction({ ...base, dead: true, hurt: true, attacking: true })).toBe('death');
    expect(heroAction({ ...base, hurt: true, dodging: true })).toBe('hurt');
    expect(heroAction({ ...base, dodging: true, attacking: true })).toBe('dodge');
    expect(heroAction({ ...base, attacking: true, speed: 5 })).toBe('attack');
    expect(heroAction({ ...base, speed: 5 })).toBe('walk');
    expect(heroAction(base)).toBe('idle');
  });

  it('nomes das animações na folha', () => {
    expect(heroClipName('walk', 'side')).toBe('walk-side');
    expect(heroClipName('death', 'up')).toBe('death');
  });
});

describe('directionOf', () => {
  it('a esquerda é a direita espelhada', () => {
    expect(directionOf({ x: -1, y: 0.2 })).toEqual({ direction: 'side', flip: true });
    expect(directionOf({ x: 1, y: 0 })).toEqual({ direction: 'side', flip: false });
    expect(directionOf({ x: 0.1, y: -1 })).toEqual({ direction: 'up', flip: false });
  });
});

describe('formatos das folhas', () => {
  it('cada animação tem a sua linha, sem sobreposição', () => {
    for (const format of [HERO_FORMAT, FOLHIM_FORMAT]) {
      const rows = Object.values(format.clips).map((clip) => clip.row);
      expect(new Set(rows).size).toBe(rows.length);
    }
  });

  it('o herói tem todas as ações em todas as direções', () => {
    for (const action of ['idle', 'walk', 'attack', 'hurt', 'dodge'] as const) {
      for (const direction of ['down', 'up', 'side'] as const) {
        expect(HERO_FORMAT.clips[heroClipName(action, direction)], `${action}-${direction}`).toBeDefined();
      }
    }
    expect(HERO_FORMAT.clips.death).toBeDefined();
  });

  it('as direções do ataque duram o mesmo e têm os mesmos quadros ativos', () => {
    const attacks = ['down', 'up', 'side'].map((direction) => HERO_FORMAT.clips[`attack-${direction}`]);
    expect(new Set(attacks.map(clipDuration)).size).toBe(1);
    expect(new Set(attacks.map((clip) => String(clip.active))).size).toBe(1);
  });

  it('tamanho da folha e posição dos quadros', () => {
    expect(sheetSize(HERO_FORMAT)).toEqual({ width: 128, height: 512 });
    expect(frameRect(HERO_FORMAT, HERO_FORMAT.clips['attack-side'], 2)).toEqual({ x: 64, y: 256, width: 32, height: 32 });
  });

  it('a âncora fica dentro do quadro', () => {
    for (const format of [HERO_FORMAT, FOLHIM_FORMAT]) {
      expect(format.anchorX).toBeLessThan(format.frameWidth);
      expect(format.anchorY).toBeLessThan(format.frameHeight);
    }
  });
});
