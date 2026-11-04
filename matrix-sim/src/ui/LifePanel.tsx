import { actionNames, variantNames, POPULATION_LIMIT, type Creature, type Band } from '../simulation/creatures';
import type { World } from '../simulation/world';
import { bandColor, bandProfile } from '../simulation/bands';
import { beingDefinitions } from '../simulation/beings';
import { forms, modifiers } from '../simulation/skills';
import { CreatureSkills } from './SkillsView';

type Props = { world: World; selected: number | null; onSelect: (id: number) => void };
export function LifePanel({ world, selected, onSelect }: Props) {
  const life = world.life;
  const creature = life.creatures.find(c => c.id === selected) ?? life.departed.find(c => c.id === selected);
  return <section className="life-panel" aria-label="Primeira espécie: Folhins">
    <div className="life-heading"><div><h2>Os primeiros habitantes</h2><p><strong>Folhins</strong> · Pequenos pastadores de folhas, sementes e frutos.</p></div><button className="secondary" disabled={!life.creatures.length} onClick={() => onSelect(life.creatures[0].id)}>Localizar um Folhim</button></div>
    <div className="life-stats"><span><strong>{life.creatures.length}</strong> vivos</span><span><strong>{life.births}</strong> nascimentos</span><span><strong>{life.deaths}</strong> mortes</span><span><strong>{life.creatures.filter(c => c.action === 'grazing').length}</strong> comendo agora</span><span><strong>{life.creatures.filter(c => c.awakenedDay !== null).length}</strong> despertos</span><span><strong>{life.creatures.filter(c => c.form !== 'folhim').length}</strong> evoluídos</span><span><strong>{life.creatures.filter(c => c.trueName).length}</strong> nomeados</span></div>
    <div className="band-list" aria-label="Bandos de Folhins">{life.bands.map(band => {
      const members = life.creatures.filter(c => c.bandId === band.id);
      return <button className={`band-card band-${band.variant}`} key={band.id} style={{ borderLeftColor: bandColor(band.id) }} aria-pressed={creature?.bandId === band.id} disabled={!members.length} onClick={() => onSelect(band.leaderId ?? members[0].id)}><strong><i style={{ background: bandColor(band.id) }} />{band.name} <small>{bandProfile(band)}</small></strong><span>{members.length} habitantes · {band.leaderId ? `Líder #${band.leaderId}` : 'Bando extinto'}</span><span className="band-attributes">Ataque {Math.round(band.attack * 100)} · Defesa {Math.round(band.defense * 100)} · União {Math.round(band.cohesion * 100)}</span></button>;
    })}</div>
    <p className="life-instructions">Bosque: pelagem verde. Campina: pelagem dourada. O losango identifica o líder. Bandos podem disputar alimento; adultos podem desafiar a liderança. A origem diferente, sozinha, não provoca brigas. Limite experimental: {POPULATION_LIMIT} habitantes.</p>
    {!life.creatures.length && <p className="life-empty">{life.deaths ? 'A população foi extinta. Gere outro mundo para recomeçar.' : 'Não há habitat com alimento suficiente para introduzir os Folhins neste mundo.'}</p>}
    {creature ? <CreatureDetails creature={creature} day={world.day} band={life.bands.find(b => b.id === creature.bandId)} /> : <p className="life-instructions">Clique em um habitante, em um bando ou use “Localizar um Folhim” para acompanhar sua vida.</p>}
    <details className="life-events"><summary>Como os bandos estão mudando</summary><p>Ataque favorece quem inicia a disputa. Defesa e aliados próximos ajudam quem resiste. União mantém os integrantes próximos. Vitórias, derrotas, fome, medo e o líder mudam essas tendências aos poucos.</p><ul>{life.bands.map(b => <li key={b.id}><strong style={{ color: bandColor(b.id) }}>{b.name}: {bandProfile(b)}</strong> · Ímpeto {Math.round(b.aggression * 100)} · {b.wins} vitórias e {b.losses} derrotas contra outros bandos.{b.history.map((h, i) => <div key={i}>Dia {h.day}: {h.text}</div>)}</li>)}</ul></details>
  </section>;
}

function CreatureDetails({ creature: c, day, band }: { creature: Creature; day: number; band?: Band }) {
  const patron = c.patron ? beingDefinitions.find(b => b.id === c.patron) : null;
  return <div className="creature-details" aria-label={`Detalhes do Folhim ${c.id}`}>
    <div className="creature-title"><strong>{c.trueName ? `${c.trueName} · ${forms[c.form].name} #${c.id}` : `${forms[c.form].name} #${c.id}`}</strong><span>{actionNames[c.action]} · ({c.x}, {c.y})</span></div>
    <p>{variantNames[c.variant]} · {band?.name ?? `Bando ${c.bandId}`} · {band?.leaderId === c.id ? 'Líder do bando' : 'Integrante do bando'}</p>
    <dl><div><dt>Energia</dt><dd>{Math.round(c.energy)} / 100</dd></div><div><dt>Idade</dt><dd>{c.age} dias</dd></div><div><dt>Geração</dt><dd>{c.generation}</dd></div><div><dt>Percepção</dt><dd>{modifiers.vision(c, false)} regiões</dd></div><div><dt>Curiosidade</dt><dd>{Math.round(c.curiosity * 100)}%</dd></div><div><dt>Ímpeto de disputa</dt><dd>{Math.round(c.temperament * 100)}%</dd></div><div><dt>Essência</dt><dd>{Math.round(c.essence)} / 100</dd></div><div><dt>Afinidade</dt><dd>{Math.round(c.affinity * 100)}%</dd></div></dl>
    {c.awakenedDay !== null && <p className="creature-awakened">✧ Desperto para a essência desde o dia {c.awakenedDay}.</p>}
    {c.trueName && patron && <p className="creature-named">✺ Nomeado por {patron.name}: <strong>{c.trueName}</strong>.</p>}
    <CreatureSkills creature={c} />
    <p>{c.action === 'dead' ? c.history.at(-1)?.text : c.foodMemory && day - c.foodMemory.day <= 14 ? `Lembra de onde encontrou comida há ${day - c.foodMemory.day} dias.` : 'Explora o entorno procurando uma fonte de alimento.'}</p>
    <details><summary>Histórico deste indivíduo</summary><ul>{[...c.history].reverse().map((event, index) => <li key={index}>Dia {event.day}: {event.text}</li>)}</ul></details>
    <details><summary>Memória de outros Folhins ({c.relations.length})</summary>{c.relations.length ? <ul>{[...c.relations].reverse().map(r => <li key={r.id}>#{r.id}: medo {Math.round(r.fear * 100)}% · raiva {Math.round(r.anger * 100)}% · último confronto no dia {r.lastDay}</li>)}</ul> : <p>Ainda não guarda lembranças de confrontos. Medo favorece o afastamento; raiva pode motivar outra disputa. Ambos diminuem com os dias.</p>}</details>
    {c.action !== 'dead' && <small>A câmera acompanha este Folhim. Clique no terreno para deixar de acompanhá-lo.</small>}
  </div>;
}
