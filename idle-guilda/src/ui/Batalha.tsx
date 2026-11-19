import { useMemo } from 'react';
import { urlDoCenario } from '../arte/extras';
import { BATALHA_ALTURA, BATALHA_ESCALA, BATALHA_LARGURA, desenharBatalha } from '../arte/batalha';
import { irParaMapa, type Resultado } from '../motor/acoes';
import { criarContexto, vidaMaximaEmBatalha } from '../motor/combate';
import { COR_ELEMENTO, NOME_ELEMENTO, PERSONAGENS } from '../motor/dados/personagens';
import { MAPAS, mapaPorId, nivelDaOnda, ONDAS_POR_CHEFE } from '../motor/dados/mapas';
import { habilidade, recargaEfetiva, statsDoHeroi } from '../motor/status';
import type { Estado, Habilidade, PersonagemId } from '../motor/tipos';
import { Retrato } from './comum';
import { Dica } from './Dica';
import { IconeUi } from './IconeUi';
import { CanvasPixel } from './pixel';
import { inteiro, nomeCurto, nomeHabilidade } from './texto';

interface Props {
  estado: Estado;
  agir: (acao: (e: Estado) => Resultado) => void;
  aoAbrirHeroi: (id: PersonagemId) => void;
  aoBestiario: () => void;
  /** Heróis que acabaram de subir de nível (selo animado no retrato). */
  recemSubiu?: PersonagemId[];
}

/** Duas letras para o ícone da habilidade: iniciais das duas primeiras palavras longas. */
export function siglaHabilidade(nome: string): string {
  const palavras = nome.split(/\s+/).filter((p) => p.length > 2);
  const base = palavras.length >= 2 ? palavras[0][0] + palavras[1][0] : (palavras[0] ?? nome).slice(0, 2);
  return base.toUpperCase();
}

