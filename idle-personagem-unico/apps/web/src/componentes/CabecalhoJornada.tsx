"use client";

import { CATALOGO, type Personagem } from "@idle-pu/motor";
import { useEffect, useRef } from "react";
import type { Sessao } from "@/lib/sync";
import type { SituacaoConta } from "@/lib/clienteConta";
import { situacaoMochila } from "@/lib/atividade";
import { destinoDaAtividade, type DestinoJogo } from "@/lib/navegacao";
import { Miniatura } from "./Miniatura";
import { BarraAtividade } from "./BarraAtividade";

export function CabecalhoJornada({ personagem: p, sessao, situacao, aoPersonagens, aoConta, aoDestino, aoSincronizar }: {
  personagem: Personagem; sessao: Sessao | null; situacao: SituacaoConta | null;
  aoPersonagens: () => void; aoConta: () => void; aoDestino: (destino: DestinoJogo) => void; aoSincronizar: () => void;
}) {
  const topo = useRef<HTMLElement>(null);
  useEffect(() => {
    const cabecalho = topo.current;
    const shell = cabecalho?.closest<HTMLElement>(".shell-jogo");
    if (!cabecalho || !shell) return;
    const medir = () => shell.style.setProperty("--altura-topo", `${cabecalho.getBoundingClientRect().height}px`);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(cabecalho);
    return () => observador.disconnect();
  }, []);
  const conexao = situacao?.conexao;
  const status = !sessao ? "Salvo neste aparelho" : conexao === "online" ? "Conta sincronizada" : conexao === "expirado" ? "Sessão expirada" : conexao === "sincronizando" ? "Sincronizando…" : "Sem conexão · leitura";
  const mochila = situacaoMochila(p);
  return <header ref={topo} className="topo jornada-topo">
    <div className="jornada-identidade">
      <Miniatura tamanho={56} rotulo={`Retrato de ${p.nome}`} parametros={{ racaId: p.racaId, coreId: p.coreId, corCabeloId: p.aparencia.corCabelo, corRoupaId: p.aparencia.corRoupa }} />
      <div className="jornada-nome"><strong>{p.nome}</strong><span>Nível {p.nivel} · {CATALOGO.racas.get(p.racaId)?.nome}</span><span className="jornada-core">{CATALOGO.cores.get(p.coreId)?.nome}</span></div>
      <button type="button" className="link jornada-personagens" onClick={aoPersonagens}>Personagens</button>
    </div>
    <div className="jornada-conexao" data-conexao={conexao ?? "local"}>
      <button type="button" className="link" onClick={aoConta} aria-label={`${status}. ${sessao ? `Conta de ${sessao.nome}` : "Entrar ou criar conta"}`}>{status}</button>
      {sessao && conexao === "desconectado" && <button type="button" className="link" disabled={situacao?.ocupado} onClick={aoSincronizar}>Reconectar</button>}
      {conexao === "expirado" && <button type="button" className="link" onClick={aoConta}>Entrar novamente</button>}
    </div>
    <div className="jornada-atividade">
      <BarraAtividade personagem={p} />
      <div className="jornada-atalhos">
        <button type="button" className="link" onClick={() => aoDestino(destinoDaAtividade(p))}>{p.limiar ? "Abrir O Limiar" : p.viagem ? "Acompanhar viagem" : p.atividade ? "Ver atividade" : "Escolher atividade"}</button>
        {mochila.cheia && <button type="button" className="link" onClick={() => aoDestino({ aba: "mochila", sub: 3 })}>Abrir materiais</button>}
      </div>
    </div>
  </header>;
}
