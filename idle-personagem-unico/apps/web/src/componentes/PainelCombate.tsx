import { AREAS_COMBATE, CATALOGO, CONFIG_COMBATE, NOME_RARIDADE, riscoDaArea, type Personagem } from "@idle-pu/motor";
import { combateDe, estimarAtividade, formatarDuracao, formatarNumero, nomeLocal } from "@/lib/atividade";
import type { Agir } from "./acoes";
import { BarraVida } from "./BarraVida";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly agir: Agir;
  readonly aoIniciar: (atividadeId: string) => void;
  readonly aoParar: () => void;
}

const ROTULO_RISCO = { verde: "Tranquilo", amarelo: "Arriscado", vermelho: "Perigoso" } as const;

/** Combate → Áreas: escolher onde caçar, ver o risco e ajustar o recuo. */
export function PainelAreas({ personagem: p, ocupado, agir, aoIniciar, aoParar }: Props) {
  const sc = combateDe(p);
  const opcoes = Array.from({ length: CONFIG_COMBATE.recuoMaximo / 10 + 1 }, (_, i) => i * 10);
  return (
    <section className="painel" aria-label="Áreas de combate">
      <article className="cartao">
        <BarraVida atual={p.vida * sc.vidaMax} maxima={sc.vidaMax} rotulo="Vida" />
        <p className="suave">
          Ataque {formatarNumero(sc.ataque, 1)} · Defesa {formatarNumero(sc.defesa, 1)} · {formatarNumero(1000 / sc.intervaloMs, 2)} ataques/s · Esquiva {formatarNumero(sc.esquiva * 100, 1)}% · Crítico{" "}
          {formatarNumero(sc.critico * 100, 1)}%
        </p>
        <label className="campo-linha">
          <span>Recuar com vida em</span>
          <select value={p.recuoPercentual} disabled={ocupado} onChange={(ev) => agir({ tipo: "definirRecuo", percentual: Number(ev.target.value) })}>
            {opcoes.map((v) => (
              <option key={v} value={v}>
                {v === 0 ? "nunca" : `${v}%`}
              </option>
            ))}
          </select>
        </label>
        <p className="suave nota">Ao recuar, o personagem volta a {nomeLocal("pedravau")}, descansa e retoma a caça. Sem recuo, ele pode morrer e passar um tempo no Limiar (Combate → O Limiar).</p>
      </article>
      <ul className="lista-treinos">
        {AREAS_COMBATE.map((a) => {
          const { risco, perdaPorLuta } = riscoDaArea(sc, a);
          const atual = p.atividade?.id === a.id;
          const e = estimarAtividade(p, a.id);
          const chefe = CATALOGO.monstros.get(a.chefeId)!;
          return (
            <li key={a.id} className={`cartao treino${atual ? " treino-atual" : ""}`}>
              <div className="treino-info">
                <div className="nivel-linha">
                  <h3>{a.nome}</h3>
                  <span className={`selo risco-${risco}`}>{ROTULO_RISCO[risco]}</span>
                </div>
                <p className="suave">{a.descricao}</p>
                <p className="suave">
                  {nomeLocal(a.localId)} · nível {a.nivelRecomendado} · perde ~{formatarNumero(perdaPorLuta * 100, 0)}% da vida por luta
                  {e.viagemMs > 0 && ` · viagem de ${formatarDuracao(e.viagemMs)}`}
                </p>
                <p className="suave">
                  {a.monstros.map((m) => CATALOGO.monstros.get(m.monstroId)!.nome).join(", ")} · chefe a cada {a.abatesParaChefe} abates: {chefe.nome} · equipamento {NOME_RARIDADE[(["comum", "comum", "incomum", "raro"] as const)[a.tierEquipamento]]}
                </p>
              </div>
              {atual ? (
                <button type="button" className="botao" disabled={ocupado} onClick={aoParar}>
                  Parar
                </button>
              ) : (
                <button type="button" className="botao botao-principal" disabled={ocupado} onClick={() => aoIniciar(a.id)}>
                  Caçar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Combate → Bestiário: abates por monstro (marcos com bônus chegam na F11). */
export function PainelBestiario({ personagem: p }: { personagem: Personagem }) {
  return (
    <section className="painel" aria-label="Bestiário">
      <p className="suave nota">Monstros nunca abatidos aparecem como “???”. Os bônus por marcos de abates chegam numa fatia futura.</p>
      {AREAS_COMBATE.map((a) => (
        <article key={a.id} className="cartao">
          <h3>{a.nome}</h3>
          <ul className="lista-recursos">
            {[...a.monstros.map((m) => m.monstroId), a.chefeId].map((id) => {
              const m = CATALOGO.monstros.get(id)!;
              const n = p.bestiario[id] ?? 0;
              return (
                <li key={id} className={`recurso${n === 0 ? " bloqueado" : ""}`}>
                  <div>
                    <strong>{n > 0 ? m.nome : "???"}</strong> <span className="suave">· {m.tipo === "chefe" ? "chefe" : m.tipo === "raro" ? "raro" : "comum"}</span>
                    {n > 0 && <p className="suave">{m.descricao}</p>}
                  </div>
                  <span>{formatarNumero(n, 0)} abates</span>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </section>
  );
}
