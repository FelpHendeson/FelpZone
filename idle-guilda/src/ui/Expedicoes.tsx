import { useState } from 'react';
import { concluirAtividade, enviarMissao, enviarTreino, type Resultado } from '../motor/acoes';
import { mapaPorId, MAPAS } from '../motor/dados/mapas';
import { MISSOES, TREINO_XP_POR_SEGUNDO } from '../motor/dados/missoes';
import { DADOS_RARIDADE, MATERIAIS, RARIDADES } from '../motor/dados/itens';
import { PERSONAGENS } from '../motor/dados/personagens';
import type { Estado, PersonagemId } from '../motor/tipos';
import { Medidor, Retrato } from './comum';
import { compacto, duracao, nomeCurto } from './texto';

const TREINOS = [30 * 60, 2 * 3600, 8 * 3600];

/** Raridade com o maior peso de sorteio. */
const raridadeProvavel = (pesos: number[]) => RARIDADES[pesos.indexOf(Math.max(...pesos))] ?? 'comum';

export function Expedicoes({ estado: e, agir }: { estado: Estado; agir: (acao: (e: Estado) => Resultado) => void }) {
  const fora = e.herois.filter((h) => h.atividade.tipo !== 'batalha');
  const naBatalha = e.herois.filter((h) => h.atividade.tipo === 'batalha');
  const [escolhidos, setEscolhidos] = useState<PersonagemId[]>([]);
  const alternar = (id: PersonagemId) => setEscolhidos((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const validos = escolhidos.filter((id) => naBatalha.some((h) => h.id === id));
  const sobra = naBatalha.length - validos.length;

  return (
    <>
      {fora.length > 0 && (
        <section className="painel">
          <h2>Fora da batalha</h2>
          <ul className="fora">
            {fora.map((h) => {
              const a = h.atividade;
              if (a.tipo === 'batalha') return null;
              const pronto = e.tempo >= a.fim;
              const missao = a.tipo === 'exploracao' ? MISSOES.find((m) => m.id === a.missao) : null;
              return (
                <li key={h.id}>
                  <Retrato id={h.id} tamanho={44} />
                  <span className="fora-info">
                    <strong>{PERSONAGENS[h.id].nome}</strong>
                    <small>{missao ? `${missao.nome} (${mapaPorId(missao.mapa).nome})` : 'Treinando no pátio da Ilha de Aço'}</small>
                    <Medidor
                      valor={Math.min(e.tempo, a.fim) - a.inicio}
                      maximo={a.fim - a.inicio}
                      cor={pronto ? '#7ed66a' : '#5b9bff'}
                      texto={pronto ? 'pronto' : duracao(a.fim - e.tempo)}
                      fino
                    />
                  </span>
                  {a.tipo === 'treino' ? (
                    <button className={pronto ? 'principal' : ''} onClick={() => agir((x) => concluirAtividade(x, h.id))}>
                      {pronto ? 'Concluir' : 'Interromper'}
                    </button>
                  ) : (
                    <button className="principal" disabled={!pronto} onClick={() => agir((x) => concluirAtividade(x, h.id))}>
                      Coletar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="painel">
        <h2>Expedições</h2>
        <p className="dica">
          Quem sai deixa de lutar até voltar. Expedições trazem equipamentos, acessórios, materiais e, nas longas, relíquias. Pelo menos um herói precisa ficar
          na batalha.
        </p>
        <div className="escolha-herois">
          {naBatalha.map((h) => (
            <button key={h.id} className={escolhidos.includes(h.id) ? 'ativa' : ''} aria-pressed={escolhidos.includes(h.id)} onClick={() => alternar(h.id)}>
              <Retrato id={h.id} tamanho={36} />
              <small>{nomeCurto(h.id)}</small>
            </button>
          ))}
        </div>
        {validos.length === 0 ? <p className="dica">Escolha quem vai sair.</p> : sobra < 1 ? <p className="erro">Deixe pelo menos um herói lutando.</p> : null}

        <h3>Treino</h3>
        <p className="dica">
          XP garantida, sem risco e sem saque: cerca de {compacto(TREINO_XP_POR_SEGUNDO(naBatalha[0]?.nivel ?? 1) * 60)} XP por minuto no nível atual. Pode
          interromper quando quiser.
        </p>
        <div className="linha-botoes">
          {TREINOS.map((s) => (
            <button
              key={s}
              disabled={validos.length === 0 || sobra < 1}
              onClick={() => {
                for (const id of validos) agir((x) => enviarTreino(x, id, s));
                setEscolhidos([]);
              }}
            >
              Treinar {duracao(s)}
            </button>
          ))}
        </div>

        {MAPAS.filter((m) => e.mapasLiberados.includes(m.id)).map((m) => (
          <div key={m.id}>
            <h3>{m.nome}</h3>
            <ul className="missoes">
              {MISSOES.filter((x) => x.mapa === m.id).map((x) => {
                const emAndamento = fora.filter((h) => h.atividade.tipo === 'exploracao' && h.atividade.missao === x.id);
                const andamento = emAndamento[0]?.atividade;
                const cabe = validos.length > 0 && validos.length <= x.maxHerois;
                return (
                  <li key={x.id} className="missao-cartao">
                    <span className="missao-topo">
                      <strong>{x.nome}</strong>
                      <span className="etiqueta">⏱ {duracao(x.duracao)}</span>
                    </span>
                    <small>{x.descricao}</small>
                    <ul className="missao-recompensa" aria-label="Recompensa esperada">
                      <li>
                        {x.itens}+ {x.itens === 1 ? 'item' : 'itens'}, mais comum {DADOS_RARIDADE[raridadeProvavel(x.pesosRaridade)].nome.toLowerCase()}
                      </li>
                      <li>{x.chanceReliquia > 0 ? `${Math.round(x.chanceReliquia * 100)}% de chance de relíquia` : 'sem relíquias'}</li>
                      <li>ouro, XP e {MATERIAIS[m.material].nome.toLowerCase()}</li>
                    </ul>
                    {andamento && andamento.tipo === 'exploracao' ? (
                      <div className="missao-andamento">
                        <span className="missao-herois">
                          {emAndamento.map((h) => (
                            <Retrato key={h.id} id={h.id} tamanho={28} />
                          ))}
                          <small>em andamento</small>
                        </span>
                        <Medidor
                          valor={Math.min(e.tempo, andamento.fim) - andamento.inicio}
                          maximo={andamento.fim - andamento.inicio}
                          cor={e.tempo >= andamento.fim ? '#7ed66a' : '#5b9bff'}
                          texto={e.tempo >= andamento.fim ? 'pronto' : duracao(andamento.fim - e.tempo)}
                          fino
                        />
                      </div>
                    ) : (
                      <div className="missao-acao">
                        <span className="missao-herois" aria-label={`Vão: ${validos.map(nomeCurto).join(', ') || 'ninguém escolhido'}`}>
                          {cabe ? validos.map((id) => <Retrato key={id} id={id} tamanho={28} />) : null}
                          <small>
                            {validos.length === 0
                              ? `até ${x.maxHerois} ${x.maxHerois === 1 ? 'herói' : 'heróis'}`
                              : validos.length > x.maxHerois
                                ? `máximo de ${x.maxHerois}`
                                : `${validos.length}/${x.maxHerois}`}
                          </small>
                        </span>
                        <button
                          className={cabe && sobra >= 1 ? 'principal' : ''}
                          disabled={!cabe || sobra < 1}
                          onClick={() => {
                            agir((s) => enviarMissao(s, x.id, validos));
                            setEscolhidos([]);
                          }}
                        >
                          Enviar
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
