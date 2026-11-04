import { describe, expect, it } from 'vitest';
import { advanceLife, populateWorld, type Creature } from './creatures';
import { createWorld, type World } from './world';
import { emptyDeeds, EVOLUTION, evolutionFor, learnSkills, modifiers, skillById, skillProgress, skills } from './skills';
import { advanceSocialLife } from './social';

const folhim = (overrides: Partial<Creature> = {}): Creature => ({ ...populateWorld(createWorld('habilidades', 16), 1).life.creatures[0], ...overrides });
const withDeeds = (deeds: Partial<Creature['deeds']>, overrides: Partial<Creature> = {}) => folhim({ deeds: { ...emptyDeeds(), ...deeds }, ...overrides });

describe('habilidades declaradas', () => {
  it('cada habilidade tem identidade única, requisitos e texto', () => {
    expect(new Set(skills.map(s => s.id)).size).toBe(skills.length);
    for (const s of skills) {
      expect(Object.keys(s.needs).length).toBeGreaterThan(0);
      expect(s.name && s.effect && s.lore).toBeTruthy();
    }
    expect(skills.some(s => s.rarity === 'única')).toBe(true);
  });
  it('conquista ao atingir o limiar, uma única vez', () => {
    const c = withDeeds({ walked: 1199 });
    expect(learnSkills(c)).toEqual([]);
    c.deeds.walked = 1200;
    expect(learnSkills(c).map(s => s.id)).toEqual(['passo-leve']);
    expect(learnSkills(c)).toEqual([]);
    expect(c.skills).toEqual(['passo-leve']);
  });
  it('habilidades da essência exigem um Folhim desperto e todos os requisitos', () => {
    const asleep = withDeeds({ nearSourceDays: 200, walked: 2000 });
    expect(learnSkills(asleep).map(s => s.id)).toEqual(['passo-leve']);
    const awake = withDeeds({ nearSourceDays: 200, walked: 1000 }, { awakenedDay: 10 });
    expect(learnSkills(awake).map(s => s.id)).toEqual(['elo-da-nascente']);
    expect(skillProgress(awake, skillById('sentido-desperto')!)).toBeCloseTo(1000 / 1500);
  });
});

describe('efeitos das habilidades', () => {
  it('mudam visão, custo de andar, gasto diário, disputas e afinidade', () => {
    const plain = folhim({ vision: 3, affinity: 0.5 });
    const skilled = folhim({ vision: 3, affinity: 0.5, skills: ['faro-de-agua', 'passo-leve', 'estomago-firme', 'pelagem-de-inverno', 'couro-grosso', 'garra-de-bando', 'elo-da-nascente', 'sentido-desperto'] });
    expect(modifiers.vision(plain, true)).toBe(3);
    expect(modifiers.vision(skilled, false)).toBe(5);
    expect(modifiers.vision(skilled, true)).toBe(6);
    expect(modifiers.moveCost(skilled)).toBeCloseTo(modifiers.moveCost(plain) / 2);
    expect(modifiers.upkeep(skilled, false)).toBeCloseTo(0.88);
    expect(modifiers.upkeep(skilled, true)).toBeCloseTo(0.88 * 0.8);
    expect(modifiers.disputeCost(skilled)).toBe(3);
    expect(modifiers.disputeStrength(skilled)).toBeGreaterThan(modifiers.disputeStrength(plain));
    expect(modifiers.affinity(skilled)).toBeCloseTo(0.75);
    expect(modifiers.affinity(folhim({ affinity: 0.95, skills: ['elo-da-nascente'] }))).toBe(1);
  });
  it('Couro Grosso reduz o custo real de uma disputa', () => {
    const world = populateWorld(createWorld('origem-001', 16), 2);
    const base: World = { ...world, day: 30, cells: world.cells.map(c => ({ ...c, terrain: 'grass', vegetation: { grass: 0, shrubs: 0, trees: 0, fruit: 0, litter: 0 }, food: 0 })) };
    const fight = (skillsOf: string[]) => {
      for (let day = 30; day < 400; day++) {
        const w: World = { ...base, day, life: { ...base.life, bands: base.life.bands.map(b => ({ ...b, updatedDay: day })), creatures: base.life.creatures.map((c, i) => ({ ...c, x: 5, y: 5, age: 40, energy: 50, temperament: i ? 0 : 1, lastConflictDay: -100, bandId: i ? 2 : 1, skills: skillsOf })) } };
        const after = advanceSocialLife(w).life.creatures;
        if (after.some(c => c.action === 'disputing')) return 50 - after[1].energy;
      }
      return null;
    };
    expect(fight([])).toBe(6);
    expect(fight(['couro-grosso'])).toBe(3);
  });
});

