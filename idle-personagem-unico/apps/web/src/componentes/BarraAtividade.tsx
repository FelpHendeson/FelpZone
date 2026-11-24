import { CATALOGO, NOME_STATUS, type Personagem } from "@idle-pu/motor";
import { estimarAtividade, formatarNumero, nomeLocal, nomeSubarea, situacaoMochila } from "@/lib/atividade";

function Progresso({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="progresso" role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(valor * 100)}>
      <div className="progresso-preenchido" style={{ width: `${Math.min(1, valor) * 100}%` }} />
    </div>
  );
}

/** Barra fixa da atividade atual (GDD §16), com viagem, gold e aviso de mochila cheia. */
export function BarraAtividade({ personagem: p }: { personagem: Personagem }) {
  const mochila = situacaoMochila(p);
  const extras = (
    <span className="barra-extras">
      {mochila.cheia && <span className="selo selo-alerta">Mochila cheia</span>}
      <span className="ouro" aria-label={`${p.ouro} de gold`}>
        {formatarNumero(p.ouro, 0)} g
      </span>
    </span>
  );

  if (p.viagem) {
    const v = p.viagem;
    return (
      <div className="barra-atividade" role="status">
        <div className="barra-linha">
          <span className="barra-titulo">Movendo-se até {nomeLocal(v.destinoLocalId)}…</span>
          {extras}
        </div>
        <Progresso valor={(v.totalMs - v.restanteMs) / v.totalMs} rotulo="Progresso da viagem" />
      </div>
    );
  }

  const atual = p.atividade;
  if (!atual) {
    return (
      <div className="barra-atividade" role="status">
        <div className="barra-linha">
          <span>
            <span className="barra-titulo">Ocioso</span> <span className="suave">em {nomeLocal(p.localId)}</span>
          </span>
          {extras}
        </div>
      </div>
    );
  }
  const a = CATALOGO.atividades.get(atual.id)!;
  const e = estimarAtividade(p, atual.id);
  const ganho =
    a.tipo === "treino"
      ? `+${formatarNumero(e.ganhoPorHora, 2)} ${NOME_STATUS[a.status]}/h agora`
      : `~${formatarNumero(e.itensPorHora, 0)} ${CATALOGO.itens.get(a.itemId)!.nome.toLowerCase()}/h`;
  return (
    <div className="barra-atividade" role="status" aria-label={`Atividade atual: ${a.nome}`}>
      <div className="barra-linha">
        <span className="barra-titulo">{a.nome}</span>
        {extras}
      </div>
      <div className="barra-linha suave">
        <span>
          {nomeLocal(p.localId)} · {nomeSubarea(p.localId, p.subareaId)}
        </span>
        <span>
          {ganho} · {formatarNumero(e.xpPorHora, 0)} XP/h
        </span>
      </div>
      <Progresso valor={atual.progressoMs / e.duracaoMs} rotulo="Progresso do ciclo" />
    </div>
  );
}
