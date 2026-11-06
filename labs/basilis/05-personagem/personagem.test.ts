import { describe, expect, it } from 'vitest';
import { frameRect } from '../04-animacao/animation.ts';
import { ARMA_RADIUS, generateTestSword } from './arma-teste.ts';
import { MANEQUIM_DEFAULTS, drawManequim, generateManequimSheet } from './manequim.ts';
import {
  DIRECTIONS,
  MANEQUIM_PALETTE,
  MANEQUIM_RAMPS,
  MOLDE_ACTIONS,
  MOLDE_FORMAT,
  MOLDE_SIZE,
  facingRow,
  moldeClipName,
  paletteIndex,
} from './molde.ts';
import { MOLDE_POSES, missingPoses } from './poses.ts';
import { MOLDE_POINTS, ORIENTATIONS, POINT_NAMES, mirrorOrientation, mirrorPoints, pointsAt, pointsJSON } from './pontos.ts';

const clips = Object.entries(MOLDE_FORMAT.clips);
const everyFrame = clips.flatMap(([name, clip]) => Array.from({ length: clip.frames }, (_, index) => ({ name, index })));

describe('formato do molde', () => {
  it('quadros de 32 × 32 com âncora nos pés em (16, 28)', () => {
    expect(MOLDE_FORMAT).toMatchObject({ frameWidth: 32, frameHeight: 32, anchorX: 16, anchorY: 28 });
  });

  it('tem as animações da seção 2 com o número de quadros pedido', () => {
    const frames = Object.fromEntries(MOLDE_ACTIONS.map((info) => [info.action, info.frames]));
    expect(frames).toEqual({ idle: 4, walk: 6, dash: 3, hurt: 2, 'slash-a': 4, 'slash-b': 4, death: 4 });
  });

  it('as ações com direção têm baixo, cima e lado; morrer é uma só', () => {
    for (const info of MOLDE_ACTIONS) {
      if (!info.directional) {
        expect(MOLDE_FORMAT.clips[info.action]).toBeDefined();
        continue;
      }
      for (const direction of DIRECTIONS) {
        expect(MOLDE_FORMAT.clips[moldeClipName(info.action, direction)], `${info.action}-${direction}`).toBeDefined();
      }
    }
    expect(moldeClipName('death', 'side')).toBe('death');
  });

  it('uma animação por linha, sem linhas repetidas nem buracos', () => {
    const rows = clips.map(([, clip]) => clip.row).sort((a, b) => a - b);
    expect(rows).toEqual(rows.map((_, index) => index));
  });

  it('a folha tem 192 × 608 px (6 quadros na linha mais longa, 19 linhas)', () => {
    expect(MOLDE_SIZE).toEqual({ width: 192, height: 608 });
  });

  it('a esquerda é o lado espelhado', () => {
    expect(facingRow('left')).toEqual({ direction: 'side', flip: true });
    expect(facingRow('side')).toEqual({ direction: 'side', flip: false });
  });

  it('as duas linhas de cortar duram o mesmo e acertam nos mesmos quadros', () => {
    const a = MOLDE_FORMAT.clips['slash-a-down'];
    const b = MOLDE_FORMAT.clips['slash-b-down'];
    expect(a.active).toEqual([1, 2]);
    expect(b.active).toEqual(a.active);
    expect(b.frames / b.fps).toBe(a.frames / a.fps);
  });

  it('há uma pose para cada quadro de cada animação', () => {
    expect(missingPoses()).toEqual([]);
  });
});

