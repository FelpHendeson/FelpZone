import type { Save } from '../motor/save';
import type { Estado } from '../motor/tipos';
import { Modal } from './Modal';
import { quandoFoi, resumoDoEstado } from './resumo';

interface Props {
  local: Estado;
  remoto: Save;
  aoUsarLocal: () => void;
  aoUsarRemoto: () => void;
}

/** Quando o aparelho e a nuvem têm progressos diferentes, o jogador escolhe. */
export function Conflito({ local, remoto, aoUsarLocal, aoUsarRemoto }: Props) {
  return (
    <Modal titulo="Qual progresso usar?">
      <p className="dica">Este aparelho e a sua conta têm progressos diferentes. O que você não escolher será substituído.</p>
      <div className="opcoes-save">
        <button onClick={aoUsarLocal}>
          <strong>📱 Este aparelho</strong>
          <small>{resumoDoEstado(local)}</small>
        </button>
        <button onClick={aoUsarRemoto}>
          <strong>☁ Nuvem</strong>
          <small>{resumoDoEstado(remoto.estado)}</small>
          <small>Salvo {quandoFoi(remoto.salvoEm)}</small>
        </button>
      </div>
    </Modal>
  );
}
