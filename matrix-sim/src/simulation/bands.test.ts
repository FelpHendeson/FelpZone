import { describe, expect, it } from 'vitest';
import { adaptBand, bandProfile, bandStrength, learnFromConflict } from './bands';
import { populateWorld } from './creatures';
import { advanceWorld, createWorld, type World } from './world';
import { buildTerritories, territoryKey } from './territories';

function prepare(): World {
  const original = populateWorld(createWorld('bandos', 16), 10);
  return { ...original, cells: original.cells.map(c => ({ ...c, terrain: 'grass' as const })),
    life: { ...original.life, bands: original.life.bands.map((b, i) => ({ ...b, home: 7 * 16 + 4 + i * 4 })) } };
}

describe('territórios', () => {
  it('mostra presença limitada, áreas compartilhadas e desempate reproduzível', () => {
    const world = prepare(), before = JSON.stringify(world);
    const map = buildTerritories(world);
    expect(map.areas.size).toBe(2);
    expect(map.owners.some(owner => owner === 0)).toBe(true);
    expect(map.contested.some(Boolean)).toBe(true);
    expect(map.owners[7 * 16 + 6]).toBe(1);
    expect(buildTerritories({ ...world, life: { ...world.life, bands: [...world.life.bands].reverse() } })).toEqual(map);
    expect(JSON.stringify(world)).toBe(before);
  });
  it('não atravessa água ou montanhas, nem deixa influência de bando extinto', () => {
    let world = prepare();
    world = { ...world, life: { ...world.life, bands: [world.life.bands[0]], creatures: world.life.creatures.filter(c => c.bandId === 1) },
      cells: world.cells.map(c => c.x === 6 ? { ...c, terrain: c.y % 2 ? 'water' : 'mountain' } : c) };
    const map = buildTerritories(world);
    expect(world.cells.every((c, i) => c.x < 6 || map.owners[i] === 0)).toBe(true);
    expect(map.owners.some(Boolean)).toBe(true);
    const extinct = { ...world, life: { ...world.life, creatures: [] } };
    expect(buildTerritories(extinct).owners.every(owner => owner === 0)).toBe(true);
    expect(territoryKey(extinct)).not.toBe(territoryKey(world));
  });
  it('muda com a migração e o tamanho, sem recalcular por energia ou animação', () => {
    const world = prepare();
    const moved = { ...world, life: { ...world.life, bands: world.life.bands.map(b => ({ ...b, home: b.home + 16 })) } };
    expect(territoryKey(moved)).not.toBe(territoryKey(world));
    expect(buildTerritories(moved).owners).not.toEqual(buildTerritories(world).owners);
    const same = { ...world, life: { ...world.life, creatures: world.life.creatures.map(c => ({ ...c, energy: 80, moving: true })) } };
    expect(territoryKey(same)).toBe(territoryKey(world));
  });
});

describe('tendências dos bandos', () => {
  it('distingue ataque, defesa e o apoio de aliados no resultado das disputas', () => {
    const b = prepare().life.bands[0];
    expect(bandStrength({ ...b, attack: 0.9 }, false, 0)).toBeGreaterThan(bandStrength({ ...b, attack: 0.1 }, false, 0));
    expect(bandStrength({ ...b, defense: 0.9 }, true, 0)).toBeGreaterThan(bandStrength({ ...b, defense: 0.1 }, true, 0));
    expect(bandStrength(b, true, 3)).toBeGreaterThan(bandStrength(b, true, 0));
    expect(bandProfile({ ...b, attack: 0.2, defense: 0.8 })).toBe('Defensivo');
    expect(bandProfile({ ...b, attack: 0.8, defense: 0.2 })).toBe('Ousado');
  });
  it('vitórias favorecem ousadia e derrotas favorecem defesa, união e mudança de perfil', () => {
    const source = prepare().life.bands[0];
    const winner = { ...source, attack: 0.5, defense: 0.5 }, loser = { ...winner };
    for (let i = 0; i < 12; i++) { learnFromConflict(winner, true, true); learnFromConflict(loser, false, false); }
    expect(winner.attack).toBeGreaterThan(0.5);
    expect(winner.aggression).toBeGreaterThan(source.aggression);
    expect(loser.defense).toBeGreaterThan(winner.defense);
    expect(loser.cohesion).toBeGreaterThan(source.cohesion);
    expect(winner.wins).toBe(12); expect(loser.losses).toBe(12);
    expect(bandProfile(loser)).toBe('Defensivo');
  });
  it('adapta-se uma vez por dia e ancora a área num integrante vivo', () => {
    const world = prepare(), b = { ...world.life.bands[0] };
    const members = world.life.creatures.filter(c => c.bandId === b.id).map(c => ({ ...c, x: 12, y: 12, temperament: 1 }));
    adaptBand({ ...world, day: 1 }, b, members);
    expect(b.home).toBe(12 * 16 + 12);
    const after = { ...b };
    adaptBand({ ...world, day: 1 }, b, members);
    expect(b).toEqual(after);
    for (let day = 2; day < 100; day++) adaptBand({ ...world, day }, b, members);
    expect(b.attack).toBeGreaterThan(after.attack);
    expect([b.attack, b.defense, b.cohesion, b.aggression].every(n => n >= 0.1 && n <= 0.95)).toBe(true);
  });
  it('preserva tendências e áreas ao salvar e reproduzir os mesmos dias', () => {
    const world = populateWorld(createWorld('origem-001', 16));
    const snapshot = advanceWorld(world, 4);
    expect(advanceWorld(JSON.parse(JSON.stringify(snapshot)), 4)).toEqual(advanceWorld(world, 8));
    expect(world.life.bands.every(b => b.wins === 0 && b.losses === 0 && b.updatedDay === 0)).toBe(true);
  });
});
