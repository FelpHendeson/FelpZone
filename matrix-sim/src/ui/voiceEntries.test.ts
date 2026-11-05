import { describe, expect, it } from 'vitest';
import { populateWorld, type LifeEvent } from '../simulation/creatures';
import { createWorld, type World } from '../simulation/world';
import { chronicleChanges, newAnnouncements, voiceFeed, worldGenesis } from './voiceEntries';

const base = () => populateWorld(createWorld('voz-001', 16), 10);
const event = (day: number, kind: LifeEvent['kind'], text: string, creatureId = 1): LifeEvent => ({ day, kind, creatureId, text });

describe('voz do mundo', () => {
  it('anuncia a troca de estação e bandos que desaparecem, sem repetir no mesmo estado', () => {
    const world = { ...base(), day: 89 };
    const firstBand = world.life.bands[0].id;
    const next: World = { ...world, day: 90, life: { ...world.life, creatures: world.life.creatures.filter(c => c.bandId !== firstBand) } };
    const entries = chronicleChanges(world, next);
    expect(entries.map(e => e.kind)).toEqual(['season', 'extinction']);
    expect(entries[0].text).toBe('Começou o Verão do ano 1.');
    expect(entries[1].text).toContain(world.life.bands[0].name);
    expect(chronicleChanges(next, next)).toEqual([]);
    expect(chronicleChanges(world, { ...next, seed: 'outro' })).toEqual([]);
  });
  it('ordena do mais recente ao mais antigo e mistura eventos com a crônica', () => {
    const feed = voiceFeed([event(1, 'birth', 'a'), event(3, 'death', 'b')], [{ key: 's', kind: 'season', day: 2, text: 'c', creatureId: null }]);
    expect(feed.map(e => e.text)).toEqual(['b', 'c', 'a']);
    expect(voiceFeed([event(1, 'birth', 'x'), event(1, 'birth', 'y')], []).map(e => e.text)).toEqual(['y', 'x']);
    expect(voiceFeed(Array.from({ length: 50 }, (_, i) => event(i, 'birth', `${i}`)), [], 5)).toHaveLength(5);
  });
  it('narra a gênese passo a passo: as Regras, cada deus na ordem deste mundo e a primeira espécie', () => {
    const world = base();
    const genesis = worldGenesis(world);
    expect(genesis.map(e => e.kind)).toEqual(Array(7).fill('genesis'));
    expect(genesis[0].text).toContain('Regras da Existência');
    expect(genesis.at(-1)!.text).toContain('Verdanthe');
    expect(genesis.at(-1)!.text).toContain('Folhins');
    const essence = genesis.find(e => e.text.startsWith('Aurenth'))!;
    expect(essence.text).toContain(`${world.essenceSources.length} nascentes`);
    for (const s of world.essenceSources) expect(essence.text).toContain(s.name);
    expect(new Set(genesis.map(e => e.key)).size).toBe(7);
    expect(voiceFeed([], genesis)[0]).toEqual(genesis.at(-1));
    expect(newAnnouncements(null, world, genesis).at(-1)).toEqual(genesis.at(-1));
  });
  it('anuncia só os atos divinos raros: dar um nome, não abençoar', () => {
    const world = base();
    const after = { ...world, life: { ...world.life, events: [...world.life.events, event(1, 'divine', 'Kaltor abençoou as terras ao redor de sua morada.', 0), event(1, 'divine', 'Aurenth deu o nome Orul ao Folhim #6.', 6)] } };
    expect(newAnnouncements(world, after, []).map(e => e.text)).toEqual(['Aurenth deu o nome Orul ao Folhim #6.']);
  });
  it('destaca apenas acontecimentos marcantes que ainda não existiam', () => {
    const world = base();
    const old = event(0, 'leadership', 'antigo');
    const before = { ...world, life: { ...world.life, events: [old] } };
    const after = { ...before, life: { ...before.life, events: [old, event(1, 'birth', 'filhote'), event(1, 'culture', 'mudou')] } };
    expect(newAnnouncements(before, after, []).map(e => e.text)).toEqual(['mudou']);
    expect(newAnnouncements(before, { ...after, seed: 'outro' }, []).map(e => e.text)).toEqual(['antigo', 'mudou']);
    expect(newAnnouncements(null, world, []).map(e => e.kind)).toEqual(['arrival']);
  });
});
