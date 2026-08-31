import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { ITEM_FRUIT, ITEM_WATER } from '../campaigns/first-day/ids';
import { validateCampaign, walkCampaignTrajectories } from '../core/engine';
import type { Campaign, StoryEvent } from '../core/events';
import { stubCampaign } from './helpers';

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
});
