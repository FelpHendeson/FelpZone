import { iconeArma } from '../arte/sprites';
import { armasLivres, forjar, podeForjar, type Resultado } from '../motor/acoes';
import { ARMAS, CLASSES, ORDEM_ARMAS } from '../motor/dados';
import type { Estado, Material } from '../motor/tipos';
import { Recurso } from './Barra';
import { Icone } from './pixel';

export function Forja(props: { estado: Estado; agir: (acao: (e: Estado) => Resultado) => void }) {
  const e = props.estado;
  return (
    <section className="painel">
      <h2>Forja</h2>
      <p className="dica">Armas com afinidade rendem 50% a mais na classe certa. Cada arma só pode estar com um herói.</p>
      <ul className="lista">
        {ORDEM_ARMAS.filter((a) => a !== 'bastao').map((a) => {
          const arma = ARMAS[a];
          return (
            <li key={a} className="item-forja">
              <Icone chave={`arma-${a}`} sprite={iconeArma(a)} escala={3} />
              <div className="item-info">
                <strong>{arma.nome}</strong>
                <small>
                  Ataque +{arma.ataque}
                  {arma.afinidade ? ` · afinidade: ${CLASSES[arma.afinidade].nome}` : ' · sem afinidade'}
                  {e.armas[a] > 0 && ` · possui ${e.armas[a]} (${armasLivres(e, a)} livre)`}
                </small>
                <span className="custo">
                  <Recurso tipo="ouro" valor={arma.custoOuro} falta={e.ouro < arma.custoOuro} />
                  {Object.entries(arma.custoMateriais).map(([m, q]) => (
                    <Recurso
                      key={m}
                      tipo={m as Material}
                      valor={q ?? 0}
                      falta={Math.floor(e.materiais[m as Material]) < (q ?? 0)}
                    />
                  ))}
                </span>
              </div>
              <button disabled={!podeForjar(e, a)} onClick={() => props.agir((s) => forjar(s, a))}>
                Forjar
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
