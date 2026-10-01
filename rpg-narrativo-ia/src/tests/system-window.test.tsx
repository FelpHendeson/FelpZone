import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { createSandboxContext } from '../modules/sandbox';
import { buildSystemStatus } from '../modules/system-interface';
import { buildExplorationView } from '../ui/sandbox';
import { GameMenuPanel } from '../ui/screens/exploration/GameMenuPanel';
import { SystemWindow } from '../ui/components/SystemWindow';
import {
  diffSystemSnapshots,
  hapticPattern,
  revealedMenuDomains,
  takeSystemSnapshot,
  type SystemSnapshot,
} from '../ui/system-window';
import { playFirstDay } from './helpers';

const context = createSandboxContext();
const noop = () => undefined;

function enterExploration() {
  return playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
}

const EMPTY: SystemSnapshot = { level: 1, skills: {}, patents: {}, titleIds: [], domains: ['progression', 'map', 'help'] };

describe('Revelação progressiva da Central do Sistema', () => {
  it('mantém seladas as interfaces sem conteúdo no início da partida', () => {
    const state = enterExploration();
    const status = buildSystemStatus(state, context);
    const revealed = revealedMenuDomains(status, 0);
    expect(revealed.has('progression')).toBe(true);
    expect(revealed.has('map')).toBe(true);
    expect(revealed.has('help')).toBe(true);
    expect(revealed.has('relationships')).toBe(false);
    expect(revealed.has('domain')).toBe(false);
    expect(revealed.has('family')).toBe(false);
  });

  it('revela cada interface quando surge estado ou ação real nela', () => {
    const status = buildSystemStatus(enterExploration(), context);
    const action = { actionId: 'a', label: 'Agir', hint: '', costPeriods: 1, available: true };
    expect(revealedMenuDomains(status, 1).has('relationships')).toBe(true);
    expect(revealedMenuDomains({ ...status, settlementActions: [action] }, 0).has('domain')).toBe(true);
    expect(revealedMenuDomains({ ...status, civicActions: [action] }, 0).has('society')).toBe(true);
    expect(revealedMenuDomains({ ...status, familyActions: [action] }, 0).has('family')).toBe(true);
    const blocked = { ...action, available: false, blockedReason: 'Requisitos em aberto' };
    expect(revealedMenuDomains({ ...status, settlementActions: [blocked], politicsActions: [blocked] }, 0).has('domain')).toBe(false);
    expect(revealedMenuDomains({ ...status, registry: { ...status.registry, accessGranted: true } }, 0).has('registry')).toBe(true);
  });

  it('esconde entradas seladas no Menu e diz quantas faltam, sem esconder grupos com conteúdo', () => {
    const state = enterExploration();
    const status = buildSystemStatus(state, context);
    const view = buildExplorationView(state, firstDayCampaign, context);
    const html = renderToStaticMarkup(
      <GameMenuPanel status={status} view={view} campaign={firstDayCampaign} onNavigate={noop} guidanceCount={1} guidanceUnseenCount={0} />,
    );
    const hidden = 8 - revealedMenuDomains(status, view.bonds.length).size;
    expect(hidden).toBeGreaterThan(0);
    expect(html).toContain('menu-sealed');
    expect(html).toContain(`${hidden} interface`);
    expect(html).toContain('<strong>Progressão</strong>');
    expect(html).not.toContain('<strong>Domínio</strong>');
  });
});

describe('Janela do Sistema', () => {
  it('anuncia nível, habilidade, proficiência, patente, título e interface nova — nessa prioridade', () => {
    const before: SystemSnapshot = { ...EMPTY, skills: { a: { name: 'Sentidos', description: '', proficiency: 1 } } };
    const after: SystemSnapshot = {
      level: 2,
      skills: {
        a: { name: 'Sentidos', description: '', proficiency: 2 },
        b: { name: 'Passo Leve', description: 'Movimento silencioso.', proficiency: 0 },
      },
      patents: { scout: 'Batedor' },
      titleIds: ['despertar'],
      domains: [...EMPTY.domains, 'relationships'],
    };
    const found = diffSystemSnapshots(before, after, firstDayCampaign);
    expect(found.map((entry) => entry.kind)).toEqual(['level', 'title', 'skill', 'proficiency', 'patent', 'unlock']);
    expect(found[0]?.title).toBe('Nível 2');
    expect(found.find((entry) => entry.kind === 'title')?.imageSrc).toBe('/images/first-day/titles/despertar.webp');
    expect(found.find((entry) => entry.kind === 'unlock')?.title).toBe('Nova interface: Relacionamentos');
    expect(hapticPattern(found).length).toBeGreaterThan(1);
  });

  it('fica em silêncio quando nada mudou', () => {
    expect(diffSystemSnapshots(EMPTY, EMPTY, firstDayCampaign)).toEqual([]);
    expect(hapticPattern([])).toEqual([]);
  });

  it('registra a prática real do treino como proficiência anunciada', () => {
    const state = enterExploration();
    const before = takeSystemSnapshot(state, firstDayCampaign, context);
    const raised = {
      ...state,
      system: {
        ...state.system,
        entries: state.system.entries.map((entry, index) => (index === 0 ? { ...entry, proficiency: entry.proficiency + 1 } : entry)),
      },
    };
    const after = takeSystemSnapshot(raised, firstDayCampaign, context);
    const found = diffSystemSnapshots(before, after, firstDayCampaign);
    expect(found.some((entry) => entry.kind === 'proficiency')).toBe(true);
  });

  it('renderiza a janela com o rótulo diegético e um botão de confirmação', () => {
    const html = renderToStaticMarkup(
      <SystemWindow announcements={[{ id: 'level-2', kind: 'level', title: 'Nível 2', detail: 'O Sistema reconhece o seu crescimento.' }]} onClose={noop} />,
    );
    expect(html).toContain('[ Sistema ]');
    expect(html).toContain('system-window__panel--level');
    expect(html).toContain('Confirmar');
  });
});
