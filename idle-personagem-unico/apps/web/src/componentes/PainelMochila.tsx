import { CATALOGO, LIVROS, LOCAL_CIDADE, NOME_OFICIO, OFICIOS, comprarLivro, precoDeCompra, precoDeVenda, vender, venderTudo, type Personagem } from "@idle-pu/motor";
import { formatarNumero, nomeLocal, situacaoMochila } from "@/lib/atividade";
import type { Agir } from "./acoes";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly agir: Agir;
}

/** Mercado: venda por item e em lote (GDD §9.3, §9.5). Usado em Mapa e em Mochila. */
export function PainelMercado({ personagem: p, ocupado, agir }: Props) {
  const naCidade = p.localId === LOCAL_CIDADE && !p.viagem;
  const itens = Object.entries(p.mochila);
  const total = itens.reduce((s, [id, q]) => s + precoDeVenda(p, id, q), 0);
  return (
    <article className="cartao">
      <div className="nivel-linha">
        <h3>Mercado</h3>
        <span className="ouro">{formatarNumero(p.ouro, 0)} g</span>
      </div>
      {!naCidade && <p className="suave">Para vender, vá até {nomeLocal(LOCAL_CIDADE)}.</p>}
      {itens.length === 0 ? (
        <p className="suave">A mochila está vazia.</p>
      ) : (
        <>
          <ul className="lista-recursos">
            {itens.map(([id, q]) => {
              const item = CATALOGO.itens.get(id)!;
              return (
                <li key={id} className="recurso">
                  <div>
                    <strong>{item.nome}</strong> <span className={`selo raridade-${item.raridade}`}>×{formatarNumero(q, 0)}</span>
                    <p className="suave">
                      {formatarNumero(item.preco, 0)} g cada · {formatarNumero(precoDeVenda(p, id, q), 0)} g tudo
                    </p>
                  </div>
                  <button type="button" className="botao" disabled={ocupado || !naCidade} onClick={() => agir((e, agora) => vender(e, id, q, agora))}>
                    Vender
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="acoes">
            <button type="button" className="botao botao-principal" disabled={ocupado || !naCidade} onClick={() => agir(venderTudo)}>
              Vender tudo ({formatarNumero(total, 0)} g)
            </button>
          </div>
        </>
      )}
    </article>
  );
}

/** Mochila → Materiais: o que está guardado, espaço e venda. */
export function PainelMateriais(props: Props) {
  const m = situacaoMochila(props.personagem);
  return (
    <section className="painel" aria-label="Materiais">
      <article className="cartao">
        <div className="nivel-linha">
          <h3>Mochila</h3>
          <span className={m.cheia ? "erro" : "suave"}>
            {m.usados} / {m.capacidade} espaços{m.cheia ? " — cheia" : ""}
          </span>
        </div>
        <div className="progresso" role="progressbar" aria-label="Espaço usado da mochila" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((m.usados / m.capacidade) * 100)}>
          <div className={`progresso-preenchido${m.cheia ? " progresso-cheio" : ""}`} style={{ width: `${Math.min(1, m.usados / m.capacidade) * 100}%` }} />
        </div>
        <p className="suave nota">Cada espaço guarda uma pilha (100 materiais ou 20 achados raros). A Força aumenta o espaço. Com a mochila cheia, o que não couber se perde.</p>
      </article>
      <PainelMercado {...props} />
    </section>
  );
}

/** Mochila → Ferramentas: a equipada em cada ofício. */
export function PainelFerramentas({ personagem: p }: { personagem: Personagem }) {
  return (
    <section className="painel" aria-label="Ferramentas">
      <ul className="lista-treinos">
        {OFICIOS.map((o) => {
          const f = CATALOGO.ferramentas.get(p.ferramentas[o])!;
          return (
            <li key={o} className="cartao">
              <div className="nivel-linha">
                <h3>{f.nome}</h3>
                <span className={`selo raridade-${f.raridade}`}>{NOME_OFICIO[o]}</span>
              </div>
              <p className="suave">
                ×{formatarNumero(f.eficiencia, 2)} rendimento · ×{formatarNumero(f.velocidade, 2)} velocidade
              </p>
            </li>
          );
        })}
      </ul>
      <p className="suave nota">Ferramentas melhores ficam à venda no Ferreiro (Mapa → Estabelecimentos).</p>
    </section>
  );
}

/** Livreiro (no Mercado): livros de habilidades gerais. */
export function PainelLivreiro({ personagem: p, ocupado, agir }: Props) {
  const naCidade = p.localId === LOCAL_CIDADE && !p.viagem;
  return (
    <article className="cartao">
      <h3>Livreiro</h3>
      <p className="suave">Livros ensinam habilidades. Leia em Personagem → Habilidades.</p>
      <ul className="lista-recursos">
        {LIVROS.map((l) => {
          const preco = precoDeCompra(p, l.livro!.precoCompra);
          const sabe = Boolean(p.habilidades[l.livro!.habilidadeId]);
          const bloqueado = !naCidade || p.ouro < preco;
          return (
            <li key={l.id} className={`recurso${bloqueado || sabe ? " bloqueado" : ""}`}>
              <div>
                <strong>{l.nome.replace("Livro: ", "")}</strong> <span className={`selo raridade-${l.raridade}`}>{formatarNumero(preco, 0)} g</span>
                <p className="suave">{CATALOGO.habilidades.get(l.livro!.habilidadeId)!.descricao}</p>
                {sabe && <p className="suave">Você já sabe essa habilidade.</p>}
              </div>
              <button type="button" className="botao botao-principal" disabled={ocupado || bloqueado || sabe} onClick={() => agir((e, agora) => comprarLivro(e, l.id, agora))}>
                Comprar
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
