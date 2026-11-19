import { memo, useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { desmontar, equiparItem, podeUsar, slotsDoItem, vender, type Resultado } from '../motor/acoes';
import { DADOS_RARIDADE, INVENTARIO_MAXIMO, NOME_SLOT, RARIDADES } from '../motor/dados/itens';
import { NOME_STAT, PERSONAGENS } from '../motor/dados/personagens';
import { precoDeVenda } from '../motor/itens';
import type { Estado, Item, PersonagemId, Raridade, Slot, Stat } from '../motor/tipos';
import { CartaoItem, rotuloDoItem } from './CartaoItem';
import { IconeItem, Medidor, Recurso, Retrato } from './comum';
import { Dica } from './Dica';
import { IconeUi } from './IconeUi';
import {
  CHAVE_PREFERENCIAS,
  diferencaStats,
  espacoAlvo,
  filtrarItens,
  FILTRO_PADRAO,
  heroisParaItem,
  itensBaratos,
  lerPreferencias,
  NOME_ESPACO,
  NOME_ORDEM,
  ordenarItens,
  pedeConfirmacao,
  type Espaco,
  type FiltroMochila,
  type Ordem,
} from './regrasMochila';
import { Modal } from './Modal';
import { compacto, inteiro, nomeCurto, nomeItem } from './texto';
import { useMidia } from './usarMidia';

type Agir = (acao: (e: Estado) => Resultado) => void;

/** uids dos itens do inventário que podem ser melhoria para alguém. */
export function useMelhorias(e: Estado): Set<string> {
  // O estado muda a cada tick; a chave só muda com inventário ou equipamento.
  const chave =
    e.inventario.map((i) => `${i.uid}${i.melhoria}`).join() +
    '|' +
    e.herois
      .map(
        (h) =>
          `${h.id}${h.nivel}:${Object.values(h.equipamento)
            .map((i) => `${i?.uid}${i?.melhoria}`)
            .join()}`,
      )
      .join();
  return useMemo(() => new Set(e.inventario.filter((i) => heroisParaItem(e, i).length > 0).map((i) => i.uid)), [chave]); // eslint-disable-line react-hooks/exhaustive-deps
}

function lerPreferenciasSalvas() {
  try {
    return lerPreferencias(localStorage.getItem(CHAVE_PREFERENCIAS));
  } catch {
    return lerPreferencias(null);
  }
}

/** Faixa de aviso da mochila cheia (Mochila e Batalha). */
export function AvisoMochilaCheia({ estado: e, agir }: { estado: Estado; agir: Agir }) {
  if (e.inventario.length < INVENTARIO_MAXIMO) return null;
  const baratos = itensBaratos(e.inventario);
  return (
    <div className="faixa-aviso" role="status">
      <span>
        <strong>Mochila cheia:</strong> itens novos são vendidos na hora.
      </span>
      <button
        disabled={baratos.length === 0}
        onClick={() =>
          agir((x) =>
            vender(
              x,
              baratos.map((i) => i.uid),
            ),
          )
        }
      >
        Liberar espaço{baratos.length > 0 && ` (${baratos.length})`}
      </button>
    </div>
  );
}

/* ---------- Célula da grade ---------- */

interface PropsCelula {
  estado: Estado;
  item: Item;
  selecionado: boolean;
  marcado: boolean;
  melhoria: boolean;
  hover: boolean;
  aoTocar: (uid: string) => void;
  /** Herói que está usando a peça (Ferreiro mostra equipados e mochila juntos). */
  dono?: PersonagemId;
}

const Celula = memo(
  function Celula({ estado, item, selecionado, marcado, melhoria, hover, aoTocar, dono }: PropsCelula) {
    const botao = (
      <button
        className={`celula raridade-${item.raridade} ${selecionado ? 'selecionada' : ''} ${marcado ? 'marcada' : ''}`}
        style={{ '--cor-raridade': DADOS_RARIDADE[item.raridade].cor } as React.CSSProperties}
        aria-label={`${rotuloDoItem(item)}${item.conjunto ? ', de conjunto' : ''}${melhoria ? ', possível melhoria' : ''}${dono ? `, equipado em ${nomeCurto(dono)}` : ''}`}
        aria-pressed={marcado || selecionado}
        onClick={() => aoTocar(item.uid)}
        data-celula
      >
        <IconeItem item={item} escala={4} />
        <span className="celula-nivel" aria-hidden>
          {item.nivel}
        </span>
        {item.melhoria > 0 && (
          <span className="celula-melhoria" aria-hidden>
            +{item.melhoria}
          </span>
        )}
        {item.conjunto && (
          <span className="celula-conjunto" aria-hidden>
            ◆
          </span>
        )}
        {dono && (
          <span className="celula-dono" aria-hidden>
            {nomeCurto(dono).slice(0, 3)}
          </span>
        )}
        {melhoria && (
          <span className="celula-melhor" aria-hidden>
            ▲
          </span>
        )}
        {marcado && (
          <span className="celula-marca" aria-hidden>
            ✓
          </span>
        )}
      </button>
    );
    if (!hover) return botao;
    return (
      <Dica toque="nenhum" larga conteudo={() => <CartaoItem estado={estado} item={item} compacto />}>
        {botao}
      </Dica>
    );
  },
  // O estado muda a cada tick; a célula só muda com o próprio item ou a seleção.
  (a, b) =>
    a.item.uid === b.item.uid &&
    a.item.melhoria === b.item.melhoria &&
    a.selecionado === b.selecionado &&
    a.marcado === b.marcado &&
    a.melhoria === b.melhoria &&
    a.hover === b.hover &&
    a.dono === b.dono &&
    a.aoTocar === b.aoTocar,
);

/** Grade de itens reaproveitada pela Mochila, Ferreiro e Loja. */
export function GradeItens(props: {
  estado: Estado;
  itens: Item[];
  rotulo: string;
  aoTocar: (uid: string) => void;
  selecionado?: string | null;
  marcados?: ReadonlySet<string>;
  melhorias?: ReadonlySet<string>;
  donos?: ReadonlyMap<string, PersonagemId>;
  /** Espaços vazios desenhados depois dos itens. */
  vazios?: number;
}) {
  const comMouse = useMidia('(hover: hover) and (pointer: fine)');
  return (
    <div className="grade-itens" role="group" aria-label={props.rotulo} onKeyDown={navegarGrade}>
      {props.itens.map((item) => (
        <Celula
          key={item.uid}
          estado={props.estado}
          item={item}
          selecionado={item.uid === props.selecionado}
          marcado={!!props.marcados?.has(item.uid)}
          melhoria={!!props.melhorias?.has(item.uid)}
          dono={props.donos?.get(item.uid)}
          hover={comMouse}
          aoTocar={props.aoTocar}
        />
      ))}
      {Array.from({ length: props.vazios ?? 0 }, (_, i) => (
        <span key={`livre-${i}`} className="celula vazia" aria-hidden />
      ))}
    </div>
  );
}

/** Setas do teclado movem o foco pela grade. */
function navegarGrade(ev: KeyboardEvent<HTMLDivElement>) {
  const setas: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 0, ArrowUp: 0 };
  if (!(ev.key in setas)) return;
  const celulas = [...ev.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-celula]')];
  const i = celulas.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0) return;
  const topo = celulas[0].offsetTop;
  const colunas = Math.max(1, celulas.filter((c) => c.offsetTop === topo).length);
  const passo = ev.key === 'ArrowDown' ? colunas : ev.key === 'ArrowUp' ? -colunas : setas[ev.key];
  const alvo = celulas[i + passo];
  if (alvo) {
    ev.preventDefault();
    alvo.focus();
  }
}