export function Batalha({ estado: e, agir, aoAbrirHeroi, aoBestiario, recemSubiu = [] }: Props) {
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
    <div className="tela-batalha duas-colunas">
      <section className="painel batalha fixa">
        <div className="cena-moldura">
          <CanvasPixel
            largura={BATALHA_LARGURA * BATALHA_ESCALA}
            altura={BATALHA_ALTURA * BATALHA_ESCALA}
            className="cena-batalha"
            rotulo={`Batalha em ${mapa.nome}`}
            desenho={(ctx, t) => desenharBatalha(ctx, e, vidaMax, t)}
          />
          <div className="cena-rotulo">
            <strong>{mapa.nome}</strong>
            <span>
              {b.situacao === 'descansando' ? '🔥 Descansando' : `Onda ${b.onda}`} · inimigos nv {nivelDaOnda(mapa, b.onda)}
            </span>
          </div>
          {chefe && b.situacao !== 'descansando' && <span className="selo-chefe">☠ Chefe</span>}
        </div>
        <div className="batalha-info">
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
          <button className="bestiario-atalho" onClick={aoBestiario}>
            🐾 Bestiário
          </button>
        </div>
      </section>

      <div className="coluna">
        <section className="painel">
          <h2>Party em combate</h2>
          <ul className="party-combate">
            {membros.map((h) => {
              const comb = b.herois[h.id];
              const max = vidaMax[h.id] ?? 1;
              const vida = comb?.vida ?? max;
              const escudo = comb?.escudo ?? 0;
              const caido = !!comb && comb.vida <= 0;
              const { stats, mods } = statsDoHeroi(e, h);
              const transformado = comb?.buffs.some((x) => x.id.startsWith('transf:'));
              return (
                <li key={h.id} className={`combate-cartao ${caido ? 'caido' : ''} ${recemSubiu.includes(h.id) ? 'subiu' : ''}`}>
                  <button className="combate-topo" onClick={() => aoAbrirHeroi(h.id)} aria-label={`Abrir ficha de ${PERSONAGENS[h.id].nome}`}>
                    <span className="retrato-com-selo">
                      <Retrato id={h.id} tamanho={48} />
                      {recemSubiu.includes(h.id) && <span className="selo-nivel">▲ {h.nivel}</span>}
                    </span>
                    <span className="linha-nome">
                      <strong>{PERSONAGENS[h.id].nome}</strong>
                      <small>nv {h.nivel}</small>
                      {transformado && <span className="etiqueta fogo">🔥 Leão das Chamas</span>}
                      {caido && <span className="etiqueta caido">caído</span>}
                    </span>
                  </button>
                  <BarraVida vida={vida} max={max} escudo={escudo} />
                  <ul className="habilidades-combate" aria-label="Habilidades em uso">
                    {h.equipadas.map((id) => {
                      const hab = habilidade(e, id);
                      if (!hab) return null;
                      const nivel = h.habilidades.find((x) => x.id === id)?.nivel ?? 1;
                      const passiva = hab.tipo === 'passiva';
                      const total = passiva ? 0 : recargaEfetiva(hab, stats, mods, nivel);
                      const resta = passiva ? 0 : (comb?.recargas[id] ?? 0);
                      const pct = passiva || total <= 0 ? 100 : Math.max(0, Math.min(100, (1 - resta / total) * 100));
                      return (
                        <li key={id}>
                          <Dica conteudo={() => <DicaHabilidade hab={hab} nivel={nivel} recarga={passiva ? undefined : total} resta={resta} />}>
                            <span
                              className={`hab-anel ${passiva ? 'passiva' : resta <= 0 ? 'pronta' : ''}`}
                              style={{ '--el': COR_ELEMENTO[hab.elemento], '--p': `${pct}%` } as React.CSSProperties}
                              tabIndex={0}
                              role="img"
                              aria-label={`${hab.nome}: ${passiva ? 'passiva' : resta > 0 ? `${Math.ceil(resta)} s` : 'pronta'}`}
                            >
                              <span className="hab-sigla">{siglaHabilidade(hab.nome)}</span>
                            </span>
                          </Dica>
                        </li>
                      );
                    })}
                  </ul>
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
              const imagem = urlDoCenario(m.cenario);
              return (
                <li key={m.id} className={`mapa ${atual ? 'atual' : ''} ${liberado ? '' : 'bloqueado'}`}>
                  <div className="mapa-miniatura" style={imagem ? { backgroundImage: `url(${imagem})` } : undefined}>
                    {atual && <span className="etiqueta atual">Você está aqui</span>}
                    {!liberado && (
                      <span className="mapa-cadeado">
                        <IconeUi nome="cadeado" tamanho={18} /> Abre no nível {m.nivelMinimo}
                      </span>
                    )}
                  </div>
                  <span className="mapa-info">
                    <strong>{m.nome}</strong>
                    <small>{liberado ? m.descricao : `Abre quando Sir LionHearth chegar ao nível ${m.nivelMinimo}.`}</small>
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
      </div>
    </div>
  );
}

/** Vida com o escudo sobreposto em outra cor (e escrito no texto). */
export function BarraVida({ vida, max, escudo }: { vida: number; max: number; escudo: number }) {
  const v = Math.max(0, Math.min(1, vida / max));
  const s = Math.max(0, Math.min(1, escudo / max));
  return (
    <span className="barra-vida">
      <span
        className="barra-vida-trilho"
        role="meter"
        aria-label="Vida"
        aria-valuemin={0}
        aria-valuemax={Math.floor(max)}
        aria-valuenow={Math.floor(Math.max(0, vida))}
        aria-valuetext={`${inteiro(Math.max(0, vida))} de ${inteiro(max)}${escudo > 0 ? `, escudo ${inteiro(escudo)}` : ''}`}
      >
        <span className="barra-vida-cheio" style={{ width: `${v * 100}%` }} />
        {s > 0 && <span className="barra-vida-escudo" style={{ width: `${s * 100}%` }} />}
      </span>
      <span className="medidor-texto">
        {inteiro(Math.max(0, vida))}/{inteiro(max)}
        {escudo > 0 && <span className="escudo-texto"> +{inteiro(escudo)} escudo</span>}
      </span>
    </span>
  );
}

/** Conteúdo da dica de uma habilidade em combate. */
export function DicaHabilidade(props: { hab: Habilidade; nivel: number; recarga?: number; resta?: number }) {
  const { hab } = props;
  const tipo = hab.tipo === 'passiva' ? (hab.aura ? 'aura' : 'passiva') : hab.tipo === 'transformacao' ? 'transformação' : 'ativa';
  return (
    <>
      <p>
        <strong>{hab.nome}</strong> <span className={`rank rank-${hab.rank}`}>{hab.rank}</span>
      </p>
      <p className="suave">
        <span className="ponto-elemento" style={{ background: COR_ELEMENTO[hab.elemento] }} aria-hidden /> {NOME_ELEMENTO[hab.elemento]} · {tipo} · nível{' '}
        {props.nivel}
      </p>
      <p>{hab.descricao}</p>
      {props.recarga !== undefined && (
        <p className="suave">
          Recarga {props.recarga.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s ·{' '}
          {(props.resta ?? 0) > 0 ? `pronta em ${Math.ceil(props.resta ?? 0)} s` : 'pronta'}
        </p>
      )}
    </>
  );
}