describe('pontos por quadro', () => {
  it('todo quadro tem os cinco pontos', () => {
    for (const { name, index } of everyFrame) {
      expect(Object.keys(MOLDE_POINTS[name][index]).sort(), `${name} ${index}`).toEqual([...POINT_NAMES].sort());
    }
  });

  it('os pontos ficam dentro do quadro', () => {
    for (const { name, index } of everyFrame) {
      for (const point of Object.values(MOLDE_POINTS[name][index])) {
        expect(point.x, `${name} ${index}`).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(MOLDE_FORMAT.frameWidth);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(MOLDE_FORMAT.frameHeight);
      }
    }
  });

  it('os pés são sempre a âncora', () => {
    for (const { name, index } of everyFrame) {
      expect(MOLDE_POINTS[name][index].pes).toMatchObject({ x: 16, y: 28 });
    }
  });

  it('a mão principal tem uma das 16 orientações e diz se a arma vai na frente ou atrás', () => {
    for (const { name, index } of everyFrame) {
      const hand = MOLDE_POINTS[name][index]['mao-principal'];
      expect(Number.isInteger(hand.orientation) && hand.orientation >= 0 && hand.orientation < ORIENTATIONS, `${name} ${index}`).toBe(true);
      expect(typeof hand.front).toBe('boolean');
    }
  });

  it('as duas mãos ficam sobre as mãos desenhadas do manequim', () => {
    for (const { name, index } of everyFrame) {
      const image = drawManequim(MOLDE_POSES[name][index]);
      for (const hand of [MOLDE_POINTS[name][index]['mao-principal'], MOLDE_POINTS[name][index]['mao-secundaria']]) {
        // A mão é o 2 × 2 em volta do ponto: pelo menos um desses pixels é do corpo.
        const cells = [
          [hand.x - 1, hand.y - 1],
          [hand.x, hand.y - 1],
          [hand.x - 1, hand.y],
          [hand.x, hand.y],
        ];
        expect(
          cells.some(([x, y]) => image.get(x, y) !== 0),
          `${name} ${index}`,
        ).toBe(true);
      }
    }
  });

  it('a cabeça fica no topo do corpo nos quadros em pé com a mão abaixo dela', () => {
    for (const { name, index } of everyFrame) {
      const pose = MOLDE_POSES[name][index];
      const head = MOLDE_POINTS[name][index].cabeca;
      if (pose.lying || pose.mainHand.y - 1 <= head.y + 1) continue;
      expect(head.y, `${name} ${index}`).toBe(drawManequim(pose).bounds()!.y);
    }
  });

  it('de costas, o que vai nas costas fica na frente; de frente e de lado, atrás', () => {
    expect(MOLDE_POINTS['idle-up'][0].costas.front).toBe(true);
    expect(MOLDE_POINTS['idle-down'][0].costas.front).toBe(false);
    expect(MOLDE_POINTS['idle-side'][0].costas.front).toBe(false);
  });

  it('cortando de costas, a arma erguida vai atrás do corpo', () => {
    expect(MOLDE_POINTS['slash-a-up'][1]['mao-principal'].front).toBe(false);
    expect(MOLDE_POINTS['slash-a-up'][2]['mao-principal'].front).toBe(false);
  });
});

describe('espelhamento', () => {
  it('a orientação espelha na horizontal: direita e esquerda trocam, cima e baixo ficam', () => {
    expect(mirrorOrientation(0)).toBe(8);
    expect(mirrorOrientation(8)).toBe(0);
    expect(mirrorOrientation(4)).toBe(4);
    expect(mirrorOrientation(12)).toBe(12);
    expect(mirrorOrientation(2)).toBe(6);
    expect(mirrorOrientation(14)).toBe(10);
    for (let o = 0; o < ORIENTATIONS; o++) expect(mirrorOrientation(mirrorOrientation(o))).toBe(o);
  });

  it('espelhar duas vezes devolve os mesmos pontos, e os pés não saem do lugar', () => {
    for (const { name, index } of everyFrame) {
      const points = MOLDE_POINTS[name][index];
      expect(mirrorPoints(mirrorPoints(points))).toEqual(points);
      expect(mirrorPoints(points).pes).toEqual(points.pes);
    }
  });

  it('x vira 32 menos x, e frente ou atrás se mantém', () => {
    const points = pointsAt('slash-a-side', 1, true);
    const original = MOLDE_POINTS['slash-a-side'][1];
    expect(points['mao-principal'].x).toBe(32 - original['mao-principal'].x);
    expect(points['mao-principal'].y).toBe(original['mao-principal'].y);
    expect(points['mao-principal'].front).toBe(original['mao-principal'].front);
  });
});

