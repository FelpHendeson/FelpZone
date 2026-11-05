import type { CSSProperties } from 'react';
import { BEING, devotion, elementNames, genesisOrder, verbNames, type Act, type BeingDefinition, type BeingState } from '../simulation/beings';
import type { World } from '../simulation/world';

type Props = { world: World; onSelectHome: (index: number) => void; onFollow: (id: number) => void; onReplayGenesis: () => void };

/** The supreme beings of each element, in the order they were released into this world, and how to declare a new one. */
export function BeingsPanel({ world, onSelectHome, onFollow, onReplayGenesis }: Props) {
  const order = genesisOrder(world);
  return <section className="beings-panel" aria-label="Seres primordiais">
    <h2>Seres</h2>
    <p className="beings-rules">As Regras da Existência criaram uma entidade suprema para cada elemento deste mundo. Cada uma traz no núcleo uma habilidade principal e a mesma missão: dar forma ao mundo, criar a vida e a morte, manter o equilíbrio e fazê-lo evoluir. Foram soltas numa ordem que as regras não fixam; neste mundo, foi esta:</p>
    <ol className="genesis-order">{order.map(def => <li key={def.id} style={{ '--being': def.color } as CSSProperties}><span aria-hidden="true">{def.glyph}</span>{def.name}<small>{elementNames[def.element]}</small></li>)}</ol>
    <button type="button" className="secondary replay-genesis" onClick={onReplayGenesis}>Rever a Gênese</button>
    {world.beings.length === 0 && <p className="beings-empty">Nenhum ser despertou neste mundo.</p>}
    {order.map(def => {
      const state = world.beings.find(b => b.id === def.id);
      return state ? <BeingCard key={state.id} world={world} state={state} def={def} onSelectHome={onSelectHome} onFollow={onFollow} /> : null;
    })}
    <details className="beings-guide"><summary>Como criar um ser</summary>
      <ol>
        <li>Abra <code>src/simulation/beings.ts</code> e copie um dos blocos de <code>beingDefinitions</code>.</li>
        <li>Troque <code>id</code>, nome, epíteto, elemento, personalidade, cor e glifo, e escreva a frase da Gênese.</li>
        <li>Dê a ele uma habilidade principal em <code>core</code> e escolha a morada: <code>busiest-shore</code>, <code>most-fertile</code>, <code>highest-peak</code>, <code>densest-forest</code> ou <code>strongest-source</code>.</li>
        <li>Monte a lista de <code>acts</code> com os verbos que o motor entende (abençoar, fazer chover, fertilizar, florescer e nomear), o intervalo em dias, o custo de poder, o raio e a intensidade.</li>
        <li>Para que ele crie uma espécie, use <code>creates</code>. Gere outro mundo: o ser entra na Gênese junto com os outros.</li>
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
    <p className="being-domain">Entidade suprema da {elementNames[def.element]} · mora em ({home.x}, {home.y}){def.creates ? ` · criou os ${def.creates}` : ''}</p>
    <p className="being-core"><strong>Núcleo: {def.core.name}</strong> · {def.core.description}</p>
    <p className="being-personality">{def.personality}</p>
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
