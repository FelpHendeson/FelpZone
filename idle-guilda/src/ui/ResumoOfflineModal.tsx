import { MATERIAIS } from '../motor/dados';
import type { ResumoOffline } from '../motor/simulacao';
import type { Material } from '../motor/tipos';
import { Recurso } from './Barra';
import { Modal } from './Modal';
import { duracao, inteiro } from './texto';

export function ResumoOfflineModal(props: { resumo: ResumoOffline; aoFechar: () => void }) {
  const r = props.resumo;
  const subiram = r.herois.filter((h) => h.niveis > 0);
  return (
    <Modal
      titulo="Enquanto você esteve fora"
      aoFechar={props.aoFechar}
      rodape={
        <button className="principal" onClick={props.aoFechar} autoFocus>
          Continuar
        </button>
      }
    >
      <p className="dica">
        A party lutou por {duracao(r.segundos)}
        {r.limitado && ' (o máximo guardado é 8 horas)'} e derrotou {inteiro(r.abates)} monstros.
      </p>
      <div className="ganhos">
        {r.ouro > 0 && <Recurso tipo="ouro" valor={r.ouro} />}
        {(Object.keys(MATERIAIS) as Material[]).map((m) =>
          r.materiais[m] ? <Recurso key={m} tipo={m} valor={r.materiais[m] ?? 0} /> : null,
        )}
      </div>
      {subiram.length > 0 && (
        <ul className="lista-resumo">
          {subiram.map((h) => (
            <li key={h.id}>
              <strong>{h.nome}</strong> subiu {h.niveis} {h.niveis === 1 ? 'nível' : 'níveis'}: tem pontos para distribuir!
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
