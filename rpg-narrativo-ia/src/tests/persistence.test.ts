import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../core/state';
import { firstDayCampaign } from '../campaigns/first-day';
import { startGame } from '../core/engine';
import {
  createMemoryPersistence,
  parseGameState,
  serializeGameState,
} from '../infrastructure/persistence';
import { freshState, now, serializedState } from './helpers';

function parseMutated(mutate: (raw: Record<string, unknown>) => void) {
  const raw = serializedState();
  mutate(raw);
  return parseGameState(JSON.stringify(raw));
}

const malformedCases: Array<[string, (raw: Record<string, unknown>) => void]> = [
  ['atributo ausente', (raw) => {
    const attributes = raw.attributes as Record<string, unknown>;
    delete attributes.saude;
  }],
  ['atributo não numérico', (raw) => {
    const attributes = raw.attributes as Record<string, unknown>;
    attributes.saude = '80';
  }],
  ['atributo fora do intervalo', (raw) => {
    const attributes = raw.attributes as Record<string, unknown>;
    attributes.energia = 140;
  }],
  ['identidade incompleta', (raw) => {
    raw.character = { firstName: 'Ana' };
  }],
  ['nome vazio', (raw) => {
    const character = raw.character as Record<string, unknown>;
    character.lastName = '';
  }],
  ['status inválido', (raw) => {
    raw.status = 'paused';
  }],
  ['evento atual vazio', (raw) => {
    raw.currentEventId = '';
  }],
  ['item sem quantidade', (raw) => {
    raw.inventory = [{ itemId: 'agua-limpa' }];
  }],
  ['item com quantidade zero', (raw) => {
    raw.inventory = [{ itemId: 'agua-limpa', quantity: 0 }];
  }],
  ['item com quantidade fracionária', (raw) => {
    raw.inventory = [{ itemId: 'agua-limpa', quantity: 1.5 }];
  }],
  ['item com quantidade insegura', (raw) => {
    raw.inventory = [{ itemId: 'agua-limpa', quantity: Number.MAX_SAFE_INTEGER + 1 }];
  }],
  ['itens duplicados', (raw) => {
    raw.inventory = [
      { itemId: 'agua-limpa', quantity: 1 },
      { itemId: 'agua-limpa', quantity: 2 },
    ];
  }],
  ['relação com confiança inválida', (raw) => {
    raw.relationships = [{ characterId: 'mira-vale', trust: 'alta' }];
  }],
  ['relações duplicadas', (raw) => {
    raw.relationships = [
      { characterId: 'mira-vale', trust: 10 },
      { characterId: 'mira-vale', trust: 20 },
    ];
  }],
  ['flag não booleana', (raw) => {
    raw.flags = { 'ability.olhar-atento': 1 };
  }],
  ['histórico incompleto', (raw) => {
    raw.history = [{ eventId: 'awakening' }];
  }],
  ['período inválido', (raw) => {
    const world = raw.world as Record<string, unknown>;
    world.period = 'madrugada';
  }],
  ['dia inválido', (raw) => {
    const world = raw.world as Record<string, unknown>;
    world.day = 0;
  }],
  ['capacidades duplicadas', (raw) => {
    const progression = raw.progression as Record<string, unknown>;
    progression.abilityIds = ['olhar-atento', 'olhar-atento'];
    progression.titleIds = [];
  }],
  ['títulos duplicados', (raw) => {
    const progression = raw.progression as Record<string, unknown>;
    progression.abilityIds = [];
    progression.titleIds = ['despertar', 'despertar'];
  }],
  ['data de atualização inválida', (raw) => {
    raw.updatedAt = 'ontem';
  }],
];

describe('persistência', () => {
  it('salva e carrega o mesmo estado, incluindo schemaVersion', () => {
    const state = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
    const storage = createMemoryPersistence();

    storage.save(state);
    const loaded = storage.load();

    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded).toEqual({ status: 'ok', state });
  });

  it('serializa um estado que pode ser relido integralmente', () => {
    const state = startGame({ firstName: 'Lia', lastName: 'Nunes' }, firstDayCampaign, now);
    const parsed = parseGameState(serializeGameState(state));

    expect(parsed).toEqual({ status: 'ok', state });
  });

  it('falha de forma controlada quando a versão do esquema é incompatível', () => {
    const parsed = parseGameState(JSON.stringify({ schemaVersion: 99, character: { firstName: 'Ana' } }));
    const storage = createMemoryPersistence(JSON.stringify({ schemaVersion: 0 }));

    expect(parsed).toEqual({ status: 'incompatible', foundVersion: 99 });
    expect(storage.load()).toEqual({ status: 'incompatible', foundVersion: 0 });
  });

  it('trata salvamento vazio, corrompido e limpeza', () => {
    expect(parseGameState('')).toEqual({ status: 'empty' });
    expect(parseGameState('{')).toEqual({ status: 'corrupt', reason: 'O salvamento não pôde ser lido.' });

    const storage = createMemoryPersistence();
    storage.save(startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now));
    storage.clear();

    expect(storage.load()).toEqual({ status: 'empty' });
  });

  it('rejeita como corrupt um save com schema atual e campos internos incompletos', () => {
    const incomplete = {
      schemaVersion: SCHEMA_VERSION,
      status: 'playing',
      character: { firstName: 'Ana', lastName: 'Cruz' },
      currentEventId: 'awakening',
      attributes: {},
      inventory: [],
      relationships: [],
      flags: {},
      history: [],
      world: {},
      progression: {},
      updatedAt: now(),
    };

    const parsed = parseGameState(JSON.stringify(incomplete));
    expect(parsed.status).toBe('corrupt');
    if (parsed.status === 'corrupt') {
      expect(parsed.reason.length).toBeGreaterThan(0);
    }
  });

  it('não lança erro ao ler JSON malformado ou tipos inesperados', () => {
    expect(() => parseGameState('null')).not.toThrow();
    expect(() => parseGameState('[]')).not.toThrow();
    expect(() => parseGameState('true')).not.toThrow();
    expect(parseGameState('null').status).toBe('corrupt');
    expect(parseGameState('[]').status).toBe('corrupt');
    expect(parseGameState('true').status).toBe('corrupt');
  });

  it.each(malformedCases)('retorna corrupt quando %s', (_label, mutate) => {
    const parsed = parseMutated(mutate);
    expect(parsed.status).toBe('corrupt');
  });

  it('preserva um estado jogável válido com inventário, relação e histórico', () => {
    const state = freshState();
    const rich: typeof state = {
      ...state,
      inventory: [{ itemId: 'agua-limpa', quantity: 1 }],
      relationships: [{ characterId: 'mira-vale', trust: 12 }],
      flags: { 'sought.water': true },
      history: [
        {
          eventId: 'awakening',
          eventTitle: 'Despertar',
          choiceId: 'awake-calm',
          choiceLabel: 'Levantar com calma e observar',
          notable: true,
        },
      ],
      progression: { abilityIds: ['olhar-atento'], titleIds: [] },
    };

    expect(parseGameState(serializeGameState(rich))).toEqual({ status: 'ok', state: rich });
  });

  it('rejeita a serialização de um estado atual inválido', () => {
    const state = freshState();
    const invalid = {
      ...state,
      sandbox: {
        ...state.sandbox,
        navigation: {
          ...state.sandbox.navigation,
          currentLocationId: 'lugar-inexistente',
        },
      },
    };

    expect(() => serializeGameState(invalid)).toThrow('A localização atual precisa estar descoberta, desbloqueada e visitada.');
  });
});
