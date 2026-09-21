import { describe, expect, it } from 'vitest';
import packManifest from '../../content/first-day/pack.json' with { type: 'json' };
import {
  ContentError,
  FIRST_DAY_SKILLS_RAW,
  PACK_FILE_KEYS,
  assembleFirstDayRaw,
  composeSkills,
  composeWorld,
  createMemorySource,
  createRemoteSource,
  loadFirstDayWorld,
  loadWorld,
} from '../modules/content';
import { inspectSkillsCatalog, indexSkillsCatalog, INITIAL_SKILLS } from '../modules/skills';
import { SCHEMA_VERSION } from '../core/state/types';

describe('pack de mundo e ContentSource', () => {
  it('indexa skills.json igual ao catálogo usado pelo jogo e rejeita JSON hostil', () => {
    const fromFile = JSON.parse(JSON.stringify(FIRST_DAY_SKILLS_RAW)) as unknown;
    expect(inspectSkillsCatalog(fromFile).ok).toBe(true);
    expect(indexSkillsCatalog(fromFile)).toEqual(INITIAL_SKILLS);
    expect(composeSkills(FIRST_DAY_SKILLS_RAW)).toEqual(INITIAL_SKILLS);
    expect(inspectSkillsCatalog({ paths: [], skills: [{ id: 1 }] }).ok).toBe(false);
    expect(() => composeSkills({ paths: 'nope' })).toThrow(ContentError);
  });

  it('compõe o pack first-day e falha com conteúdo adulterado', () => {
    const world = loadFirstDayWorld();
    expect(world.id).toBe('first-day');
    expect(world.startingLocationId).toBe('awakening-clearing');
    expect(world.skills.skillById.get('sharpened-senses')?.name).toBe('Sentidos Aguçados');
    expect(world.campaign.firstEventId).toBe('awakening');
    expect(world.npcs.factById.get('mira-seeks-water')?.locationHint).toBe(true);
    expect(world.presenceInteractions.byId.get('talk-mira-awakening-clearing')?.effects).toEqual([
      { type: 'npc.rememberFact', npcId: 'mira-vale', factId: 'mira-first-talk' },
      { type: 'npc.rememberFact', npcId: 'mira-vale', factId: 'mira-seeks-water' },
      { type: 'flag.set', flag: 'mira.promise.made', value: true },
    ]);
    expect(SCHEMA_VERSION).toBe(25);

    const hostile = structuredClone(assembleFirstDayRaw()) as { skills: { skills: unknown[] } };
    hostile.skills.skills = [];
    expect(() => composeWorld(hostile)).toThrow(ContentError);
  });

  it('troca o nome no JSON sem alterar o motor', () => {
    const raw = structuredClone(assembleFirstDayRaw()) as {
      skills: { skills: Array<{ id: string; name: string }> };
    };
    const skill = raw.skills.skills.find((entry) => entry.id === 'sharpened-senses');
    expect(skill).toBeDefined();
    skill!.name = 'Percepção Alterada';
    const world = composeWorld(raw, 'memory:renamed');
    expect(world.skills.skillById.get('sharpened-senses')?.name).toBe('Percepção Alterada');
    expect(INITIAL_SKILLS.skillById.get('sharpened-senses')?.name).toBe('Sentidos Aguçados');
  });

  it('a fonte remota reusa o mesmo composeWorld', async () => {
    const assembled = assembleFirstDayRaw() as Record<string, unknown>;
    const files = new Map<string, unknown>([['https://pack.test/pack.json', packManifest]]);
    for (const key of PACK_FILE_KEYS) {
      files.set(`https://pack.test/${packManifest.files[key]}`, assembled[key]);
    }

    const source = createRemoteSource({
      id: 'remote:first-day',
      packUrl: 'https://pack.test/pack.json',
      fetchImpl: async (input) => {
        const url = String(input);
        const body = files.get(url);
        if (body === undefined) {
          return new Response('missing', { status: 404 });
        }
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
    });

    const world = await loadWorld(source);
    expect(world.sourceId).toBe('remote:first-day');
    expect(world.skills).toEqual(loadFirstDayWorld().skills);
    expect(loadWorld(createMemorySource('memory:first-day', assembleFirstDayRaw()))).toMatchObject({
      id: 'first-day',
      sourceId: 'memory:first-day',
    });
  });
});
