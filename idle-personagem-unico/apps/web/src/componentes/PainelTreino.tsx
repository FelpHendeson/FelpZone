import { ATIVIDADES_TREINO, NOME_STATUS, faixaStatus, modificadoresDoPersonagem, type Personagem } from "@idle-pu/motor";
import { estimarTreino, formatarDuracao, formatarNumero } from "@/lib/atividade";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly aoIniciar: (atividadeId: string) => void;
  readonly aoParar: () => void;
}

/** Atividades → Treino: um treino por status. */
export function PainelTreino({ personagem, ocupado, aoIniciar, aoParar }: Props) {
  const mods = modificadoresDoPersonagem(personagem, personagem.nivel);
  return (
    <section className="painel" aria-label="Treinos">
      <p className="suave nota">Uma atividade por vez. Trocar de treino descarta o ciclo em andamento.</p>
      <ul className="lista-treinos">
        {ATIVIDADES_TREINO.map((a) => {
          const e = estimarTreino(personagem, a.id);
          const { piso, teto } = faixaStatus(personagem.racaId, a.status, personagem.nivel, mods);
          const valor = personagem.status[a.status];
          const atual = personagem.atividade?.id === a.id;
          const cheio = (valor - piso) / (teto - piso);
          return (
            <li key={a.id} className={`cartao treino${atual ? " treino-atual" : ""}`}>
              <div className="treino-info">
                <h3>{a.nome}</h3>
                <p className="suave">{a.descricao}</p>
                <p>
                  <strong>{NOME_STATUS[a.status]}</strong> {formatarNumero(valor, 2)} / {formatarNumero(teto, 2)} ({formatarNumero(cheio * 100, 0)}% da faixa)
                </p>
                <p className="suave">
                  Ciclo de {formatarDuracao(e.duracaoMs)} · +{formatarNumero(e.ganhoPorHora, 2)}/h agora · {formatarNumero(e.xpPorHora, 0)} XP/h
                </p>
              </div>
              {atual ? (
                <button type="button" className="botao" disabled={ocupado} onClick={aoParar}>
                  Parar
                </button>
              ) : (
                <button type="button" className="botao botao-principal" disabled={ocupado} onClick={() => aoIniciar(a.id)}>
                  {personagem.atividade ? "Trocar" : "Treinar"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
