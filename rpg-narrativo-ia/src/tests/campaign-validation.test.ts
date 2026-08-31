import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { ITEM_FRUIT, ITEM_WATER } from '../campaigns/first-day/ids';
import { applyChoice, getAvailableChoices, startGame, validateCampaign, walkCampaignTrajectories } from '../core/engine';
import type { Campaign, StoryEvent } from '../core/events';
import { now, stubCampaign } from './helpers';

describe('validação de campanha', () => {
  it('aceita a campanha atual na validação ampliada', () => {
    expect(validateCampaign(firstDayCampaign)).toEqual([]);
  });

  it('diagnostica referências quebradas, IDs repetidos e transições inválidas', () => {
    const broken: Campaign = stubCampaign({
      firstEventId: 'missing-start',
      items: [{ id: ITEM_WATER, name: 'Água', description: 'Água' }],
      events: [
        {
          id: 'alpha',
          title: 'Um',
          body: 'Olá {{desconhecido}}.',
          image: { kind: 'scene', label: 'Um' },
          choices: [
            {
              id: 'take',
              label: 'Pegar',
              effects: [{ type: 'inventory.add', itemId: 'item-fantasma', quantity: 1 }],
              transition: { type: 'event', eventId: 'beta' },
            },
            {
              id: 'take',
              label: 'Repetida',
              effects: [{ type: 'inventory.remove', itemId: ITEM_WATER, quantity: 1 }],
              transition: { type: 'firstMatch', eventIds: [] },
            },
          ],
        },
        {
          id: 'alpha',
          title: 'Duplicado',
          body: 'Duplicado.',
          image: { kind: 'scene', label: 'Dois' },
          choices: [
            {
              id: 'gone',
              label: 'Ir',
              effects: [{ type: 'progression.ability', abilityId: 'nao-existe' }],
              transition: { type: 'event', eventId: 'lugar-nenhum' },
            },
          ],
        },
        {
          id: 'sem-saida',
          title: 'Sem saída',
          body: 'Travado.',
          image: { kind: 'scene', label: 'Fim morto' },
          choices: [],
        },
      ],
    });

    const diagnostics = validateCampaign(broken);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some((line) => line.includes('missing-start'))).toBe(true);
    expect(diagnostics.some((line) => /repetid/i.test(line))).toBe(true);
    expect(diagnostics.some((line) => line.includes('item-fantasma') || line.includes('não existe'))).toBe(true);
    expect(diagnostics.some((line) => line.includes('{{desconhecido}}') || line.includes('desconhecido'))).toBe(true);
    expect(diagnostics.some((line) => line.includes('firstMatch') || line.includes('candidato'))).toBe(true);
    expect(diagnostics.some((line) => line.includes('sem-saida') || line.includes('não possui escolhas'))).toBe(true);
    expect(diagnostics.some((line) => line.includes('inventory.remove') || line.includes('proteg'))).toBe(true);
  });

  it('exige condição compatível para consumo de item', () => {
    const campaign = stubCampaign({
      items: [{ id: ITEM_FRUIT, name: 'Fruto', description: 'Fruto' }],
      events: [
        {
          id: 'start',
          title: 'Início',
          body: 'Há um fruto.',
          image: { kind: 'scene', label: 'Início' },
          choices: [
            {
              id: 'eat',
              label: 'Comer',
              effects: [{ type: 'inventory.remove', itemId: ITEM_FRUIT, quantity: 1 }],
              transition: { type: 'complete' },
            },
          ],
          isEnding: true,
        },
      ],
    });

    const diagnostics = validateCampaign(campaign);
    expect(diagnostics.some((line) => line.includes('eat') && (line.includes('fruto') || line.includes(ITEM_FRUIT) || line.includes('proteg')))).toBe(
      true,
    );
  });

  it('detecta evento inalcançável e ausência de encerramento alcançável', () => {
    const orphan: StoryEvent = {
      id: 'ilha',
      title: 'Ilha',
      body: 'Ninguém chega aqui.',
      image: { kind: 'scene', label: 'Ilha' },
      choices: [
        {
          id: 'stay',
          label: 'Ficar',
          effects: [],
          transition: { type: 'event', eventId: 'ilha' },
        },
      ],
    };

    const campaign = stubCampaign({
      firstEventId: 'start',
      events: [
        {
          id: 'start',
          title: 'Começo',
          body: 'Sem fim.',
          image: { kind: 'scene', label: 'Início' },
          choices: [
            {
              id: 'loop',
              label: 'Continuar',
              effects: [],
              transition: { type: 'event', eventId: 'start' },
            },
          ],
        },
        orphan,
      ],
    });

    const diagnostics = validateCampaign(campaign);
    expect(diagnostics.some((line) => line.includes('ilha'))).toBe(true);
    expect(diagnostics.some((line) => /encerr/i.test(line) || /complete/i.test(line) || /fim/i.test(line))).toBe(true);
  });

  it('percorre todas as trajetórias válidas da campanha atual sem evento morto', () => {
    const walk = walkCampaignTrajectories(firstDayCampaign);
    const eventIds = firstDayCampaign.events.map((event) => event.id);

    expect(walk.errors).toEqual([]);
    expect(walk.deadEnds).toEqual([]);
    expect(walk.completedPaths).toBeGreaterThan(0);
    expect(walk.reachedEventIds.sort()).toEqual([...eventIds].sort());
  });

  it('distingue dois estados no mesmo evento quando atributos ou relações mudam as escolhas', () => {
    const campaign = branchingAttributeCampaign();
    const started = startGame({ firstName: 'Ana', lastName: 'Cruz' }, campaign, now);
    const skipped = applyChoice(started, campaign, 'skip', now);
    const trained = applyChoice(started, campaign, 'train', now);

    expect(skipped.currentEventId).toBe('hub');
    expect(trained.currentEventId).toBe('hub');
    expect(skipped.flags).toEqual(trained.flags);
    expect(skipped.inventory).toEqual(trained.inventory);
    expect(skipped.attributes.cautela).not.toBe(trained.attributes.cautela);
    expect(getAvailableChoices(skipped, campaign).some((choice) => choice.id === 'secret')).toBe(false);
    expect(getAvailableChoices(trained, campaign).some((choice) => choice.id === 'secret')).toBe(true);

    const walk = walkCampaignTrajectories(campaign);
    expect(walk.errors).toEqual([]);
    expect(walk.reachedEventIds).toContain('secret');
  });

  it('não considera semanticamente alcançável um evento só porque aparece numa transição', () => {
    const campaign = structurallyConnectedButGatedCampaign();
    const diagnostics = validateCampaign(campaign);
    const walk = walkCampaignTrajectories(campaign);

    expect(walk.reachedEventIds).not.toContain('gated');
    expect(walk.reachedEventIds).toContain('ending');
    expect(diagnostics.some((line) => line.includes('gated') && /semanticamente/i.test(line))).toBe(true);
    expect(diagnostics.some((line) => line.includes('gated') && /estruturalmente/i.test(line))).toBe(false);
  });
});

