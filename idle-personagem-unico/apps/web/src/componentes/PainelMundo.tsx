"use client";

import {
  CATALOGO,
  EVENTOS,
  MARCOS_CRONICA,
  NOME_CLIMA,
  climaEm,
  ehNoite,
  horaDoJogo,
  missoesVisiveis,
  relogioDoSistema,
  type Personagem,
} from "@idle-pu/motor";
import type { Agir } from "./acoes";

/** "☀ 14h · Chuva" para a barra de atividade. */
export function textoDoMundo(instante: number): string {
  return `${ehNoite(instante) ? "☾" : "☀"} ${horaDoJogo(instante)}h · ${NOME_CLIMA[climaEm(instante)]}`;
}

/** Eventos esperando resposta (aparecem no topo de qualquer aba). */
export function EventosPendentes({ personagem: p, ocupado, agir }: { personagem: Personagem; ocupado: boolean; agir: Agir }) {
  if (p.eventos.pendentes.length === 0) return null;
  return (
    <section className="painel" aria-label="Eventos">
      {p.eventos.pendentes.map((pend) => {
        const ev = EVENTOS.find((x) => x.id === pend.eventoId)!;
        return (
          <article key={pend.n} className="cartao evento" role="group" aria-label={ev.titulo}>
            <h3>{ev.titulo}</h3>
            <p>{ev.texto}</p>
            <div className="acoes">
              {ev.escolhas.map((e, i) => (
                <button key={e.rotulo} type="button" className={`botao${i === 0 ? " botao-principal" : ""}`} disabled={ocupado} onClick={() => agir({ tipo: "resolverEvento", n: pend.n, escolha: i as 0 | 1 })}>
                  {e.rotulo}
                </button>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}

const dataJogo = (t: number) => new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Personagem → Crônica: nascimento, marcos e escolhas. */
export function PainelCronica({ personagem: p }: { personagem: Personagem }) {
  const raca = CATALOGO.racas.get(p.racaId)?.nome ?? p.racaId;
  const core = CATALOGO.cores.get(p.coreId)?.nome ?? p.coreId;
  const traco = CATALOGO.tracos.get(p.tracoPersonalidadeId)?.nome ?? "";
  return (
    <section className="painel" aria-label="Crônica">
      <article className="cartao">
        <h3>Crônica de {p.nome}</h3>
        <p>
          {raca} · {core}
          {traco ? ` · ${traco}` : ""}. Começou a jornada em {dataJogo(p.criadoEm)}.
        </p>
        <p className="suave">{p.origem.loreGerada}</p>
      </article>
      <article className="cartao">
        <h3>Marcos</h3>
        {p.cronica.marcos.length === 0 ? (
          <p className="suave">Nenhum marco ainda. A história está só começando.</p>
        ) : (
          <ul className="lista-simples">
            {MARCOS_CRONICA.filter((m) => p.cronica.marcos.includes(m.id)).map((m) => (
              <li key={m.id}>
                {p.nome} {m.texto}
              </li>
            ))}
          </ul>
        )}
      </article>
      <article className="cartao">
        <h3>Encontros e escolhas</h3>
        {p.cronica.registros.length === 0 ? (
          <p className="suave">Nada ainda. Eventos aparecem enquanto o personagem trabalha.</p>
        ) : (
          <ul className="lista-simples">
            {[...p.cronica.registros].reverse().map((r, i) => (
              <li key={`${r.instante}-${i}`}>
                <span className="suave">{dataJogo(r.instante)} · </span>
                {r.texto}
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}

/** Quantas missões de arco o personagem tem (para mostrar a sub-aba "História"). */
export function temArco(p: Personagem): boolean {
  return missoesVisiveis(p, "arco", relogioDoSistema.agora()).length > 0;
}
