import type { Estado } from '../motor/tipos';
import { descreverEvento, duracao } from './texto';

export function Diario(props: { estado: Estado }) {
  const e = props.estado;
  return (
    <section className="painel">
      <h2>Diário</h2>
      <p className="dica">Guilda fundada há {duracao(e.tempo)} de jogo.</p>
      <ol className="diario">
        {[...e.diario].reverse().map((r, i) => (
          <li key={`${r.t}-${i}`}>
            <small>há {duracao(e.tempo - r.t)}</small>
            {descreverEvento(e, r.evento)}
          </li>
        ))}
      </ol>
    </section>
  );
}
