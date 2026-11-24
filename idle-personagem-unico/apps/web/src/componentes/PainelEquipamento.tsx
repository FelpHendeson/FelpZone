import { CATALOGO, NOME_SLOT, SLOTS, desequipar, equipar, type Item, type Personagem } from "@idle-pu/motor";
import { formatarNumero } from "@/lib/atividade";
import type { Agir } from "./acoes";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly agir: Agir;
}

/** Bônus de um equipamento em texto (ataque, defesa, vida). */
export function bonusDe(item: Item): string {
  const nomes: Record<string, string> = { ataque: "ataque", defesa: "defesa", vida: "vida" };
  return (item.equipamento?.modificadores ?? []).map((m) => `+${formatarNumero(m.valor, 0)} ${nomes[m.alvo] ?? m.alvo}`).join(" · ");
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
                {item && <p className="suave">{bonusDe(item)}</p>}
              </div>
              {item && (
                <button type="button" className="botao" disabled={ocupado} onClick={() => agir((e, agora) => desequipar(e, s, agora))}>
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
            const atual = p.equipados[slot] ? CATALOGO.itens.get(p.equipados[slot]!) : undefined;
            return (
              <li key={item.id} className="recurso">
                <div>
                  <strong>{item.nome}</strong> <span className={`selo raridade-${item.raridade}`}>{NOME_SLOT[slot]}</span>
                  {q > 1 && <span className="suave"> ×{q}</span>}
                  <p className="suave">{bonusDe(item)}</p>
                  <p className="suave">Equipado: {atual ? `${atual.nome} (${bonusDe(atual)})` : "nada"}</p>
                </div>
                <button type="button" className="botao botao-principal" disabled={ocupado} onClick={() => agir((e, agora) => equipar(e, item.id, agora))}>
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
