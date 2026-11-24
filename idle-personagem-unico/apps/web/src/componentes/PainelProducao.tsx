"use client";

import {
  CATALOGO,
  CONFIG_FUSAO,
  NOME_OFICIO_PRODUCAO,
  OFICIOS_PRODUCAO,
  RECEITAS,
  infoFusao,
  modificadoresDoPersonagem,
  nivelEfetivoOficio,
  xpParaProximoNivelOficio,
  type Personagem,
} from "@idle-pu/motor";
import { useState } from "react";
import { ciclosPossiveis, estimarAtividade, formatarDuracao, formatarNumero, nomeSubarea } from "@/lib/atividade";
import type { Agir } from "./acoes";
import { bonusDe } from "./PainelEquipamento";

interface PropsProducao {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly aoIniciar: (atividadeId: string) => void;
  readonly aoParar: () => void;
}

const nomeItem = (id: string) => CATALOGO.itens.get(id)?.nome ?? id;

/** Atividades → Produção: Ferreiro, Alquimista e Cozinheiro (GDD §6.3). */
export function PainelProducao({ personagem: p, ocupado, aoIniciar, aoParar }: PropsProducao) {
  const mods = modificadoresDoPersonagem(p, p.nivel);
  return (
    <section className="painel" aria-label="Produção">
      <p className="suave nota">A produção é em Pedravau e consome materiais da mochila. Sem material (ou sem espaço), o personagem para.</p>
      {OFICIOS_PRODUCAO.map((o) => {
        const prog = p.oficiosProducao[o];
        const efetivo = nivelEfetivoOficio(p, o, mods);
        const proximo = xpParaProximoNivelOficio(prog.nivel);
        return (
          <article key={o} className="cartao oficio">
            <header className="nivel-linha">
              <h3>
                {NOME_OFICIO_PRODUCAO[o]} {efetivo}
              </h3>
              <span className="suave">{proximo > 0 ? `${formatarNumero(Math.floor(prog.xp), 0)} / ${formatarNumero(proximo, 0)} XP` : "Máximo"}</span>
            </header>
            {proximo > 0 && (
              <div
                className="progresso"
                role="progressbar"
                aria-label={`XP de ${NOME_OFICIO_PRODUCAO[o]}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((prog.xp / proximo) * 100)}
              >
                <div className="progresso-preenchido progresso-xp" style={{ width: `${(prog.xp / proximo) * 100}%` }} />
              </div>
            )}
            <ul className="lista-recursos">
              {RECEITAS.filter((r) => r.oficio === o).map((r) => {
                const bloqueado = efetivo < r.nivelMinimo;
                const atual = p.atividade?.id === r.id;
                const possiveis = ciclosPossiveis(p, r);
                const e = estimarAtividade(p, r.id);
                return (
                  <li key={r.id} className={`recurso${atual ? " treino-atual" : ""}${bloqueado ? " bloqueado" : ""}`}>
                    <div>
                      <strong>{r.nome}</strong> <span className="suave">· {nomeSubarea(r.localId, r.subareaId)}</span>
                      <p className="suave">
                        Pede:{" "}
                        {r.entradas.map((x, i) => (
                          <span key={x.itemId} className={(p.mochila[x.itemId] ?? 0) < x.quantidade ? "erro" : undefined}>
                            {i > 0 && ", "}
                            {x.quantidade} {nomeItem(x.itemId)} ({formatarNumero(p.mochila[x.itemId] ?? 0, 0)})
                          </span>
                        ))}
                      </p>
                      {bloqueado ? (
                        <p className="suave">
                          Exige {NOME_OFICIO_PRODUCAO[o]} {r.nivelMinimo}.
                        </p>
                      ) : (
                        <p className="suave">
                          {formatarDuracao(e.duracaoMs)} por ciclo · {formatarNumero(e.xpOficioPorHora, 0)} XP de ofício/h · materiais para {possiveis} ciclo{possiveis === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                    {atual ? (
                      <button type="button" className="botao" disabled={ocupado} onClick={aoParar}>
                        Parar
                      </button>
                    ) : (
                      <button type="button" className="botao botao-principal" disabled={ocupado || bloqueado || possiveis === 0} onClick={() => aoIniciar(r.id)}>
                        {bloqueado ? "Bloqueado" : possiveis === 0 ? "Sem material" : "Produzir"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </section>
  );
}

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly agir: Agir;
}

/** Ferreiro → Fusão: 3 iguais viram 1 aprimorado (GDD §9.4). */
export function PainelFusao({ personagem: p, ocupado, agir }: Props) {
  const [tentativa, setTentativa] = useState<{ id: string; proximo: string; antes: number; pity: number } | null>(null);
  const itens = Object.entries(p.mochila)
    .map(([id, q]) => ({ id, q, info: infoFusao(p, id) }))
    .filter((x) => x.info !== null);
  let mensagem: string | null = null;
  if (tentativa) {
    if ((p.mochila[tentativa.proximo] ?? 0) > tentativa.antes) mensagem = `Sucesso! ${nomeItem(tentativa.proximo)} saiu da forja.`;
    else if ((p.pityFusao[tentativa.id] ?? 0) > tentativa.pity) mensagem = `Falhou: perdeu 1 ${nomeItem(tentativa.id)}.`;
  }
  return (
    <article className="cartao" aria-label="Fusão">
      <h3>Fusão</h3>
      <p className="suave">
        3 itens iguais + gold + material viram 1 versão aprimorada (até +{CONFIG_FUSAO.maximo}). Na falha, perde 1 dos 3. Depois de {CONFIG_FUSAO.pity} falhas seguidas no mesmo item, a próxima é garantida. Sorte ajuda.
      </p>
      {mensagem && (
        <p role="status" className="destaque">
          {mensagem}
        </p>
      )}
      {itens.length === 0 ? (
        <p className="suave">Nenhum equipamento que se funde na mochila.</p>
      ) : (
        <ul className="lista-recursos">
          {itens.map(({ id, q, info }) => {
            const i = info!;
            const material = p.mochila[i.material.itemId] ?? 0;
            const motivo = q < 3 ? `Tem ${q} de 3` : p.ouro < i.ouro ? "Gold insuficiente" : material < i.material.quantidade ? `Faltam ${i.material.quantidade - material} ${nomeItem(i.material.itemId)}` : null;
            return (
              <li key={id} className={`recurso${motivo ? " bloqueado" : ""}`}>
                <div>
                  <strong>
                    {nomeItem(id)} → {nomeItem(i.proximo)}
                  </strong>
                  <p className="suave">{bonusDe(CATALOGO.itens.get(i.proximo)!)}</p>
                  <p className="suave">
                    {formatarNumero(i.ouro, 0)} g · {i.material.quantidade} {nomeItem(i.material.itemId)} · chance {i.garantida ? "garantida" : `${formatarNumero(i.chance * 100, 0)}%`}
                    {(p.pityFusao[id] ?? 0) > 0 && ` · ${p.pityFusao[id]} falha(s) seguida(s)`}
                  </p>
                  {motivo && <p className="suave">{motivo}.</p>}
                </div>
                <button
                  type="button"
                  className="botao botao-principal"
                  disabled={ocupado || motivo !== null}
                  onClick={() => {
                    setTentativa({ id, proximo: i.proximo, antes: p.mochila[i.proximo] ?? 0, pity: p.pityFusao[id] ?? 0 });
                    agir({ tipo: "fundir", itemId: id });
                  }}
                >
                  Fundir
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

/** Mochila → Consumíveis: poções (usadas sozinhas no combate) e comida. */
export function PainelConsumiveis({ personagem: p }: { personagem: Personagem }) {
  const itens = Object.entries(p.mochila)
    .map(([id, q]) => [CATALOGO.itens.get(id)!, q] as const)
    .filter(([i]) => i.consumivel);
  return (
    <section className="painel" aria-label="Consumíveis">
      <article className="cartao">
        {itens.length === 0 ? (
          <p className="suave">Nenhum consumível. Poções saem do Alquimista; comida, da Taverna (Atividades → Produção).</p>
        ) : (
          <ul className="lista-recursos">
            {itens.map(([i, q]) => (
              <li key={i.id} className="recurso">
                <div>
                  <strong>{i.nome}</strong> <span className="suave">×{formatarNumero(q, 0)}</span>
                  <p className="suave">{i.descricao}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="suave nota">Com a vida abaixo de 40% em combate, o personagem bebe sozinho a poção mais forte (uma a cada 10 s).</p>
      </article>
    </section>
  );
}

/** Mochila → Nomeados: itens únicos (nomeados e relíquias), na mochila ou equipados. */
export function PainelNomeados({ personagem: p }: { personagem: Personagem }) {
  const equipados = new Set(Object.values(p.equipados).filter((x): x is string => !!x));
  const ids = [...new Set([...Object.keys(p.mochila), ...equipados])].filter((id) => CATALOGO.itens.get(id)?.equipamento?.nomeado);
  return (
    <section className="painel" aria-label="Nomeados">
      <article className="cartao">
        {ids.length === 0 ? (
          <p className="suave">Nenhum item nomeado ainda. Eles vêm de origens especiais, de chefes (relíquias) e da forja com fragmentos de chefe.</p>
        ) : (
          <ul className="lista-recursos">
            {ids.map((id) => {
              const i = CATALOGO.itens.get(id)!;
              return (
                <li key={id} className="recurso">
                  <div>
                    <strong>{i.nome}</strong> <span className={`selo raridade-${i.raridade}`}>{equipados.has(id) ? "Equipado" : "Na mochila"}</span>
                    <p className="suave">{i.descricao}</p>
                    <p className="suave">{bonusDe(i, p.nivel)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="suave nota">Nomeados são únicos: não se vendem, não se fundem e só existe um de cada por personagem.</p>
      </article>
    </section>
  );
}