describe('manequim', () => {
  const idle = drawManequim(MOLDE_POSES['idle-down'][0]);

  it('o corpo tem 16 × 24, centrado na âncora, com os pés na linha dela', () => {
    const bounds = idle.bounds()!;
    expect(bounds.width).toBe(16);
    expect(bounds.height).toBe(24);
    expect(bounds.y + bounds.height).toBe(MOLDE_FORMAT.anchorY);
    expect(bounds.x + bounds.width / 2).toBe(MOLDE_FORMAT.anchorX);
  });

  it('em pé, de todos os lados, o corpo fica sobre os pés', () => {
    for (const direction of DIRECTIONS) {
      const bounds = drawManequim(MOLDE_POSES[`idle-${direction}`][0]).bounds()!;
      expect(bounds.y + bounds.height, direction).toBe(MOLDE_FORMAT.anchorY);
      expect(Math.abs(bounds.x + bounds.width / 2 - MOLDE_FORMAT.anchorX), direction).toBeLessThanOrEqual(1.5);
    }
  });

  it('usa no máximo 15 cores mais a transparente, sem preto puro', () => {
    const sheet = generateManequimSheet();
    expect(sheet.colorsUsed().size).toBeLessThanOrEqual(15);
    for (const entry of MANEQUIM_PALETTE) if (entry) expect(entry.color.toLowerCase()).not.toBe('#000000');
  });

  it('rampas de 3 a 4 tons por material', () => {
    for (const ramp of [MANEQUIM_RAMPS.pele, MANEQUIM_RAMPS.tecido]) {
      expect(ramp.length).toBeGreaterThanOrEqual(3);
      expect(ramp.length).toBeLessThanOrEqual(4);
    }
  });

  it('o contorno é colorido: a borda do corpo usa os tons escuros das rampas', () => {
    const dark = new Set([paletteIndex('pele', 0), paletteIndex('pele', 1), paletteIndex('tecido', 0), paletteIndex('tecido', 1)]);
    for (let y = 0; y < idle.height; y++) {
      for (let x = 0; x < idle.width; x++) {
        const value = idle.get(x, y);
        if (value === 0) continue;
        const edge = [idle.get(x + 1, y), idle.get(x - 1, y), idle.get(x, y + 1), idle.get(x, y - 1)].includes(0);
        if (edge) expect(dark.has(value), `${x}, ${y}`).toBe(true);
      }
    }
  });

  it('a luz vem do alto à esquerda: a metade esquerda da cabeça é mais clara que a direita', () => {
    const tone = (x: number, y: number) => MANEQUIM_PALETTE[idle.get(x, y)]?.tone ?? 0;
    let left = 0;
    let right = 0;
    for (let y = 6; y < 13; y++) {
      for (let i = 0; i < 5; i++) {
        left += tone(11 + i, y);
        right += tone(16 + i, y);
      }
    }
    expect(left).toBeGreaterThan(right);
  });

  it('sem contorno seletivo, o topo usa só o tom mais escuro', () => {
    const plain = drawManequim(MOLDE_POSES['idle-down'][0], { ...MANEQUIM_DEFAULTS, selectiveOutline: false });
    const darkest = new Set([paletteIndex('pele', 0), paletteIndex('tecido', 0)]);
    const top = plain.bounds()!.y;
    for (let x = 0; x < plain.width; x++) {
      const value = plain.get(x, top);
      if (value !== 0) expect(darkest.has(value)).toBe(true);
    }
  });

  it('cada quadro da folha fica no lugar do formato', () => {
    const sheet = generateManequimSheet();
    expect([sheet.width, sheet.height]).toEqual([MOLDE_SIZE.width, MOLDE_SIZE.height]);
    for (const { name, index } of everyFrame) {
      const { x, y } = frameRect(MOLDE_FORMAT, MOLDE_FORMAT.clips[name], index);
      const frame = drawManequim(MOLDE_POSES[name][index]);
      let same = true;
      for (let j = 0; j < 32 && same; j++) for (let i = 0; i < 32 && same; i++) same = sheet.get(x + i, y + j) === frame.get(i, j);
      expect(same, `${name} ${index}`).toBe(true);
    }
  });
});

describe('espada de teste e JSON', () => {
  it('tem 16 orientações já desenhadas, com a pegada no mesmo ponto', () => {
    const sword = generateTestSword();
    expect(sword).toHaveLength(16);
    for (const sprite of sword) expect([sprite.gripX, sprite.gripY]).toEqual([ARMA_RADIUS, ARMA_RADIUS]);
    // Apontada para a direita, a lâmina fica à direita da pegada; para cima, acima.
    const right = sword[0].image.bounds()!;
    const up = sword[12].image.bounds()!;
    expect(right.x + right.width).toBeGreaterThan(ARMA_RADIUS + 8);
    expect(up.y).toBeLessThan(ARMA_RADIUS - 8);
  });

  it('o JSON dos pontos traz todas as animações', () => {
    const data = JSON.parse(pointsJSON());
    expect(Object.keys(data.animacoes).sort()).toEqual(Object.keys(MOLDE_FORMAT.clips).sort());
    expect(data.formato.ancora).toEqual([16, 28]);
  });
});
