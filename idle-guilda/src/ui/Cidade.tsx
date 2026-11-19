import { useEffect, useRef, useState } from 'react';
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
import { BASES, INVENTARIO_MAXIMO, MATERIAIS, MELHORIA_MAXIMA, NOME_SLOT } from '../motor/dados/itens';
import { MAPAS, mapaPorId } from '../motor/dados/mapas';
import { COR_ELEMENTO, ORDEM_PERSONAGENS, PERSONAGENS } from '../motor/dados/personagens';
import { precoDeVenda, valorDoItem } from '../motor/itens';
import { habilidade } from '../motor/status';
import type { Estado, Habilidade, Item, Material, PersonagemId } from '../motor/tipos';
import { CartaoItem } from './CartaoItem';
import { Medidor, Recurso, Retrato, SubAbas } from './comum';
import { IconeUi } from './IconeUi';
import { Modal } from './Modal';
import { GradeItens } from './Mochila';
import { itensBaratos, ordenarItens, pedeConfirmacao } from './regrasMochila';
import { useMidia } from './usarMidia';
import { CartaoHabilidade } from './Ficha';
import { duracao, inteiro, nomeCurto, nomeHeroi } from './texto';

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
    ...e.herois.flatMap((h) =>
      Object.values(h.equipamento)
        .filter((i): i is Item => !!i)
        .map((item) => ({ item, dono: h.id })),
    ),
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

type ModoFerreiro = 'forjar' | 'melhorar' | 'desmontar';

/** Custo com o que falta escrito (não só em vermelho). */
function Custo({ e, ouro, material, quantidade, essencia }: { e: Estado; ouro: number; material: Material; quantidade: number; essencia: number }) {
  const faltas = [
    e.ouro < ouro && `${inteiro(ouro - e.ouro)} de ouro`,
    e.materiais[material] < quantidade && `${inteiro(quantidade - e.materiais[material])} de ${MATERIAIS[material].nome.toLowerCase()}`,
    essencia > 0 && e.materiais.essencia < essencia && `${inteiro(essencia - e.materiais.essencia)} de essência`,
  ].filter(Boolean);
  return (
    <div className="custo-bloco">
      <span className="custo">
        <Recurso tipo="ouro" valor={ouro} falta={e.ouro < ouro} dica />
        <Recurso tipo={material} valor={quantidade} falta={e.materiais[material] < quantidade} dica />
        {essencia > 0 && <Recurso tipo="essencia" valor={essencia} falta={e.materiais.essencia < essencia} dica />}
      </span>
      {faltas.length > 0 && <small className="erro">Faltam {faltas.join(', ')}.</small>}
    </div>
  );
}

/** Barra de melhorias de +0 a +10. */
function BarraMelhoria({ nivel }: { nivel: number }) {
  return (
    <div className="barra-melhoria">
      <span className="barra-melhoria-trilho" role="meter" aria-label="Melhorias" aria-valuemin={0} aria-valuemax={MELHORIA_MAXIMA} aria-valuenow={nivel}>
        {Array.from({ length: MELHORIA_MAXIMA }, (_, i) => (
          <span key={i} className={i < nivel ? 'feito' : i === nivel ? 'proximo' : ''}>
            {i + 1 === 6 && <em aria-hidden>◆</em>}
          </span>
        ))}
      </span>
      <small>
        +{nivel} de +{MELHORIA_MAXIMA}
        {nivel < MELHORIA_MAXIMA && nivel >= 5 && ' · a partir de +6 pede essência (◆)'}
      </small>
    </div>
  );
}

