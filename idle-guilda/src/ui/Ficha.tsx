import { useState } from 'react';
import {
  alternarHabilidade,
  aprenderNo,
  desequipar,
  distribuirPonto,
  distribuirSugerido,
  equiparItem,
  MAXIMO_EQUIPADAS,
  moverHabilidade,
  podeUsar,
  situacaoDoNo,
  slotsDoItem,
  type Resultado,
} from '../motor/acoes';
import { ARVORES } from '../motor/dados/arvores';
import { CONJUNTOS, NOME_SLOT, SLOTS } from '../motor/dados/itens';
import { COR_ELEMENTO, NOME_ELEMENTO, NOME_STAT, PERSONAGENS, STATS, VALOR_PONTO } from '../motor/dados/personagens';
import {
  habilidade,
  intervaloAtaque,
  NIVEL_MAXIMO_HABILIDADE,
  pecasDeConjunto,
  recargaEfetiva,
  statsDoHeroi,
  XP_HABILIDADE,
} from '../motor/status';
import type { Estado, Habilidade, Heroi, PersonagemId, Slot } from '../motor/tipos';
import { iconeSlotVazio } from '../arte/icones';
import { IconeItem, Retrato, SubAbas } from './comum';
import { CartaoItem } from './CartaoItem';
import { Dica } from './Dica';
import { Modal } from './Modal';
import { Icone } from './pixel';
import { atividadeTexto, temNoDisponivel } from './Party';
import { compacto, descreverEfeito, descreverMod, nomeCurto, nomeItem } from './texto';

type Aba = 'status' | 'equipamento' | 'habilidades' | 'arvore' | 'historia';

interface Props {
  estado: Estado;
  heroi: PersonagemId;
  agir: (acao: (e: Estado) => Resultado) => void;
  aoFechar: () => void;
  /** Abre a Mochila filtrada para este herói. */
  aoMochila?: (heroi: PersonagemId) => void;
}

