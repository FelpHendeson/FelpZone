import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INITIAL_COMBAT, createCombat } from '../modules/combat';
import { CombatScreen } from '../ui/screens/CombatScreen';

function render(knownSkillIds: string[]) {
  const initialState = createCombat(INITIAL_COMBAT, 'clearing-predator', {
    playerName: 'Ana Sol',
    knownSkillIds,
  });
  return renderToStaticMarkup(
    <CombatScreen initialState={initialState} encounterName="Predador Arisco" onFinish={() => undefined} />,
  );
}

describe('Fatia 12.5 — superfície de combate', () => {
  it('apresenta combatentes, vidas e ações base com a opção de fugir', () => {
    const html = render([]);
    expect(html).toContain('Predador Arisco');
    expect(html).toContain('Ana Sol');
    expect(html).toContain('20/20');
    expect(html).toContain('18/18');
    expect(html).toContain('Golpe');
    expect(html).toContain('Postura Defensiva');
    expect(html).toContain('Fugir');
  });

  it('mostra ações liberadas por habilidades conhecidas do Sistema 11', () => {
    const html = render(['sharpened-senses']);
    expect(html).toContain('Golpe Preciso');
  });

  it('oculta ações de habilidades ainda não conhecidas', () => {
    const html = render([]);
    expect(html).not.toContain('Golpe Preciso');
  });
});