describe('feitos e evolução', () => {
  it('o motor conta passos, alimento e dias em essência forte', () => {
    const world = populateWorld(createWorld('origem-001'));
    const rich = { ...world, tick: 0, cells: world.cells.map(c => ({ ...c, essence: 0.9 })) };
    const next = advanceLife(rich, 1);
    const moved = next.life.creatures.filter(c => c.deeds.walked > 0).length, grazed = next.life.creatures.filter(c => c.deeds.grazed > 0).length;
    expect(moved + grazed).toBeGreaterThan(0);
    expect(next.life.creatures.every(c => c.deeds.nearSourceDays === 1)).toBe(true);
    expect(world.life.creatures.every(c => c.deeds.nearSourceDays === 0)).toBe(true);
  });
  it('escolhe a forma pelo caminho das habilidades e exige despertar e essência', () => {
    const ready = { awakenedDay: 5, essence: EVOLUTION.essence };
    expect(evolutionFor(folhim({ ...ready, skills: ['estomago-firme', 'couro-grosso', 'elo-da-nascente'] }))).toBe('guardiao');
    expect(evolutionFor(folhim({ ...ready, skills: ['faro-de-agua', 'passo-leve', 'elo-da-nascente'] }))).toBe('errante');
    expect(evolutionFor(folhim({ ...ready, skills: ['elo-da-nascente', 'sentido-desperto', 'passo-leve'] }))).toBe('vidente');
    expect(evolutionFor(folhim({ ...ready, skills: ['passo-leve', 'elo-da-nascente', 'estomago-firme'] }))).toBe('guardiao');
    expect(evolutionFor(folhim({ ...ready, awakenedDay: null, skills: ['estomago-firme', 'couro-grosso', 'garra-de-bando'] }))).toBeNull();
    expect(evolutionFor(folhim({ ...ready, essence: EVOLUTION.essence - 1, skills: ['estomago-firme', 'couro-grosso', 'garra-de-bando'] }))).toBeNull();
    expect(evolutionFor(folhim({ ...ready, form: 'guardiao', skills: ['estomago-firme', 'couro-grosso', 'garra-de-bando'] }))).toBeNull();
  });
  it('evoluir registra o acontecimento, prolonga a vida e acontece uma vez', () => {
    let world = populateWorld(createWorld('origem-001'));
    const id = world.life.creatures[0].id, lifespan = world.life.creatures[0].lifespan;
    world = { ...world, tick: 0, life: { ...world.life, creatures: world.life.creatures.map(c => c.id === id ? { ...c, awakenedDay: 0, essence: 95, deeds: { ...emptyDeeds(), walked: 5000, droughtDays: 100, nearSourceDays: 10 } } : c) } };
    const evolved = advanceLife(world, 1);
    const c = evolved.life.creatures.find(x => x.id === id)!;
    expect(c.skills).toEqual(['faro-de-agua', 'passo-leve']);
    expect(c.form).toBe('folhim');
    const third = advanceLife({ ...evolved, life: { ...evolved.life, creatures: evolved.life.creatures.map(x => x.id === id ? { ...x, deeds: { ...x.deeds, grazed: 100 } } : x) } }, 1);
    const done = third.life.creatures.find(x => x.id === id)!;
    expect(done.form).toBe('errante');
    expect(done.lifespan).toBe(lifespan + EVOLUTION.extraLife);
    expect(third.life.events.filter(e => e.kind === 'evolution' && e.creatureId === id)).toHaveLength(1);
    expect(third.life.events.filter(e => e.kind === 'skill' && e.creatureId === id)).toHaveLength(3);
    const later = advanceLife(third, 1);
    expect(later.life.events.filter(e => e.kind === 'evolution' && e.creatureId === id)).toHaveLength(1);
  });
});
