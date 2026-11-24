import { CATALOGO, NOME_STATUS, type Personagem } from "@idle-pu/motor";
import { estimarTreino, formatarNumero } from "@/lib/atividade";

/** Barra fixa da atividade atual (GDD §16). */
export function BarraAtividade({ personagem }: { personagem: Personagem }) {
  const atual = personagem.atividade;
  if (!atual) {
    return (
      <div className="barra-atividade" role="status">
        <span className="barra-titulo">Ocioso</span>
        <span className="suave">Escolha um treino em Atividades.</span>
      </div>
    );
  }
  const a = CATALOGO.atividades.get(atual.id)!;
  const e = estimarTreino(personagem, atual.id);
  const progresso = Math.min(1, atual.progressoMs / e.duracaoMs);
  return (
    <div className="barra-atividade" role="status" aria-label={`Atividade atual: ${a.nome}`}>
      <div className="barra-linha">
        <span className="barra-titulo">{a.nome}</span>
        <span className="suave">
          +{formatarNumero(e.ganhoPorHora, 2)} {NOME_STATUS[a.status]}/h agora · {formatarNumero(e.xpPorHora, 0)} XP/h
        </span>
      </div>
      <div className="progresso" role="progressbar" aria-label="Progresso do ciclo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progresso * 100)}>
        <div className="progresso-preenchido" style={{ width: `${progresso * 100}%` }} />
      </div>
    </div>
  );
}
