import { DADOS_RARIDADE, MATERIAIS } from '../motor/dados/itens';
import type { ResumoOffline } from '../motor/jogo';
import type { Material } from '../motor/tipos';
import { IconeItem, Recurso, Retrato } from './comum';
import type { ExtrasOffline } from './feedback';
import { Modal } from './Modal';
import { duracao, inteiro, nomeHeroi, nomeItem } from './texto';
import { useContagem } from './usarContagem';

function Contador({ valor, rotulo, icone }: { valor: number; rotulo: string; icone: string }) {
  const atual = useContagem(valor);
  return (
    <li className="contador">
      <span className="contador-icone" aria-hidden>
        {icone}
      </span>
      <strong className="numero-grande" aria-label={`${inteiro(valor)} ${rotulo}`}>
        {inteiro(atual)}
      </strong>
      <small>{rotulo}</small>
    </li>
  );
}

function RecursoContado({ tipo, valor }: { tipo: Material | 'ouro'; valor: number }) {
  const atual = useContagem(valor);
  return <Recurso tipo={tipo} valor={atual} />;
}

export function ResumoOfflineModal(props: { resumo: ResumoOffline; extras?: ExtrasOffline | null; aoFechar: () => void }) {
  const r = props.resumo;
  const subiram = r.niveis.filter((h) => h.niveis > 0);
  const raros = props.extras?.raros ?? [];
  const vendidos = props.extras?.vendidos ?? 0;
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
        {r.limitado && ' (o máximo guardado é 8 horas)'}.
      </p>
      <ul className="contadores">
        <Contador valor={r.abates} rotulo="inimigos" icone="⚔" />
        <Contador valor={r.chefes} rotulo="chefes" icone="☠" />
        <Contador valor={r.itens} rotulo="itens novos" icone="🎒" />
      </ul>
      <div className="ganhos">
        {r.ouro > 0 && <RecursoContado tipo="ouro" valor={r.ouro} />}
        {(Object.keys(MATERIAIS) as Material[]).map((m) => (r.materiais[m] ? <RecursoContado key={m} tipo={m} valor={r.materiais[m] ?? 0} /> : null))}
      </div>
      {raros.length > 0 && (
        <>
          <h3>Achados raros</h3>
          <ul className="achados">
            {raros.slice(0, 8).map((item) => (
              <li key={item.uid} className={`raridade-${item.raridade}`}>
                <IconeItem item={item} escala={3} />
                <span>
                  <strong style={{ color: DADOS_RARIDADE[item.raridade].cor }}>{nomeItem(item)}</strong>
                  <small>{DADOS_RARIDADE[item.raridade].nome}</small>
                </span>
              </li>
            ))}
          </ul>
          {raros.length > 8 && <small>E mais {raros.length - 8}. Veja tudo na Mochila.</small>}
        </>
      )}
      {vendidos > 0 && (
        <p className="faixa-aviso">
          <span>
            <strong>Mochila cheia:</strong> {vendidos === 1 ? '1 item foi vendido' : `${inteiro(vendidos)} itens foram vendidos`} automaticamente.
          </span>
        </p>
      )}
      {subiram.length > 0 && (
        <ul className="lista-resumo">
          {subiram.map((h) => (
            <li key={h.id}>
              <Retrato id={h.id} tamanho={32} />
              <span>
                <strong>{nomeHeroi(h.id)}</strong> subiu {h.niveis} {h.niveis === 1 ? 'nível' : 'níveis'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
