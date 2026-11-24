import {
  CATALOGO,
  NPCS,
  RANKS,
  estaNoLugar,
  meritoParaSubir,
  missoesVisiveis,
  progressoDaMissao,
  relogioDoSistema,
  type Missao,
  type Personagem,
} from "@idle-pu/motor";
import { formatarNumero, nomeLocal, nomeSubarea } from "@/lib/atividade";
import type { Agir } from "./acoes";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly agir: Agir;
}

function textoRecompensa(m: Missao): string {
  const partes = [`${formatarNumero(m.recompensa.xp, 0)} XP`];
  if (m.recompensa.ouro) partes.push(`${formatarNumero(m.recompensa.ouro, 0)} g`);
  if (m.recompensa.merito) partes.push(`${m.recompensa.merito} de Mérito`);
  for (const it of m.recompensa.itens) partes.push(`${CATALOGO.itens.get(it.itemId)?.nome ?? it.itemId}${it.quantidade > 1 ? ` ×${it.quantidade}` : ""}`);
  return partes.join(" · ");
}

/** Linha de missão com progresso e ações. */
function LinhaMissao({ personagem: p, m, ocupado, agir }: Props & { m: Missao }) {
  const ativa = p.missoes.ativas.some((a) => a.id === m.id);
  const agora = relogioDoSistema.agora();
  const pode = missoesVisiveis(p, m.tipo, agora).find((x) => x.missao.id === m.id)?.pode;
  const vezes = p.missoes.concluidas[m.id] ?? 0;
  const lugar = estaNoLugar(p, m);
  const prog = ativa ? progressoDaMissao(p, m.id) : null;
  return (
    <li className={`recurso missao${prog?.completa ? " treino-atual" : ""}${!ativa && !pode?.ok ? " bloqueado" : ""}`}>
      <div>
        <strong>{m.titulo}</strong>
        {vezes > 0 && <span className="suave"> · feita {vezes}×</span>}
        <p className="suave">{m.descricao}</p>
        <p className="suave">Recompensa: {textoRecompensa(m)}</p>
        {prog && (
          <>
            <div className="progresso" role="progressbar" aria-label={`Progresso de ${m.titulo}`} aria-valuemin={0} aria-valuemax={prog.alvo} aria-valuenow={prog.atual}>
              <div className="progresso-preenchido progresso-xp" style={{ width: `${(prog.atual / prog.alvo) * 100}%` }} />
            </div>
            <p className="suave">
              {formatarNumero(prog.atual, 0)} / {formatarNumero(prog.alvo, 0)}
              {prog.completa && !lugar && " · vá até quem deu a missão para entregar"}
            </p>
          </>
        )}
        {!ativa && pode && !pode.ok && vezes === 0 && <p className="suave">{pode.motivo}</p>}
        {!ativa && pode && !pode.ok && vezes > 0 && m.repetivel && <p className="suave">{pode.motivo}</p>}
      </div>
      <div className="botoes-coluna">
        {ativa ? (
          <>
            <button type="button" className="botao botao-principal" disabled={ocupado || !prog?.completa || !lugar} onClick={() => agir({ tipo: "entregarMissao", missaoId: m.id })}>
              Entregar
            </button>
            {m.tipo !== "meta" && (
              <button type="button" className="botao" disabled={ocupado} onClick={() => agir({ tipo: "abandonarMissao", missaoId: m.id })}>
                Desistir
              </button>
            )}
          </>
        ) : (
          m.tipo !== "meta" &&
          pode?.ok && (
            <button type="button" className="botao botao-principal" disabled={ocupado || !lugar} onClick={() => agir({ tipo: "aceitarMissao", missaoId: m.id })}>
              {lugar ? "Aceitar" : "Longe"}
            </button>
          )
        )}
      </div>
    </li>
  );
}

