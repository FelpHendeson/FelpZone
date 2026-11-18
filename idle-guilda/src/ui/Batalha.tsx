import { useMemo } from 'react';
import { BATALHA_ALTURA, BATALHA_ESCALA, BATALHA_LARGURA, desenharBatalha } from '../arte/batalha';
import { irParaMapa, type Resultado } from '../motor/acoes';
import { criarContexto, vidaMaximaEmBatalha } from '../motor/combate';
import { COR_ELEMENTO, PERSONAGENS } from '../motor/dados/personagens';
import { MAPAS, mapaPorId, nivelDaOnda, ONDAS_POR_CHEFE } from '../motor/dados/mapas';
import { habilidade, recargaEfetiva, statsDoHeroi } from '../motor/status';
import type { Estado, PersonagemId } from '../motor/tipos';
import { Medidor, Retrato } from './comum';
import { CanvasPixel } from './pixel';
import { inteiro, nomeCurto, nomeHabilidade } from './texto';

interface Props {
  estado: Estado;
  agir: (acao: (e: Estado) => Resultado) => void;
  aoAbrirHeroi: (id: PersonagemId) => void;
  aoBestiario: () => void;
}

export function Batalha({ estado: e, agir, aoAbrirHeroi, aoBestiario }: Props) {
  const b = e.batalha;
  const mapa = mapaPorId(b.mapa);
  const membros = e.herois.filter((h) => h.atividade.tipo === 'batalha');
  // A vida máxima muda com equipamento e nível, não a cada passo.
  const chave = membros.map((h) => `${h.id}${h.nivel}${Object.values(h.equipamento).map((i) => i?.uid + '' + i?.melhoria).join()}${h.equipadas.join()}${h.nos.length}`).join('|');
  const vidaMax = useMemo(() => {
    const ctx = criarContexto(e);
    return Object.fromEntries(membros.map((h) => [h.id, vidaMaximaEmBatalha(ctx, h.id)])) as Partial<Record<PersonagemId, number>>;
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  const chefe = b.onda % ONDAS_POR_CHEFE === 0;
  const recentes = [...b.lancadas].reverse().slice(0, 3);

  return (
    <>
      <section className="painel batalha">
        <CanvasPixel
          largura={BATALHA_LARGURA * BATALHA_ESCALA}
          altura={BATALHA_ALTURA * BATALHA_ESCALA}
          className="cena-batalha"
          rotulo={`Batalha em ${mapa.nome}`}
          desenho={(ctx, t) => desenharBatalha(ctx, e, vidaMax, t)}
        />
        <div className="batalha-info">
          <div className="batalha-topo">
            <strong>{mapa.nome}</strong>
            <span className={`etiqueta ${chefe ? 'chefe' : ''}`}>
              {b.situacao === 'descansando' ? '🔥 Descansando' : chefe ? `☠ Chefe · onda ${b.onda}` : `Onda ${b.onda}`}
            </span>
            <small>inimigos nv {nivelDaOnda(mapa, b.onda)}</small>
            <button className="bestiario-atalho" onClick={aoBestiario}>
              🐾 Bestiário
            </button>
          </div>
          <ul className="lancadas" aria-live="polite">
            {recentes.length === 0 && <li className="dica">Os heróis usam as habilidades sozinhos quando recarregam.</li>}
            {recentes.map((l, i) => {
              const hab = habilidade(e, l.habilidade);
              return (
                <li key={`${l.t}-${i}`} style={{ opacity: 1 - i * 0.25 }}>
                  <span className="ponto-elemento" style={{ background: COR_ELEMENTO[hab?.elemento ?? 'neutro'] }} />
                  <strong>{nomeCurto(l.heroi)}</strong> {nomeHabilidade(e, l.habilidade)}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="painel">
        <h2>Party em combate</h2>
        <ul className="party-combate">
          {membros.map((h) => {
            const comb = b.herois[h.id];
            const max = vidaMax[h.id] ?? 1;
            const { stats, mods } = statsDoHeroi(e, h);
            const transformado = comb?.buffs.some((x) => x.id.startsWith('transf:'));
            return (
              <li key={h.id}>
                <button className="heroi-combate" onClick={() => aoAbrirHeroi(h.id)}>
                  <Retrato id={h.id} tamanho={40} />
                  <span className="heroi-combate-info">
                    <span className="linha-nome">
                      <strong>{PERSONAGENS[h.id].nome}</strong>
                      <small>nv {h.nivel}</small>
                      {transformado && <span className="etiqueta fogo">🔥 Leão das Chamas</span>}
                      {comb && comb.vida <= 0 && <span className="etiqueta caido">caído</span>}
                    </span>
                    <Medidor
                      valor={comb?.vida ?? max}
                      maximo={max}
                      cor="#5fcf5a"
                      texto={`${inteiro(comb?.vida ?? max)}/${inteiro(max)}${comb?.escudo ? ` 🛡${inteiro(comb.escudo)}` : ''}`}
                      fino
                    />
                    <span className="recargas">
                      {h.equipadas.map((id) => {
                        const hab = habilidade(e, id);
                        if (!hab) return null;
                        if (hab.tipo === 'passiva') {
                          return (
                            <span key={id} className="recarga passiva" title={`${hab.nome} (passiva)`}>
                              <span style={{ background: COR_ELEMENTO[hab.elemento] }} />
                            </span>
                          );
                        }
                        const total = recargaEfetiva(hab, stats, mods, h.habilidades.find((x) => x.id === id)?.nivel ?? 1);
                        const resta = comb?.recargas[id] ?? 0;
                        return (
                          <span key={id} className={`recarga ${resta <= 0 ? 'pronta' : ''}`} title={`${hab.nome}: ${resta > 0 ? `${Math.ceil(resta)} s` : 'pronta'}`}>
                            <span style={{ background: COR_ELEMENTO[hab.elemento], height: `${(1 - resta / total) * 100}%` }} />
                          </span>
                        );
                      })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="painel">
        <h2>Mapas</h2>
        <p className="dica">Novos mapas abrem pelo nível do Sir LionHearth. A cada 10 ondas os inimigos sobem de nível, e há um chefe.</p>
        <ul className="mapas">
          {MAPAS.map((m) => {
            const liberado = e.mapasLiberados.includes(m.id);
            const atual = m.id === b.mapa;
            const maior = e.estatisticas.maiorOnda[m.id] ?? 0;
            const retomar = Math.max(1, Math.floor(maior / ONDAS_POR_CHEFE) * ONDAS_POR_CHEFE - ONDAS_POR_CHEFE + 1);
            return (
              <li key={m.id} className={`mapa ${atual ? 'atual' : ''} ${liberado ? '' : 'bloqueado'}`}>
                <span className="mapa-info">
                  <strong>{liberado ? m.nome : `🔒 ${m.nome}`}</strong>
                  <small>{liberado ? m.descricao : `Abre no nível ${m.nivelMinimo} do Sir LionHearth`}</small>
                  <small>
                    Inimigos nv {m.nivelInimigo}–{m.nivelInimigo + 7}
                    {maior > 0 && ` · maior onda ${maior}`}
                  </small>
                </span>
                {liberado && (
                  <span className="mapa-acoes">
                    {atual ? (
                      b.onda > ONDAS_POR_CHEFE && (
                        <button onClick={() => agir((s) => irParaMapa(s, m.id, Math.max(1, b.onda - ONDAS_POR_CHEFE)))}>Recuar 10 ondas</button>
                      )
                    ) : (
                      <>
                        <button onClick={() => agir((s) => irParaMapa(s, m.id, 1))}>Ir</button>
                        {retomar > 1 && <button onClick={() => agir((s) => irParaMapa(s, m.id, retomar))}>Onda {retomar}</button>}
                      </>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
