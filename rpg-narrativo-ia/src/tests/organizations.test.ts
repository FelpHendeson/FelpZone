import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import {
  INITIAL_ORGANIZATION_CATALOG,
  INITIAL_ORGANIZATIONS,
  OrganizationError,
  inspectOrganizationCatalog,
  planOrganizationAction,
} from '../modules/organizations';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { asV14, freshState, revealMiraForTest, grantMiraPromiseForTest } from './helpers';

function exploringState(): GameState {
  return { ...freshState(), narrativeSession: null };
}

function meetMira(): GameState {
  let state = exploringState();
  state = revealMiraForTest(state);
  return grantMiraPromiseForTest(executeSandboxAction(
    state,
    {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    },
    { campaign: firstDayCampaign },
  ).current);
}

function befriendMira(): GameState {
  const afterTalk = meetMira();
  const honored = executeSandboxAction(grantMiraPromiseForTest(afterTalk), { type: 'bond.act', actionId: 'honor-mira-promise' }).current;
  return executeSandboxAction(honored, { type: 'bond.act', actionId: 'form-mira-friendship' }).current;
}

describe('Sistema 21 — grupos e organizações', () => {
  it('rejeita tipo duplicado, cargo com permissão desconhecida e filiação de NPC sem decisão', () => {
    expect(
      inspectOrganizationCatalog({
        ...structuredClone(INITIAL_ORGANIZATION_CATALOG),
        types: [INITIAL_ORGANIZATION_CATALOG.types[0], INITIAL_ORGANIZATION_CATALOG.types[0]],
      }).ok,
    ).toBe(false);
    expect(
      inspectOrganizationCatalog({
        membershipStates: [{ id: 'active', name: 'Ativo' }],
        types: [
          {
            id: 'guild',
            name: 'Guilda',
            description: 'Ofício.',
            roles: [{ id: 'master', name: 'Mestre', permissions: ['tax-collect'] }],
          },
        ],
        organizations: [],
        npcDecisions: [],
        actions: [],
      }).ok,
    ).toBe(false);
    expect(
      inspectOrganizationCatalog({
        membershipStates: [{ id: 'active', name: 'Ativo' }],
        types: [
          {
            id: 'party',
            name: 'Grupo',
            description: 'Companhia.',
            roles: [{ id: 'leader', name: 'Guia', permissions: ['disband'] }],
          },
        ],
        organizations: [{ id: 'ghost', typeId: 'party', name: 'Fantasma', description: 'X' }],
        npcDecisions: [],
        actions: [
          {
            id: 'force-mira',
            label: 'Forçar',
            hint: 'Sem agência.',
            timeCost: { periods: 0 },
            once: true,
            requirements: [],
            effects: [
              { type: 'organization.create', organizationId: 'ghost' },
              { type: 'organization.join', organizationId: 'ghost', actorId: 'mira-vale', roleId: 'leader', membershipId: 'active' },
            ],
            feedback: 'Não.',
          },
        ],
      }).ok,
    ).toBe(false);
    expect(() => (INITIAL_ORGANIZATIONS.typeById as Map<string, never>).set('party', {} as never)).toThrow(OrganizationError);
  });

  it('aceita outro tipo de organização sem código específico da Clareira', () => {
    const inspected = inspectOrganizationCatalog({
      membershipStates: [
        { id: 'invited', name: 'Convidado' },
        { id: 'active', name: 'Ativo' },
      ],
      types: [
        {
          id: 'guild',
          name: 'Guilda de ofício',
          description: 'Organização distinta de party e de família.',
          roles: [{ id: 'member', name: 'Membro', permissions: ['leave'] }],
        },
      ],
      organizations: [{ id: 'local-guild', typeId: 'guild', name: 'Guilda local', description: 'Sem tesouro.' }],
      npcDecisions: [],
      actions: [
        {
          id: 'found-guild',
          label: 'Fundar guilda',
          hint: 'Criar sem Mira.',
          timeCost: { periods: 1 },
          once: true,
          requirements: [],
          effects: [
            { type: 'organization.create', organizationId: 'local-guild' },
            { type: 'organization.join', organizationId: 'local-guild', actorId: 'player', roleId: 'member', membershipId: 'active' },
          ],
          feedback: 'A guilda existe.',
        },
      ],
    });
    expect(inspected.ok).toBe(true);
  });

  it('Mira só entra depois da amizade e a UI envia apenas actionId', () => {
    const afterTalk = meetMira();
    expect(() =>
      executeSandboxAction(afterTalk, { type: 'organization.act', actionId: 'propose-mira-party' }),
    ).toThrow();

    const friends = befriendMira();
    const formed = executeSandboxAction(friends, { type: 'organization.act', actionId: 'propose-mira-party' });
    expect(formed.action).toEqual({ type: 'organization.act', actionId: 'propose-mira-party' });
    expect(formed.action).not.toHaveProperty('roleId');
    expect(formed.action).not.toHaveProperty('actorId');
    expect(formed.current.organizations.entries).toEqual([
      expect.objectContaining({
        id: 'clearing-party',
        typeId: 'party',
        members: [
          expect.objectContaining({ actorId: 'player', roleId: 'leader', membershipId: 'active' }),
          expect.objectContaining({ actorId: 'mira-vale', roleId: 'companion', membershipId: 'active' }),
        ],
      }),
    ]);
    expect(formed.current.system.level).toBe(friends.system.level);
    expect(formed.current.registry.patentIds).toEqual(friends.registry.patentIds);
    expect(formed.current.progression.titleIds).toEqual(friends.progression.titleIds);
  });

  it('atribui cargo permitido, rejeita promoção sem permissão e sobrevive ao save', () => {
    const friends = befriendMira();
    const formed = executeSandboxAction(friends, { type: 'organization.act', actionId: 'propose-mira-party' }).current;
    const assigned = executeSandboxAction(formed, { type: 'organization.act', actionId: 'assign-mira-scout' });
    expect(assigned.current.organizations.entries[0]?.members.find((member) => member.actorId === 'mira-vale')?.roleId).toBe(
      'scout',
    );

    const previous = structuredClone(assigned.current);
    expect(() =>
      executeSandboxAction(assigned.current, { type: 'organization.act', actionId: 'propose-mira-party' }),
    ).toThrow();
    expect(assigned.current).toEqual(previous);

    const raw = serializeGameState(assigned.current);
    expect(raw).not.toContain('Grupo da Clareira');
    expect(raw).not.toContain('Batedor');
    const loaded = parseGameState(raw);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.organizations).toEqual(assigned.current.organizations);
    }

    const disbanded = executeSandboxAction(assigned.current, { type: 'organization.act', actionId: 'disband-clearing-party' });
    expect(disbanded.current.organizations.entries).toEqual([]);
    expect(disbanded.current.flags['clearing-party.disbanded']).toBe(true);
  });

  it('migra schema 14 sem conceder grupo, cargo ou catálogo no save', () => {
    const loaded = parseGameState(JSON.stringify(asV14(freshState())));
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.organizations).toEqual({ entries: [], consumedActionIds: [] });
    }
    const raw = JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
    delete raw.organizations;
    expect(parseGameState(JSON.stringify(raw)).status).toBe('corrupt');
  });

  it('ação inválida é atômica', () => {
    const friends = befriendMira();
    const previous = structuredClone(friends);
    expect(() => planOrganizationAction(INITIAL_ORGANIZATIONS, friends.organizations, 'assign-mira-scout', friends)).toThrow(
      OrganizationError,
    );
    expect(() => executeSandboxAction(friends, { type: 'organization.act', actionId: 'assign-mira-scout' })).toThrow();
    expect(friends).toEqual(previous);
  });
});
