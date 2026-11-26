"use client";

import { CATALOGO, type ParametrosMiniatura } from "@idle-pu/motor";
import { useEffect, useRef, useState } from "react";
import { obterArtePersonagem } from "@/lib/renderPersonagem";

export function PersonagemRaster({ parametros: p, retrato = false, rotulo, tamanho, animado = false }: {
  parametros: ParametrosMiniatura; retrato?: boolean; rotulo?: string; tamanho?: number; animado?: boolean;
}) {
  const { racaId, coreId, corCabeloId, corRoupaId } = p;
  const chave = `${racaId}:${corCabeloId}:${corRoupaId}:${retrato}`;
  const tela = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState({ chave: "", erro: false });
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let atual = true;
    void Promise.resolve().then(() => obterArtePersonagem({ racaId, coreId, corCabeloId, corRoupaId })).then((arte) => {
      if (!atual || !tela.current) return;
      const ctx = tela.current.getContext("2d"); if (!ctx) throw new Error("Canvas indisponível.");
      ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, tela.current.width, tela.current.height);
      ctx.drawImage(retrato ? arte.retrato : arte.corpo, 0, 0);
      setStatus({ chave, erro: false });
    }).catch(() => { if (atual) setStatus({ chave, erro: true }); });
    return () => { atual = false; };
  }, [racaId, coreId, corCabeloId, corRoupaId, retrato, chave, tentativa]);
  useEffect(() => {
    const reconectar = () => setTentativa((n) => n + 1);
    window.addEventListener("online", reconectar); return () => window.removeEventListener("online", reconectar);
  }, []);
  const pronto = status.chave === chave && !status.erro;
  const core = CATALOGO.cores.get(coreId);
  return <span className={`${retrato ? "miniatura miniatura-raster" : "sprite-personagem"}${animado ? " sprite-animado" : ""}`} role={retrato ? "img" : undefined} aria-label={retrato ? rotulo : undefined} aria-hidden={!retrato || undefined} aria-busy={!pronto && !status.erro}
    data-carregado={pronto} data-raca={racaId} data-cabelo={corCabeloId} data-roupa={corRoupaId}
    style={retrato ? { width: tamanho ?? 96, height: tamanho ?? 96, backgroundColor: core?.visual.cor } : undefined}>
    <canvas ref={tela} className="personagem-raster" width={retrato ? 128 : 256} height={retrato ? 128 : 256} style={{ visibility: pronto ? "visible" : "hidden" }} />
    {retrato && <span className="retrato-core" title={core?.nome} style={{ backgroundColor: core?.visual.cor }} aria-hidden="true">◆</span>}
    {status.chave === chave && status.erro && <span className="arte-indisponivel" title="Arte indisponível. Reconecte para tentar novamente.">◇</span>}
  </span>;
}
