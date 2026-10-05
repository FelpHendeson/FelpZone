import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { startGame } from '../core/engine';
import { firstDayCampaign } from '../campaigns/first-day';
import { inspectGameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { INITIAL_ARCHETYPES, inspectArchetypeCatalog } from '../modules/archetypes';
import { INITIAL_COMBAT, createCombat } from '../modules/combat';
import { createEchoSeal, decodeEchoSeal, encodeEchoSeal } from '../modules/echoes';
import { buildCombatLoadout } from '../modules/equipment';
import { INITIAL_ITEMS } from '../modules/items';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { PortraitAvatar } from '../ui/components/PortraitAvatar';
import { Silhouette } from '../ui/components/Silhouette';
import { CreateCharacterScreen } from '../ui/screens/CreateCharacterScreen';
import { poseForAction, poseForSkill } from '../ui/silhouettes';
import archetypesJson from '../../content/first-day/system/archetypes.json' with { type: 'json' };
import { now } from './helpers';

function start(archetypeId?: string) {
  return startGame(
    { firstName: 'Ana', lastName: 'Cruz', sex: 'female', archetypeId, portrait: { kind: 'silhouette', skin: 2, hair: 3, hairColor: 4 } },
    firstDayCampaign,
    now,
  );
}

describe('Arquétipos de aprendiz', () => {
  it('o pack traz os cinco aprendizes', () => {
    expect(INITIAL_ARCHETYPES.archetypes.map((entry) => entry.name)).toEqual([
      'Aprendiz de Mago',
      'Aprendiz de Espadachim',
      'Aprendiz de Arqueiro',
      'Aprendiz de Assassino',
      'Aprendiz sem caminho definido',
    ]);
  });

  it('cada aprendiz desperta com o equipamento de assinatura equipado e a técnica no banco de combate', () => {
    const cases: [string, string, string][] = [
      ['apprentice-mage', 'living-branch-staff', 'numen-bolt'],
      ['apprentice-swordsman', 'chipped-stone-blade', 'twin-cut'],
      ['apprentice-archer', 'rustic-bow', 'aimed-shot'],
      ['apprentice-assassin', 'bone-dagger', 'shadow-strike'],
    ];
    for (const [archetypeId, itemId, actionId] of cases) {
      const state = start(archetypeId);
      expect(state.character.archetypeId).toBe(archetypeId);
      expect(state.inventory).toContainEqual({ itemId, quantity: 1 });
      expect(state.items.equipment['main-hand']).toBe(itemId);
      const portrait = buildCombatLoadout(INITIAL_ITEMS, state.items);
      const combat = createCombat(INITIAL_COMBAT, 'clearing-predator', { loadout: portrait.loadout });
      expect(combat.player.actionIds).toContain(actionId);
    }
  });

  it('técnicas de assinatura não aparecem para quem não tem o equipamento', () => {
    const plain = createCombat(INITIAL_COMBAT, 'clearing-predator');
    for (const actionId of ['numen-bolt', 'twin-cut', 'aimed-shot', 'shadow-strike']) {
      expect(plain.player.actionIds).not.toContain(actionId);
    }
  });

  it('o aprendiz sem caminho começa com mantimentos e nenhuma assinatura', () => {
    const state = start('apprentice-pathless');
    expect(state.items.equipment['main-hand']).toBeNull();
    expect(state.inventory).toEqual([
      { itemId: 'fruto-desconhecido', quantity: 2 },
      { itemId: 'agua-limpa', quantity: 1 },
    ]);
  });

  it('arquétipo e retrato persistem e sobrevivem às ações do mundo; saves antigos seguem válidos', () => {
    const state = start('apprentice-archer');
    expect(state.character.portrait).toEqual({ kind: 'silhouette', skin: 2, hair: 3, hairColor: 4 });
    expect(parseGameState(serializeGameState(state))).toEqual({ status: 'ok', state });
    const legacy = start();
    expect(legacy.character).toEqual({ firstName: 'Ana', lastName: 'Cruz', sex: 'female', portrait: { kind: 'silhouette', skin: 2, hair: 3, hairColor: 4 } });
    const tampered = { ...JSON.parse(serializeGameState(state)), character: { ...state.character, portrait: { kind: 'silhouette', skin: 99, hair: 0, hairColor: 0 } } };
    expect(parseGameState(JSON.stringify(tampered)).status).toBe('corrupt');
    expect(inspectGameState({ ...state, character: { ...state.character, portrait: { kind: 'custom' } } }).ok).toBe(true);
  });

  it('o catálogo recusa técnica de assinatura que não vem do equipamento inicial', () => {
    const broken = {
      archetypes: [{ ...INITIAL_ARCHETYPES.archetypes[0], signatureActionIds: ['twin-cut'] }],
    };
    expect(inspectArchetypeCatalog(broken).ok).toBe(false);
  });

  it('o Selo do Eco leva o arquétipo e a técnica de assinatura', () => {
    const seal = createEchoSeal(INITIAL_COMBAT, { name: 'Ana Cruz', knownSkillIds: [], archetypeId: 'apprentice-assassin' });
    expect(seal.archetypeId).toBe('apprentice-assassin');
    expect(seal.actionIds).toContain('shadow-strike');
    expect(decodeEchoSeal(encodeEchoSeal(seal), INITIAL_COMBAT)).toEqual({ ok: true, value: seal });
    const forged = encodeEchoSeal({ ...seal, archetypeId: undefined });
    expect(decodeEchoSeal(forged, INITIAL_COMBAT).ok).toBe(false);
  });

  it('a primeira ação do mundo preserva o arquétipo do personagem', () => {
    const state = start('apprentice-mage');
    const after = executeSandboxAction(state, { type: 'exploration.explore' }).current;
    expect(after.character).toEqual(state.character);
  });
});

describe('Silhuetas e retratos', () => {
  it('cada técnica tem uma pose: declarada no pack ou deduzida dos efeitos', () => {
    expect(poseForAction(INITIAL_COMBAT.actionById.get('aimed-shot')!)).toBe('shoot');
    expect(poseForAction(INITIAL_COMBAT.actionById.get('dodge')!)).toBe('dodge');
    expect(poseForSkill('sharpened-senses')).toBe('strike');
    expect(poseForSkill('inexistente')).toBe('stand');
  });

  it('desenha a silhueta e o retrato montável sem rosto, na cor do arquétipo', () => {
    const silhouette = renderToStaticMarkup(<Silhouette pose="cast" label="Seta de Númen" />);
    expect(silhouette).toContain('aria-label="Seta de Númen"');
    expect(silhouette).toContain('<circle');
    const portrait = renderToStaticMarkup(
      <PortraitAvatar portrait={{ kind: 'silhouette', skin: 0, hair: 2, hairColor: 3 }} archetypeId="apprentice-mage" />,
    );
    expect(portrait).toContain('#7b6cf0');
    const custom = renderToStaticMarkup(<PortraitAvatar portrait={{ kind: 'custom' }} customSrc="data:image/webp;base64,AAA" />);
    expect(custom).toContain('<img');
  });

  it('a criação de personagem começa pelo nome e oferece os arquétipos depois', () => {
    const html = renderToStaticMarkup(<CreateCharacterScreen onBack={() => undefined} onConfirm={() => undefined} />);
    expect(html).toContain('Quem acorda neste mundo?');
  });

  it('sem imagens no pack, a criação não desenha fundo pintado', () => {
    const html = renderToStaticMarkup(<CreateCharacterScreen onBack={() => undefined} onConfirm={() => undefined} />);
    expect(html).not.toContain('creation-backdrop');
  });

  it('com a arte no pack, a criação mostra o fundo do despertar e pré-carrega os demais', () => {
    const raw = JSON.parse(JSON.stringify(archetypesJson)) as typeof archetypesJson;
    raw.creation.awakening = { ...raw.creation.awakening, src: '/images/first-day/creation/awakening.webp' } as typeof raw.creation.awakening;
    raw.archetypes[0]!.backdrop = { ...raw.archetypes[0]!.backdrop, src: '/images/first-day/creation/apprentice-mage.webp' } as typeof raw.archetypes[0]['backdrop'];
    const catalog = inspectArchetypeCatalog(raw);
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;
    const html = renderToStaticMarkup(
      <CreateCharacterScreen onBack={() => undefined} onConfirm={() => undefined} archetypes={catalog.value} />,
    );
    expect(html).toMatch(/<img[^>]*creation-backdrop__layer--active[^>]*awakening\.webp|<img[^>]*awakening\.webp[^>]*creation-backdrop__layer--active/);
    expect(html).toContain('apprentice-mage.webp');
  });

  it('o pack recusa arte da criação fora dos espaços conhecidos ou com caminho remoto', () => {
    const base = JSON.parse(JSON.stringify(archetypesJson)) as Record<string, unknown>;
    expect(inspectArchetypeCatalog({ ...base, creation: { intro: { kind: 'scene', label: 'x' } } }).ok).toBe(false);
    expect(
      inspectArchetypeCatalog({ ...base, creation: { awakening: { kind: 'scene', label: 'x', src: 'https://example.com/a.webp' } } }).ok,
    ).toBe(false);
    expect(INITIAL_ARCHETYPES.creation.awakening?.label).toBeTruthy();
  });
});