function branchingAttributeCampaign(): Campaign {
  return stubCampaign({
    events: [
      {
        id: 'start',
        title: 'Início',
        body: 'Dois jeitos de chegar ao mesmo lugar.',
        image: { kind: 'scene', label: 'Início' },
        choices: [
          {
            id: 'loop',
            label: 'Esperar no lugar',
            effects: [],
            transition: { type: 'event', eventId: 'start' },
          },
          {
            id: 'skip',
            label: 'Seguir direto',
            effects: [],
            transition: { type: 'event', eventId: 'hub' },
          },
          {
            id: 'train',
            label: 'Treinar o olhar',
            effects: [{ type: 'attribute.change', attribute: 'cautela', amount: 20 }],
            transition: { type: 'event', eventId: 'hub' },
          },
        ],
      },
      {
        id: 'hub',
        title: 'Clareira',
        body: 'O mesmo sítio, outra disposição.',
        image: { kind: 'scene', label: 'Hub' },
        choices: [
          {
            id: 'finish',
            label: 'Encerrar',
            effects: [{ type: 'game.complete' }],
            transition: { type: 'complete' },
          },
          {
            id: 'secret',
            label: 'Notar o atalho',
            conditions: [{ type: 'attribute.min', attribute: 'cautela', amount: 50 }],
            effects: [],
            transition: { type: 'event', eventId: 'secret' },
          },
        ],
      },
      {
        id: 'secret',
        title: 'Atalho',
        body: 'Só quem treinou percebe.',
        image: { kind: 'scene', label: 'Segredo' },
        isEnding: true,
        choices: [
          {
            id: 'secret-end',
            label: 'Encerrar',
            effects: [{ type: 'game.complete' }],
            transition: { type: 'complete' },
          },
        ],
      },
    ],
  });
}

function structurallyConnectedButGatedCampaign(): Campaign {
  return stubCampaign({
    events: [
      {
        id: 'start',
        title: 'Início',
        body: 'Há uma porta trancada no caminho.',
        image: { kind: 'scene', label: 'Início' },
        choices: [
          {
            id: 'proceed',
            label: 'Avançar',
            effects: [],
            transition: { type: 'firstMatch', eventIds: ['gated', 'ending'] },
          },
        ],
      },
      {
        id: 'gated',
        title: 'Sala trancada',
        body: 'Ninguém abre isto neste estado.',
        image: { kind: 'scene', label: 'Trancada' },
        conditions: [{ type: 'flag.is', flag: 'never-open', value: true }],
        isEnding: true,
        choices: [
          {
            id: 'gated-end',
            label: 'Encerrar',
            effects: [{ type: 'game.complete' }],
            transition: { type: 'complete' },
          },
        ],
      },
      {
        id: 'ending',
        title: 'Saída',
        body: 'O caminho possível.',
        image: { kind: 'scene', label: 'Fim' },
        isEnding: true,
        choices: [
          {
            id: 'real-end',
            label: 'Encerrar',
            effects: [{ type: 'game.complete' }],
            transition: { type: 'complete' },
          },
        ],
      },
    ],
  });
}
