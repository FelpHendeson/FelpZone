"use client";

import { useEffect, useRef } from "react";
import { ABAS, type Aba } from "@/lib/abas";

export function NavegacaoPrincipal({ ativa, prontas, aoEscolher }: { ativa: string; prontas: number; aoEscolher: (id: string) => void }) {
  return <nav className="abas" aria-label="Navegação principal">
    {ABAS.map((a) => <button key={a.id} type="button" className="aba" aria-current={a.id === ativa ? "page" : undefined} onClick={() => aoEscolher(a.id)}>
      <span className="aba-icone" aria-hidden="true">{a.icone}</span>
      <span className="aba-rotulo">{a.rotulo}</span>
      {a.id === "missoes" && prontas > 0 && <span className="aba-selo"><span aria-hidden="true">{prontas}</span><span className="visualmente-oculto">{prontas} missões prontas para entregar</span></span>}
    </button>)}
  </nav>;
}

export function SubAbas({ aba, indice, aoEscolher }: { aba: Aba; indice: number; aoEscolher: (indice: number) => void }) {
  const lista = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const faixa = lista.current;
    const tab = faixa?.querySelector<HTMLElement>("[aria-selected=true]");
    if (!faixa || !tab) return;
    const limites = faixa.getBoundingClientRect();
    const item = tab.getBoundingClientRect();
    if (item.left < limites.left) faixa.scrollLeft -= limites.left - item.left;
    else if (item.right > limites.right) faixa.scrollLeft += item.right - limites.right;
  }, [aba.id, indice]);

  return <div ref={lista} className="subabas" role="tablist" aria-label={`Seções de ${aba.rotulo}`}>
    {aba.subAbas.map((nome, i) => <button key={nome} id={`secao-${aba.id}-${i}`} type="button" role="tab" tabIndex={i === indice ? 0 : -1} aria-selected={i === indice} aria-controls="painel-jogo" className="subaba"
      onClick={() => aoEscolher(i)}
      onKeyDown={(e) => {
        const proximo = e.key === "ArrowRight" ? (i + 1) % aba.subAbas.length : e.key === "ArrowLeft" ? (i - 1 + aba.subAbas.length) % aba.subAbas.length : e.key === "Home" ? 0 : e.key === "End" ? aba.subAbas.length - 1 : null;
        if (proximo === null) return;
        e.preventDefault();
        aoEscolher(proximo);
        lista.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[proximo]?.focus({ preventScroll: true });
      }}>{nome}</button>)}
  </div>;
}
