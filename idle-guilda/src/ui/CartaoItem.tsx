import { useState, type ReactNode } from 'react';
import { podeUsar } from '../motor/acoes';
import { BASES, CONJUNTOS, DADOS_RARIDADE, NOME_SLOT } from '../motor/dados/itens';
import { NOME_STAT, PERSONAGENS, STATS } from '../motor/dados/personagens';
import { precoDeVenda } from '../motor/itens';
import { modsDoItem, pecasDeConjunto, statsDoItem } from '../motor/status';
import type { Estado, Item, PersonagemId, Slot, Stat } from '../motor/tipos';
import { IconeItem, Recurso, Retrato } from './comum';
import { diferencaStats, espacoAlvo } from './regrasMochila';
import { compacto, descreverMod, nomeCurto, nomeItem } from './texto';

const NOME_ARMADURA = { pesada: 'pesada', media: 'média', leve: 'leve', tecido: 'tecido' } as const;

/** "Raro · Peitoral · pesada · nível 12" */
export function linhaDoItem(item: Item): string {
  const base = BASES[item.base];
  const slot = NOME_SLOT[base?.slot === 'acessorio' ? 'acessorio1' : (base?.slot ?? 'reliquia')];
  return [DADOS_RARIDADE[item.raridade].nome, slot, base?.armadura && NOME_ARMADURA[base.armadura], `nível ${item.nivel}`].filter(Boolean).join(' · ');
}

/** Texto completo para leitores de tela: "Espada de Aço +3, raro, nível 12". */
export function rotuloDoItem(item: Item): string {
  return `${nomeItem(item)}, ${DADOS_RARIDADE[item.raridade].nome.toLowerCase()}, nível ${item.nivel}`;
}

function Diferenca({ valor }: { valor: number }) {
  if (valor === 0) return null;
  const melhor = valor > 0;
  return (
    <em className={melhor ? 'melhor' : 'pior'}>
      {melhor ? '▲' : '▼'}
      {compacto(Math.abs(valor))}
      <span className="so-leitor">{melhor ? ' a mais' : ' a menos'}</span>
    </em>
  );
}

/**
 * Cartão único de item (Mochila, Ferreiro, Loja, Ficha). Mostra atributos com
 * a diferença contra a peça que o herói escolhido usa no mesmo espaço,
 * afixos, conjunto, quem pode usar, valor de venda e as ações.
 */
