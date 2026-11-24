import { CATALOGO, NOME_OFICIO, NOME_STATUS, OFICIOS, STATUS, type ResumoAvanco } from "@idle-pu/motor";
import { useEffect, useRef } from "react";
import { formatarDuracao, formatarNumero, nomeLocal } from "@/lib/atividade";

/** "Enquanto você estava fora": o que o personagem fez com o jogo fechado. */
export function ResumoOffline({ resumo, aoFechar }: { resumo: ResumoAvanco; aoFechar: () => void }) {
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => botao.current?.focus(), []);
  const atividade = resumo.atividadeId ? CATALOGO.atividades.get(resumo.atividadeId) : undefined;
  return (
    <div className="fundo-modal">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-resumo" onKeyDown={(e) => e.key === "Escape" && aoFechar()}>
        <h2 id="titulo-resumo">Enquanto você estava fora</h2>
        <p className="suave">
          {formatarDuracao(resumo.decorridoMs)} fora{atividade ? ` · ${atividade.nome}` : ""}
        </p>
        {resumo.limitado && resumo.decorridoMs - resumo.simuladoMs >= 1_000 && (
          <p className="aviso">O limite é de 12 h: {formatarDuracao(resumo.decorridoMs - resumo.simuladoMs)} não contaram.</p>
        )}
        <ul className="lista-resumo">
          <li>
            {resumo.ciclos > 0 && `${resumo.ciclos} ${resumo.ciclos === 1 ? "ciclo" : "ciclos"} · `}+{formatarNumero(resumo.xp, 0)} XP
          </li>
          {resumo.nivelFinal > resumo.nivelInicial && (
            <li>
              <strong>
                Nível {resumo.nivelInicial} → {resumo.nivelFinal}
              </strong>
            </li>
          )}
          {resumo.chegouEm && <li>Chegou a {nomeLocal(resumo.chegouEm)}.</li>}
          {Object.keys(resumo.abates).length > 0 && (
            <li>
              <strong>{formatarNumero(Object.values(resumo.abates).reduce((s, n) => s + n, 0), 0)} abates</strong>:{" "}
              {Object.entries(resumo.abates)
                .map(([id, n]) => `${CATALOGO.monstros.get(id)?.nome} ×${n}`)
                .join(", ")}
            </li>
          )}
          {Object.entries(resumo.maestria).map(([id, n]) => (
            <li key={id}>
              <strong>
                {CATALOGO.habilidades.get(id)?.nome}: +{n} de maestria
              </strong>
            </li>
          ))}
          {resumo.recuos > 0 && <li>Recuou {resumo.recuos} {resumo.recuos === 1 ? "vez" : "vezes"} para descansar.</li>}
          {resumo.mortes > 0 && (
            <li className="erro">
              Morreu {resumo.mortes === 1 ? "uma vez" : `${resumo.mortes} vezes`} e atravessou para o Limiar. Nada foi perdido, só tempo.
            </li>
          )}
          {resumo.saidasDoLimiar > 0 && <li>Voltou do Limiar {resumo.saidasDoLimiar === 1 ? "" : `${resumo.saidasDoLimiar} vezes `}e retomou o que fazia.</li>}
          {resumo.essencia > 0 && <li>Essência do Limiar +{formatarNumero(resumo.essencia, 0)}</li>}
          {Object.entries(resumo.itens).map(([id, q]) => (
            <li key={id}>
              {CATALOGO.itens.get(id)?.nome} ×{formatarNumero(q, 0)}
            </li>
          ))}
          {resumo.itensPerdidos > 0 && (
            <li className="erro">Mochila cheia: {formatarNumero(resumo.itensPerdidos, 0)} itens ficaram pelo caminho.</li>
          )}
          {OFICIOS.filter((o) => (resumo.niveisOficio[o] ?? 0) > 0).map((o) => (
            <li key={o}>
              <strong>
                {NOME_OFICIO[o]} +{resumo.niveisOficio[o]} {resumo.niveisOficio[o] === 1 ? "nível" : "níveis"}
              </strong>
            </li>
          ))}
          {STATUS.filter((s) => resumo.ganhos[s] > 1e-9).map((s) => (
            <li key={s}>
              {NOME_STATUS[s]} +{formatarNumero(resumo.ganhos[s], 2)}
            </li>
          ))}
        </ul>
        <button ref={botao} type="button" className="botao botao-principal" onClick={aoFechar}>
          Continuar
        </button>
      </div>
    </div>
  );
}
