"use client";

import { CATALOGO, CONQUISTAS, MAX_PERSONAGENS, type EstadoJogo } from "@idle-pu/motor";
import { useState } from "react";
import { definirSons, sonsLigados, tocar } from "@/lib/sons";
import { type Sessao } from "@/lib/sync";
import { AcessoConta } from "./AcessoConta";
import type { Agir } from "./acoes";

interface Props {
  readonly estado: EstadoJogo;
  readonly sessao: Sessao | null;
  readonly ocupado: boolean;
  readonly agir: Agir;
  /** Conectou (ou desconectou, com `null`) a conta; `novo` é o estado que passa a valer. */
  readonly aoConectar: (sessao: Sessao | null, novo: Record<string, unknown> | null) => Promise<void>;
}

/** Personagem → Conta: personagens, Cofre da Conta e sincronização (F9). */
export function PainelConta({ estado, sessao, ocupado, agir, aoConectar }: Props) {
  const { personagens, personagemAtivoId, cofre } = estado.conta;
  const podeCriar = personagens.length < MAX_PERSONAGENS && cofre.pergaminhos > 0;
  return (
    <section className="painel" aria-label="Conta">
      <article className="cartao">
        <h3>Personagens ({personagens.length} de {MAX_PERSONAGENS})</h3>
        <p className="suave">Cada personagem é uma existência separada. Só o ativo joga; os outros ficam parados até serem escolhidos.</p>
        <ul className="lista-recursos">
          {personagens.map((p) => (
            <li key={p.id} className={`recurso${p.id === personagemAtivoId ? " treino-atual" : ""}`}>
              <div>
                <strong>{p.nome}</strong> <span className="suave">· nível {p.nivel} · {CATALOGO.racas.get(p.racaId)?.nome} · {CATALOGO.cores.get(p.coreId)?.nome}</span>
              </div>
              {p.id === personagemAtivoId ? (
                <span className="selo">Ativo</span>
              ) : (
                <button type="button" className="botao" disabled={ocupado} onClick={() => agir({ tipo: "trocarPersonagem", personagemId: p.id })}>
                  Jogar com este
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="acoes">
          <button type="button" className="botao botao-principal" disabled={ocupado || !podeCriar} onClick={() => agir({ tipo: "iniciarSorteio" })}>
            Novo personagem (gasta 1 pergaminho)
          </button>
        </div>
        <p className="suave nota">
          Pergaminhos do Novo Destino: <strong>{cofre.pergaminhos}</strong>. Cada personagem ganha um ao chegar aos ranks C e A da guilda.
        </p>
      </article>

      <article className="cartao" aria-label="Conquistas">
        <h3>
          Conquistas ({cofre.conquistas.length} de {CONQUISTAS.length})
        </h3>
        <ul className="lista-recursos">
          {CONQUISTAS.map((c) => {
            const tem = cofre.conquistas.includes(c.id);
            return (
              <li key={c.id} className={`recurso${tem ? "" : " bloqueado"}`}>
                <div>
                  <strong>{tem ? "✓ " : ""}{c.nome}</strong>
                  <p className="suave">{c.descricao}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="suave nota">
          Álbum de Descobertas: {cofre.descobertas.racas.length} raças, {cofre.descobertas.cores.length} cores, {cofre.descobertas.origens.length} origens e {cofre.descobertas.monstros.length} monstros. Conquistas não dão poder.
        </p>
      </article>

      <Preferencias />
      <AcessoConta key={sessao?.id ?? sessao?.token ?? "convidado"} estado={estado} sessao={sessao} aoConectar={aoConectar} />
    </section>
  );
}

/** Preferências deste aparelho (F13). */
function Preferencias() {
  // Só renderiza no aparelho (depois de carregar o save), então pode ler a preferência já.
  const [sons, setSons] = useState(sonsLigados);
  return (
    <article className="cartao" aria-label="Preferências">
      <h3>Preferências</h3>
      <div className="nivel-linha">
        <span>Sons (nível, eventos, Arena)</span>
        <button
          type="button"
          className="botao"
          aria-pressed={sons}
          onClick={() => {
            definirSons(!sons);
            setSons(!sons);
            if (!sons) tocar("nivel");
          }}
        >
          {sons ? "Ligados" : "Desligados"}
        </button>
      </div>
      <p className="suave nota">Os sons são gerados pelo navegador, sem arquivos. A preferência fica só neste aparelho.</p>
    </article>
  );
}
