import { mapaPorId } from '../motor/dados/mapas';
import { INVENTARIO_MAXIMO } from '../motor/dados/itens';
import type { Estado } from '../motor/tipos';
import { Recurso } from './comum';
import type { SituacaoNuvem } from './Conta';
import { Dica } from './Dica';
import { IconeUi } from './IconeUi';
import { quandoFoi } from './resumo';

/** normal (< 80%), atenção (80% ou mais) ou cheia. */
export function nivelMochila(n: number): 'normal' | 'atencao' | 'cheia' {
  if (n >= INVENTARIO_MAXIMO) return 'cheia';
  if (n >= INVENTARIO_MAXIMO * 0.8) return 'atencao';
  return 'normal';
}

export function Barra(props: { estado: Estado; nuvem: SituacaoNuvem | null; aoMenu: () => void; aoMochila: () => void }) {
  const e = props.estado;
  const material = mapaPorId(e.batalha.mapa).material;
  const n = e.inventario.length;
  const nivel = nivelMochila(n);
  const nuvem = props.nuvem;
  return (
    <header className="barra">
      <span className="recursos">
        <Recurso tipo="ouro" valor={e.ouro} dica />
        <Recurso tipo={material} valor={e.materiais[material]} dica />
        <Recurso tipo="essencia" valor={e.materiais.essencia} dica />
        <Dica
          toque="navegacao"
          conteudo={
            nivel === 'cheia' ? (
              <p>
                <strong>Mochila cheia:</strong> itens novos são vendidos na hora.
              </p>
            ) : (
              <p>
                Mochila {n}/{INVENTARIO_MAXIMO} · {INVENTARIO_MAXIMO - n} livres. Toque para abrir.
              </p>
            )
          }
        >
          <button
            className={`pilula-mochila ${nivel}`}
            onClick={props.aoMochila}
            aria-label={`Abrir mochila: ${n} de ${INVENTARIO_MAXIMO} itens${nivel === 'cheia' ? ', cheia' : ''}`}
          >
            <IconeUi nome="mochila" tamanho={16} />
            <span className="pilula-mochila-texto">
              {n}/{INVENTARIO_MAXIMO}
              <span className="pilula-mochila-trilho" aria-hidden>
                <span style={{ width: `${Math.min(1, n / INVENTARIO_MAXIMO) * 100}%` }} />
              </span>
            </span>
            {nivel === 'cheia' && <span className="selo-cheio">CHEIO</span>}
          </button>
        </Dica>
      </span>
      <span className="barra-direita">
        {nuvem && (
          <Dica
            conteudo={
              <>
                <p>
                  <strong>Save na nuvem</strong> · {nuvem.enviando ? 'enviando…' : nuvem.erro ? 'erro' : 'salvo'}
                </p>
                {nuvem.erro && <p>Falha ao salvar: {nuvem.erro}</p>}
                <p className="suave">Último envio: {nuvem.ultimoEnvio ? quandoFoi(nuvem.ultimoEnvio) : 'ainda não'}</p>
              </>
            }
          >
            <span
              className={`nuvem ${nuvem.erro ? 'com-erro' : ''}`}
              tabIndex={0}
              role="img"
              aria-label={nuvem.erro ? 'Erro no save na nuvem' : 'Save na nuvem ligado'}
            >
              <IconeUi nome="nuvem" tamanho={18} />
              {nuvem.enviando ? '…' : nuvem.erro ? '!' : ''}
            </span>
          </Dica>
        )}
        <button className="ajuda" onClick={props.aoMenu} aria-label="Menu">
          <IconeUi nome="menu" tamanho={18} />
        </button>
      </span>
    </header>
  );
}
