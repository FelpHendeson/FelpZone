import { mapaPorId } from '../motor/dados/mapas';
import { INVENTARIO_MAXIMO } from '../motor/dados/itens';
import type { Estado } from '../motor/tipos';
import { Recurso } from './comum';
import type { SituacaoNuvem } from './Conta';

export function Barra(props: { estado: Estado; nuvem: SituacaoNuvem | null; aoMenu: () => void }) {
  const e = props.estado;
  const material = mapaPorId(e.batalha.mapa).material;
  const cheio = e.inventario.length >= INVENTARIO_MAXIMO - 5;
  return (
    <header className="barra">
      <span className="recursos">
        <Recurso tipo="ouro" valor={e.ouro} />
        <Recurso tipo={material} valor={e.materiais[material]} />
        <Recurso tipo="essencia" valor={e.materiais.essencia} />
        <span className={`inventario ${cheio ? 'falta' : ''}`} title="Itens no inventário">
          🎒 {e.inventario.length}/{INVENTARIO_MAXIMO}
        </span>
      </span>
      <span className="barra-direita">
        {props.nuvem && (
          <span className={`nuvem ${props.nuvem.erro ? 'com-erro' : ''}`} title={props.nuvem.erro ? `Falha ao salvar na nuvem: ${props.nuvem.erro}` : 'Save na nuvem ligado'}>
            {props.nuvem.enviando ? '☁…' : props.nuvem.erro ? '☁!' : '☁'}
          </span>
        )}
        <button className="ajuda" onClick={props.aoMenu} aria-label="Menu">
          ☰
        </button>
      </span>
    </header>
  );
}