export function CartaoItem(props: {
  estado: Estado;
  item: Item;
  /** Herói que está usando o item (sem comparação). */
  dono?: PersonagemId;
  /** Versão curta para o hover: nome, raridade e três atributos. */
  compacto?: boolean;
  heroiInicial?: PersonagemId;
  acoes?: ReactNode;
  /** Esconde o valor de venda (ex.: itens da Loja, que mostram o preço). */
  semVenda?: boolean;
  /** Compara com a peça deste espaço (ex.: escolhendo para um espaço da Ficha). */
  slot?: Slot;
}) {
  const { estado: e, item } = props;
  const usaveis = e.herois.filter((h) => !podeUsar(h, item));
  const [escolhido, setEscolhido] = useState<PersonagemId | null>(props.heroiInicial ?? null);
  const heroi = props.dono ? undefined : (usaveis.find((h) => h.id === escolhido) ?? usaveis[0]);
  const alvo = heroi ? (props.slot ? { slot: props.slot, atual: heroi.equipamento[props.slot] } : espacoAlvo(heroi, item)) : null;
  const stats = statsDoItem(item);
  const dif = heroi ? diferencaStats(item, alvo?.atual) : {};
  const statsUsados = STATS.filter((s) => stats[s] || dif[s]);
  const cor = DADOS_RARIDADE[item.raridade].cor;
  const conjunto = item.conjunto ? CONJUNTOS[item.conjunto] : undefined;

  const topo = (
    <div className="cartao-item-topo">
      <IconeItem item={item} escala={props.compacto ? 3 : 4} />
      <span className="cartao-item-nome">
        <strong style={{ color: cor }}>{nomeItem({ ...item, melhoria: 0 })}</strong>
        <small>{linhaDoItem(item)}</small>
        <span className="selos">
          {item.melhoria > 0 && <span className="selo-item">+{item.melhoria}</span>}
          {conjunto && <span className="selo-item conjunto">◆ {conjunto.nome}</span>}
        </span>
      </span>
    </div>
  );

  if (props.compacto) {
    const principais = STATS.filter((s) => stats[s])
      .sort((a, b) => (stats[b] ?? 0) - (stats[a] ?? 0))
      .slice(0, 3);
    return (
      <div className={`cartao-item compacto raridade-${item.raridade}`}>
        {topo}
        <ul className="cartao-item-stats">
          {principais.map((s) => (
            <li key={s}>
              <span>{NOME_STAT[s].curto}</span> <strong>{compacto(stats[s] ?? 0)}</strong> <Diferenca valor={dif[s] ?? 0} />
            </li>
          ))}
        </ul>
        <small>Clique para ver tudo e agir.</small>
      </div>
    );
  }

  const mods = modsDoItem(item);
  const pecas = heroi && conjunto ? (pecasDeConjunto(heroi)[conjunto.id] ?? 0) : 0;
  const ganhaPeca = heroi && conjunto && alvo?.atual?.conjunto !== conjunto.id ? 1 : 0;

  return (
    <div className={`cartao-item raridade-${item.raridade}`}>
      {topo}

      {props.dono ? (
        <small className="cartao-item-nota">Equipado em {nomeCurto(props.dono)}.</small>
      ) : heroi ? (
        <div className="cartao-item-comparar">
          {usaveis.length > 1 && !props.slot ? (
            <label className="campo-linha">
              Comparar com
              <select value={heroi.id} onChange={(ev) => setEscolhido(ev.target.value as PersonagemId)}>
                {usaveis.map((h) => (
                  <option key={h.id} value={h.id}>
                    {PERSONAGENS[h.id].nome}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <small>Comparando com {nomeCurto(heroi.id)}</small>
          )}
          <small>{alvo?.atual ? `no lugar de ${nomeItem(alvo.atual)}` : `${alvo ? NOME_SLOT[alvo.slot] : 'Espaço'} vazio`}</small>
        </div>
      ) : (
        <small className="cartao-item-nota">Nenhum herói da party pode usar esta peça agora.</small>
      )}

      {statsUsados.length > 0 && (
        <ul className="cartao-item-stats">
          {statsUsados.map((s: Stat) => (
            <li key={s}>
              <span>{NOME_STAT[s].curto}</span> <strong>{compacto(stats[s] ?? 0)}</strong> <Diferenca valor={dif[s] ?? 0} />
            </li>
          ))}
        </ul>
      )}

      {mods.length > 0 && (
        <ul className="cartao-item-afixos">
          {mods.map((m, i) => (
            <li key={i}>
              <span className="ponto-raridade" style={{ background: cor }} aria-hidden />
              {descreverMod(m)}
            </li>
          ))}
        </ul>
      )}

      {conjunto && (
        <div className="cartao-item-conjunto">
          <strong>◆ {conjunto.nome}</strong>
          {heroi && (
            <small>
              {nomeCurto(heroi.id)} tem {pecas} {pecas === 1 ? 'peça' : 'peças'}
              {ganhaPeca ? `; com esta, ${pecas + 1}` : ''}.
            </small>
          )}
          <ul>
            {conjunto.bonus.map((b) => {
              const ativo = pecas + ganhaPeca >= b.pecas;
              return (
                <li key={b.pecas} className={ativo ? 'ativo' : ''}>
                  {ativo ? '✓' : '·'} {b.pecas} peças: {b.texto}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="cartao-item-quem">
        <small>Quem pode usar</small>
        <ul>
          {e.herois.map((h) => {
            const motivo = podeUsar(h, item);
            return (
              <li key={h.id} className={motivo ? 'nao' : ''}>
                <Retrato id={h.id} tamanho={32} />
                <small>
                  {nomeCurto(h.id)}
                  {motivo ? `: ${motivo.replace(`${PERSONAGENS[h.id].nome} `, '')}` : ' ✓'}
                </small>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="cartao-item-rodape">
        {!props.semVenda && (
          <small className="cartao-item-venda">
            Venda <Recurso tipo="ouro" valor={precoDeVenda(item)} />
          </small>
        )}
        {props.acoes && <div className="cartao-item-acoes">{props.acoes}</div>}
      </div>
    </div>
  );
}