/** Missões → NPC. */
export function PainelNpcs(props: Props) {
  const { personagem: p } = props;
  return (
    <section className="painel" aria-label="NPCs">
      <p className="suave nota">Missões de NPC se aceitam e se entregam onde o NPC está. O progresso conta a partir do aceite.</p>
      {NPCS.map((n) => {
        const missoes = [...CATALOGO.missoes.values()].filter((m) => m.npcId === n.id);
        const visiveis = missoes.filter((m) => p.missoes.ativas.some((a) => a.id === m.id) || (p.missoes.concluidas[m.id] ?? 0) > 0 || (m.requisitos.missoes ?? []).every((r) => p.missoes.concluidas[r]));
        return (
          <article key={n.id} className="cartao">
            <h3>{n.nome}</h3>
            <p className="suave">
              {n.descricao} · {nomeLocal(n.localId)}, {nomeSubarea(n.localId, n.subareaId)}
            </p>
            <ul className="lista-recursos">
              {visiveis.map((m) => (
                <LinhaMissao key={m.id} {...props} m={m} />
              ))}
            </ul>
          </article>
        );
      })}
    </section>
  );
}

/** Missões → Metas: tutorial e bússola (só XP). */
export function PainelMetas(props: Props) {
  const { personagem: p } = props;
  const metas = [...CATALOGO.missoes.values()].filter((m) => m.tipo === "meta");
  const feitas = metas.filter((m) => p.missoes.concluidas[m.id]);
  const ativas = metas.filter((m) => p.missoes.ativas.some((a) => a.id === m.id));
  return (
    <section className="painel" aria-label="Metas">
      <ul className="lista-recursos">
        {ativas.map((m) => (
          <LinhaMissao key={m.id} {...props} m={m} />
        ))}
      </ul>
      {ativas.length === 0 && <p className="suave">Todas as metas do Ato I foram cumpridas.</p>}
      <p className="suave nota">
        Metas cumpridas: {feitas.length} de {metas.length}. Elas só dão XP, mas mostram um caminho.
      </p>
    </section>
  );
}

/** Missões → Guilda: rank, Mérito, promoção e quadro. */
export function PainelGuilda(props: Props) {
  const { personagem: p, ocupado, agir } = props;
  const custo = meritoParaSubir(p.guilda.rank);
  const prova = `prova-${RANKS[p.guilda.rank]}`;
  const quadro = [...CATALOGO.missoes.values()].filter((m) => (m.tipo === "guilda" && m.rank !== undefined && m.rank <= p.guilda.rank && m.rank >= p.guilda.rank - 1) || m.id === prova);
  return (
    <section className="painel" aria-label="Guilda">
      <article className="cartao">
        <div className="nivel-linha">
          <h3>Rank {RANKS[p.guilda.rank]}</h3>
          <span className="suave">{custo === null ? "Topo do Ato I" : `${formatarNumero(p.guilda.merito, 0)} / ${formatarNumero(custo, 0)} de Mérito`}</span>
        </div>
        {custo !== null && (
          <>
            <p className="suave">
              Para chegar a {RANKS[p.guilda.rank + 1]}: Mérito e a prova de promoção ({p.missoes.concluidas[prova] ? "feita" : "pendente"}).
            </p>
            <div className="acoes">
              <button type="button" className="botao botao-principal" disabled={ocupado || p.guilda.merito < custo || !p.missoes.concluidas[prova]} onClick={() => agir({ tipo: "promover" })}>
                Pedir promoção
              </button>
            </div>
          </>
        )}
        <p className="suave nota">Cada rank dá 2% de desconto no Ferreiro e no Livreiro e +2% de rendimento na coleta. A Guilda fica em Pedravau.</p>
      </article>
      <article className="cartao">
        <h3>Quadro de missões</h3>
        <ul className="lista-recursos">
          {quadro.map((m) => (
            <LinhaMissao key={m.id} {...props} m={m} />
          ))}
        </ul>
      </article>
    </section>
  );
}

/** Quantas missões ativas estão prontas para entregar (para o aviso na aba). */
export function missoesProntas(p: Personagem): number {
  return p.missoes.ativas.filter((a) => progressoDaMissao(p, a.id).completa).length;
}