function Ferreiro({ e, agir, destaque }: { e: Estado; agir: Props['agir']; destaque: string | null }) {
  const [modo, setModo] = useState<ModoFerreiro>(destaque ? 'melhorar' : 'forjar');
  const [selecionado, setSelecionado] = useState<string | null>(destaque);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const detalhe = useRef<HTMLDivElement>(null);
  const estreito = useMidia('(max-width: 899px)');
  useEffect(() => {
    if (!destaque) return;
    setModo('melhorar');
    setSelecionado(destaque);
  }, [destaque]);

  const liberados = MAPAS.filter((m) => e.mapasLiberados.includes(m.id));
  const [mapa, setMapa] = useState(liberados.at(-1)!.id);
  const [base, setBase] = useState('peitoral-pesada');
  const [essencia, setEssencia] = useState(false);
  const custo = custoForja(mapa, essencia);
  const falta = e.ouro < custo.ouro || e.materiais[custo.material] < custo.quantidade || e.materiais.essencia < custo.essencia;

  const todos = todosOsItens(e);
  const donos = new Map(todos.filter((x) => x.dono).map((x) => [x.item.uid, x.dono!]));
  const equipados = todos.filter((x) => x.dono).map((x) => x.item);
  const listaMelhorar = [...equipados, ...ordenarItens(e.inventario, 'raridade')];
  const sel = todos.find((x) => x.item.uid === selecionado);

  const tocar = (uid: string) => {
    if (modo === 'desmontar') {
      setConfirmar(false);
      setMarcados((m) => {
        const n = new Set(m);
        if (n.has(uid)) n.delete(uid);
        else n.add(uid);
        return n;
      });
      return;
    }
    setSelecionado(uid);
    if (estreito) requestAnimationFrame(() => detalhe.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };

  const marcadosValidos = e.inventario.filter((i) => marcados.has(i.uid));
  const desmontarMarcados = () => {
    if (marcadosValidos.some(pedeConfirmacao) && !confirmar) {
      setConfirmar(true);
      return;
    }
    const lista = marcadosValidos.map((i) => i.uid);
    agir((x) => {
      let atual = x;
      for (const uid of lista) {
        const r = desmontar(atual, uid);
        if (!r.ok) return r;
        atual = r.estado;
      }
      return { ok: true, estado: atual };
    });
    setMarcados(new Set());
    setConfirmar(false);
  };

  return (
    <section className="painel">
      <h2>Ferreiro</h2>
      <SubAbas<ModoFerreiro>
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
          <Custo e={e} ouro={custo.ouro} material={custo.material} quantidade={custo.quantidade} essencia={custo.essencia} />
          <button
            className="principal"
            disabled={falta || e.inventario.length >= INVENTARIO_MAXIMO}
            onClick={() => agir((x) => forjar(x, mapa, base, essencia))}
          >
            Forjar
          </button>
          {e.inventario.length >= INVENTARIO_MAXIMO && <small className="erro">Mochila cheia: libere espaço antes de forjar.</small>}
          {e.inventario.length > 0 && (
            <>
              <h3>Última forja</h3>
              <div className="cartao-destaque">
                <CartaoItem estado={e} item={e.inventario.at(-1)!} />
              </div>
            </>
          )}
        </div>
      )}
      {modo === 'melhorar' && (
        <div className="ferreiro-grade duas-colunas">
          <div className="coluna fixa ferreiro-detalhe" ref={detalhe}>
            {sel ? (
              <PainelMelhoria e={e} item={sel.item} dono={sel.dono} agir={agir} />
            ) : (
              <p className="dica">
                Escolha uma peça na grade. Cada melhoria soma 8% aos atributos do item (relíquias: 5% às passivas). A partir de +6 pede essência.
              </p>
            )}
          </div>
          <div className="coluna">
            <small>Peças equipadas aparecem primeiro, com o nome de quem usa.</small>
            <GradeItens estado={e} itens={listaMelhorar} rotulo="Peças para melhorar" donos={donos} selecionado={sel?.item.uid} aoTocar={tocar} />
          </div>
        </div>
      )}
      {modo === 'desmontar' && (
        <>
          <p className="dica">Desmontar devolve materiais do mapa do item; peças raras ou melhores podem render essência. Toque para marcar.</p>
          {e.inventario.length === 0 ? (
            <p className="dica">Mochila vazia. Lute em {mapaPorId(e.batalha.mapa).nome} ou visite a Loja.</p>
          ) : (
            <>
              <div className="mochila-lote-atalhos">
                <button className="link" onClick={() => setMarcados(new Set(itensBaratos(e.inventario).map((i) => i.uid)))}>
                  Selecionar comuns e incomuns
                </button>
                {marcadosValidos.length > 0 && (
                  <button className="link" onClick={() => setMarcados(new Set())}>
                    Limpar seleção
                  </button>
                )}
              </div>
              <GradeItens estado={e} itens={ordenarItens(e.inventario, 'raridade')} rotulo="Itens para desmontar" marcados={marcados} aoTocar={tocar} />
              <div className="acao-lote">
                <button className="perigo" disabled={marcadosValidos.length === 0} onClick={desmontarMarcados}>
                  <IconeUi nome="desmontar" tamanho={16} /> {confirmar ? 'Confirmar?' : `Desmontar (${marcadosValidos.length})`}
                </button>
                {confirmar && <small className="erro">Há itens raros ou melhores marcados. Não dá para desfazer.</small>}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function PainelMelhoria({ e, item, dono, agir }: { e: Estado; item: Item; dono?: PersonagemId; agir: Props['agir'] }) {
  const c = custoMelhoria(item);
  const maximo = item.melhoria >= MELHORIA_MAXIMA;
  const falta = e.ouro < c.ouro || e.materiais[c.material] < c.quantidade || e.materiais.essencia < c.essencia;
  return (
    <div className="painel-melhoria">
      <CartaoItem estado={e} item={item} dono={dono} />
      <BarraMelhoria nivel={item.melhoria} />
      {maximo ? (
        <p>Melhoria máxima.</p>
      ) : (
        <>
          <Custo e={e} ouro={c.ouro} material={c.material} quantidade={c.quantidade} essencia={c.essencia} />
          <button className="principal" disabled={falta} onClick={() => agir((x) => melhorar(x, item.uid))}>
            Melhorar para +{item.melhoria + 1}
          </button>
        </>
      )}
    </div>
  );
}

/* ---------- Loja ---------- */

function Loja({ e, agir }: { e: Estado; agir: Props['agir'] }) {
  const [modo, setModo] = useState<'comprar' | 'vender'>('comprar');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const detalhe = useRef<HTMLDivElement>(null);
  const estreito = useMidia('(max-width: 899px)');
  const item = e.loja.itens.find((i) => i.uid === selecionado);
  const marcadosValidos = e.inventario.filter((i) => marcados.has(i.uid));
  const ouroLote = marcadosValidos.reduce((s, i) => s + precoDeVenda(i), 0);
  const cheia = e.inventario.length >= INVENTARIO_MAXIMO;

  const venderMarcados = () => {
    if (marcadosValidos.some(pedeConfirmacao) && !confirmar) {
      setConfirmar(true);
      return;
    }
    agir((x) =>
      vender(
        x,
        marcadosValidos.map((i) => i.uid),
      ),
    );
    setMarcados(new Set());
    setConfirmar(false);
  };

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
          {e.loja.itens.length === 0 ? (
            <p className="dica">Tudo vendido. Volte quando a mercadoria renovar.</p>
          ) : (
            <div className="duas-colunas">
              <div className="coluna fixa" ref={detalhe}>
                {item ? (
                  <div className="cartao-destaque">
                    <CartaoItem
                      estado={e}
                      item={item}
                      semVenda
                      acoes={
                        <button className="principal" disabled={e.ouro < valorDoItem(item) || cheia} onClick={() => agir((x) => comprar(x, item.uid))}>
                          Comprar <Recurso tipo="ouro" valor={valorDoItem(item)} falta={e.ouro < valorDoItem(item)} />
                        </button>
                      }
                    />
                    {e.ouro < valorDoItem(item) && <small className="erro">Faltam {inteiro(valorDoItem(item) - e.ouro)} de ouro.</small>}
                    {cheia && <small className="erro">Mochila cheia: venda algo antes de comprar.</small>}
                  </div>
                ) : (
                  <p className="dica">Escolha um item para ver detalhes, comparar e comprar.</p>
                )}
              </div>
              <div className="coluna">
                <GradeItens
                  estado={e}
                  itens={e.loja.itens}
                  rotulo="Itens à venda"
                  selecionado={item?.uid}
                  aoTocar={(uid) => {
                    setSelecionado(uid);
                    if (estreito) requestAnimationFrame(() => detalhe.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
                  }}
                />
              </div>
            </div>
          )}
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
          <h3>Itens</h3>
          {e.inventario.length === 0 ? (
            <p className="dica">Nada na mochila. Lute em {mapaPorId(e.batalha.mapa).nome} para conseguir itens.</p>
          ) : (
            <>
              <div className="mochila-lote-atalhos">
                <small>Toque para marcar o que vender.</small>
                <button className="link" onClick={() => setMarcados(new Set(itensBaratos(e.inventario).map((i) => i.uid)))}>
                  Selecionar comuns e incomuns ({itensBaratos(e.inventario).length})
                </button>
              </div>
              <GradeItens
                estado={e}
                itens={ordenarItens(e.inventario, 'raridade')}
                rotulo="Itens para vender"
                marcados={marcados}
                aoTocar={(uid) => {
                  setConfirmar(false);
                  setMarcados((m) => {
                    const n = new Set(m);
                    if (n.has(uid)) n.delete(uid);
                    else n.add(uid);
                    return n;
                  });
                }}
              />
              <div className="acao-lote">
                <button className="perigo" disabled={marcadosValidos.length === 0} onClick={venderMarcados}>
                  <IconeUi nome="vender" tamanho={16} /> {confirmar ? 'Confirmar?' : `Vender (${marcadosValidos.length})`}{' '}
                  <Recurso tipo="ouro" valor={ouroLote} />
                </button>
                {marcadosValidos.length > 0 && (
                  <button className="link" onClick={() => setMarcados(new Set())}>
                    Limpar seleção
                  </button>
                )}
                {confirmar && <small className="erro">Há itens raros ou melhores marcados. Não dá para desfazer.</small>}
              </div>
            </>
          )}
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
        Plante duas habilidades de um mesmo herói e colha uma nova, um rank acima. Algumas combinações têm receitas secretas, com habilidades únicas. A fusão
        leva {duracao(DURACAO_FUSAO)} e cresce mesmo com o jogo fechado; as originais continuam com o herói.
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
  const [escolhendo, setEscolhendo] = useState<number | null>(null);
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
  const opcoes = h.habilidades.map((x) => habilidade(e, x.id)).filter((x): x is Habilidade => !!x);
  const previa = a && b && a !== b ? previaFusao(e, h.id, a, b) : null;
  const custo = a && b ? custoFusao(e, a, b) : null;
  const jaSabe = previa && h.habilidades.some((x) => x.id === previa.id);
  const sementes: [string, (v: string) => void][] = [
    [a, setA],
    [b, setB],
  ];
  return (
    <div className="canteiro vazio">
      <strong>Canteiro {indice + 1}</strong>
      <div className="escolha-retratos" role="radiogroup" aria-label="Herói">
        {e.herois.map((x) => (
          <button
            key={x.id}
            role="radio"
            aria-checked={x.id === h.id}
            className={x.id === h.id ? 'ativa' : ''}
            onClick={() => {
              setHeroi(x.id);
              setA('');
              setB('');
            }}
          >
            <Retrato id={x.id} tamanho={36} />
            <small>{nomeCurto(x.id)}</small>
          </button>
        ))}
      </div>
      <div className="ranhuras">
        {sementes.map(([valor], n) => {
          const hab = valor ? habilidade(e, valor) : undefined;
          return (
            <button
              key={n}
              className={`ranhura ${hab ? 'cheia' : ''}`}
              onClick={() => setEscolhendo(n)}
              style={hab ? ({ '--el': COR_ELEMENTO[hab.elemento] } as React.CSSProperties) : undefined}
            >
              <small>Semente {n + 1}</small>
              {hab ? (
                <span>
                  <span className={`rank rank-${hab.rank}`}>{hab.rank}</span> {hab.nome}
                </span>
              ) : (
                <span className="dica">Escolher…</span>
              )}
            </button>
          );
        })}
      </div>
      {escolhendo !== null && (
        <Modal variante="folha" titulo={`Semente ${escolhendo + 1} de ${nomeCurto(h.id)}`} aoFechar={() => setEscolhendo(null)}>
          {opcoes.length < 2 && <p className="dica">{nomeCurto(h.id)} precisa conhecer pelo menos duas habilidades. Aprenda mais na Árvore.</p>}
          <ul className="habilidades">
            {opcoes.map((x) => {
              const outra = sementes[1 - escolhendo][0];
              return (
                <li key={x.id}>
                  <CartaoHabilidade
                    e={e}
                    h={h}
                    hab={x}
                    acoes={
                      <button
                        className="principal"
                        disabled={x.id === outra}
                        onClick={() => {
                          sementes[escolhendo][1](x.id);
                          setEscolhendo(null);
                        }}
                      >
                        {x.id === outra ? 'Já na outra semente' : 'Plantar esta'}
                      </button>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
      {previa ? (
        <div className="previa-fusao">
          <small>Vai nascer:</small>
          <CartaoHabilidade e={e} hab={previa} />
        </div>
      ) : (
        <p className="dica">Escolha duas sementes para ver a prévia.</p>
      )}
      {jaSabe && <small className="erro">{nomeCurto(h.id)} já conhece essa habilidade.</small>}
      {custo && (
        <span className="custo">
          <Recurso tipo="ouro" valor={custo.ouro} falta={e.ouro < custo.ouro} dica />
          <Recurso tipo="essencia" valor={custo.essencia} falta={e.materiais.essencia < custo.essencia} dica />
          {(e.ouro < custo.ouro || e.materiais.essencia < custo.essencia) && <small className="erro">Faltam recursos.</small>}
        </span>
      )}
      <button
        className="principal"
        disabled={!previa || !!jaSabe || !custo || e.ouro < custo.ouro || e.materiais.essencia < custo.essencia}
        onClick={() => agir((x) => plantarFusao(x, indice, h.id, a, b))}
      >
        Plantar ({duracao(DURACAO_FUSAO)})
      </button>
    </div>
  );
}
