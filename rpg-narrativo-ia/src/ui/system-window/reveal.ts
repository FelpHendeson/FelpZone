import type { SystemStatusView } from '../../modules/system-interface';

export type MenuDomainId = 'progression' | 'registry' | 'echoes' | 'relationships' | 'society' | 'family' | 'domain' | 'chronicle' | 'map' | 'help' | 'settings';

export const ALL_MENU_DOMAINS: readonly MenuDomainId[] = ['progression', 'registry', 'echoes', 'relationships', 'society', 'family', 'domain', 'chronicle', 'map', 'help', 'settings'];

export const MENU_DOMAIN_LABELS: Record<MenuDomainId, string> = {
  progression: 'Progressão',
  registry: 'Registro',
  echoes: 'Ecos',
  relationships: 'Relacionamentos',
  society: 'Sociedade',
  family: 'Família e lar',
  domain: 'Domínio',
  chronicle: 'Crônica',
  settings: 'Configurações',
  map: 'Mapa completo',
  help: 'Ajuda',
};

const anyAvailable = (actions: readonly { available: boolean }[]) => actions.some((action) => action.available);

/**
 * Revelação progressiva da Central do Sistema: uma interface só aparece quando
 * existe algo real para consultar (estado persistido) ou fazer agora (ação disponível).
 * Ações listadas mas bloqueadas não abrem uma interface sozinhas.
 */
export function revealedMenuDomains(
  status: SystemStatusView,
  knownBonds: number,
  notableDecisions = 0,
  echoesUnlocked = false,
): Set<MenuDomainId> {
  const revealed = new Set<MenuDomainId>(['progression', 'map', 'help', 'settings']);
  if (echoesUnlocked) {
    revealed.add('echoes');
  }
  if (notableDecisions > 0) {
    revealed.add('chronicle');
  }
  if (status.registry.accessGranted || status.registry.patents.some((entry) => entry.granted)) {
    revealed.add('registry');
  }
  if (knownBonds > 0) {
    revealed.add('relationships');
  }
  if (
    status.organizations.length > 0 ||
    status.party.length > 0 ||
    status.civic.length > 0 ||
    anyAvailable(status.organizationActions) ||
    anyAvailable(status.civicActions)
  ) {
    revealed.add('society');
  }
  if (status.family.some((member) => !member.isPlayer) || anyAvailable(status.familyActions)) {
    revealed.add('family');
  }
  if (
    status.settlements.claims.length > 0 ||
    status.settlements.projects.length > 0 ||
    status.economy.wallets.length > 0 ||
    status.economy.properties.length > 0 ||
    status.politics.mandates.length > 0 ||
    status.politics.agreements.length > 0 ||
    anyAvailable(status.economyActions) ||
    anyAvailable(status.settlementActions) ||
    anyAvailable(status.politicsActions)
  ) {
    revealed.add('domain');
  }
  return revealed;
}