export function Ficha({ estado: e, heroi, agir, aoFechar, aoMochila }: Props) {
  const [aba, setAba] = useState<Aba>('status');
  const h = e.herois.find((x) => x.id === heroi);
  if (!h) return null;
  const p = PERSONAGENS[h.id];
  return (
    <div className="tela-cheia" role="dialog" aria-modal="true" aria-label={p.nome}>
      <header className="ficha-cabecalho">
        <button className="voltar" onClick={aoFechar} aria-label="Voltar">
          ←
        </button>
        <Retrato id={h.id} tamanho={48} animar />
        <span>
          <strong>{p.nome}</strong>
          <small>
            {p.titulo} · nível {h.nivel} · {atividadeTexto(e, h)}
          </small>
        </span>
      </header>
      <SubAbas<Aba>
        abas={[
          ['status', 'Status', h.pontosLivres > 0],
          ['equipamento', 'Equip.'],
          ['habilidades', 'Habilid.'],
          ['arvore', 'Árvore', temNoDisponivel(h)],
          ['historia', 'História'],
        ]}
        ativa={aba}
        aoTrocar={setAba}
      />
      <div className="ficha-corpo">
        {aba === 'status' && <Status e={e} h={h} agir={agir} />}
        {aba === 'equipamento' && <Equipamento e={e} h={h} agir={agir} aoMochila={aoMochila && (() => aoMochila(h.id))} />}
        {aba === 'habilidades' && <Habilidades e={e} h={h} agir={agir} />}
        {aba === 'arvore' && <Arvore e={e} h={h} agir={agir} />}
        {aba === 'historia' && (
          <section className="painel">
            <h3>
              {p.nome}, {p.titulo.toLowerCase()}
            </h3>
            <p>{p.lore}</p>
            <p className="dica">
              Raça: {p.raca} · Papel: {p.papelNome} · Elemento: {NOME_ELEMENTO[p.elemento]} · Armaduras: {p.armaduras.join(', ')} · Armas:{' '}
              {p.armas.join(', ')} / {p.secundarias.join(', ')}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

/* ---------- Status ---------- */

function Status({ e, h, agir }: { e: Estado; h: Heroi; agir: Props['agir'] }) {
  const { stats, mods } = statsDoHeroi(e, h);
  const extras: [string, string][] = [
    ['Ataques por segundo', compacto(1 / intervaloAtaque(stats.vel))],
    ['Chance de crítico', `${compacto(5 + mods.critico)}%`],
    ['Dano crítico', `${compacto(150 + mods.danoCritico)}%`],
    ['Roubo de vida', `${compacto(mods.rouboVida)}%`],
    ['Regeneração', `${compacto(mods.regen)}%/s`],
    ['Redução de recarga', `${compacto(mods.recarga)}%`],
  ];
  return (
    <section className="painel">
      <div className="linha-titulo">
        <h3>Atributos</h3>
        {h.pontosLivres > 0 && <span className="selo">{h.pontosLivres} pontos para usar</span>}
      </div>
      <ul className="stats">
        {STATS.map((s) => (
          <li key={s}>
            <span className="stat-nome">
              <strong>{NOME_STAT[s].nome}</strong>
              <small>{NOME_STAT[s].efeito}</small>
            </span>
            <span className="stat-valor">
              {compacto(stats[s])}
              {h.pontos[s] > 0 && <small> ({h.pontos[s]} pts)</small>}
            </span>
            <Dica
              conteudo={
                <p>
                  +{VALOR_PONTO[s].toLocaleString('pt-BR')} {NOME_STAT[s].curto} por ponto.{' '}
                  {h.pontosLivres > 0 ? `Você tem ${h.pontosLivres} ${h.pontosLivres === 1 ? 'ponto livre' : 'pontos livres'}.` : 'Sem pontos livres: ganhe mais subindo de nível.'}
                </p>
              }
            >
              <button className="mais" disabled={h.pontosLivres <= 0} onClick={() => agir((x) => distribuirPonto(x, h.id, s))} aria-label={`+1 ponto em ${NOME_STAT[s].nome}`}>
                +
              </button>
            </Dica>
          </li>
        ))}
      </ul>
      {h.pontosLivres > 0 && <button onClick={() => agir((x) => distribuirSugerido(x, h.id))}>Distribuir sugerido para {PERSONAGENS[h.id].papelNome.toLowerCase()}</button>}
      <h3>Secundários</h3>
      <ul className="secundarios">
        {extras.map(([n, v]) => (
          <li key={n}>
            {n} <strong>{v}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Equipamento ---------- */

function Equipamento({ e, h, agir, aoMochila }: { e: Estado; h: Heroi; agir: Props['agir']; aoMochila?: () => void }) {
  const [slot, setSlot] = useState<Slot | null>(null);
  const conjuntos = pecasDeConjunto(h);
  return (
    <section className="painel">
      <div className="boneco">
        {SLOTS.map((s) => {
          const item = h.equipamento[s];
          return (
            <button key={s} className={`slot slot-${s} ${item ? `raridade-${item.raridade}` : 'vazio'}`} onClick={() => setSlot(s)}>
              {item ? <IconeItem item={item} /> : <Icone chave={`vazio-${s}`} sprite={iconeSlotVazio(s)} escala={3} />}
              <small>{item ? nomeItem(item) : NOME_SLOT[s]}</small>
            </button>
          );
        })}
      </div>
      {Object.keys(conjuntos).length > 0 && (
        <div className="conjuntos">
          {Object.entries(conjuntos).map(([id, n]) => (
            <div key={id}>
              <strong>◆ {CONJUNTOS[id].nome}</strong> <small>({n} peças)</small>
              <ul>
                {CONJUNTOS[id].bonus.map((b) => (
                  <li key={b.pecas} className={n >= b.pecas ? 'ativo' : ''}>
                    {b.pecas} peças: {b.texto}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p className="dica">Toque num espaço para equipar algo do inventário. Peças do mesmo conjunto somam bônus.</p>
      {aoMochila && (
        <button className="link" onClick={aoMochila}>
          Ver o que {nomeCurto(h.id)} pode usar na Mochila →
        </button>
      )}
      {slot && <EscolherItem e={e} h={h} slot={slot} agir={agir} aoFechar={() => setSlot(null)} />}
    </section>
  );
}

function EscolherItem({ e, h, slot, agir, aoFechar }: { e: Estado; h: Heroi; slot: Slot; agir: Props['agir']; aoFechar: () => void }) {
  const atual = h.equipamento[slot];
  const opcoes = e.inventario.filter((i) => slotsDoItem(i).includes(slot));
  opcoes.sort((a, b) => Number(!!podeUsar(h, a)) - Number(!!podeUsar(h, b)) || b.nivel - a.nivel);
  return (
    <Modal variante="folha" titulo={`${NOME_SLOT[slot]} de ${nomeCurto(h.id)}`} aoFechar={aoFechar}>
      {atual ? (
        <CartaoItem
          estado={e}
          item={atual}
          dono={h.id}
          acoes={
            <button
              onClick={() => {
                agir((x) => desequipar(x, h.id, slot));
                aoFechar();
              }}
            >
              Tirar
            </button>
          }
        />
      ) : (
        <p className="dica">Nada equipado aqui.</p>
      )}
      <h3>No inventário ({opcoes.length})</h3>
      {opcoes.length === 0 && <p className="dica">Nenhum item para este espaço. Monstros, chefes, expedições, a Loja e o Ferreiro dão itens.</p>}
      <ul className="lista-itens">
        {opcoes.map((item) => {
          const motivo = podeUsar(h, item);
          return (
            <li key={item.uid} className="cartao-na-lista">
              <CartaoItem
                estado={e}
                item={item}
                heroiInicial={h.id}
                slot={slot}
                acoes={
                  motivo ? (
                    <small className="erro">{motivo}</small>
                  ) : (
                    <button
                      className="principal"
                      onClick={() => {
                        agir((x) => equiparItem(x, h.id, item.uid, slot));
                        aoFechar();
                      }}
                    >
                      Equipar
                    </button>
                  )
                }
              />
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

/* ---------- Habilidades ---------- */

export function CartaoHabilidade({ e, h, hab, acoes }: { e: Estado; h?: Heroi; hab: Habilidade; acoes?: React.ReactNode }) {
  const aprendida = h?.habilidades.find((x) => x.id === hab.id);
  const recarga = h && hab.tipo !== 'passiva' ? recargaEfetiva(hab, statsDoHeroi(e, h).stats, statsDoHeroi(e, h).mods, aprendida?.nivel ?? 1) : 0;
  const tipo = hab.tipo === 'passiva' ? (hab.aura ? 'Aura' : 'Passiva') : hab.tipo === 'transformacao' ? 'Transformação' : 'Ativa';
  return (
    <div className="habilidade" style={{ borderLeftColor: COR_ELEMENTO[hab.elemento] }}>
      <div className="habilidade-topo">
        <span className={`rank rank-${hab.rank}`}>{hab.rank}</span>
        <span className="habilidade-nome">
          <strong>{hab.nome}</strong>
          <small>
            {tipo} · {hab.escola === 'fisica' ? 'física' : 'mágica'} · {NOME_ELEMENTO[hab.elemento]}
            {hab.tipo !== 'passiva' && ` · recarga ${compacto(recarga || hab.recarga)} s`}
          </small>
        </span>
        {aprendida && (
          <Dica
            conteudo={
              <p>
                Nível {aprendida.nivel}
                {aprendida.nivel < NIVEL_MAXIMO_HABILIDADE
                  ? ` · faltam ${Math.max(0, Math.ceil(XP_HABILIDADE(aprendida.nivel) - aprendida.xp))} usos para o nível ${aprendida.nivel + 1}`
                  : ' · nível máximo'}
              </p>
            }
          >
            <span className="habilidade-nivel" tabIndex={0}>
              Nv {aprendida.nivel}
              {aprendida.nivel < NIVEL_MAXIMO_HABILIDADE && <small>{Math.floor((aprendida.xp / XP_HABILIDADE(aprendida.nivel)) * 100)}%</small>}
            </span>
          </Dica>
        )}
      </div>
      <p>{hab.descricao}</p>
      {hab.criada && (
        <ul className="efeitos">
          {hab.efeitos.map((ef, i) => (
            <li key={i}>{descreverEfeito(ef, hab.escola)}</li>
          ))}
          {hab.mods?.map((m, i) => (
            <li key={`m${i}`}>{descreverMod(m)}</li>
          ))}
        </ul>
      )}
      {acoes && <div className="habilidade-acoes">{acoes}</div>}
    </div>
  );
}

function Habilidades({ e, h, agir }: { e: Estado; h: Heroi; agir: Props['agir'] }) {
  const naoUsadas = h.habilidades.filter((x) => !h.equipadas.includes(x.id));
  return (
    <section className="painel">
      <div className="linha-titulo">
        <h3>Em uso</h3>
        <small>
          {h.equipadas.length}/{MAXIMO_EQUIPADAS} + ataque básico
        </small>
      </div>
      <p className="dica">A ordem é a prioridade: quando duas estão prontas, a de cima vai primeiro. Passivas também ocupam espaço.</p>
      <ol className="habilidades">
        {h.equipadas.map((id, i) => {
          const hab = habilidade(e, id);
          if (!hab) return null;
          return (
            <li key={id}>
              <CartaoHabilidade
                e={e}
                h={h}
                hab={hab}
                acoes={
                  <>
                    <button disabled={i === 0} onClick={() => agir((x) => moverHabilidade(x, h.id, id, -1))} aria-label="Subir prioridade">
                      ↑
                    </button>
                    <button disabled={i === h.equipadas.length - 1} onClick={() => agir((x) => moverHabilidade(x, h.id, id, 1))} aria-label="Descer prioridade">
                      ↓
                    </button>
                    <button onClick={() => agir((x) => alternarHabilidade(x, h.id, id))}>Tirar</button>
                  </>
                }
              />
            </li>
          );
        })}
      </ol>
      <h3>Aprendidas ({naoUsadas.length})</h3>
      {naoUsadas.length === 0 && <p className="dica">Aprenda mais na Árvore ou crie novas no Jardim (Cidade).</p>}
      <ul className="habilidades">
        {naoUsadas.map((x) => {
          const hab = habilidade(e, x.id);
          if (!hab) return null;
          return (
            <li key={x.id}>
              <CartaoHabilidade
                e={e}
                h={h}
                hab={hab}
                acoes={
                  <button className="principal" disabled={h.equipadas.length >= MAXIMO_EQUIPADAS} onClick={() => agir((s) => alternarHabilidade(s, h.id, x.id))}>
                    Usar
                  </button>
                }
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- Árvore ---------- */

function Arvore({ e, h, agir }: { e: Estado; h: Heroi; agir: Props['agir'] }) {
  const arvore = ARVORES[h.id];
  const [aberto, setAberto] = useState<string | null>(null);
  const no = arvore.nos.find((n) => n.id === aberto);
  const COL = 78;
  const LIN = 84;
  const largura = COL * 4;
  const altura = LIN * 5;
  const centro = (n: { x: number; y: number }) => [n.x * COL + COL / 2, n.y * LIN + 30] as const;
  return (
    <section className="painel">
      <div className="linha-titulo">
        <h3>Árvore de habilidades</h3>
        <span className={h.pontosHabilidade > 0 ? 'selo' : 'dica'}>{h.pontosHabilidade} pontos</span>
      </div>
      <p className="dica">
        Ramos: {arvore.ramos[0]} (esquerda) e {arvore.ramos[1]} (direita). Cada nível dá 1 ponto.
      </p>
      <div className="arvore" style={{ width: largura, height: altura }}>
        <svg width={largura} height={altura} className="arvore-linhas" aria-hidden>
          {arvore.nos.flatMap((n) =>
            n.requer.map((r) => {
              const de = arvore.nos.find((x) => x.id === r)!;
              const [x1, y1] = centro(de);
              const [x2, y2] = centro(n);
              const ativo = h.nos.includes(n.id);
              return <line key={`${r}-${n.id}`} x1={x1} y1={y1} x2={x2} y2={y2} className={ativo ? 'ativa' : ''} />;
            }),
          )}
        </svg>
        {arvore.nos.map((n) => {
          const situacao = situacaoDoNo(h, n.id);
          const hab = n.habilidade ? habilidade(e, n.habilidade) : undefined;
          const [cx, cy] = centro(n);
          return (
            <button
              key={n.id}
              className={`no ${situacao} ${hab ? 'de-habilidade' : 'de-bonus'}`}
              style={{ left: cx - 34, top: cy - 26, borderColor: hab ? COR_ELEMENTO[hab.elemento] : undefined }}
              onClick={() => setAberto(n.id)}
            >
              <span>{hab ? hab.nome : n.nome}</span>
              <small>{situacao === 'aprendido' ? '✓' : `nv ${n.nivel} · ${n.custo}pt`}</small>
            </button>
          );
        })}
      </div>
      {no && (
        <Modal titulo={no.habilidade ? (habilidade(e, no.habilidade)?.nome ?? '') : (no.nome ?? '')} aoFechar={() => setAberto(null)}>
          {no.habilidade ? (
            <CartaoHabilidade e={e} hab={habilidade(e, no.habilidade)!} />
          ) : (
            <ul className="efeitos">
              {no.mods?.map((m, i) => (
                <li key={i}>{descreverMod(m)}</li>
              ))}
            </ul>
          )}
          <p className="dica">
            Requer nível {no.nivel}
            {no.requer.length > 0 && ` e os nós anteriores`} · custa {no.custo} ponto(s).
          </p>
          {situacaoDoNo(h, no.id) === 'aprendido' ? (
            <p>✓ Aprendido</p>
          ) : (
            <button
              className="principal"
              disabled={situacaoDoNo(h, no.id) !== 'disponivel' || h.pontosHabilidade < no.custo}
              onClick={() => {
                agir((x) => aprenderNo(x, h.id, no.id));
                setAberto(null);
              }}
            >
              Aprender
            </button>
          )}
        </Modal>
      )}
    </section>
  );
}

