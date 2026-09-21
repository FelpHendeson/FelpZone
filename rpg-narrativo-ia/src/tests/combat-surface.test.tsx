import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INITIAL_COMBAT, createCombat, resolveTurn, type CombatState } from '../modules/combat';
import { INITIAL_ORGANIZATIONS } from '../modules/organizations';
import { INITIAL_PARTY, listCompanionOrderViews } from '../modules/party';
import { CombatScreen } from '../ui/screens/CombatScreen';
import { freshState } from './helpers';

function render(knownSkillIds: string[]) {
  const initialState = createCombat(INITIAL_COMBAT, 'clearing-predator', {
    playerName: 'Ana Sol',
    knownSkillIds,
  });
  return renderToStaticMarkup(
    <CombatScreen initialState={initialState} encounterName="Predador Arisco" combat={INITIAL_COMBAT} onFinish={() => undefined} />,
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
    expect(html).toContain('Centelha de Númen');
    expect(html).toContain('Númen 10/10');
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

  it('mostra aliados, o segundo oponente e as orientações de Mira no confronto coletivo', () => {
    const allies = [
      { id: 'mira-vale', name: 'Mira Vale', maxHealth: 16, health: 16, actionIds: ['attack', 'guard'] },
    ];
    const initialState = createCombat(INITIAL_COMBAT, 'clearing-pair', {
      playerName: 'Ana Sol',
      playerMaxHealth: 80,
      allies,
    });
    const html = renderToStaticMarkup(
      <CombatScreen
        initialState={initialState}
        encounterName="Predadores da Clareira"
        combat={INITIAL_COMBAT}
        orderViews={listCompanionOrderViews(
          INITIAL_PARTY,
          INITIAL_ORGANIZATIONS,
          {
            entries: [
              {
                id: 'clearing-party',
                typeId: 'party',
                members: [
                  { actorId: 'player', roleId: 'leader', membershipId: 'active' },
                  { actorId: 'mira-vale', roleId: 'companion', membershipId: 'active' },
                ],
              },
            ],
            consumedActionIds: ['propose-mira-party'],
          },
          {
            ...freshState(),
            flags: { 'clearing-party.formed': true },
            organizations: {
              entries: [
                {
                  id: 'clearing-party',
                  typeId: 'party',
                  members: [
                    { actorId: 'player', roleId: 'leader', membershipId: 'active' },
                    { actorId: 'mira-vale', roleId: 'companion', membershipId: 'active' },
                  ],
                },
              ],
              consumedActionIds: ['propose-mira-party'],
            },
          },
        )}
        onFinish={() => undefined}
      />,
    );
    expect(html).toContain('Predadores da Clareira');
    expect(html).toContain('Mira Vale');
    expect(html).toContain('Predador Menor');
    expect(html).toContain('Pedir que Mira ataque');
  });

  it('mostra o desfecho com a saúde preservada e o retorno ao mundo', () => {
    let state: CombatState = createCombat(INITIAL_COMBAT, 'clearing-predator', {
      playerName: 'Ana Sol',
      knownSkillIds: ['sharpened-senses'],
      playerMaxHealth: 80,
    });
    let safety = 0;
    while (state.outcome === 'ongoing' && safety < 50) {
      state = resolveTurn(INITIAL_COMBAT, state, 'focus-strike');
      safety += 1;
    }
    const html = renderToStaticMarkup(
      <CombatScreen initialState={state} encounterName="Predador Arisco" combat={INITIAL_COMBAT} onFinish={() => undefined} />,
    );
    expect(html).toContain('Vitória');
    expect(html).toContain('Saúde preservada');
    expect(html).toContain('Voltar ao mundo');
  });
});
