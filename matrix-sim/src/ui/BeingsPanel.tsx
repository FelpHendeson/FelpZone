import type { CSSProperties } from 'react';
import { BEING, beingDefinitions, devotion, verbNames, type Act, type BeingDefinition, type BeingState } from '../simulation/beings';
import type { World } from '../simulation/world';

type Props = { world: World; onSelectHome: (index: number) => void; onFollow: (id: number) => void };

/** Declared primordial beings: power, devotees, named Folhins, acts and a short authoring guide. */
export function BeingsPanel({ world, onSelectHome, onFollow }: Props) {
  return <section className="beings-panel" aria-label="Seres primordiais">
    <h2>Seres</h2>
    <p>Entidades declaradas em <code>src/simulation/beings.ts</code>. Cada bloco diz onde mora, como ganha poder e quais atos realiza. Criar outro ser é acrescentar um bloco ali; o motor já entende os verbos abençoar, fazer chover e nomear.</p>
    {world.beings.length === 0 && <p className="beings-empty">Nenhum ser despertou neste mundo.</p>}
    {world.beings.map(state => {
      const def = beingDefinitions.find(d => d.id === state.id);
      return def ? <BeingCard key={state.id} world={world} state={state} def={def} onSelectHome={onSelectHome} onFollow={onFollow} /> : null;
    })}
    <details className="beings-guide"><summary>Como criar um ser</summary>
      <ol>
        <li>Abra <code>src/simulation/beings.ts</code> e copie o bloco de Aurenth.</li>
        <li>Troque <code>id</code>, nome, epíteto, domínio, cor e glifo.</li>
        <li>Escolha a morada: <code>strongest-source</code> (nascente mais forte) ou <code>highest-peak</code>.</li>
        <li>Monte a lista de <code>acts</code> com verbo, intervalo em dias, custo de poder, raio e intensidade.</li>
        <li>Reinicie o mundo: o ser nasce junto com ele.</li>
      </ol>
    </details>
  </section>;
}

function BeingCard({ world, state, def, onSelectHome, onFollow }: { world: World; state: BeingState; def: BeingDefinition; onSelectHome: (index: number) => void; onFollow: (id: number) => void }) {
  const faith = devotion(world, state, def);
  const home = world.cells[state.home];
  const next = soonestAct(world.day, state, def);
  const named = state.named.map(id => world.life.creatures.find(c => c.id === id) ?? world.life.departed.find(c => c.id === id)).filter(Boolean);
  return <article className="being-card" style={{ '--being': def.color } as CSSProperties}>
    <header>
      <button type="button" className="being-jump" onClick={() => onSelectHome(state.home)} title="Ir à morada no mapa">
        <span aria-hidden="true">{def.glyph}</span>
        <strong>{def.name}</strong>
      </button>
      <small>{def.epithet}</small>
    </header>
    <p className="being-domain">{def.domain} · mora em ({home.x}, {home.y})</p>
    <p className="being-lore">{def.lore}</p>
    <div className="being-power" aria-label={`Poder ${Math.round(state.power)} de ${BEING.maxPower}`}>
      <div><span>Poder</span><strong>{Math.round(state.power)}</strong><small>/ {BEING.maxPower}</small></div>
      <div className="progress-track" aria-hidden="true"><span style={{ width: `${state.power / BEING.maxPower * 100}%` }} /></div>
    </div>
    <dl className="being-stats">
      <div><dt>Por perto</dt><dd>{faith.near}</dd></div>
      <div><dt>Nomeados vivos</dt><dd>{faith.named}</dd></div>
      <div><dt>Alcance</dt><dd>{def.reach} regiões</dd></div>
      <div><dt>Essência da morada</dt><dd>{Math.round(home.essence * 100)}%</dd></div>
    </dl>
    <h3>Atos</h3>
    <ul className="being-acts">{def.acts.map(act => {
      const last = state.lastActs[act.verb];
      const wait = Math.max(0, act.every - (world.day - (last ?? -Infinity)));
      const ready = wait === 0 && state.power >= act.cost;
      return <li key={act.verb} data-ready={ready}>
        <div><strong>{verbNames[act.verb]}</strong><small>{ready ? 'pronto' : wait > 0 ? `em ${wait}d` : `falta poder (${act.cost})`}</small></div>
        <p>A cada {act.every} dias · custo {act.cost} · raio {act.radius}{act.drought ? ` · seca ≥ ${act.drought}d` : ''}{last != null ? ` · último no dia ${last}` : ''}</p>
      </li>;
    })}</ul>
    {next && <p className="being-next">Próximo ato possível: <strong>{verbNames[next.verb]}</strong>{next.wait > 0 ? ` em ${next.wait} dia${next.wait === 1 ? '' : 's'}` : state.power >= next.cost ? ' agora' : `, quando o poder chegar a ${next.cost}`}.</p>}
    {named.length > 0 && <><h3>Nomeados</h3><ul className="being-named">{named.map(c => c && <li key={c.id}>
      <button type="button" onClick={() => onFollow(c.id)}>{c.trueName ?? `#${c.id}`}</button>
      <small>{c.action === 'dead' ? 'partido' : formsLabel(c.form)} · essência {Math.round(c.essence)}</small>
    </li>)}</ul></>}
    {state.history.length > 0 && <details><summary>Histórico recente</summary><ul>{[...state.history].reverse().map((entry, i) => <li key={i}>Dia {entry.day}: {entry.text}</li>)}</ul></details>}
  </article>;
}

function formsLabel(form: string) {
  if (form === 'guardiao') return 'Guardião';
  if (form === 'vidente') return 'Vidente';
  if (form === 'errante') return 'Errante';
  return 'Folhim';
}

/** The act that becomes available soonest, preferring the definition order when tied. */
function soonestAct(day: number, state: BeingState, def: BeingDefinition): (Act & { wait: number }) | null {
  let best: (Act & { wait: number }) | null = null;
  for (const act of def.acts) {
    const wait = Math.max(0, act.every - (day - (state.lastActs[act.verb] ?? -Infinity)));
    if (!best || wait < best.wait) best = { ...act, wait };
  }
  return best;
}
