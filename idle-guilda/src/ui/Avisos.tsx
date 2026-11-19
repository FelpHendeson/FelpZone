import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export type TipoAviso = 'info' | 'sucesso' | 'erro' | 'loot' | 'nivel';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  conteudo: ReactNode;
  /** Milissegundos na tela. */
  duracao: number;
  /** Brilho extra (loot épico ou lendário). */
  brilho?: boolean;
}

const MAXIMO = 3;
const DURACAO_PADRAO = 3500;
const ICONE: Record<TipoAviso, string> = { info: 'ℹ', sucesso: '✓', erro: '!', loot: '✦', nivel: '▲' };
const NOME_TIPO: Record<TipoAviso, string> = { info: 'Aviso', sucesso: 'Pronto', erro: 'Erro', loot: 'Saque', nivel: 'Nível' };

/** Fila de até 3 avisos empilhados; o mais antigo sai quando chega um quarto. */
export function useAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const proximo = useRef(1);
  const avisar = useCallback((conteudo: ReactNode, tipo: TipoAviso = 'info', extra: { duracao?: number; brilho?: boolean } = {}) => {
    const id = proximo.current++;
    setAvisos((lista) => [...lista, { id, tipo, conteudo, duracao: extra.duracao ?? DURACAO_PADRAO, brilho: extra.brilho }].slice(-MAXIMO));
  }, []);
  const remover = useCallback((id: number) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);
  return { avisos, avisar, remover };
}

function ItemAviso({ aviso, aoSair }: { aviso: Aviso; aoSair: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => aoSair(aviso.id), aviso.duracao);
    return () => clearTimeout(t);
  }, [aviso.id, aviso.duracao, aoSair]);
  return (
    <li className={`aviso-item tipo-${aviso.tipo} ${aviso.brilho ? 'brilho' : ''}`}>
      <span className="aviso-icone" aria-hidden>
        {ICONE[aviso.tipo]}
      </span>
      <span className="so-leitor">{NOME_TIPO[aviso.tipo]}: </span>
      <span className="aviso-texto">{aviso.conteudo}</span>
      <button className="aviso-fechar" onClick={() => aoSair(aviso.id)} aria-label="Fechar aviso">
        ✕
      </button>
    </li>
  );
}

export function Avisos({ avisos, aoSair }: { avisos: Aviso[]; aoSair: (id: number) => void }) {
  return (
    <ol className="avisos" aria-live="polite" aria-relevant="additions">
      {avisos.map((a) => (
        <ItemAviso key={a.id} aviso={a} aoSair={aoSair} />
      ))}
    </ol>
  );
}
