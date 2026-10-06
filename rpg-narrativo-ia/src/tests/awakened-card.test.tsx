import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GameState } from '../core/state';
import { buildAwakenedCard, wrapCode } from '../modules/awakened-card';
import { AwakenedCard } from '../ui/components/AwakenedCard';
import { cardBust, shareText } from '../ui/awakened-card/card';
import { AwakenedCardDialog } from '../ui/screens/exploration/AwakenedCardDialog';
import { freshState } from './helpers';

const TITLES = [
  { id: 'mao-partilhada', name: 'Mão Partilhada' },
  { id: 'vigia', name: 'Vigia da Clareira' },
];

function swordsman(): GameState {
  const state = freshState();
  return {
    ...state,
    character: { ...state.character, firstName: 'Ana', lastName: 'Sol', archetypeId: 'apprentice-swordsman' },
    world: { ...state.world, day: 6 },
    progression: { ...state.progression, titleIds: ['mao-partilhada', 'vigia'] },
    bestiary: {
      entries: {
        'wary-predator': { encounters: 2, victories: 2, actionsSeen: [] },
        'thorn-boar': { encounters: 1, victories: 1, actionsSeen: [] },
        'bark-crow': { encounters: 3, victories: 0, actionsSeen: [] },
      },
    },
  };
}

describe('Caso 10 — Carta do Desperto', () => {
  it('reúne nome, patente, técnica de assinatura e três conquistas a partir do estado', () => {
    const card = buildAwakenedCard({ state: swordsman(), rank: { rank: 'apprentice', title: 'Aprendiz de Espadachim' }, titles: TITLES, sealCode: 'ECO1.abc' });
    expect(card.name).toBe('Ana Sol');
    expect(card.rankTitle).toBe('Aprendiz de Espadachim');
    expect(card.signature?.name).toBeTruthy();
    expect(card.achievements.map((entry) => entry.value)).toEqual(['Vigia da Clareira', 'Javali de Espinhos', '6 dias']);
    expect(card.sealCode).toBe('ECO1.abc');
    expect(card.palette.primary).toMatch(/^#/);
  });

  it('sem títulos nem vitórias, a carta diz isso com clareza', () => {
    const state = freshState();
    const card = buildAwakenedCard({ state: { ...state, bestiary: { entries: {} } }, rank: { rank: 'apprentice', title: 'Sobrevivente' }, titles: TITLES });
    expect(card.achievements[0].value).toBe('Ainda sem título');
    expect(card.achievements[1].value).toBe('Ainda sem vitórias');
    expect(card.achievements[2].value).toBe('1 dia');
    expect(card.sealCode).toBeUndefined();
  });

  it('desenha a carta 1080×1350 com cores fixas e o Selo no rodapé', () => {
    const code = `ECO1.${'x'.repeat(300)}`;
    const card = buildAwakenedCard({ state: swordsman(), rank: { rank: 'initiate', title: 'Espadachim Iniciado' }, titles: TITLES, sealCode: code });
    const html = renderToStaticMarkup(<AwakenedCard card={card} portraitConfig={cardBust(undefined)} pose="slash" prop="sword" />);
    expect(html).toContain('viewBox="0 0 1080 1350"');
    expect(html).toContain('Ana Sol');
    expect(html).toContain('Espadachim Iniciado');
    expect(html).toContain('Iniciado · ');
    expect(html).toContain('>Javali de<');
    expect(html).toContain('>Espinhos<');
    expect(html).toContain(wrapCode(code, 118)[0]);
    expect(html).not.toContain('var(--');
  });

  it('o retrato próprio fica fora da carta até o jogador marcar a opção', () => {
    const state = { ...swordsman(), character: { ...swordsman().character, portrait: { kind: 'custom' as const } } };
    const card = buildAwakenedCard({ state, rank: { rank: 'apprentice', title: 'Aprendiz de Espadachim' }, titles: TITLES });
    const html = renderToStaticMarkup(
      <AwakenedCardDialog open card={card} portrait={state.character.portrait} customSrc="data:image/png;base64,AAAA" onClose={() => undefined} />,
    );
    expect(html).toContain('Incluir meu retrato próprio na carta');
    expect(html).not.toContain('checked=""');
    expect(html).not.toContain('data:image/png;base64,AAAA');
    expect(html).toContain('Salvar imagem');
  });

  it('o texto compartilhado leva o Selo para quem quiser enfrentar o Eco', () => {
    const card = buildAwakenedCard({ state: swordsman(), rank: { rank: 'apprentice', title: 'Aprendiz de Espadachim' }, titles: TITLES, sealCode: 'ECO1.abc' });
    expect(shareText(card)).toContain('ECO1.abc');
    expect(shareText(card)).toContain('6 dias em Reset');
    expect(wrapCode('abcdefg', 3)).toEqual(['abc', 'def', 'g']);
  });
});
