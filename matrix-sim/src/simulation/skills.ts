import type { Creature } from './creatures';

/** What a Folhim has lived through. Skills and evolution read only from here, the essence and the awakening. */
export type Deeds = { walked: number; grazed: number; droughtDays: number; winterDays: number; nearSourceDays: number; disputesWon: number; disputesLost: number };
export const emptyDeeds = (): Deeds => ({ walked: 0, grazed: 0, droughtDays: 0, winterDays: 0, nearSourceDays: 0, disputesWon: 0, disputesLost: 0 });
export const deedNames: Record<keyof Deeds, string> = {
  walked: 'regiões percorridas', grazed: 'unidades de alimento comidas', droughtDays: 'dias em seca', winterDays: 'dias de inverno',
  nearSourceDays: 'dias em essência forte', disputesWon: 'disputas vencidas', disputesLost: 'disputas perdidas',
};

export type Rarity = 'comum' | 'rara' | 'única';
export type Path = 'guardiao' | 'vidente' | 'errante';
/**
 * A skill is declared, not coded into the engine: the deed thresholds that earn it, whether it needs an awakened
 * Folhim, and the path it leads toward. Its effect is read by the engine through `has(c, id)` in `modifiers`.
 */
export type Skill = { id: string; name: string; rarity: Rarity; path: Path; awakened: boolean; needs: Partial<Deeds>; effect: string; lore: string };

export const skills: Skill[] = [
  { id: 'faro-de-agua', name: 'Faro de Água', rarity: 'comum', path: 'errante', awakened: false, needs: { droughtDays: 45 },
    effect: 'Com fome, enxerga 1 região a mais.', lore: 'Quem atravessa secas aprende a farejar a umidade escondida.' },
  { id: 'passo-leve', name: 'Passo Leve', rarity: 'comum', path: 'errante', awakened: false, needs: { walked: 1200 },
    effect: 'Andar custa metade da energia.', lore: 'Muitas léguas ensinam a pisar sem desperdício.' },
  { id: 'estomago-firme', name: 'Estômago Firme', rarity: 'comum', path: 'guardiao', awakened: false, needs: { grazed: 60 },
    effect: 'Gasta 12% menos energia por dia.', lore: 'Cada refeição bem aproveitada fortalece o corpo.' },
  { id: 'pelagem-de-inverno', name: 'Pelagem de Inverno', rarity: 'comum', path: 'guardiao', awakened: false, needs: { winterDays: 40 },
    effect: 'No inverno, gasta 20% menos energia.', lore: 'O frio que não mata engrossa o pelo.' },
  { id: 'couro-grosso', name: 'Couro Grosso', rarity: 'comum', path: 'guardiao', awakened: false, needs: { disputesLost: 2 },
    effect: 'Disputas custam metade da energia.', lore: 'As derrotas deixam marcas que viram proteção.' },
  { id: 'garra-de-bando', name: 'Garra de Bando', rarity: 'rara', path: 'guardiao', awakened: false, needs: { disputesWon: 3 },
    effect: 'Mais força em qualquer disputa.', lore: 'Vitórias repetidas viram confiança no corpo.' },
  { id: 'elo-da-nascente', name: 'Elo da Nascente', rarity: 'rara', path: 'vidente', awakened: true, needs: { nearSourceDays: 40 },
    effect: 'Afinidade com a essência sobe 25 pontos.', lore: 'Quem dorme junto às nascentes passa a ouvi-las.' },
  { id: 'sentido-desperto', name: 'Sentido Desperto', rarity: 'única', path: 'vidente', awakened: true, needs: { nearSourceDays: 150, walked: 1500 },
    effect: 'Enxerga 2 regiões a mais.', lore: 'A essência abre olhos que o corpo não tem.' },
];
const byId = new Map(skills.map(s => [s.id, s]));
export const skillById = (id: string) => byId.get(id);
export const has = (c: Creature, id: string) => c.skills.includes(id);
export const rarityNames: Record<Rarity, string> = { comum: 'Comum', rara: 'Rara', única: 'Única' };

/** Progress toward a skill: the weakest of its deed ratios, 0 to 1. */
export function skillProgress(c: Creature, skill: Skill) {
  const ratios = (Object.entries(skill.needs) as [keyof Deeds, number][]).map(([deed, need]) => Math.min(1, c.deeds[deed] / need));
  return Math.min(...ratios);
}
/** Earns every skill whose requirements are met now. Mutates `c.skills`; returns what was new. */
export function learnSkills(c: Creature): Skill[] {
  const learned = skills.filter(s => !has(c, s.id) && (!s.awakened || c.awakenedDay !== null) && skillProgress(c, s) >= 1);
  if (learned.length) c.skills = [...c.skills, ...learned.map(s => s.id)];
  return learned;
}

export type Form = 'folhim' | Path;
export const forms: Record<Form, { name: string; description: string; bonus: string }> = {
  folhim: { name: 'Folhim', description: 'Forma comum da espécie.', bonus: '' },
  guardiao: { name: 'Folhim Guardião', description: 'Moldado por disputas, inverno e fartura. Corpo largo e marcado.', bonus: 'Força extra nas disputas e 140 dias a mais de vida.' },
  vidente: { name: 'Folhim Vidente', description: 'Moldado pela essência das nascentes. Olhos que brilham.', bonus: 'Afinidade extra, visão maior e 140 dias a mais de vida.' },
  errante: { name: 'Folhim Errante', description: 'Moldado pela jornada e pelas secas. Pernas longas e leves.', bonus: 'Visão maior, passo ainda mais leve e 140 dias a mais de vida.' },
};
export const EVOLUTION = { skills: 3, essence: 70, extraLife: 140 } as const;
/** An awakened Folhim with enough skills and essence evolves along the path most of its skills point to. */
export function evolutionFor(c: Creature): Path | null {
  if (c.form !== 'folhim' || c.awakenedDay === null || c.skills.length < EVOLUTION.skills || c.essence < EVOLUTION.essence) return null;
  const weight: Record<Path, number> = { guardiao: 0, vidente: 0, errante: 0 };
  // One vote per skill: every awakened Folhim already leans to the essence, so rarity must not decide the path.
  for (const id of c.skills) { const s = byId.get(id); if (s) weight[s.path]++; }
  // Ties go to the first path in this order, so the outcome never depends on skill order.
  return (['guardiao', 'errante', 'vidente'] as Path[]).reduce((best, p) => weight[p] > weight[best] ? p : best, 'guardiao');
}

/** Every behavior number the engine takes from skills and form lives here. */
export const modifiers = {
  vision: (c: Creature, hungry: boolean) => c.vision + (hungry && has(c, 'faro-de-agua') ? 1 : 0) + (has(c, 'sentido-desperto') ? 2 : 0) + (c.form === 'vidente' || c.form === 'errante' ? 1 : 0),
  moveCost: (c: Creature) => 0.4 * (has(c, 'passo-leve') ? 0.5 : 1) * (c.form === 'errante' ? 0.5 : 1),
  upkeep: (c: Creature, winter: boolean) => (has(c, 'estomago-firme') ? 0.88 : 1) * (winter && has(c, 'pelagem-de-inverno') ? 0.8 : 1),
  disputeCost: (c: Creature) => has(c, 'couro-grosso') ? 3 : 6,
  disputeStrength: (c: Creature) => (has(c, 'garra-de-bando') ? 0.2 : 0) + (c.form === 'guardiao' ? 0.25 : 0),
  affinity: (c: Creature) => Math.min(1, c.affinity + (has(c, 'elo-da-nascente') ? 0.25 : 0) + (c.form === 'vidente' ? 0.15 : 0)),
};
