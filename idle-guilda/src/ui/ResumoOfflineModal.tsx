import { MATERIAIS } from '../motor/dados/itens';
import type { ResumoOffline } from '../motor/jogo';
import type { Material } from '../motor/tipos';
import { Recurso } from './comum';
import { Modal } from './Modal';
import { duracao, inteiro, nomeHeroi } from './texto';

export function ResumoOfflineModal(props: { resumo: ResumoOffline; aoFechar: () => void }) {
  const r = props.resumo;
  const subiram = r.niveis.filter((h) => h.niveis > 0);
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
        {r.limitado && ' (o máximo guardado é 8 horas)'}: {inteiro(r.abates)} inimigos e {r.chefes} chefes derrotados
        {r.itens > 0 && `, ${r.itens} itens novos no inventário`}.
      </p>
      <div className="ganhos">
        {r.ouro > 0 && <Recurso tipo="ouro" valor={r.ouro} />}
        {(Object.keys(MATERIAIS) as Material[]).map((m) => (r.materiais[m] ? <Recurso key={m} tipo={m} valor={r.materiais[m] ?? 0} /> : null))}
      </div>
      {subiram.length > 0 && (
        <ul className="lista-resumo">
          {subiram.map((h) => (
            <li key={h.id}>
              <strong>{nomeHeroi(h.id)}</strong> subiu {h.niveis} {h.niveis === 1 ? 'nível' : 'níveis'}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
