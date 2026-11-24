import { CATALOGO, NOME_SLOT, SLOTS, type Item, type Personagem } from "@idle-pu/motor";
import { formatarNumero, slotDoItem } from "@/lib/atividade";
import type { Agir } from "./acoes";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly agir: Agir;
}

const NOMES_ALVO: Record<string, string> = {
  ataque: "ataque",
  defesa: "defesa",
  vida: "vida",
  critico: "crítico",
  esquiva: "esquiva",
  regeneracao: "regeneração",
  "chance-raro": "chance de raro",
  "duracao-limiar": "tempo no Limiar",
  "producao.sucesso": "sucesso na fusão",
  "espacos-mochila": "espaços na mochila",
  "coleta.velocidade": "velocidade de coleta",
  "coleta.rendimento": "rendimento de coleta",
  "producao.velocidade": "velocidade de produção",
  "ganho-treino": "ganho de treino",
  "xp-maestria": "XP de maestria",
  "xp-personagem": "XP do personagem",
};

/** Bônus de um equipamento em texto (ataque, defesa, vida…). */
export function bonusDe(item: Item, nivel?: number): string {
  const d = item.equipamento;
  const partes = (d?.modificadores ?? []).map((m) => {
    const nome = NOMES_ALVO[m.alvo] ?? m.alvo;
    const sinal = m.valor >= 0 ? "+" : "−";
    const v = Math.abs(m.valor);
    if (m.operacao === "percentual" || (m.alvo === "critico" && v < 1)) return `${sinal}${formatarNumero(v * 100, 0)}% ${nome}`;
    return `${sinal}${formatarNumero(v, 0)} ${nome}`;
  });
  const evo = d?.nomeado?.evoluiComNivel;
  if (evo) {
    const nome = NOMES_ALVO[evo.alvo] ?? evo.alvo;
    partes.push(nivel === undefined ? `${nome} cresce com o nível` : `+${formatarNumero(evo.base + evo.porNivel * nivel, 0)} ${nome} (cresce com o nível)`);
  }
  return partes.join(" · ");
}

/** Mochila → Equipados: um item por slot. */
export function PainelEquipados({ personagem: p, ocupado, agir }: Props) {
  return (
    <section className="painel" aria-label="Equipados">
      <ul className="lista-recursos">
        {SLOTS.map((s) => {
          const id = p.equipados[s];
          const item = id ? CATALOGO.itens.get(id) : undefined;
          return (
            <li key={s} className={`recurso${item ? "" : " bloqueado"}`}>
              <div>
                <span className="suave">{NOME_SLOT[s]}</span>
                <p>{item ? <strong>{item.nome}</strong> : "Vazio"}</p>
                {item && <p className="suave">{bonusDe(item, p.nivel)}</p>}
              </div>
              {item && (
                <button type="button" className="botao" disabled={ocupado} onClick={() => agir({ tipo: "desequipar", slot: s })}>
                  Tirar
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="suave nota">Equipamentos caem dos monstros e são vendidos no Ferreiro (Mapa → Estabelecimentos).</p>
    </section>
  );
}

/** Mochila → Equipáveis: equipamentos guardados, com comparação ao equipado. */
export function PainelEquipaveis({ personagem: p, ocupado, agir }: Props) {
  const itens = Object.entries(p.mochila)
    .map(([id, q]) => [CATALOGO.itens.get(id)!, q] as const)
    .filter(([i]) => i.equipamento);
  return (
    <section className="painel" aria-label="Equipáveis">
      {itens.length === 0 ? (
        <article className="cartao">
          <p className="suave">Nenhum equipamento na mochila.</p>
        </article>
      ) : (
        <ul className="lista-recursos">
          {itens.map(([item, q]) => {
            const slot = item.equipamento!.slot;
            const alvo = slotDoItem(p, slot);
            const atual = p.equipados[alvo] ? CATALOGO.itens.get(p.equipados[alvo]!) : undefined;
            return (
              <li key={item.id} className="recurso">
                <div>
                  <strong>{item.nome}</strong> <span className={`selo raridade-${item.raridade}`}>{NOME_SLOT[slot]}</span>
                  {q > 1 && <span className="suave"> ×{q}</span>}
                  <p className="suave">{bonusDe(item)}</p>
                  <p className="suave">Equipado: {atual ? `${atual.nome} (${bonusDe(atual)})` : "nada"}</p>
                </div>
                <button type="button" className="botao botao-principal" disabled={ocupado} onClick={() => agir({ tipo: "equipar", itemId: item.id })}>
                  Equipar
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
