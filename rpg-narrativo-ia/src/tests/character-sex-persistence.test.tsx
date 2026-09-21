import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { startGame } from '../core/engine';
import { SCHEMA_VERSION, SCHEMA_VERSION_V23 } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { CreateCharacterScreen } from '../ui/screens/CreateCharacterScreen';
import { now } from './helpers';

describe('sexo do personagem no schema 24', () => {
  it.each(['male', 'female'] as const)('preserva %s em nova partida e persistência', (sex) => {
    const state = startGame({ firstName: 'Lia', lastName: 'Nunes', sex }, firstDayCampaign, now);

    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.character.sex).toBe(sex);
    expect(parseGameState(serializeGameState(state))).toEqual({ status: 'ok', state });
  });

  it('migra schema 23 sem inferir sexo pelo nome', () => {
    const current = startGame(
      { firstName: 'Alex', lastName: 'Silva', sex: 'female' },
      firstDayCampaign,
      now,
    );
    const legacy = JSON.parse(serializeGameState(current)) as Record<string, unknown>;
    legacy.schemaVersion = SCHEMA_VERSION_V23;
    const character = legacy.character as Record<string, unknown>;
    delete character.sex;

    const parsed = parseGameState(JSON.stringify(legacy));

    expect(parsed.status).toBe('ok');
    if (parsed.status === 'ok') {
      expect(parsed.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(parsed.state.character).toEqual({
        firstName: 'Alex',
        lastName: 'Silva',
        sex: 'unspecified',
      });
    }
  });

  it('rejeita schema atual sem sexo ou com valor desconhecido', () => {
    const state = startGame({ firstName: 'Ana', lastName: 'Cruz', sex: 'female' }, firstDayCampaign, now);
    const missing = JSON.parse(serializeGameState(state)) as Record<string, unknown>;
    const invalid = JSON.parse(serializeGameState(state)) as Record<string, unknown>;

    delete (missing.character as Record<string, unknown>).sex;
    (invalid.character as Record<string, unknown>).sex = 'other';

    expect(parseGameState(JSON.stringify(missing)).status).toBe('corrupt');
    expect(parseGameState(JSON.stringify(invalid)).status).toBe('corrupt');
  });

  it('apresenta as duas escolhas na criação de personagem', () => {
    const html = renderToStaticMarkup(
      <CreateCharacterScreen onBack={() => undefined} onConfirm={() => undefined} />,
    );

    expect(html).toContain('name="sex"');
    expect(html).toContain('value="male"');
    expect(html).toContain('Masculino');
    expect(html).toContain('value="female"');
    expect(html).toContain('Feminino');
  });
});
