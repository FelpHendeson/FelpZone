import type { Estado } from '../motor/tipos';
import { Modal } from './Modal';
import { descreverEvento, duracao } from './texto';

export function Diario(props: { estado: Estado; aoFechar: () => void }) {
  const e = props.estado;
  return (
    <Modal titulo="Diário de viagem" aoFechar={props.aoFechar}>
      <p className="dica">
        {duracao(e.tempo)} de aventura · {e.estatisticas.abates.toLocaleString('pt-BR')} inimigos · {e.estatisticas.chefes} chefes
      </p>
      {e.diario.length === 0 && <p className="dica">Nada registrado ainda. Derrote inimigos e chefes para escrever a história da guilda.</p>}
      <ol className="diario">
        {[...e.diario].reverse().map((r, i) => (
          <li key={`${r.t}-${i}`}>
            <small>há {duracao(e.tempo - r.t)}</small>
            {descreverEvento(e, r.evento)}
          </li>
        ))}
      </ol>
    </Modal>
  );
}
