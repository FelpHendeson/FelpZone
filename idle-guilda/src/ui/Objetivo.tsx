import { receberObjetivo, type Resultado } from '../motor/acoes';
import { OBJETIVOS, objetivoAtual, type Destino } from '../motor/objetivos';
import type { Estado } from '../motor/tipos';
import { Recurso } from './Barra';

const NOME_DESTINO: Record<Destino, string> = { expedicao: 'Expedição', forja: 'Forja', taverna: 'Taverna' };

interface Props {
  estado: Estado;
  abaAtual: string;
  agir: (acao: (e: Estado) => Resultado) => void;
  aoIr: (destino: Destino) => void;
}

/** Objetivo atual, sempre visível: é o tutorial do jogo. */
export function Objetivo({ estado: e, abaAtual, agir, aoIr }: Props) {
  const o = objetivoAtual(e);
  if (!o) {
    return (
      <section className="objetivo concluido">
        <strong>🏆 Todos os objetivos concluídos!</strong>
        <small>Continue evoluindo a party nas Ruínas. Mais conteúdo vem nas próximas versões.</small>
      </section>
    );
  }
  const [atual, total] = o.progresso(e);
  const cumprido = atual >= total;
  return (
    <section className={`objetivo ${cumprido ? 'pronto' : ''}`} aria-live="polite">
      <div className="objetivo-topo">
        <small>
          Objetivo {e.objetivo + 1} de {OBJETIVOS.length}
        </small>
        <Recurso tipo="ouro" valor={o.recompensa} />
      </div>
      <strong>{o.titulo}</strong>
      {total > 1 && (
        <div className="objetivo-progresso" aria-label={`${Math.floor(atual)} de ${total}`}>
          <div style={{ width: `${Math.min(1, atual / total) * 100}%` }} />
          <span>
            {Math.floor(Math.min(atual, total))}/{total}
          </span>
        </div>
      )}
      {cumprido ? (
        <button className="principal" onClick={() => agir(receberObjetivo)}>
          Receber recompensa
        </button>
      ) : (
        <>
          <small>💡 {o.dica}</small>
          {abaAtual !== o.destino && (
            <button className="link" onClick={() => aoIr(o.destino)}>
              Ir para {NOME_DESTINO[o.destino]} →
            </button>
          )}
        </>
      )}
    </section>
  );
}
