import {
  ATIVIDADES_COLETA,
  CATALOGO,
  NOME_OFICIO,
  OFICIOS,
  modificadoresDoPersonagem,
  nivelEfetivoOficio,
  xpParaProximoNivelOficio,
  type Personagem,
} from "@idle-pu/motor";
import { estimarAtividade, formatarDuracao, formatarNumero, nomeLocal, nomeSubarea } from "@/lib/atividade";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly aoIniciar: (atividadeId: string) => void;
  readonly aoParar: () => void;
}

/** Atividades → Coleta: os 4 ofícios e seus recursos por tier. */
export function PainelColeta({ personagem: p, ocupado, aoIniciar, aoParar }: Props) {
  const mods = modificadoresDoPersonagem(p, p.nivel);
  return (
    <section className="painel" aria-label="Coleta">
      <p className="suave nota">Escolher um recurso em outro local leva o personagem até lá. O ciclo começa ao chegar.</p>
      {OFICIOS.map((o) => {
        const prog = p.oficios[o];
        const efetivo = nivelEfetivoOficio(p, o, mods);
        const proximo = xpParaProximoNivelOficio(prog.nivel);
        const ferramenta = CATALOGO.ferramentas.get(p.ferramentas[o])!;
        return (
          <article key={o} className="cartao oficio">
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
                      <strong>{a.nome}</strong> <span className="suave">· tier {a.tier}</span>
                      <p className="suave">
                        {nomeLocal(a.localId)} · {nomeSubarea(a.localId, a.subareaId)}
                        {e.viagemMs > 0 && ` · viagem de ${formatarDuracao(e.viagemMs)}`}
                      </p>
                      {bloqueado ? (
                        <p className="suave">Exige {NOME_OFICIO[o]} {a.nivelMinimo}.</p>
                      ) : (
                        <p className="suave">
                          ~{formatarNumero(e.itensPorHora, 0)} itens/h · {formatarNumero(e.xpOficioPorHora, 0)} XP de ofício/h · achado raro {formatarNumero(e.chanceRaro * 100, 1)}%/ciclo
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
        );
      })}
    </section>
  );
}
