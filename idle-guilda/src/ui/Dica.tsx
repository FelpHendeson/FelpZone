import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';

/**
 * Como o toque (celular) trata a dica:
 * - `auto`: toque abre a dica. Se o elemento não for interativo, o toque não
 *   chega a quem está em volta (ex.: recarga dentro do cartão do herói).
 *   Botões continuam fazendo a ação e mostram a dica junto.
 * - `navegacao`: o toque só navega; a dica fica para mouse e teclado.
 * - `nenhum`: dica só com mouse e teclado (ex.: células da Mochila, cujo
 *   toque abre o cartão completo).
 */
export type ToqueDica = 'auto' | 'navegacao' | 'nenhum';

type PropsAlvo = {
  ref?: unknown;
  onClick?: (ev: SyntheticEvent) => void;
  onMouseEnter?: (ev: SyntheticEvent) => void;
  onMouseLeave?: (ev: SyntheticEvent) => void;
  onFocus?: (ev: SyntheticEvent) => void;
  onBlur?: (ev: SyntheticEvent) => void;
  onPointerDown?: (ev: React.PointerEvent) => void;
  'aria-describedby'?: string;
};

const ATRASO_MS = 150;
const TOQUE_ABERTA_MS = 4000;
const MARGEM = 8;

const interativo = (el: Element | null) => !!el?.matches('button, a, input, select, textarea, [role="button"]');

/**
 * Balão curto de ajuda. Desktop: abre com hover ou foco após ~150 ms.
 * Celular: o toque abre e um toque fora (ou 4 s) fecha. O conteúdo só é
 * montado com a dica aberta, então não pesa nos ticks do jogo.
 */
export function Dica(props: { conteudo: ReactNode | (() => ReactNode); children: ReactElement<PropsAlvo>; toque?: ToqueDica; larga?: boolean }) {
  const toque = props.toque ?? 'auto';
  const id = useId();
  const alvo = useRef<HTMLElement | null>(null);
  const balao = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ultimoToque = useRef(0);
  const [aberta, setAberta] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; abaixo: boolean } | null>(null);

  const fechar = useCallback(() => {
    clearTimeout(timer.current);
    setAberta(false);
    setPos(null);
  }, []);

  const abrirDepois = (ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAberta(true), ms);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  // Posição: em cima do alvo; embaixo se não couber; sempre dentro da tela.
  useLayoutEffect(() => {
    if (!aberta || !alvo.current || !balao.current) return;
    const r = alvo.current.getBoundingClientRect();
    const b = balao.current.getBoundingClientRect();
    let top = r.top - b.height - MARGEM;
    const abaixo = top < MARGEM;
    if (abaixo) top = Math.min(r.bottom + MARGEM, window.innerHeight - b.height - MARGEM);
    const left = Math.max(MARGEM, Math.min(r.left + r.width / 2 - b.width / 2, window.innerWidth - b.width - MARGEM));
    setPos({ top, left, abaixo });
  }, [aberta]);

  // Aberta: fecha com Esc, rolagem ou toque fora.
  useEffect(() => {
    if (!aberta) return;
    const fora = (ev: PointerEvent) => {
      if (!alvo.current?.contains(ev.target as Node)) fechar();
    };
    const tecla = (ev: KeyboardEvent) => ev.key === 'Escape' && fechar();
    document.addEventListener('pointerdown', fora, true);
    window.addEventListener('keydown', tecla);
    window.addEventListener('scroll', fechar, true);
    return () => {
      document.removeEventListener('pointerdown', fora, true);
      window.removeEventListener('keydown', tecla);
      window.removeEventListener('scroll', fechar, true);
    };
  }, [aberta, fechar]);

  const filho = props.children;
  const p = filho.props;
  const deToque = () => Date.now() - ultimoToque.current < 800;

  const novo: PropsAlvo = {
    ref: (el: HTMLElement | null) => {
      alvo.current = el;
    },
    'aria-describedby': aberta ? id : p['aria-describedby'],
    onPointerDown: (ev) => {
      if (ev.pointerType !== 'mouse') ultimoToque.current = Date.now();
      p.onPointerDown?.(ev);
    },
    onMouseEnter: (ev) => {
      p.onMouseEnter?.(ev);
      if (!deToque()) abrirDepois(ATRASO_MS);
    },
    onMouseLeave: (ev) => {
      p.onMouseLeave?.(ev);
      if (!deToque()) fechar();
    },
    onFocus: (ev) => {
      p.onFocus?.(ev);
      // Só o foco pelo teclado abre; o foco de um toque é tratado no clique.
      if (!deToque() && (ev.target as HTMLElement).matches?.(':focus-visible')) abrirDepois(ATRASO_MS);
    },
    onBlur: (ev) => {
      p.onBlur?.(ev);
      fechar();
    },
    onClick: (ev) => {
      if (deToque() && toque === 'auto') {
        if (!interativo(alvo.current)) {
          ev.stopPropagation();
          ev.preventDefault();
        }
        if (aberta) fechar();
        else {
          clearTimeout(timer.current);
          setAberta(true);
          timer.current = setTimeout(fechar, TOQUE_ABERTA_MS);
        }
      }
      p.onClick?.(ev);
    },
  };

  const conteudo = aberta ? (typeof props.conteudo === 'function' ? props.conteudo() : props.conteudo) : null;

  return (
    <>
      {cloneElement(filho, novo)}
      {aberta &&
        createPortal(
          <div
            ref={balao}
            id={id}
            role="tooltip"
            className={`balao ${props.larga ? 'largo' : ''} ${pos?.abaixo ? 'abaixo' : ''}`}
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
          >
            {conteudo}
          </div>,
          document.body,
        )}
    </>
  );
}
