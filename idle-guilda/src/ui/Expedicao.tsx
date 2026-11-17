import { useMemo } from 'react';
import { CENA_ALTURA, CENA_LARGURA, desenharCena, desenharRetrato } from '../arte/cena';
import { irPara, type Resultado } from '../motor/acoes';
import { CLASSES, MAXIMO_HEROIS, ORDEM_ZONAS, ZONAS } from '../motor/dados';
import { vidaMaxima, xpParaProximo } from '../motor/regras';
import { estimar } from '../motor/simulacao';
import type { Estado, Heroi, ZonaId } from '../motor/tipos';
import { Medidor } from './Barra';
import { CanvasPixel } from './pixel';
import { compacto, inteiro } from './texto';

interface Props {
  estado: Estado;
  agir: (acao: (e: Estado) => Resultado) => void;
  aoAbrirHeroi: (id: string) => void;
  aoIrTaverna: () => void;
}

/** Chave que muda só quando algo que afeta o rendimento muda (não a cada segundo). */
function chaveDaParty(e: Estado): string {
  return e.herois.map((h) => `${h.classe}:${h.nivel}:${h.atributos.poder}:${h.atributos.vigor}:${h.arma}`).join('|');
}

export function Expedicao({ estado: e, agir, aoAbrirHeroi, aoIrTaverna }: Props) {
  const chave = chaveDaParty(e);
  const estimativas = useMemo(() => {
    const r: Partial<Record<ZonaId, ReturnType<typeof estimar>>> = {};
    for (const z of e.zonasLiberadas) r[z] = estimar(e, z);
    return r;
    // Recalcula só quando a party ou as zonas mudam.
  }, [chave, e.zonasLiberadas.length]);

  const atual = estimativas[e.zona];
  const monstro = ZONAS[e.zona].monstro;
  const descansando = e.situacao === 'descansando';
  const vidaMedia = e.herois.reduce((s, h) => s + h.vida / vidaMaxima(h), 0) / e.herois.length;

  return (
    <>
      <section className="painel expedicao">
        <CanvasPixel
          largura={CENA_LARGURA}
          altura={CENA_ALTURA}
          className="cena"
          rotulo={descansando ? 'A party descansa no acampamento' : `A party luta contra ${monstro.plural}`}
          desenho={(ctx, t) => desenharCena(ctx, e, t)}
        />
        <div className="status">
          {descansando ? (
            <>
              <strong>🔥 Descansando no acampamento</strong>
              <small>
                Alguém se feriu. A party volta para {ZONAS[e.zona].nome} quando todos se recuperarem (
                {Math.round(vidaMedia * 100)}%).
              </small>
            </>
          ) : (
            <>
              <strong>
                ⚔ Lutando contra {monstro.plural} em {ZONAS[e.zona].nome}
              </strong>
              {atual && (
                <small>
                  Rende ~{compacto(atual.xpPorMinuto)} XP e ~{compacto(atual.ouroPorMinuto)} ouro por minuto
                  {atual.tempoLutando < 0.95 && `, com pausas para descansar (${Math.round((1 - atual.tempoLutando) * 100)}% do tempo)`}
                  .
                </small>
              )}
            </>
          )}
        </div>

        <h3>Para onde a party vai?</h3>
        <div className="zonas" role="radiogroup" aria-label="Zona">
          {ORDEM_ZONAS.map((z) => {
            const liberada = e.zonasLiberadas.includes(z);
            const est = estimativas[z];
            const dificil = est && est.tempoLutando < 0.5;
            return (
              <button
                key={z}
                role="radio"
                aria-checked={e.zona === z}
                className={`zona ${e.zona === z ? 'ativa' : ''}`}
                disabled={!liberada}
                onClick={() => agir((s) => irPara(s, z))}
              >
                <strong>{liberada ? ZONAS[z].nome : `🔒 ${ZONAS[z].nome}`}</strong>
                <small>
                  {!liberada
                    ? `Abre no nível ${ZONAS[z].nivelMinimo}`
                    : dificil
                      ? 'Difícil: a party vai recuar muito'
                      : `~${compacto(est?.xpPorMinuto ?? 0)} XP/min`}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="painel">
        <h2>Party</h2>
        <p className="dica">Toque num herói para distribuir pontos e trocar a arma.</p>
        <ul className="party">
          {e.herois.map((h) => (
            <LinhaHeroi key={h.id} h={h} aoAbrir={() => aoAbrirHeroi(h.id)} />
          ))}
          {e.herois.length < MAXIMO_HEROIS && (
            <li>
              <button className="vaga" onClick={aoIrTaverna}>
                + Vaga livre: recrute na Taverna
              </button>
            </li>
          )}
        </ul>
      </section>
    </>
  );
}

function LinhaHeroi({ h, aoAbrir }: { h: Heroi; aoAbrir: () => void }) {
  const max = vidaMaxima(h);
  const classe = CLASSES[h.classe];
  return (
    <li>
      <button className="heroi" onClick={aoAbrir}>
        <CanvasPixel
          largura={24}
          altura={20}
          className="retrato"
          rotulo={classe.nome}
          desenho={(ctx, t) => desenharRetrato(ctx, h, t, false)}
        />
        <span className="heroi-info">
          <span className="heroi-nome">
            <strong>{h.nome}</strong>
            <span className={`papel papel-${classe.papel}`}>{classe.papelNome}</span>
            <small>Nv {h.nivel}</small>
            {h.pontosLivres > 0 && <span className="selo">+{h.pontosLivres} pontos</span>}
          </span>
          <Medidor rotulo="Vida" valor={h.vida} maximo={max} cor="#5fcf5a" texto={`${inteiro(h.vida)}/${inteiro(max)}`} />
          <Medidor
            rotulo="XP"
            valor={h.xp}
            maximo={xpParaProximo(h.nivel)}
            cor="#5b9bff"
            texto={`${Math.floor((h.xp / xpParaProximo(h.nivel)) * 100)}%`}
          />
        </span>
      </button>
    </li>
  );
}
