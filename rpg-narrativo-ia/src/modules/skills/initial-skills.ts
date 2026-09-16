import raw from '../../../content/first-day/system/skills.json' with { type: 'json' };
import type { SkillsCatalog } from './types';

export const INITIAL_SKILLS_CATALOG = raw as SkillsCatalog;
