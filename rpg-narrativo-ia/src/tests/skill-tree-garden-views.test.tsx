import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GameState } from '../core/state';
import { createSandboxContext } from '../modules/sandbox';
import { buildSystemStatus } from '../modules/system-interface';
import { ProgressionTabs } from '../ui/screens/exploration/ProgressionTabs';
import { playFirstDay } from './helpers';

const context = createSandboxContext();
const noop = () => undefined;

function withProgress(level: number, entries: Array<[string, number]>, garden = { cultivationPoints: 0, completedRecipeIds: [] as string[] }): GameState {
  const state = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
  return {
    ...state,
    system: { level, entries: entries.map(([skillId, proficiency]) => ({ skillId, proficiency })) },
    garden,
  };
}

const path = (state: GameState, pathId: string) => buildSystemStatus(state, context).skillTree.paths.find((entry) => entry.pathId === pathId);
const node = (state: GameState, pathId: string, skillId: string) => path(state, pathId)?.nodes.find((entry) => entry.skillId === skillId);

describe('Árvore de habilidades — requisitos, conexões e como desenvolver', () => {
  it('no começo mostra a próxima possibilidade, o marco que revela o método e oculta o resto', () => {
    const state = withProgress(1, [['sharpened-senses', 1]]);
    const status = buildSystemStatus(state, context);
    const steady = node(state, 'body-reinforcement', 'steady-body');
    expect(steady?.status).toBe('available');
    expect(steady?.requirements).toEqual([
      { skillId: 'sharpened-senses', name: 'Sentidos Aguçados', pathName: 'Reforço do Corpo', crossPath: false, known: true },
    ]);
    expect(steady?.develop).toEqual({ kind: 'milestone', level: 2 });
    expect(path(state, 'numen-manifestation')).toBeUndefined();
    expect(status.skillTree.hasHiddenPaths).toBe(true);
    expect(path(state, 'body-reinforcement')?.hasHiddenSkills).toBe(true);
    // Nada oculto vaza: nem o caminho de Poder nem a técnica híbrida.
    const visible = JSON.stringify({ tree: status.skillTree, garden: status.garden.integrations });
    expect(visible).not.toContain('Sentinela');
    expect(visible).not.toContain('Fagulha');
    expect(visible).not.toContain('Manifestação');
    expect(status.garden.nextPointLevel).toBe(2);
  });

  it('no Nível 2 aponta o treino revelado que ensina a habilidade', () => {
    const state = withProgress(2, [['sharpened-senses', 3]]);
    expect(node(state, 'body-reinforcement', 'steady-body')?.develop).toMatchObject({
      kind: 'training',
      methodId: 'body-reinforcement-routine',
      methodName: 'Rotina de Reforço do Corpo',
      canTrain: true,
    });
    expect(buildSystemStatus(state, context).garden.nextPointLevel).toBeNull();
  });

  it('desenha a conexão entre caminhos quando o Poder depende do Corpo', () => {
    const state = withProgress(2, [['sharpened-senses', 3], ['steady-body', 0]]);
    const spark = node(state, 'numen-manifestation', 'guiding-spark');
    expect(spark?.status).toBe('available');
    expect(spark?.requirements[0]).toMatchObject({ name: 'Corpo Firme', pathName: 'Reforço do Corpo', crossPath: true, known: true });
    expect(path(state, 'numen-manifestation')?.fieldName).toBe('Poder');
  });

  it('marca a habilidade nascida no Jardim depois do cultivo', () => {
    const state = withProgress(2, [['sharpened-senses', 3], ['steady-body', 0], ['sensing-guard', 1]], {
      cultivationPoints: 0,
      completedRecipeIds: ['inner-sentinel'],
    });
    expect(node(state, 'body-reinforcement', 'sensing-guard')).toMatchObject({ status: 'known', origin: 'garden' });
    expect(node(state, 'body-reinforcement', 'steady-body')?.origin).toBe('path');
  });
});

describe('Jardim — requisitos conhecidos, fontes → resultado e pontos', () => {
  it('percebe a integração com requisitos e seu estado atual, sem revelar o resultado', () => {
    const state = withProgress(1, [['sharpened-senses', 1], ['steady-body', 0]]);
    const [integration] = buildSystemStatus(state, context).garden.integrations;
    expect(integration).toMatchObject({
      visibility: 'perceived',
      name: 'Sentinela Interior',
      sourceNames: ['Sentidos Aguçados', 'Corpo Firme'],
      resultName: null,
      canCultivate: false,
    });
    expect(integration?.requirements).toEqual([
      { text: 'Conhecer Sentidos Aguçados', met: true },
      { text: 'Conhecer Corpo Firme', met: true },
      { text: 'Sentidos Aguçados em proficiência 3 (atual 1)', met: false },
      { text: 'Nível 2 (atual 1)', met: false },
    ]);
  });

  it('libera o cultivo só com requisitos e ponto, e explica o bloqueio sem ponto', () => {
    const ready = withProgress(2, [['sharpened-senses', 3], ['steady-body', 0]], { cultivationPoints: 1, completedRecipeIds: [] });
    expect(buildSystemStatus(ready, context).garden.integrations[0]).toMatchObject({
      visibility: 'available',
      resultName: 'Sentinela Interior',
      canCultivate: true,
      cost: { cultivationPoints: 1, periods: 2 },
    });
    const noPoint = { ...ready, garden: { cultivationPoints: 0, completedRecipeIds: [] } };
    expect(buildSystemStatus(noPoint, context).garden.integrations[0]).toMatchObject({
      canCultivate: false,
      blockedReason: 'Não há pontos de cultivo suficientes.',
    });
  });
});

describe('Progressão em abas', () => {
  it('abre na Árvore com trilha de nós e oferece Treino, Jardim e Fundamentos', () => {
    const status = buildSystemStatus(withProgress(2, [['sharpened-senses', 3], ['steady-body', 0]], { cultivationPoints: 1, completedRecipeIds: [] }), context);
    const html = renderToStaticMarkup(<ProgressionTabs status={status} onTrain={noop} onCultivate={noop} />);
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('skill-node skill-node--known');
    expect(html).toContain('⇄ Reforço do Corpo');
    expect(html).toContain('progression-tabs__dot');
  });

  it('desenha a integração como fontes → resultado com checklist e custo', () => {
    const status = buildSystemStatus(withProgress(2, [['sharpened-senses', 3], ['steady-body', 0]], { cultivationPoints: 1, completedRecipeIds: [] }), context);
    const html = renderToStaticMarkup(<ProgressionTabs status={status} onTrain={noop} onCultivate={noop} initialTab="garden" />);
    expect(html).toContain('garden-chip--result');
    expect(html).toContain('Sentinela Interior');
    expect(html).toContain('1 ponto · 2 períodos · permanente');
    expect(html).toContain('✓');
  });
});
