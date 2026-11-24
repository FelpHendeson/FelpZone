import { CATALOGO, type ResultadoTentativa } from "@idle-pu/motor";
import { ROTULO_COMPATIBILIDADE, ROTULO_MODO, ROTULO_NATUREZA, rotuloRaridade } from "@/lib/textos";

/** Cartões de raça, core, dom, origem e marca. Usados no sorteio e na ficha. */
export function CartoesResultado({ resultado, lore }: { resultado: Omit<ResultadoTentativa, "orcamento">; lore: string }) {
  const raca = CATALOGO.racas.get(resultado.racaId)!;
  const core = CATALOGO.cores.get(resultado.coreId)!;
  const dom = CATALOGO.dons.get(resultado.domId)!;
  const marca = resultado.marcaAnomaliaId ? CATALOGO.marcasAnomalia.get(resultado.marcaAnomaliaId) : undefined;
  const besta = resultado.bestaVinculadaId ? CATALOGO.bestas.get(resultado.bestaVinculadaId) : undefined;
  const traco = CATALOGO.tracos.get(resultado.tracoId);
  const especial = resultado.origem.tipo === "especial" ? CATALOGO.origensEspeciais.get(resultado.origem.id) : undefined;
  const berco = resultado.origem.tipo === "comum" ? CATALOGO.bercos.get(resultado.origem.bercoId) : undefined;

  return (
    <div className="cartoes">
      <article className="cartao">
        <header className="cartao-topo">
          <span className="cartao-tipo">Raça</span>
          <span className={`selo raridade-${raca.raridade}`}>{rotuloRaridade(raca.raridade)}</span>
        </header>
        <h2 className="cartao-titulo">{raca.nome}</h2>
        <p className="suave">{raca.perfil}</p>
        <p>
          <strong>{raca.habilidadeComum.nome}:</strong> {raca.habilidadeComum.descricao}
        </p>
      </article>

      <article className="cartao">
        <header className="cartao-topo">
          <span className="cartao-tipo">Core</span>
          <span className={`selo compat-${resultado.compatibilidade}`}>{ROTULO_COMPATIBILIDADE[resultado.compatibilidade]}</span>
        </header>
        <h2 className="cartao-titulo">{core.nome}</h2>
        <p className="suave">
          <em>{core.descricao}</em>
        </p>
        <ul className="tecnicas">
          {core.tecnicas.map((t) => (
            <li key={t.id}>
              <strong>{t.nome}</strong>{" "}
              <span className="suave">
                ({ROTULO_MODO[t.modo]}, {ROTULO_NATUREZA[t.natureza]})
              </span>
              : {t.descricao}
            </li>
          ))}
        </ul>
      </article>

      <article className="cartao">
        <header className="cartao-topo">
          <span className="cartao-tipo">Dom de raça</span>
          <span className={`selo raridade-${dom.raridade}`}>{rotuloRaridade(dom.raridade)}</span>
        </header>
        <h2 className="cartao-titulo">{dom.nome}</h2>
        <p>{dom.descricao}</p>
      </article>

      <article className="cartao">
        <header className="cartao-topo">
          <span className="cartao-tipo">Origem</span>
          <span className={`selo ${especial ? "raridade-epico" : "raridade-comum"}`}>{especial ? "Especial" : "Comum"}</span>
        </header>
        <h2 className="cartao-titulo">{especial ? especial.nome : berco?.nome}</h2>
        <p className="lore">{lore}</p>
        {especial && <p className="suave">{especial.efeitoTexto}</p>}
        {berco && <p className="suave">Bônus de berço: {berco.bonusTexto}.</p>}
        {besta && (
          <p>
            <strong>Besta vinculada — {besta.nome}:</strong> {besta.descricao}
          </p>
        )}
        {traco && (
          <p className="suave">
            Traço: <strong>{traco.nome}</strong>. {traco.descricao}
          </p>
        )}
      </article>

      {marca && (
        <article className="cartao cartao-anomalia">
          <header className="cartao-topo">
            <span className="cartao-tipo">Marca da Anomalia</span>
          </header>
          <h2 className="cartao-titulo">{marca.nome}</h2>
          <p>{marca.descricao}</p>
        </article>
      )}
    </div>
  );
}
