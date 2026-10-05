import { findTitle } from '../../campaigns/first-day';
import type { Campaign } from '../../core/events';
import type { GameState } from '../../core/state';
import type { SandboxContext } from '../../modules/sandbox';
import { notableHistory } from '../../modules/narrative';
import { buildSystemStatus } from '../../modules/system-interface';
import { buildExplorationView } from '../sandbox';
import { MENU_DOMAIN_LABELS, revealedMenuDomains, type MenuDomainId } from './reveal';
import { hasWonAnyConfrontation } from '../../modules/echoes';

export type SystemAnnouncementKind = 'level' | 'skill' | 'proficiency' | 'patent' | 'title' | 'unlock';

export interface SystemAnnouncement {
  id: string;
  kind: SystemAnnouncementKind;
  title: string;
  detail: string;
  imageSrc?: string;
}

export interface SystemSnapshot {
  level: number;
  skills: Record<string, { name: string; description: string; proficiency: number }>;
  patents: Record<string, string>;
  titleIds: string[];
  domains: MenuDomainId[];
}

export function takeSystemSnapshot(state: GameState, campaign: Campaign, context: SandboxContext): SystemSnapshot {
  const status = buildSystemStatus(state, context);
  const bonds = buildExplorationView(state, campaign, context).bonds.length;
  return {
    level: status.level,
    skills: Object.fromEntries(
      status.knownSkills.map((skill) => [skill.skillId, { name: skill.name, description: skill.description, proficiency: skill.proficiency }]),
    ),
    patents: Object.fromEntries(status.registry.patents.filter((entry) => entry.granted).map((entry) => [entry.id, entry.name])),
    titleIds: [...state.progression.titleIds],
    domains: [...revealedMenuDomains(status, bonds, notableHistory(state.history).length, hasWonAnyConfrontation(state.flags))],
  };
}

const KIND_ORDER: Record<SystemAnnouncementKind, number> = { level: 0, title: 1, skill: 2, proficiency: 3, patent: 4, unlock: 5 };

/** Compara dois retratos do Sistema e devolve só o que o personagem acabou de conquistar. */
export function diffSystemSnapshots(before: SystemSnapshot, after: SystemSnapshot, campaign: Campaign): SystemAnnouncement[] {
  const announcements: SystemAnnouncement[] = [];
  if (after.level > before.level) {
    announcements.push({
      id: `level-${after.level}`,
      kind: 'level',
      title: `Nível ${after.level}`,
      detail: 'O Sistema reconhece o seu crescimento.',
    });
  }
  for (const [skillId, skill] of Object.entries(after.skills)) {
    const previous = before.skills[skillId];
    if (!previous) {
      announcements.push({ id: `skill-${skillId}`, kind: 'skill', title: `Habilidade registrada: ${skill.name}`, detail: skill.description });
    } else if (skill.proficiency > previous.proficiency) {
      announcements.push({
        id: `proficiency-${skillId}-${skill.proficiency}`,
        kind: 'proficiency',
        title: `${skill.name} · proficiência ${skill.proficiency}`,
        detail: 'A prática se fixou no seu Númen.',
      });
    }
  }
  for (const [patentId, name] of Object.entries(after.patents)) {
    if (!(patentId in before.patents)) {
      announcements.push({ id: `patent-${patentId}`, kind: 'patent', title: `Patente concedida: ${name}`, detail: 'O Registro passou a reconhecer esta posição.' });
    }
  }
  for (const titleId of after.titleIds) {
    if (before.titleIds.includes(titleId)) continue;
    const title = findTitle(campaign, titleId);
    announcements.push({
      id: `title-${titleId}`,
      kind: 'title',
      title: `Título obtido: ${title?.name ?? titleId}`,
      detail: title?.description ?? '',
      imageSrc: title?.image?.src,
    });
  }
  for (const domain of after.domains) {
    if (before.domains.includes(domain)) continue;
    announcements.push({
      id: `unlock-${domain}`,
      kind: 'unlock',
      title: domain === 'echoes' ? 'Seu Eco foi registrado' : `Nova interface: ${MENU_DOMAIN_LABELS[domain]}`,
      detail:
        domain === 'echoes'
          ? 'O Sistema guardou a marca das suas escolhas em combate. Troque Selos com outros Despertos na Prova do Eco (Menu → Ecos).'
          : 'Disponível na Central do Sistema.',
    });
  }
  return announcements.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/** Padrão de vibração proporcional ao peso do anúncio mais importante. */
export function hapticPattern(announcements: readonly SystemAnnouncement[]): number[] {
  if (announcements.some((entry) => entry.kind === 'level' || entry.kind === 'title')) return [30, 60, 30, 60, 60];
  if (announcements.some((entry) => entry.kind === 'skill' || entry.kind === 'patent')) return [30, 50, 30];
  return announcements.length > 0 ? [20] : [];
}
