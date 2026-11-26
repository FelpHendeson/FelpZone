import { textoDoMundo } from "./PainelMundo";
import { CATALOGO, NOME_STATUS, type Personagem, relogioDoSistema } from "@idle-pu/motor";
import { combateDe, estimarAtividade, formatarDuracao, formatarNumero, nomeLocal, nomeSubarea, situacaoMochila } from "@/lib/atividade";
import { BarraVida } from "./BarraVida";

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
      <span className="mundo" aria-label="Hora e clima">
        {textoDoMundo(relogioDoSistema.agora())}
      </span>
      {mochila.cheia && <span className="selo selo-alerta">Mochila cheia</span>}
      <span className="ouro" aria-label={`${p.ouro} de gold`}>
        {formatarNumero(p.ouro, 0)} g
      </span>
    </span>
  );

  if (p.limiar) {
    const l = p.limiar;
    const sc = combateDe(p);
    const c = l.combate;
    const m = c.monstroId ? CATALOGO.monstros.get(c.monstroId) : undefined;
    return (
      <div className="barra-atividade barra-limiar" role="group" aria-label="No Limiar">
        <div className="barra-linha">
          <span className="barra-titulo">No Limiar · volta em {formatarDuracao(l.restanteMs)}</span>
          {extras}
        </div>
        <div className="barra-linha suave">
          <span>{c.fase === "lutando" && m ? `Lutando com ${m.nome}` : c.fase === "recompondo" && m ? `Se recompondo diante de ${m.nome}…` : "Vagando entre os mortos…"}</span>
          <span>{formatarNumero(p.essencia, 0)} de Essência</span>
        </div>
        <BarraVida atual={p.vida * sc.vidaMax} maxima={sc.vidaMax} rotulo="Vida" />
      </div>
    );
  }

  if (p.viagem) {
    const v = p.viagem;
    return (
      <div className="barra-atividade" role="group">
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
      <div className="barra-atividade" role="group">
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
  if (a.tipo === "combate") {
    const sc = combateDe(p);
    const c = atual.combate;
    const m = c?.monstroId ? CATALOGO.monstros.get(c.monstroId) : undefined;
    const fase =
      c?.fase === "lutando" && m ? `Lutando com ${m.nome}${m.tipo === "chefe" ? " (chefe)" : m.tipo === "raro" ? " (raro)" : ""}` : c?.fase === "recuando" ? `Recuando para ${nomeLocal("pedravau")} e descansando…` : "Procurando…";
    return (
      <div className="barra-atividade" role="group" aria-label={`Caçando em ${a.nome}`}>
        <div className="barra-linha">
          <span className="barra-titulo">Caçando: {a.nome}</span>
          {extras}
        </div>
        <div className="barra-linha suave">
          <span>{fase}</span>
        </div>
        <BarraVida atual={p.vida * sc.vidaMax} maxima={sc.vidaMax} rotulo="Vida" />
        {c?.fase === "lutando" && m && <BarraVida atual={c.vidaMonstro} maxima={m.vida} rotulo={m.nome} monstro />}
      </div>
    );
  }
  const e = estimarAtividade(p, atual.id);
  if (a.tipo === "aprendizado") {
    const h = atual.habilidadeId ? CATALOGO.habilidades.get(atual.habilidadeId) : undefined;
    const prog = atual.habilidadeId ? p.habilidades[atual.habilidadeId] : undefined;
    return (
      <div className="barra-atividade" role="group" aria-label={`Praticando ${h?.nome ?? ""}`}>
        <div className="barra-linha">
          <span className="barra-titulo">Praticando: {h?.nome}</span>
          {extras}
        </div>
        <div className="barra-linha suave">
          <span>Campo de Treino · maestria {prog?.maestria}</span>
          <span>{formatarNumero(e.xpPorHora, 0)} XP/h</span>
        </div>
        <Progresso valor={atual.progressoMs / e.duracaoMs} rotulo="Progresso do ciclo" />
      </div>
    );
  }
  const ganho =
    a.tipo === "cuidado"
      ? `cuidando de ${p.pets.find((x) => x.id === p.petsPorSlot.cuidado)?.nome ?? "ninguém"}`
      : a.tipo === "treino"
      ? `+${formatarNumero(e.ganhoPorHora, 2)} ${NOME_STATUS[a.status]}/h agora`
      : `~${formatarNumero(e.itensPorHora, 0)} ${CATALOGO.itens.get(a.tipo === "producao" ? a.saida.itemId : a.itemId)!.nome.toLowerCase()}/h`;
  return (
    <div className="barra-atividade" role="group" aria-label={`Atividade atual: ${a.nome}`}>
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
