import { useEffect, type ReactNode } from 'react';

export function Modal(props: { titulo: string; aoFechar: () => void; children: ReactNode; rodape?: ReactNode }) {
  const { aoFechar } = props;
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => ev.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoFechar]);

  return (
    <div className="fundo-modal" onClick={aoFechar}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={props.titulo} onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>{props.titulo}</h2>
          <button className="fechar" onClick={aoFechar} aria-label="Fechar">
            ✕
          </button>
        </div>
        {props.children}
        {props.rodape}
      </div>
    </div>
  );
}
