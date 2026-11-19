import { PERSONAGENS, ORDEM_PERSONAGENS, xpParaProximo } from '../motor/dados/personagens';
import { MISSOES } from '../motor/dados/missoes';
import type { Estado, Heroi, PersonagemId } from '../motor/tipos';
import { situacaoDoNo } from '../motor/acoes';
import { ARVORES } from '../motor/dados/arvores';
import { iconeSlotVazio } from '../arte/icones';
import { NOME_SLOT, SLOTS } from '../motor/dados/itens';
import { IconeItem, Medidor, Retrato } from './comum';
import { ehPossivelMelhoria } from './regrasMochila';
import { Icone } from './pixel';
import { nomeItem } from './texto';
import { duracao } from './texto';

export function atividadeTexto(e: Estado, h: Heroi): string {
  const a = h.atividade;
  if (a.tipo === 'batalha') return e.batalha.situacao === 'descansando' ? 'Descansando no acampamento' : 'Em batalha';
  if (a.tipo === 'treino') return e.tempo >= a.fim ? 'Treino concluído' : `Treinando · ${duracao(a.fim - e.tempo)}`;
  const m = MISSOES.find((x) => x.id === a.missao);
  return e.tempo >= a.fim ? `Voltou de “${m?.nome}”` : `Explorando · ${duracao(a.fim - e.tempo)}`;
}

export function temNoDisponivel(h: Heroi): boolean {
  return h.pontosHabilidade > 0 && ARVORES[h.id].nos.some((n) => situacaoDoNo(h, n.id) === 'disponivel');
}

export function Party(props: { estado: Estado; aoAbrir: (id: PersonagemId) => void; aoTaverna: () => void; aoEquiparMelhor: (id: PersonagemId) => void; recemSubiu?: PersonagemId[] }) {
  const e = props.estado;
  return (
    <section className="painel">
      <h2>Party</h2>
      <p className="dica">Até cinco heróis lutam juntos. Toque em um para ver status, equipamento, habilidades e árvore.</p>
      <ul className="party-lista">
        {ORDEM_PERSONAGENS.map((id) => {
          const p = PERSONAGENS[id];
          const h = e.herois.find((x) => x.id === id);
          if (!h) {
            return (
              <li key={id}>
                <button className="heroi-cartao bloqueado" onClick={props.aoTaverna}>
                  <Retrato id={id} tamanho={64} apagado />
                  <span className="heroi-info">
                    <strong>{p.nome}</strong>
                    <small>
                      {p.titulo} · {p.raca}
                    </small>
                    <small>{p.recrutamento ? `Na Taverna a partir do nível ${p.recrutamento.nivel} do Sir LionHearth` : ''}</small>
                  </span>
                </button>
              </li>
            );
          }
          const avisos = [h.pontosLivres > 0 && `+${h.pontosLivres} pontos`, temNoDisponivel(h) && 'árvore'].filter(Boolean);
          const melhores = e.inventario.filter((i) => ehPossivelMelhoria(h, i)).length;
          return (
            <li key={id} className={`party-cartao ${props.recemSubiu?.includes(id) ? 'subiu' : ''}`}>
              <button className="heroi-cartao" onClick={() => props.aoAbrir(id)}>
                <span className="retrato-com-selo">
                  <Retrato id={id} tamanho={72} animar />
                  {props.recemSubiu?.includes(id) && <span className="selo-nivel">▲ {h.nivel}</span>}
                </span>
                <span className="heroi-info">
                  <span className="linha-nome">
                    <strong>{p.nome}</strong>
                    <span className={`papel papel-${p.papel}`}>{p.papelNome}</span>
                  </span>
                  <small>
                    {p.titulo} · {p.raca} · nível {h.nivel}
                  </small>
                  <Medidor
                    rotulo="XP"
                    valor={h.xp}
                    maximo={xpParaProximo(h.nivel)}
                    cor="#5b9bff"
                    texto={`${Math.floor((h.xp / xpParaProximo(h.nivel)) * 100)}%`}
                    fino
                  />
                  <small className={h.atividade.tipo === 'batalha' ? '' : 'fora'}>{atividadeTexto(e, h)}</small>
                  {avisos.length > 0 && (
                    <span className="selos">
                      {avisos.map((a) => (
                        <span key={a as string} className="selo">
                          {a}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </button>
              <ul className="party-espacos" aria-label={`Equipamento de ${p.nome}`}>
                {SLOTS.map((s) => {
                  const item = h.equipamento[s];
                  return (
                    <li key={s} className={item ? `raridade-${item.raridade}` : 'vazio'} aria-label={`${NOME_SLOT[s]}: ${item ? nomeItem(item) : 'vazio'}`}>
                      {item ? <IconeItem item={item} escala={2} /> : <Icone chave={`vazio-${s}`} sprite={iconeSlotVazio(s)} escala={2} />}
                    </li>
                  );
                })}
              </ul>
              <button className={melhores > 0 ? 'principal' : ''} disabled={melhores === 0} onClick={() => props.aoEquiparMelhor(id)}>
                {melhores > 0 ? `Equipar melhor (${melhores} na mochila)` : 'Nada melhor na mochila'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
