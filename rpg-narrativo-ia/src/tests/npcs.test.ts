import { describe, expect, it } from 'vitest';
import {
  INITIAL_NPCS,
  INITIAL_NPC_CATALOG,
  NpcError,
  createInitialNpcsState,
  deriveNpcAt,
  inspectNpcCatalog,
  inspectNpcsState,
  rememberNpcFact,
} from '../modules/npcs';

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
    expect(nightUnknownPlace?.locationId).toBe('');
    expect(nightUnknownPlace?.availability).toBe('hidden');
  });

  it('rejeita overrides forjados e mantém os índices imutáveis', () => {
    const known = rememberNpcFact(INITIAL_NPCS, createInitialNpcsState(), 'mira-vale', 'mira-first-talk');
    expect(
      inspectNpcsState({
        entries: [{ ...known.entries[0], locationOverrideId: 'ghost-place' }],
      }).ok,
    ).toBe(false);
    expect(
      inspectNpcsState({
        entries: [{ ...known.entries[0], scheduleOverrideId: 'ghost-schedule' }],
      }).ok,
    ).toBe(false);
    expect(() => (INITIAL_NPCS.npcById as Map<string, never>).clear()).toThrow(NpcError);
  });

  it('rejeita agenda padrão pertencente a outro NPC', () => {
    const catalog = {
      ...structuredClone(INITIAL_NPC_CATALOG),
      npcs: [
        ...INITIAL_NPC_CATALOG.npcs,
        {
          id: 'impostor',
          entityId: 'impostor-entity',
          name: 'Impostor',
          defaultScheduleId: INITIAL_NPC_CATALOG.npcs[0].defaultScheduleId,
        },
      ],
    };
    expect(inspectNpcCatalog(catalog, new Set(INITIAL_NPCS.locationIds)).ok).toBe(false);
  });
});
