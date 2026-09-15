import type { MasteryRequirement } from './types';

export function describeMasteryRequirement(
  requirement: MasteryRequirement,
  resolveSkillName: (skillId: string) => string,
): string {
  if (requirement.type === 'level.minimum') {
    return `Nível ${requirement.level}`;
  }
  if (requirement.type === 'skill.known') {
    return `Conhecer ${resolveSkillName(requirement.skillId)}`;
  }
  return `${resolveSkillName(requirement.skillId)} em proficiência ${requirement.minimum}`;
}
