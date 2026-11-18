import { PERSONAGENS, ORDEM_PERSONAGENS, xpParaProximo } from '../motor/dados/personagens';
import { MISSOES } from '../motor/dados/missoes';
import type { Estado, Heroi, PersonagemId } from '../motor/tipos';
import { situacaoDoNo } from '../motor/acoes';
import { ARVORES } from '../motor/dados/arvores';
import { Medidor, Retrato } from './comum';
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

export function Party(props: { estado: Estado; aoAbrir: (id: PersonagemId) => void; aoTaverna: () => void }) {
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
                    <small>{p.titulo} · {p.raca}</small>
                    <small>
                      {p.recrutamento ? `Na Taverna a partir do nível ${p.recrutamento.nivel} do Sir LionHearth` : ''}
                    </small>
                  </span>
                </button>
              </li>
            );
          }
          const avisos = [h.pontosLivres > 0 && `+${h.pontosLivres} pontos`, temNoDisponivel(h) && 'árvore'].filter(Boolean);
          return (
            <li key={id}>
              <button className="heroi-cartao" onClick={() => props.aoAbrir(id)}>
                <Retrato id={id} tamanho={64} animar />
                <span className="heroi-info">
                  <span className="linha-nome">
                    <strong>{p.nome}</strong>
                    <span className={`papel papel-${p.papel}`}>{p.papelNome}</span>
                  </span>
                  <small>
                    {p.titulo} · {p.raca} · nível {h.nivel}
                  </small>
                  <Medidor rotulo="XP" valor={h.xp} maximo={xpParaProximo(h.nivel)} cor="#5b9bff" texto={`${Math.floor((h.xp / xpParaProximo(h.nivel)) * 100)}%`} fino />
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
