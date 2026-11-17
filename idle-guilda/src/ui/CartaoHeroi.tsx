import { useState } from 'react';
import { CENA_ALTURA, CENA_LARGURA, desenharCena } from '../arte/cena';
import { iconeArma } from '../arte/sprites';
import {
  alternarDescansoAutomatico,
  armasLivres,
  definirTarefa,
  distribuirPonto,
  equipar,
  type Resultado,
} from '../motor/acoes';
import { ARMAS, ATRIBUTOS, CLASSES, ORDEM_ARMAS, ORDEM_ZONAS, ZONAS } from '../motor/dados';
import {
  ataque,
  eficiencia,
  estimativaCaca,
  fatorDefesa,
  mineracaoPorSegundo,
  vidaMaxima,
  xpParaProximo,
} from '../motor/regras';
import type { Atributo, Estado, Heroi } from '../motor/tipos';
import { Medidor } from './Barra';
import { CanvasPixel, Icone } from './pixel';
import { compacto, descreverTarefa, inteiro } from './texto';

interface Props {
  estado: Estado;
  heroi: Heroi;
  agir: (acao: (e: Estado) => Resultado) => void;
}

function rendimento(h: Heroi): string {
  const t = h.tarefa;
  if (t.tipo === 'cacar') {
    const est = estimativaCaca(h, t.zona);
    const pausas = est.tempoAtivo < 0.95 ? ` · luta ${Math.round(est.tempoAtivo * 100)}% do tempo` : '';
    return `~${compacto(est.xpPorMinuto)} XP e ${compacto(est.ouroPorMinuto)} ouro por minuto${pausas}`;
  }
  if (t.tipo === 'minerar') return `~${compacto(mineracaoPorSegundo(h) * eficiencia(h) * 60)} minério por minuto`;
  return h.tarefaAnterior ? 'Volta ao trabalho quando estiver recuperado' : 'Sem tarefa para retomar';
}

export function CartaoHeroi({ estado, heroi: h, agir }: Props) {
  const [ficha, setFicha] = useState(false);
  const max = vidaMaxima(h);
  const t = h.tarefa;

  return (
    <article className="cartao">
      <CanvasPixel
        largura={CENA_LARGURA}
        altura={CENA_ALTURA}
        className="cena"
        rotulo={descreverTarefa(t)}
        desenho={(ctx, tempo) => desenharCena(ctx, h, tempo)}
      />
      <div className="cartao-corpo">
        <div className="cartao-titulo">
          <h2>{h.nome}</h2>
          <span className="etiqueta">
            {CLASSES[h.classe].nome} · Nv {h.nivel}
          </span>
          {h.pontosLivres > 0 && (
            <button className="etiqueta destaque" onClick={() => setFicha(true)}>
              +{h.pontosLivres} pontos
            </button>
          )}
        </div>
        <p className="situacao">
          {descreverTarefa(t)}
          <br />
          <small>{rendimento(h)}</small>
        </p>
        <Medidor rotulo="XP" valor={h.xp} maximo={xpParaProximo(h.nivel)} cor="#5b9bff" texto={`${inteiro(h.xp)}/${inteiro(xpParaProximo(h.nivel))}`} />
        <Medidor rotulo="Vida" valor={h.vida} maximo={max} cor="#5fcf5a" texto={`${inteiro(h.vida)}/${inteiro(max)}`} />
        <Medidor
          rotulo="Fadiga"
          valor={h.fadiga}
          maximo={100}
          cor={h.fadiga > 70 ? '#e0703a' : '#c9a227'}
          texto={`${Math.round(h.fadiga)}% · rende ${Math.round(eficiencia(h) * 100)}%`}
        />

        <div className="tarefas" role="group" aria-label="Tarefa">
          {ORDEM_ZONAS.map((z) => {
            const liberada = estado.zonasLiberadas.includes(z);
            const ativa = t.tipo === 'cacar' && t.zona === z;
            const perigosa = liberada && estimativaCaca(h, z).tempoAtivo < 0.5;
            return (
              <button
                key={z}
                className={`${ativa ? 'ativa' : ''} ${perigosa ? 'perigosa' : ''}`}
                disabled={!liberada}
                onClick={() => agir((e) => definirTarefa(e, h.id, { tipo: 'cacar', zona: z }))}
                title={liberada ? `Caçar: ${ZONAS[z].monstro.nome}` : `Libera no nível ${ZONAS[z].nivelMinimo}`}
              >
                {liberada ? ZONAS[z].nome : `🔒 Nv ${ZONAS[z].nivelMinimo}`}
                {perigosa && <small> perigoso</small>}
              </button>
            );
          })}
          <button
            className={t.tipo === 'minerar' ? 'ativa' : ''}
            onClick={() => agir((e) => definirTarefa(e, h.id, { tipo: 'minerar' }))}
          >
            Minerar
          </button>
          <button
            className={t.tipo === 'descansar' ? 'ativa' : ''}
            onClick={() => agir((e) => definirTarefa(e, h.id, { tipo: 'descansar' }))}
          >
            Descansar
          </button>
        </div>

        <button className="ficha-alternar" aria-expanded={ficha} onClick={() => setFicha(!ficha)}>
          {ficha ? '▾ Ficha' : '▸ Ficha'}
        </button>

        {ficha && (
          <div className="ficha">
            <ul className="atributos">
              {(Object.keys(ATRIBUTOS) as Atributo[]).map((a) => (
                <li key={a}>
                  <span>
                    <strong>{ATRIBUTOS[a].nome}</strong> {h.atributos[a]}
                    {CLASSES[h.classe].primario === a && <em> (ataque)</em>}
                    <br />
                    <small>{ATRIBUTOS[a].efeito}</small>
                  </span>
                  <button
                    disabled={h.pontosLivres <= 0}
                    onClick={() => agir((e) => distribuirPonto(e, h.id, a))}
                    aria-label={`Aumentar ${ATRIBUTOS[a].nome}`}
                  >
                    +
                  </button>
                </li>
              ))}
            </ul>
            <p className="derivados">
              Ataque {compacto(ataque(h))} · Vida {inteiro(max)} · Bloqueia {Math.round((1 - fatorDefesa(h)) * 100)}% do dano ·{' '}
              {h.abates} abates · {h.nocautes} nocautes
            </p>

            <h3>Arma</h3>
            <div className="armas">
              {ORDEM_ARMAS.filter((a) => a === 'bastao' || estado.armas[a] > 0).map((a) => {
                const livre = h.arma === a || armasLivres(estado, a) > 0;
                const arma = ARMAS[a];
                return (
                  <button
                    key={a}
                    className={h.arma === a ? 'ativa' : ''}
                    disabled={!livre}
                    onClick={() => agir((e) => equipar(e, h.id, a))}
                    title={livre ? arma.nome : 'Em uso por outro herói'}
                  >
                    <Icone chave={`arma-${a}`} sprite={iconeArma(a)} />
                    <span>
                      {arma.nome}
                      <small>
                        {' '}
                        +{arma.ataque}
                        {arma.afinidade === h.classe ? ' ×1,5' : ''}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="alternador">
              <input
                type="checkbox"
                checked={h.descansoAutomatico}
                onChange={() => agir((e) => alternarDescansoAutomatico(e, h.id))}
              />
              Descansar sozinho com vida baixa ou exausto, e depois voltar à tarefa
            </label>
          </div>
        )}
      </div>
    </article>
  );
}
