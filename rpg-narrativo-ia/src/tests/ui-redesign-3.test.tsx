import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { createSandboxContext } from '../modules/sandbox';
import { buildSystemStatus } from '../modules/system-interface';
import { BottomNavigation } from '../ui/components/BottomNavigation';
import { buildExplorationView, type BondCharacterView } from '../ui/sandbox';
import { DomainPanel } from '../ui/screens/exploration/DomainPanel';
import { GameMenuPanel } from '../ui/screens/exploration/GameMenuPanel';
import { RelationshipSection } from '../ui/screens/exploration/RelationshipsPanel';
import { SystemPanel } from '../ui/screens/exploration/SystemPanel';
import { playFirstDay } from './helpers';

const context = createSandboxContext();
const noop = () => undefined;

function setup() {
  const state = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
  return {
    state,
    view: buildExplorationView(state, firstDayCampaign, context),
    status: buildSystemStatus(state, context),
  };
}

function bond(npcId: string, name: string, portraitSrc?: string): BondCharacterView {
  return {
    npcId,
    name,
    portraitSrc,
    outgoing: [],
    incoming: [],
    namedBonds: [],
    actions: [],
    organizationActions: [],
    familyActions: [],
    civicActions: [],
    economyActions: [],
    settlementActions: [],
    politicsActions: [],
  };
}

describe('UI/UX 3.0 — rework visual e de informação', () => {
  it('troca os glifos do rodapé por ícones SVG de traço fino sem mudar os cinco destinos', () => {
    const html = renderToStaticMarkup(<BottomNavigation active="menu" inventoryCount={0} onChange={noop} />);
    expect(html.match(/<button/g)).toHaveLength(5);
    expect(html.match(/<svg class="ui-icon"/g)).toHaveLength(5);
    expect(html).toContain('stroke-width="1.5"');
    for (const glyph of ['◉', '⌖', '♙', '▣', '☰']) expect(html).not.toContain(glyph);
  });

  it('agrupa a Central do Sistema em três seções sem perder nenhum destino', () => {
    const { view, status } = setup();
    const action = { actionId: 'a', label: 'Agir', hint: '', costPeriods: 1, available: true };
    const unlocked = {
      ...status,
      registry: { ...status.registry, accessGranted: true },
      civicActions: [action],
      familyActions: [action],
      economyActions: [action],
    };
    const html = renderToStaticMarkup(
      <GameMenuPanel
        status={unlocked}
        view={{ ...view, bonds: [bond('mira-vale', 'Mira Vale')] }}
        campaign={firstDayCampaign}
        onNavigate={noop}
        guidanceCount={3}
        guidanceUnseenCount={0}
        notableCount={1}
      />,
    );
    expect(html).not.toContain('menu-sealed');
    const self = html.indexOf('Eu e o Sistema');
    const people = html.indexOf('>Pessoas<');
    const world = html.indexOf('Mundo e referência');
    expect(self).toBeGreaterThan(-1);
    expect(people).toBeGreaterThan(self);
    expect(world).toBeGreaterThan(people);
    expect(html.match(/class="menu-entry /g)).toHaveLength(9);
    expect(html).toContain('<strong>Crônica</strong>');
    // Sociedade passa a viver em "Pessoas", não junto do Domínio.
    const society = html.indexOf('<strong>Sociedade</strong>');
    expect(society).toBeGreaterThan(people);
    expect(society).toBeLessThan(world);
    expect(html.indexOf('<strong>Domínio</strong>')).toBeGreaterThan(world);
    expect(html).toContain('menu-entry--social');
    expect(html).toContain('menu-entry--domain');
    expect(html).toContain('menu-entry--registry');
    expect(html).toContain('sys-corners');
  });

  it('mostra miniaturas reais dos vínculos conhecidos, até três mais contagem', () => {
    const { view, status } = setup();
    const withBonds = {
      ...view,
      bonds: [
        bond('mira-vale', 'Mira Vale', '/images/first-day/npcs/mira-vale.webp'),
        bond('caio-nascimento', 'Caio Nascimento', '/images/first-day/npcs/caio-nascimento.webp'),
        bond('davi-moura', 'Davi Moura', '/images/first-day/npcs/davi-moura.webp'),
        bond('sem-arte', 'Sem Arte'),
      ],
    };
    const html = renderToStaticMarkup(
      <GameMenuPanel status={status} view={withBonds} campaign={firstDayCampaign} onNavigate={noop} guidanceCount={0} guidanceUnseenCount={0} />,
    );
    expect(html).toContain('src="/images/first-day/npcs/mira-vale.webp"');
    expect(html).toContain('src="/images/first-day/npcs/davi-moura.webp"');
    expect(html).toContain('+1');
    expect(html).toContain('4 vínculos conhecidos');
  });

  it('expõe retrato do NPC e ícone da aptidão a partir da arte já declarada no pack', () => {
    const { view } = setup();
    expect(view.abilityImageSrc).toBe(firstDayCampaign.abilities.find((entry) => entry.name === view.abilityName)?.image?.src);
    expect(view.abilityImageSrc).toMatch(/^\/images\/first-day\/abilities\//);
  });

  it('usa retrato real em Relacionamentos e iniciais como fallback honesto', () => {
    const html = renderToStaticMarkup(
      <RelationshipSection bonds={[bond('mira-vale', 'Mira Vale', '/images/first-day/npcs/mira-vale.webp'), bond('x', 'Ana Cruz')]} onAction={noop} />,
    );
    expect(html).toContain('src="/images/first-day/npcs/mira-vale.webp"');
    expect(html).toContain('>AC<');
    expect(html).not.toContain('♙');
  });

  it('transforma Domínio num hub de três entradas com a cor de domínio', () => {
    const { status } = setup();
    const html = renderToStaticMarkup(<DomainPanel status={status} onNavigate={noop} onBack={noop} />);
    expect(html).toContain('detail-screen--domain');
    expect(html.match(/class="menu-entry menu-entry--domain"/g)).toHaveLength(3);
    expect(html).toContain('Base e território');
    expect(html).toContain('Economia');
    expect(html).toContain('Política');
  });

  it('isola cada sub-tela de Domínio no seu próprio sistema de save', () => {
    const { state, status } = setup();
    const render = (section: 'territory' | 'economy' | 'politics') =>
      renderToStaticMarkup(
        <SystemPanel section={section} status={status} campaign={firstDayCampaign} onAction={noop} onBack={noop} />,
      );
    const territory = render('territory');
    const economy = render('economy');
    const politics = render('politics');
    expect(territory).toContain('<strong>Base e território</strong>');
    expect(territory).not.toContain('Comércio e propriedade');
    expect(territory).not.toContain('Facções e diplomacia');
    expect(economy).toContain('Comércio e propriedade');
    expect(economy).not.toContain('<strong>Base e território</strong>');
    expect(politics).toContain('Facções e diplomacia');
    expect(politics).not.toContain('Comércio e propriedade');
    for (const html of [territory, economy, politics]) expect(html).toContain('system-panel--tone-domain');
    expect(state.status).toBe('playing');
  });

  it('mostra o ícone da aptidão inicial em Progressão', () => {
    const { view, status } = setup();
    const html = renderToStaticMarkup(
      <SystemPanel
        section="progression"
        status={status}
        campaign={firstDayCampaign}
        ability={{ name: view.abilityName, imageSrc: view.abilityImageSrc }}
        onAction={noop}
        onBack={noop}
      />,
    );
    expect(html).toContain('Aptidão inicial');
    expect(html).toContain(`src="${view.abilityImageSrc}"`);
    expect(html).toContain('system-panel--tone-system');
  });
});
