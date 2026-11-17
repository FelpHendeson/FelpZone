import { iconeArma } from '../arte/sprites';
import { armasLivres, faltaParaForjar, forjar, type Resultado } from '../motor/acoes';
import { ARMAS, CLASSES, ORDEM_ARMAS, ZONAS } from '../motor/dados';
import type { Estado, Material } from '../motor/tipos';
import { Recurso } from './Barra';
import { Icone } from './pixel';

const ORIGEM: Record<Material, string> = {
  gosma: ZONAS.campina.nome,
  couro: ZONAS.bosque.nome,
  fragmento: ZONAS.ruinas.nome,
};

export function Forja(props: { estado: Estado; agir: (acao: (e: Estado) => Resultado) => void }) {
  const e = props.estado;
  return (
    <section className="painel">
      <h2>Forja</h2>
      <p className="dica">
        Armas aumentam o dano (e a cura da Mística). Na classe indicada, rendem 50% a mais. Depois de forjar, toque no herói na
        Expedição para equipar.
      </p>
      <ul className="lista">
        {ORDEM_ARMAS.filter((a) => a !== 'bastao').map((a) => {
          const arma = ARMAS[a];
          const livres = armasLivres(e, a);
          return (
            <li key={a} className="item-forja">
              <Icone chave={`arma-${a}`} sprite={iconeArma(a)} escala={3} />
              <div className="item-info">
                <strong>{arma.nome}</strong>
                <small>
                  +{arma.ataque} de ataque
                  {arma.afinidade ? ` · ideal para ${CLASSES[arma.afinidade].nome}` : ' · serve para todos'}
                </small>
                {e.armas[a] > 0 && (
                  <small className="possui">
                    Você tem {e.armas[a]} {livres > 0 ? `(${livres} sem dono)` : '(em uso)'}
                  </small>
                )}
                <span className="custo">
                  <Recurso tipo="ouro" valor={arma.custoOuro} falta={e.ouro < arma.custoOuro} />
                  {Object.entries(arma.custoMateriais).map(([m, q]) => (
                    <span key={m} title={`Cai em ${ORIGEM[m as Material]}`}>
                      <Recurso tipo={m as Material} valor={q ?? 0} falta={Math.floor(e.materiais[m as Material]) < (q ?? 0)} />
                    </span>
                  ))}
                </span>
              </div>
              <button disabled={faltaParaForjar(e, a)} onClick={() => props.agir((s) => forjar(s, a))}>
                Forjar
              </button>
            </li>
          );
        })}
      </ul>
      <p className="dica">
        Onde achar: gosma em {ORIGEM.gosma}, couro em {ORIGEM.couro} e fragmentos em {ORIGEM.fragmento}.
      </p>
    </section>
  );
}
