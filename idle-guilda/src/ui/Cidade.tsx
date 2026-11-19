import { useEffect, useState } from 'react';
import {
  colherFusao,
  comprar,
  custoForja,
  custoFusao,
  custoMelhoria,
  desmontar,
  DURACAO_FUSAO,
  forjar,
  melhorar,
  plantarFusao,
  previaFusao,
  recrutar,
  vender,
  venderMaterial,
  type Resultado,
} from '../motor/acoes';
import { BASES, MATERIAIS, MELHORIA_MAXIMA, NOME_SLOT } from '../motor/dados/itens';
import { MAPAS } from '../motor/dados/mapas';
import { ORDEM_PERSONAGENS, PERSONAGENS } from '../motor/dados/personagens';
import { precoDeVenda, valorDoItem } from '../motor/itens';
import { habilidade } from '../motor/status';
import type { Estado, Item, Material, PersonagemId } from '../motor/tipos';
import { DetalheItem, Medidor, Recurso, Retrato, SubAbas } from './comum';
import { CartaoHabilidade } from './Ficha';
import { duracao, nomeCurto, nomeHeroi } from './texto';

export type AbaCidade = 'ferreiro' | 'loja' | 'taverna' | 'jardim';

interface Props {
  estado: Estado;
  agir: (acao: (e: Estado) => Resultado) => void;
  aba: AbaCidade;
  aoTrocar: (a: AbaCidade) => void;
  /** Item vindo da Mochila: abre o Ferreiro em Melhorar com ele em destaque. */
  destaque?: string | null;
}

export function Cidade({ estado: e, agir, aba, aoTrocar, destaque }: Props) {
  const recrutavel = ORDEM_PERSONAGENS.some((id) => {
    const r = PERSONAGENS[id].recrutamento;
    return r && !e.herois.some((h) => h.id === id) && (e.herois[0]?.nivel ?? 1) >= r.nivel && e.ouro >= r.ouro;
  });
  const colheita = e.canteiros.some((c) => c && e.tempo >= c.fim);
  return (
    <>
      <SubAbas<AbaCidade>
        abas={[
          ['ferreiro', '⚒ Ferreiro'],
          ['loja', '🛒 Loja'],
          ['taverna', '🍺 Taverna', recrutavel],
          ['jardim', '🌱 Jardim', colheita],
        ]}
        ativa={aba}
        aoTrocar={aoTrocar}
      />
      {aba === 'ferreiro' && <Ferreiro e={e} agir={agir} destaque={destaque ?? null} />}
      {aba === 'loja' && <Loja e={e} agir={agir} />}
      {aba === 'taverna' && <Taverna e={e} agir={agir} />}
      {aba === 'jardim' && <Jardim e={e} agir={agir} />}
    </>
  );
}

/** Todos os itens com dono (equipados) e sem dono (inventário). */
function todosOsItens(e: Estado): { item: Item; dono?: PersonagemId }[] {
  return [
    ...e.herois.flatMap((h) => Object.values(h.equipamento).filter((i): i is Item => !!i).map((item) => ({ item, dono: h.id }))),
    ...e.inventario.map((item) => ({ item })),
  ];
}

/* ---------- Ferreiro ---------- */

const GRUPOS_FORJA: [string, string[]][] = [
  ['Armadura de placas', ['elmo-pesada', 'peitoral-pesada', 'manoplas-pesada', 'calcas-pesada', 'botas-pesada']],
  ['Armadura de malha', ['elmo-media', 'peitoral-media', 'manoplas-media', 'calcas-media', 'botas-media']],
  ['Armadura de couro', ['elmo-leve', 'peitoral-leve', 'manoplas-leve', 'calcas-leve', 'botas-leve']],
  ['Armadura de seda', ['elmo-tecido', 'peitoral-tecido', 'manoplas-tecido', 'calcas-tecido', 'botas-tecido']],
  ['Armas', ['espada', 'lanca', 'adaga', 'cajado']],
  ['Mão secundária', ['escudo', 'orbe', 'grimorio', 'adagaCurta']],
  ['Acessórios', ['anel', 'amuleto', 'bracelete']],
];

