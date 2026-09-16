import { describe, expect, it } from 'vitest';
import { INITIAL_NPCS, createInitialNpcsState, deriveNpcAt, rememberNpcFact } from '../modules/npcs';

describe('Fatias 17.1 a 17.3 — NPCs persistentes', () => {
  it('não deriva Mira desconhecida', () => {
    expect(
      deriveNpcAt(INITIAL_NPCS, createInitialNpcsState(), 'mira-vale', 'manha', () => true),
    ).toBeNull();
  });

  it('deriva localização por período e guarda fatos sem duplicar', () => {
    const known = rememberNpcFact(INITIAL_NPCS, createInitialNpcsState(), 'mira-vale', 'mira-first-talk');
    const withHint = rememberNpcFact(INITIAL_NPCS, known, 'mira-vale', 'mira-seeks-water');
    const again = rememberNpcFact(INITIAL_NPCS, withHint, 'mira-vale', 'mira-seeks-water');
    expect(withHint.entries[0].memoryFactIds).toEqual(['mira-first-talk', 'mira-seeks-water']);
    expect(again.entries[0].memoryFactIds).toEqual(['mira-first-talk', 'mira-seeks-water']);

    const morning = deriveNpcAt(INITIAL_NPCS, withHint, 'mira-vale', 'manha', (id) => id === 'spring-lake');
    expect(morning).toMatchObject({
      locationId: 'spring-lake',
      presence: 'present-available',
      hint: 'Costuma buscar água pela manhã.',
    });

    const nightUnknownPlace = deriveNpcAt(INITIAL_NPCS, withHint, 'mira-vale', 'noite', () => false);
    expect(nightUnknownPlace?.presence).toBe('absent');
    expect(nightUnknownPlace?.locationId).toBe('awakening-clearing');
  });
});
