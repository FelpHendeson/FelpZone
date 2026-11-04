import type { Creature } from '../simulation/creatures';
import { deedNames, EVOLUTION, forms, rarityNames, skillById, skillProgress, skills, type Deeds, type Path, type Skill } from '../simulation/skills';

const pathNames: Record<Path, string> = { guardiao: 'Guardião', vidente: 'Vidente', errante: 'Errante' };
const requirement = (s: Skill) => (Object.entries(s.needs) as [keyof Deeds, number][]).map(([deed, need]) => `${need.toLocaleString('pt-BR')} ${deedNames[deed]}`).join(' e ') + (s.awakened ? ' · só despertos' : '');

function SkillChip({ skill }: { skill: Skill }) {
  return <li className="skill-chip" data-rarity={skill.rarity} data-path={skill.path} title={`${skill.effect} ${skill.lore}`}>
    <strong>{skill.name}</strong><span>{rarityNames[skill.rarity]} · {skill.effect}</span>
  </li>;
}

/** Earned skills, the three closest to being earned, and the evolution requirements for one Folhim. */
export function CreatureSkills({ creature: c }: { creature: Creature }) {
  const earned = c.skills.map(skillById).filter((s): s is Skill => !!s);
  const next = skills.filter(s => !c.skills.includes(s.id)).map(s => ({ s, progress: skillProgress(c, s), locked: s.awakened && c.awakenedDay === null }))
    .sort((a, b) => Number(a.locked) - Number(b.locked) || b.progress - a.progress).slice(0, 3);
  return <div className="creature-skills">
    {c.form !== 'folhim' && <p className="creature-form" data-form={c.form}>❂ {forms[c.form].name} desde o dia {c.evolvedDay}. {forms[c.form].bonus}</p>}
    <h4>Habilidades {earned.length ? `(${earned.length})` : ''}</h4>
    {earned.length ? <ul className="skill-list">{earned.map(s => <SkillChip key={s.id} skill={s} />)}</ul> : <p className="skills-empty">Nenhuma ainda. Habilidades surgem do que o Folhim vive.</p>}
    {next.length > 0 && <><h4>Mais perto de aprender</h4><ul className="skill-progress">{next.map(({ s, progress, locked }) => <li key={s.id}>
      <div><span>{s.name}</span><small>{locked ? 'exige despertar' : `${Math.floor(progress * 100)}%`}</small></div>
      <div className="progress-track" aria-hidden="true"><span style={{ width: `${progress * 100}%` }} data-locked={locked} /></div>
    </li>)}</ul></>}
    {c.form === 'folhim' && <p className="evolution-hint">Evolução: desperto {c.awakenedDay !== null ? '✓' : '✗'} · {Math.min(c.skills.length, EVOLUTION.skills)}/{EVOLUTION.skills} habilidades · essência {Math.round(c.essence)}/{EVOLUTION.essence}</p>}
    <details><summary>Feitos</summary><dl className="deeds">{(Object.keys(deedNames) as (keyof Deeds)[]).map(deed => <div key={deed}><dt>{deedNames[deed]}</dt><dd>{Math.round(c.deeds[deed]).toLocaleString('pt-BR')}</dd></div>)}</dl></details>
  </div>;
}

/** Every declared skill and form, with how many living Folhins carry each one. */
export function CodexPanel({ creatures }: { creatures: Creature[] }) {
  const holders = (id: string) => creatures.filter(c => c.skills.includes(id)).length;
  return <section className="codex" aria-label="Códice de habilidades">
    <h2>Códice</h2>
    <p>As leis de poder deste mundo. Cada habilidade é declarada em <code>src/simulation/skills.ts</code>: o que precisa ser vivido para conquistá-la e o efeito que ela tem. Para criar uma nova, basta acrescentar um bloco ali.</p>
    {(['errante', 'guardiao', 'vidente'] as Path[]).map(path => <div key={path} className="codex-path" data-path={path}>
      <h3>Caminho {pathNames[path]}</h3>
      <ul>{skills.filter(s => s.path === path).map(s => <li key={s.id} data-rarity={s.rarity}>
        <div><strong>{s.name}</strong><small>{rarityNames[s.rarity]} · {holders(s.id)} {holders(s.id) === 1 ? 'portador' : 'portadores'}</small></div>
        <p>{s.effect}</p><p className="codex-lore">{s.lore}</p><p className="codex-needs">Como conquistar: {requirement(s)}.</p>
      </li>)}</ul>
    </div>)}
    <h3>Evolução</h3>
    <p>Um Folhim desperto, com {EVOLUTION.skills} habilidades e {EVOLUTION.essence} de essência, evolui uma única vez. A forma segue o caminho da maioria das suas habilidades; em empate vale a ordem Guardião, Errante, Vidente.</p>
    <ul className="codex-forms">{(['guardiao', 'errante', 'vidente'] as Path[]).map(form => <li key={form} data-form={form}>
      <strong>{forms[form].name}</strong><small>{creatures.filter(c => c.form === form).length} vivos</small><p>{forms[form].description}</p><p>{forms[form].bonus}</p>
    </li>)}</ul>
  </section>;
}
