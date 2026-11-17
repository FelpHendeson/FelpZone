import { MATERIAIS } from '../motor/dados';
import type { ResumoOffline } from '../motor/simulacao';
import type { Material } from '../motor/tipos';
import { Recurso } from './Barra';
import { duracao } from './texto';

export function ResumoOfflineModal(props: { resumo: ResumoOffline; aoFechar: () => void }) {
  const r = props.resumo;
  return (
    <div className="fundo-modal" onClick={props.aoFechar}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="resumo-titulo" onClick={(e) => e.stopPropagation()}>
        <h2 id="resumo-titulo">Enquanto você esteve fora</h2>
        <p className="dica">
          {duracao(r.segundos)} de trabalho
          {r.limitado && ' (o máximo guardado é 8 horas)'}
        </p>
        <div className="ganhos">
          {r.ouro > 0 && <Recurso tipo="ouro" valor={r.ouro} />}
          {(Object.keys(MATERIAIS) as Material[]).map((m) =>
            r.materiais[m] ? <Recurso key={m} tipo={m} valor={r.materiais[m] ?? 0} /> : null,
          )}
        </div>
        <ul className="lista-resumo">
          {r.herois.map((h) => (
            <li key={h.id}>
              <strong>{h.nome}</strong>: {h.abates} abates
              {h.niveis > 0 && `, +${h.niveis} ${h.niveis === 1 ? 'nível' : 'níveis'}`}
              {h.nocautes > 0 && `, ${h.nocautes} ${h.nocautes === 1 ? 'nocaute' : 'nocautes'}`}
            </li>
          ))}
        </ul>
        <button className="principal" onClick={props.aoFechar} autoFocus>
          Continuar
        </button>
      </div>
    </div>
  );
}
