"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Faixa colorida no topo (cor da rua). */
  band?: string;
}

/**
 * Janela que sobe da base da tela. Recebe o foco ao abrir, fecha com Escape ou
 * tocando fora, mantém o Tab dentro dela e devolve o foco a quem a abriu.
 */
export function Sheet({ title, onClose, children, band }: Props) {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const close = useRef(onClose);

  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    heading.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input, select, textarea, a[href], [tabindex='0']",
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, []);

  return (
    <div className="sheet-backdrop" onClick={() => close.current()}>
      <section
        ref={panel}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        {band && <div className="sheet-band" style={{ background: band }} />}
        <h2 id={titleId} ref={heading} tabIndex={-1}>
          {title}
        </h2>
        {children}
        <button className="button block" onClick={() => close.current()}>
          Fechar
        </button>
      </section>
    </div>
  );
}
