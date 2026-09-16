import type { MasteryCatalog } from './types';

export const INITIAL_MASTERY_CATALOG = {
  practiceRules: [
    {
      id: 'clearing-predator-practice',
      source: { type: 'combat.victory', encounterId: 'clearing-predator' },
      reward: { type: 'used-skill.proficiency.increase', amount: 1, maximumPerSkill: 1 },
    },
  ],
  milestones: [
    {
      id: 'attentive-awakening',
      level: 2,
      requirements: [{ type: 'skill.proficiency', skillId: 'sharpened-senses', minimum: 3 }],
      reveals: [
        { type: 'training.available', methodId: 'body-reinforcement-routine' },
        { type: 'garden.cultivation-points', amount: 1 },
      ],
    },
  ],
} as const satisfies MasteryCatalog;
