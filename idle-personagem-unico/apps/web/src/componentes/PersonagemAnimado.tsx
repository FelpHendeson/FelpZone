"use client";

import type { ParametrosMiniatura } from "@idle-pu/motor";
import { useEffect, useRef, useState } from "react";
import { quadroNoTempo, type SequenciaPersonagem } from "@/lib/animacaoPersonagem";
import { obterAnimacao } from "@/lib/renderAnimacao";
import { PersonagemRaster } from "./PersonagemRaster";

export function PersonagemAnimado({ parametros: p, sequencia, pausado = false, lento = false }: {
  parametros: ParametrosMiniatura; sequencia: SequenciaPersonagem; pausado?: boolean; lento?: boolean;
}) {
  const { racaId, coreId, corCabeloId, corRoupaId } = p;
  const chave = `${racaId}:${corCabeloId}:${corRoupaId}:${sequencia}`;
  const tela = useRef<HTMLCanvasElement>(null);
  const [pronta, setPronta] = useState("");
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let atual = true, raf = 0, inicio = 0, ultimo = -1;
    let folha: HTMLCanvasElement | null = null;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desenhar = (quadro: number) => {
      if (!atual || !folha || !tela.current || quadro === ultimo) return;
      const ctx = tela.current.getContext("2d"); if (!ctx) return;
      ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, 256, 256);
      ctx.drawImage(folha, quadro * 256, 0, 256, 256, 0, 0, 256, 256);
      tela.current.dataset.quadro = String(quadro); ultimo = quadro;
    };
    const avancar = (agora: number) => {
      if (!inicio) inicio = agora;
      desenhar(quadroNoTempo(sequencia, (agora - inicio) / (lento ? 1.5 : 1)));
      raf = requestAnimationFrame(avancar);
    };
    const sincronizar = () => {
      cancelAnimationFrame(raf); inicio = 0;
      if (!atual || !folha) return;
      desenhar(0);
      if (!pausado && !document.hidden && !reduzido.matches) raf = requestAnimationFrame(avancar);
    };
    void Promise.resolve().then(() => obterAnimacao({ racaId, coreId, corCabeloId, corRoupaId }, sequencia)).then(arte => {
      if (!atual) return; folha = arte; sincronizar(); setPronta(chave);
    }).catch(() => { /* A arte estática detalhada continua visível. Reconexão permite nova tentativa. */ });
    document.addEventListener("visibilitychange", sincronizar); reduzido.addEventListener("change", sincronizar);
    return () => { atual = false; cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", sincronizar); reduzido.removeEventListener("change", sincronizar); };
  }, [racaId, coreId, corCabeloId, corRoupaId, chave, sequencia, pausado, lento, tentativa]);
  useEffect(() => {
    const reconectar = () => setTentativa(n => n + 1);
    window.addEventListener("online", reconectar); return () => window.removeEventListener("online", reconectar);
  }, []);
  const carregada = pronta === chave;
  return <span className="personagem-animado sprite-personagem" aria-hidden="true" data-sequencia={sequencia} data-pronto={carregada} data-raca={racaId}>
    {!carregada && <PersonagemRaster parametros={p} />}
    <canvas ref={tela} width={256} height={256} className="personagem-raster" style={{ display: carregada ? undefined : "none" }} />
  </span>;
}