/* ---------- Tela ---------- */

interface Props {
  estado: Estado;
  agir: Agir;
  aoFerreiro: (uid: string) => void;
  /** Vindo da Ficha: abre filtrada para este herói. */
  paraHeroi?: { heroi: PersonagemId; soMelhorias?: boolean } | null;
}

export function Mochila({ estado: e, agir, aoFerreiro, paraHeroi }: Props) {
  const [pref, setPref] = useState(lerPreferenciasSalvas);
  const { filtro, ordem } = pref;
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [modoLote, setModoLote] = useState(false);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [confirmarLote, setConfirmarLote] = useState<'vender' | 'desmontar' | null>(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const estreito = useMidia('(max-width: 559px)');
  const largo = useMidia('(min-width: 900px)');
  const melhorias = useMelhorias(e);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(pref));
    } catch {
      // Sem localStorage (modo privado): a escolha vale só nesta sessão.
    }
  }, [pref]);

  useEffect(() => {
    if (paraHeroi) setPref((p) => ({ ...p, filtro: { ...FILTRO_PADRAO, heroi: paraHeroi.heroi, soMelhorias: !!paraHeroi.soMelhorias } }));
  }, [paraHeroi]);

  const mudarFiltro = (f: Partial<FiltroMochila>) => setPref((p) => ({ ...p, filtro: { ...p.filtro, ...f } }));
  const qtdFiltros = filtro.raridades.length + (filtro.heroi ? 1 : 0) + (filtro.soMelhorias ? 1 : 0) + (ordem !== 'recentes' ? 1 : 0);
  const filtroAtivo = filtro.espaco !== 'todos' || filtro.raridades.length > 0 || !!filtro.heroi || filtro.soMelhorias;

  const itens = useMemo(
    () => ordenarItens(filtrarItens(e, e.inventario, filtro, melhorias), ordem),
    [e.inventario, filtro, ordem, melhorias], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Remove da seleção o que saiu do inventário.
  const uids = useMemo(() => new Set(e.inventario.map((i) => i.uid)), [e.inventario]);
  const itemSelecionado = selecionado && uids.has(selecionado) ? e.inventario.find((i) => i.uid === selecionado)! : null;
  const marcadosValidos = [...marcados].filter((u) => uids.has(u));
  const itensMarcados = e.inventario.filter((i) => marcados.has(i.uid));

  const aoTocar = useCallback(
    (uid: string) => {
      if (modoLote) {
        setConfirmarLote(null);
        setMarcados((m) => {
          const n = new Set(m);
          if (n.has(uid)) n.delete(uid);
          else n.add(uid);
          return n;
        });
      } else {
        setSelecionado((s) => (s === uid && largo ? null : uid));
      }
    },
    [modoLote, largo],
  );

  const sairDoLote = () => {
    setModoLote(false);
    setMarcados(new Set());
    setConfirmarLote(null);
  };

  const agirLote = (tipo: 'vender' | 'desmontar') => {
    const raros = itensMarcados.some(pedeConfirmacao);
    if (raros && confirmarLote !== tipo) {
      setConfirmarLote(tipo);
      return;
    }
    const lista = marcadosValidos;
    if (tipo === 'vender') agir((x) => vender(x, lista));
    else
      agir((x) => {
        let atual = x;
        for (const uid of lista) {
          const r = desmontar(atual, uid);
          if (!r.ok) return r;
          atual = r.estado;
        }
        return { ok: true, estado: atual };
      });
    sairDoLote();
  };

  const ocupados = e.inventario.length;
  const livres = Math.max(0, INVENTARIO_MAXIMO - ocupados);
  const ouroLote = itensMarcados.reduce((s, i) => s + precoDeVenda(i), 0);

  const cartao = itemSelecionado && (
    <CartaoItem
      key={itemSelecionado.uid}
      estado={e}
      item={itemSelecionado}
      heroiInicial={filtro.heroi ?? undefined}
      acoes={<AcoesItem estado={e} item={itemSelecionado} agir={agir} aoFerreiro={aoFerreiro} aoFeito={() => setSelecionado(null)} />}
    />
  );

  return (
    <div className={`mochila ${largo ? 'larga' : ''} ${modoLote ? 'em-lote' : ''}`}>
      <section className="painel mochila-principal">
        <div className="mochila-cabecalho">
          <h2>
            <IconeUi nome="mochila" tamanho={20} /> Mochila
          </h2>
          <span className="mochila-ocupacao">
            <Medidor
              valor={ocupados}
              maximo={INVENTARIO_MAXIMO}
              cor={ocupados >= INVENTARIO_MAXIMO ? 'var(--perigo)' : ocupados >= INVENTARIO_MAXIMO * 0.8 ? 'var(--ouro)' : 'var(--acento)'}
              texto={`${ocupados}/${INVENTARIO_MAXIMO}`}
              fino
            />
            <small>{livres > 0 ? `${livres} ${livres === 1 ? 'espaço livre' : 'espaços livres'}` : 'sem espaço'}</small>
          </span>
          <button className={modoLote ? 'ativa' : ''} onClick={() => (modoLote ? sairDoLote() : setModoLote(true))} aria-pressed={modoLote}>
            <IconeUi nome="selecionar" tamanho={16} /> {modoLote ? 'Cancelar' : 'Selecionar'}
          </button>
        </div>

        <AvisoMochilaCheia estado={e} agir={agir} />

        <div className="mochila-filtros">
          <div className="chips" role="group" aria-label="Espaço">
            {(Object.keys(NOME_ESPACO) as (Espaco | 'todos')[]).map((esp) => (
              <button
                key={esp}
                className={`chip ${filtro.espaco === esp ? 'ativa' : ''}`}
                aria-pressed={filtro.espaco === esp}
                onClick={() => mudarFiltro({ espaco: esp })}
              >
                {NOME_ESPACO[esp]}
              </button>
            ))}
          </div>
          {estreito && (
            <button className="link" aria-expanded={filtrosAbertos} onClick={() => setFiltrosAbertos(!filtrosAbertos)}>
              <IconeUi nome="filtro" tamanho={14} /> {filtrosAbertos ? 'Menos filtros' : 'Mais filtros e ordem'}
              {qtdFiltros > 0 && ` (${qtdFiltros} ativos)`}
            </button>
          )}
          {(!estreito || filtrosAbertos) && (
            <>
              <div className="chips" role="group" aria-label="Raridade">
                {RARIDADES.map((r: Raridade) => {
                  const ativa = filtro.raridades.includes(r);
                  return (
                    <button
                      key={r}
                      className={`chip chip-raridade ${ativa ? 'ativa' : ''}`}
                      style={{ '--cor-raridade': DADOS_RARIDADE[r].cor } as React.CSSProperties}
                      aria-pressed={ativa}
                      onClick={() => mudarFiltro({ raridades: ativa ? filtro.raridades.filter((x) => x !== r) : [...filtro.raridades, r] })}
                    >
                      <span className="ponto-raridade" style={{ background: DADOS_RARIDADE[r].cor }} aria-hidden />
                      {DADOS_RARIDADE[r].nome}
                    </button>
                  );
                })}
              </div>
              <div className="mochila-controles">
                <label className="campo-pilha">
                  Para quem
                  <select value={filtro.heroi ?? ''} onChange={(ev) => mudarFiltro({ heroi: (ev.target.value || null) as PersonagemId | null })}>
                    <option value="">Todos</option>
                    {e.herois.map((h) => (
                      <option key={h.id} value={h.id}>
                        {PERSONAGENS[h.id].nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="campo-pilha">
                  <span>
                    <IconeUi nome="ordenar" tamanho={14} /> Ordenar por
                  </span>
                  <select value={ordem} onChange={(ev) => setPref((p) => ({ ...p, ordem: ev.target.value as Ordem }))}>
                    {(Object.keys(NOME_ORDEM) as Ordem[]).map((o) => (
                      <option key={o} value={o}>
                        {NOME_ORDEM[o]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="alternador">
                  <input type="checkbox" checked={filtro.soMelhorias} onChange={(ev) => mudarFiltro({ soMelhorias: ev.target.checked })} />
                  Só possíveis melhorias <span className="melhor">▲</span>
                </label>
                {filtroAtivo && (
                  <button className="link" onClick={() => mudarFiltro(FILTRO_PADRAO)}>
                    Limpar filtros
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {modoLote && (
          <div className="mochila-lote-atalhos">
            <small>Toque nos itens para marcar ({marcadosValidos.length}).</small>
            <button className="link" onClick={() => setMarcados(new Set(itensBaratos(e.inventario).map((i) => i.uid)))}>
              Selecionar comuns e incomuns
            </button>
          </div>
        )}

        {ocupados === 0 ? (
          <div className="vazio-estado">
            <IconeUi nome="mochila" tamanho={40} />
            <p>Mochila vazia.</p>
            <p className="dica">Monstros, chefes, expedições, a Loja e o Ferreiro dão itens.</p>
          </div>
        ) : itens.length === 0 ? (
          <div className="vazio-estado">
            <p>Nenhum item com esses filtros.</p>
            <button onClick={() => mudarFiltro(FILTRO_PADRAO)}>Limpar filtros</button>
          </div>
        ) : null}

        {ocupados > 0 && (
          <GradeItens
            estado={e}
            itens={itens}
            rotulo={`Itens da mochila: ${itens.length} mostrados`}
            selecionado={modoLote ? null : itemSelecionado?.uid}
            marcados={modoLote ? marcados : undefined}
            melhorias={melhorias}
            vazios={filtroAtivo ? 0 : livres}
            aoTocar={aoTocar}
          />
        )}
        {ocupados > 0 && <p className="dica legenda-grade">Canto superior: nível · ▲ possível melhoria · ◆ conjunto · +N melhorias no Ferreiro.</p>}
      </section>

      {largo && !modoLote && (
        <aside className="painel mochila-lateral" aria-label="Item selecionado">
          {cartao ?? <p className="dica">Escolha um item na grade para ver detalhes, comparar e agir.</p>}
        </aside>
      )}

      {!largo && !modoLote && itemSelecionado && (
        <Modal variante="folha" titulo={nomeItem(itemSelecionado)} aoFechar={() => setSelecionado(null)}>
          {cartao}
        </Modal>
      )}

      {modoLote && (
        <div className="barra-lote" role="toolbar" aria-label="Ações nos itens marcados">
          <span>
            <strong>{marcadosValidos.length}</strong> {marcadosValidos.length === 1 ? 'item' : 'itens'}
          </span>
          <button className="perigo" disabled={marcadosValidos.length === 0} onClick={() => agirLote('vender')}>
            <IconeUi nome="vender" tamanho={16} />
            {confirmarLote === 'vender' ? 'Confirmar?' : `Vender (${marcadosValidos.length})`} <Recurso tipo="ouro" valor={ouroLote} />
          </button>
          <button className="perigo" disabled={marcadosValidos.length === 0} onClick={() => agirLote('desmontar')}>
            <IconeUi nome="desmontar" tamanho={16} />
            {confirmarLote === 'desmontar' ? 'Confirmar?' : `Desmontar (${marcadosValidos.length})`}
          </button>
          {confirmarLote && <small className="erro">Há itens raros ou melhores marcados. Não dá para desfazer.</small>}
        </div>
      )}
    </div>
  );
}

/* ---------- Ações do cartão ---------- */

function AcoesItem({
  estado: e,
  item,
  agir,
  aoFerreiro,
  aoFeito,
}: {
  estado: Estado;
  item: Item;
  agir: Agir;
  aoFerreiro: (uid: string) => void;
  aoFeito: () => void;
}) {
  const [confirmar, setConfirmar] = useState<'vender' | 'desmontar' | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const usaveis = e.herois.filter((h) => !podeUsar(h, item));
  const doisEspacos = slotsDoItem(item).length > 1;

  const equipar = () => {
    const h = usaveis[0];
    if (usaveis.length === 1 && !doisEspacos) {
      agir((x) => equiparItem(x, h.id, item.uid));
      aoFeito();
    } else setEscolhendo(true);
  };

  const acao = (tipo: 'vender' | 'desmontar') => {
    if (pedeConfirmacao(item) && confirmar !== tipo) {
      setConfirmar(tipo);
      return;
    }
    agir((x) => (tipo === 'vender' ? vender(x, [item.uid]) : desmontar(x, item.uid)));
    aoFeito();
  };

  return (
    <>
      <button className="principal" disabled={usaveis.length === 0} onClick={equipar}>
        {usaveis.length === 1 && !doisEspacos ? `Equipar em ${nomeCurto(usaveis[0].id)}` : 'Equipar…'}
      </button>
      <button onClick={() => aoFerreiro(item.uid)}>Melhorar no Ferreiro</button>
      <button className="perigo" onClick={() => acao('vender')}>
        {confirmar === 'vender' ? 'Confirmar?' : 'Vender'} <Recurso tipo="ouro" valor={precoDeVenda(item)} />
      </button>
      <button className="perigo" onClick={() => acao('desmontar')}>
        {confirmar === 'desmontar' ? 'Confirmar?' : 'Desmontar'}
      </button>
      {escolhendo && (
        <EscolherHeroi
          estado={e}
          item={item}
          aoFechar={() => setEscolhendo(false)}
          aoEscolher={(id, slot) => {
            agir((x) => equiparItem(x, id, item.uid, slot));
            setEscolhendo(false);
            aoFeito();
          }}
        />
      )}
    </>
  );
}

/** Escolha do herói (e do espaço, para acessórios), com a comparação de cada um. */
function EscolherHeroi(props: { estado: Estado; item: Item; aoFechar: () => void; aoEscolher: (id: PersonagemId, slot?: Slot) => void }) {
  const { estado: e, item } = props;
  const slots = slotsDoItem(item);
  return (
    <Modal variante="folha" titulo={`Equipar ${nomeItem(item)}`} aoFechar={props.aoFechar}>
      <ul className="escolha-heroi">
        {e.herois.map((h) => {
          const motivo = podeUsar(h, item);
          const alvo = espacoAlvo(h, item);
          const dif = diferencaStats(item, alvo?.atual);
          return (
            <li key={h.id} className={motivo ? 'nao' : ''}>
              <Retrato id={h.id} tamanho={40} />
              <span className="escolha-heroi-info">
                <strong>{PERSONAGENS[h.id].nome}</strong>
                {motivo ? (
                  <small>{motivo}</small>
                ) : (
                  <small className="diferencas">
                    {Object.entries(dif).length === 0
                      ? 'mesmos atributos'
                      : Object.entries(dif).map(([s, v]) => (
                          <em key={s} className={v! > 0 ? 'melhor' : 'pior'}>
                            {v! > 0 ? '▲' : '▼'}
                            {compacto(Math.abs(v!))} {NOME_STAT[s as Stat].curto}{' '}
                          </em>
                        ))}
                  </small>
                )}
              </span>
              {!motivo && (
                <span className="escolha-heroi-acoes">
                  {slots.length > 1 ? (
                    slots.map((s) => (
                      <button key={s} onClick={() => props.aoEscolher(h.id, s)}>
                        {NOME_SLOT[s]} {s.endsWith('1') ? '1' : '2'}
                        <small>{h.equipamento[s] ? ` (${nomeItem(h.equipamento[s]!)})` : ' (vazio)'}</small>
                      </button>
                    ))
                  ) : (
                    <button className="principal" onClick={() => props.aoEscolher(h.id)}>
                      Equipar
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="dica">
        A peça trocada volta para a mochila. {inteiro(e.inventario.length)}/{INVENTARIO_MAXIMO} ocupados.
      </p>
    </Modal>
  );
}
