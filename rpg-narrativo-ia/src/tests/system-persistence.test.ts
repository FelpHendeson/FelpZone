import { describe, expect, it } from 'vitest';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import { INITIAL_SKILLS, createInitialSkillsProgress } from '../modules/skills';
import { asV1, asV2, asV3, asV4, asV5, asV6, freshState } from './helpers';

const baseline = createInitialSkillsProgress(INITIAL_SKILLS);

function withProgress(state: GameState): GameState {
  const first = INITIAL_SKILLS.skills[0];
  return { ...state, system: { level: 2, entries: [{ skillId: first.id, proficiency: 3 }] } };
}

describe('Fatia 11.2 — schema 7 e progressão persistida', () => {
  it('novas partidas começam no schema 7 com o estado de progressão de base', () => {
    const state = freshState();
    expect(SCHEMA_VERSION).toBe(25);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.system).toEqual(baseline);
  });

  it('preserva o progresso do Sistema em uma volta completa de serialização', () => {
    const raw = serializeGameState(withProgress(freshState()));
    const loaded = parseGameState(raw);

    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      const first = INITIAL_SKILLS.skills[0];
      expect(loaded.state.system).toEqual({ level: 2, entries: [{ skillId: first.id, proficiency: 3 }] });
    }
  });

  it('rejeita um save schema 7 sem o estado de progressão', () => {
    const raw = JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
    delete raw.system;
    const loaded = parseGameState(JSON.stringify(raw));
    expect(loaded.status).toBe('corrupt');
  });

  it('rejeita um save schema 6 que já traga o contrato do schema 7', () => {
    const raw = JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
    raw.schemaVersion = 6;
    const loaded = parseGameState(JSON.stringify(raw));
    expect(loaded.status).toBe('corrupt');
  });

  it.each([
    ['v1', asV1],
    ['v2', asV2],
    ['v3', asV3],
    ['v4', asV4],
    ['v5', asV5],
    ['v6', asV6],
  ] as const)('migra um save %s concedendo apenas o estado de base, sem progresso', (_label, downgrade) => {
    const raw = JSON.stringify(downgrade(freshState()));
    const loaded = parseGameState(raw);

    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.system).toEqual(baseline);
    }
  });
});