function Ferreiro({ e, agir, destaque }: { e: Estado; agir: Props['agir']; destaque: string | null }) {
  const [modo, setModo] = useState<'forjar' | 'melhorar' | 'desmontar'>(destaque ? 'melhorar' : 'forjar');
  useEffect(() => {
    if (!destaque) return;
    setModo('melhorar');
    // Espera a lista aparecer para rolar até o item.
    const id = requestAnimationFrame(() => document.getElementById(`melhorar-${destaque}`)?.scrollIntoView({ block: 'center' }));
    return () => cancelAnimationFrame(id);
  }, [destaque]);
  const liberados = MAPAS.filter((m) => e.mapasLiberados.includes(m.id));
  const [mapa, setMapa] = useState(liberados.at(-1)!.id);
  const [base, setBase] = useState('peitoral-pesada');
  const [essencia, setEssencia] = useState(false);
  const custo = custoForja(mapa, essencia);
  const falta = e.ouro < custo.ouro || e.materiais[custo.material] < custo.quantidade || e.materiais.essencia < custo.essencia;
  return (
    <section className="painel">
      <h2>Ferreiro</h2>
      <SubAbas<typeof modo>
        abas={[
          ['forjar', 'Forjar'],
          ['melhorar', 'Melhorar'],
          ['desmontar', 'Desmontar'],
        ]}
        ativa={modo}
        aoTrocar={setModo}
      />
      {modo === 'forjar' && (
        <div className="formulario">
          <p className="dica">Escolha a peça; o nível vem do mapa e a raridade é sorteada. Peças de armadura podem sair do conjunto do mapa.</p>
          <label className="campo">
            Materiais de
            <select value={mapa} onChange={(ev) => setMapa(ev.target.value)}>
              {liberados.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} (nv {m.nivelInimigo + 3})
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            Peça
            <select value={base} onChange={(ev) => setBase(ev.target.value)}>
              {GRUPOS_FORJA.map(([grupo, bases]) => (
                <optgroup key={grupo} label={grupo}>
                  {bases.map((b) => (
                    <option key={b} value={b}>
                      {BASES[b].nome} ({NOME_SLOT[BASES[b].slot === 'acessorio' ? 'acessorio1' : BASES[b].slot]})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="alternador">
            <input type="checkbox" checked={essencia} onChange={(ev) => setEssencia(ev.target.checked)} />
            Usar 1 essência: nunca sai comum e a chance de épico e lendário sobe.
          </label>
          <div className="custo">
            <Recurso tipo="ouro" valor={custo.ouro} falta={e.ouro < custo.ouro} />
            <Recurso tipo={custo.material} valor={custo.quantidade} falta={e.materiais[custo.material] < custo.quantidade} />
            {custo.essencia > 0 && <Recurso tipo="essencia" valor={1} falta={e.materiais.essencia < 1} />}
          </div>
          <button className="principal" disabled={falta} onClick={() => agir((x) => forjar(x, mapa, base, essencia))}>
            Forjar
          </button>
          {e.inventario.length > 0 && (
            <>
              <h3>Última forja</h3>
              <DetalheItem item={e.inventario.at(-1)!} />
            </>
          )}
        </div>
      )}
      {modo === 'melhorar' && (
        <>
          <p className="dica">Cada melhoria soma 8% aos atributos do item (relíquias: 5% às passivas). A partir de +6 pede essência.</p>
          <ul className="lista-itens">
            {todosOsItens(e).map(({ item, dono }) => {
              const c = custoMelhoria(item);
              const falta = e.ouro < c.ouro || e.materiais[c.material] < c.quantidade || e.materiais.essencia < c.essencia;
              return (
                <li key={item.uid} id={`melhorar-${item.uid}`} className={item.uid === destaque ? 'destaque' : ''}>
                  <DetalheItem
                    item={item}
                    compacto
                    acoes={
                      item.melhoria >= MELHORIA_MAXIMA ? (
                        <small>Máximo</small>
                      ) : (
                        <>
                          {dono && <small>com {nomeCurto(dono)}</small>}
                          <span className="custo">
                            <Recurso tipo="ouro" valor={c.ouro} falta={e.ouro < c.ouro} />
                            <Recurso tipo={c.material} valor={c.quantidade} falta={e.materiais[c.material] < c.quantidade} />
                            {c.essencia > 0 && <Recurso tipo="essencia" valor={c.essencia} falta={e.materiais.essencia < c.essencia} />}
                          </span>
                          <button disabled={falta} onClick={() => agir((x) => melhorar(x, item.uid))}>
                            +{item.melhoria + 1}
                          </button>
                        </>
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
      {modo === 'desmontar' && (
        <>
          <p className="dica">Desmontar devolve materiais do mapa do item; peças raras ou melhores podem render essência.</p>
          {e.inventario.length === 0 && <p className="dica">Inventário vazio.</p>}
          <ul className="lista-itens">
            {e.inventario.map((item) => (
              <li key={item.uid}>
                <DetalheItem item={item} compacto acoes={<button onClick={() => agir((x) => desmontar(x, item.uid))}>Desmontar</button>} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ---------- Loja ---------- */

function Loja({ e, agir }: { e: Estado; agir: Props['agir'] }) {
  const [modo, setModo] = useState<'comprar' | 'vender'>('comprar');
  const comuns = e.inventario.filter((i) => i.raridade === 'comum' || i.raridade === 'incomum');
  return (
    <section className="painel">
      <h2>Loja</h2>
      <SubAbas<typeof modo>
        abas={[
          ['comprar', 'Comprar'],
          ['vender', `Vender (${e.inventario.length})`],
        ]}
        ativa={modo}
        aoTrocar={setModo}
      />
      {modo === 'comprar' && (
        <>
          <p className="dica">Mercadoria nova em {duracao(e.loja.renovaEm - e.tempo)}. Os itens acompanham o nível da party.</p>
          <ul className="lista-itens">
            {e.loja.itens.map((item) => (
              <li key={item.uid}>
                <DetalheItem
                  item={item}
                  acoes={
                    <button className="principal" disabled={e.ouro < valorDoItem(item)} onClick={() => agir((x) => comprar(x, item.uid))}>
                      Comprar <Recurso tipo="ouro" valor={valorDoItem(item)} falta={e.ouro < valorDoItem(item)} />
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
      {modo === 'vender' && (
        <>
          <h3>Materiais</h3>
          <ul className="materiais-venda">
            {(Object.keys(MATERIAIS) as Material[])
              .filter((m) => m !== 'essencia' && e.materiais[m] >= 1)
              .map((m) => (
                <li key={m}>
                  <Recurso tipo={m} valor={e.materiais[m]} />
                  <small>{MATERIAIS[m].preco} de ouro cada</small>
                  <button onClick={() => agir((x) => venderMaterial(x, m, Math.floor(e.materiais[m] / 2)))}>Metade</button>
                  <button onClick={() => agir((x) => venderMaterial(x, m, e.materiais[m]))}>Tudo</button>
                </li>
              ))}
          </ul>
          <div className="linha-titulo">
            <h3>Itens</h3>
            {comuns.length > 0 && (
              <button onClick={() => agir((x) => vender(x, comuns.map((i) => i.uid)))}>Vender comuns e incomuns ({comuns.length})</button>
            )}
          </div>
          {e.inventario.length === 0 && <p className="dica">Nada no inventário.</p>}
          <ul className="lista-itens">
            {e.inventario.map((item) => (
              <li key={item.uid}>
                <DetalheItem
                  item={item}
                  compacto
                  acoes={
                    <button onClick={() => agir((x) => vender(x, [item.uid]))}>
                      Vender <Recurso tipo="ouro" valor={precoDeVenda(item)} />
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ---------- Taverna ---------- */

function Taverna({ e, agir }: { e: Estado; agir: Props['agir'] }) {
  const lider = e.herois.find((h) => h.id === 'leao')?.nivel ?? 1;
  const candidatos = ORDEM_PERSONAGENS.filter((id) => PERSONAGENS[id].recrutamento);
  return (
    <section className="painel">
      <h2>Taverna do Martelo Cansado</h2>
      <p className="dica">A fama dos LionHearth atrai aliados. Quem entra chega perto do nível da party.</p>
      <ul className="taverna">
        {candidatos.map((id) => {
          const p = PERSONAGENS[id];
          const r = p.recrutamento!;
          const ja = e.herois.some((h) => h.id === id);
          const aparece = lider >= r.nivel;
          return (
            <li key={id} className={ja ? 'recrutado' : aparece ? '' : 'bloqueado'}>
              <Retrato id={id} tamanho={72} animar={aparece} apagado={!aparece} />
              <span className="taverna-info">
                <span className="linha-nome">
                  <strong>{aparece ? p.nome : '???'}</strong>
                  <span className={`papel papel-${p.papel}`}>{p.papelNome}</span>
                </span>
                <small>
                  {p.titulo} · {p.raca}
                </small>
                {aparece ? <p>{p.lore}</p> : <p className="dica">Um vulto no canto da taverna. Volte quando Sir LionHearth chegar ao nível {r.nivel}.</p>}
                {ja ? (
                  <small>✓ Na party</small>
                ) : (
                  <button className="principal" disabled={!aparece || e.ouro < r.ouro} onClick={() => agir((x) => recrutar(x, id))}>
                    Recrutar <Recurso tipo="ouro" valor={r.ouro} falta={e.ouro < r.ouro} />
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- Jardim ---------- */

function Jardim({ e, agir }: { e: Estado; agir: Props['agir'] }) {
  return (
    <section className="painel">
      <h2>Jardim de Habilidades</h2>
      <p className="dica">
        Plante duas habilidades de um mesmo herói e colha uma nova, um rank acima. Algumas combinações têm receitas secretas, com habilidades
        únicas. A fusão leva {duracao(DURACAO_FUSAO)} e cresce mesmo com o jogo fechado; as originais continuam com o herói.
      </p>
      <div className="canteiros">
        {e.canteiros.map((c, i) => (
          <Canteiro key={i} e={e} indice={i} agir={agir} ocupado={c} />
        ))}
      </div>
    </section>
  );
}

function Canteiro({ e, indice, agir, ocupado }: { e: Estado; indice: number; agir: Props['agir']; ocupado: Estado['canteiros'][number] }) {
  const [heroi, setHeroi] = useState<PersonagemId>(e.herois[0].id);
  const h = e.herois.find((x) => x.id === heroi) ?? e.herois[0];
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  if (ocupado) {
    const resultado = previaFusao(e, ocupado.heroi, ocupado.a, ocupado.b);
    const pronto = e.tempo >= ocupado.fim;
    return (
      <div className={`canteiro ${pronto ? 'pronto' : 'crescendo'}`}>
        <div className="planta" aria-hidden>
          {pronto ? '🌸' : '🌱'}
        </div>
        <strong>{nomeHeroi(ocupado.heroi)}</strong>
        <small>
          {habilidade(e, ocupado.a)?.nome} + {habilidade(e, ocupado.b)?.nome}
        </small>
        {pronto ? (
          <>
            {resultado && <CartaoHabilidade e={e} hab={resultado} />}
            <button className="principal" onClick={() => agir((x) => colherFusao(x, indice))}>
              Colher
            </button>
          </>
        ) : (
          <>
            <Medidor valor={e.tempo - ocupado.inicio} maximo={ocupado.fim - ocupado.inicio} cor="#7ed66a" texto={duracao(ocupado.fim - e.tempo)} />
            <small>Resultado: {resultado?.criada ? 'uma habilidade nova' : resultado?.nome}</small>
          </>
        )}
      </div>
    );
  }
  const opcoes = h.habilidades.map((x) => habilidade(e, x.id)).filter((x) => !!x);
  const previa = a && b ? previaFusao(e, h.id, a, b) : null;
  const custo = a && b ? custoFusao(e, a, b) : null;
  const jaSabe = previa && h.habilidades.some((x) => x.id === previa.id);
  return (
    <div className="canteiro vazio">
      <strong>Canteiro {indice + 1}</strong>
      <label className="campo">
        Herói
        <select
          value={h.id}
          onChange={(ev) => {
            setHeroi(ev.target.value as PersonagemId);
            setA('');
            setB('');
          }}
        >
          {e.herois.map((x) => (
            <option key={x.id} value={x.id}>
              {PERSONAGENS[x.id].nome}
            </option>
          ))}
        </select>
      </label>
      {[
        [a, setA],
        [b, setB],
      ].map(([valor, mudar], n) => (
        <label key={n} className="campo">
          Semente {n + 1}
          <select value={valor as string} onChange={(ev) => (mudar as (v: string) => void)(ev.target.value)}>
            <option value="">Escolha…</option>
            {opcoes.map((x) => (
              <option key={x!.id} value={x!.id}>
                {x!.nome} ({x!.rank})
              </option>
            ))}
          </select>
        </label>
      ))}
      {previa && (
        <>
          <small>Vai nascer:</small>
          <CartaoHabilidade e={e} hab={previa} />
        </>
      )}
      {a && b && a === b && <small className="erro">Escolha duas diferentes.</small>}
      {jaSabe && <small className="erro">{nomeCurto(h.id)} já conhece essa habilidade.</small>}
      {custo && (
        <span className="custo">
          <Recurso tipo="ouro" valor={custo.ouro} falta={e.ouro < custo.ouro} />
          <Recurso tipo="essencia" valor={custo.essencia} falta={e.materiais.essencia < custo.essencia} />
        </span>
      )}
      <button
        className="principal"
        disabled={!previa || !!jaSabe || !custo || e.ouro < custo.ouro || e.materiais.essencia < custo.essencia}
        onClick={() => agir((x) => plantarFusao(x, indice, h.id, a, b))}
      >
        Plantar
      </button>
    </div>
  );
}

