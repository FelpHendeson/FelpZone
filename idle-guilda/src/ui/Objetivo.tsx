import { useState } from 'react';
import { receberObjetivo, type Resultado } from '../motor/acoes';
import { OBJETIVOS, objetivoAtual, type Destino } from '../motor/objetivos';
import type { Estado, Material } from '../motor/tipos';
import { Recurso } from './comum';

export const NOME_DESTINO: Record<Destino, string> = {
  batalha: 'Batalha',
  party: 'Party',
  cidade: 'Cidade',
  expedicoes: 'Expedições',
  mundo: 'Mundo',
};

interface Props {
  estado: Estado;
  abaAtual: string;
  agir: (acao: (e: Estado) => Resultado) => void;
  aoIr: (destino: Destino) => void;
}

/** Objetivo atual: o tutorial e a campanha do jogo. Pode ser recolhido. */
export function Objetivo({ estado: e, abaAtual, agir, aoIr }: Props) {
  const [aberto, setAberto] = useState(true);
  const o = objetivoAtual(e);
  if (!o) {
    return (
      <section className="objetivo concluido">
        <strong>🏆 A campanha terminou: o nome LionHearth ecoa pelas Sky Islands!</strong>
        <small>Continue fortalecendo a party, subindo ondas e criando habilidades no Jardim.</small>
      </section>
    );
  }
  const [atual, total] = o.progresso(e);
  const cumprido = atual >= total;
  const r = o.recompensa;
  return (
    <section className={`objetivo ${cumprido ? 'pronto' : ''} ${aberto ? '' : 'recolhido'}`} aria-live="polite">
      <button className="objetivo-topo" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
        <small>
          Capítulo {e.objetivo + 1}/{OBJETIVOS.length}
        </small>
        <strong>{o.titulo}</strong>
        <span className="recompensa">
          {r.ouro ? <Recurso tipo="ouro" valor={r.ouro} /> : null}
          {Object.entries(r.materiais ?? {}).map(([m, q]) => (
            <Recurso key={m} tipo={m as Material} valor={q ?? 0} />
          ))}
          {r.item && <span className="etiqueta">{r.item.reliquia ? 'relíquia' : 'item'}</span>}
        </span>
      </button>
      {aberto && (
        <>
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
        </>
      )}
    </section>
  );
}
