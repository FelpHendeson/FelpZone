import {
  ATIVIDADES_COLETA,
  CATALOGO,
  NOME_OFICIO,
  OFICIOS,
  modificadoresDoPersonagem,
  nivelEfetivoOficio,
  xpParaProximoNivelOficio,
  type Personagem,
  type OficioId,
} from "@idle-pu/motor";
import { useState } from "react";
import { estimarAtividade, formatarDuracao, formatarNumero, nomeLocal, nomeSubarea } from "@/lib/atividade";
import { CenaPersonagem } from "./ArtePersonagem";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly leitura: boolean;
  readonly aoIniciar: (atividadeId: string) => void;
  readonly aoParar: () => void;
}

/** Atividades → Coleta: os 4 ofícios e seus recursos por tier. */
export function PainelColeta({ personagem: p, ocupado, leitura, aoIniciar, aoParar }: Props) {
  const atividade = ATIVIDADES_COLETA.find((a) => a.id === p.atividade?.id);
  const [oficio, escolher] = useState<OficioId | null>(atividade?.oficio ?? null);
  const mods = modificadoresDoPersonagem(p, p.nivel);
  if (oficio === null) return <section className="painel grade-atividades" aria-label="Ofícios de coleta">
    {OFICIOS.map((o) => <button key={o} className="cartao escolha-atividade" type="button" onClick={() => escolher(o)}>
      <span className="escolha-status">Nível {nivelEfetivoOficio(p, o, mods)}{o === atividade?.oficio && (p.viagem ? " · Em viagem" : " · Executando")}</span>
      <strong>{NOME_OFICIO[o]}</strong>
    </button>)}
  </section>;
  const o = oficio;
  const prog = p.oficios[o];
  const efetivo = nivelEfetivoOficio(p, o, mods);
  const proximo = xpParaProximoNivelOficio(prog.nivel);
  const ferramenta = CATALOGO.ferramentas.get(p.ferramentas[o])!;
  return (
    <section className="painel detalhe-atividade" aria-label="Coleta">
      <button type="button" className="link detalhe-retorno" onClick={() => escolher(null)}>← Todos os ofícios de coleta</button>
      <CenaPersonagem personagem={p} animar={atividade?.oficio === oficio} leitura={leitura} />
      <p className="suave nota">Escolher um recurso em outro local leva o personagem até lá. O ciclo começa ao chegar.</p>
      <article className="cartao oficio">
        <header className="nivel-linha">
          <h3>
            {NOME_OFICIO[o]} {efetivo}
            {efetivo !== prog.nivel && <span className="suave"> ({prog.nivel} + {efetivo - prog.nivel} de bônus)</span>}
          </h3>
          <span className="suave">{proximo > 0 ? `${formatarNumero(Math.floor(prog.xp), 0)} / ${formatarNumero(proximo, 0)} XP` : "Máximo"}</span>
        </header>
        {proximo > 0 && (
          <div className="progresso" role="progressbar" aria-label={`XP de ${NOME_OFICIO[o]}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((prog.xp / proximo) * 100)}>
            <div className="progresso-preenchido progresso-xp" style={{ width: `${(prog.xp / proximo) * 100}%` }} />
          </div>
        )}
        <p className="suave">
          Ferramenta: {ferramenta.nome} (×{formatarNumero(ferramenta.eficiencia, 2)} rendimento, ×{formatarNumero(ferramenta.velocidade, 2)} velocidade)
        </p>
        <ul className="lista-recursos">
          {ATIVIDADES_COLETA.filter((a) => a.oficio === o).map((a) => {
            const bloqueado = efetivo < a.nivelMinimo;
            const atual = p.atividade?.id === a.id;
            const e = estimarAtividade(p, a.id);
            return (
              <li key={a.id} className={`recurso${atual ? " treino-atual" : ""}${bloqueado ? " bloqueado" : ""}`}>
                <div>
                <strong>{a.nome}</strong> <span className="suave">· Nível {a.tier}{atual && (p.viagem ? " · Em viagem" : " · Executando")}</span>
                  <p className="suave">
                    {nomeLocal(a.localId)} · {nomeSubarea(a.localId, a.subareaId)}
                    {e.viagemMs > 0 && ` · viagem de ${formatarDuracao(e.viagemMs)}`}
                  </p>
                  {bloqueado ? (
                    <p className="suave">Exige {NOME_OFICIO[o]} {a.nivelMinimo}.</p>
                  ) : (
                    <p className="suave">
                      {formatarDuracao(e.duracaoMs)} por ciclo · ~{formatarNumero(e.itensPorHora, 0)} itens/h · {formatarNumero(e.xpOficioPorHora, 0)} XP de ofício/h · achado raro {formatarNumero(e.chanceRaro * 100, 1)}%/ciclo
                    </p>
                  )}
                </div>
                {atual ? (
                  <button type="button" className="botao" disabled={ocupado} onClick={aoParar}>
                    Parar
                  </button>
                ) : (
                  <button type="button" className="botao botao-principal" disabled={ocupado || bloqueado} onClick={() => aoIniciar(a.id)}>
                    {bloqueado ? "Bloqueado" : "Coletar"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </article>
    </section>
  );
}
