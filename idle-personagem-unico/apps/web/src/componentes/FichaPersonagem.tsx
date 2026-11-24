import { CATALOGO, compatibilidade, type Personagem } from "@idle-pu/motor";
import { CartoesResultado } from "./CartoesResultado";
import { Miniatura } from "./Miniatura";

/** Ficha da aba Personagem → Status (F1: sem status numéricos ainda). */
export function FichaPersonagem({ personagem: p }: { personagem: Personagem }) {
  const raca = CATALOGO.racas.get(p.racaId)!;
  const core = CATALOGO.cores.get(p.coreId)!;
  const resultado = {
    racaId: p.racaId,
    coreId: p.coreId,
    compatibilidade: compatibilidade(raca, core),
    domId: p.dons[0]!,
    origem:
      p.origem.tipo === "especial"
        ? { tipo: "especial" as const, id: p.origem.id }
        : { tipo: "comum" as const, bercoId: p.origem.id, motivacaoId: p.origem.motivacaoId, marcaId: p.origem.marcaId ?? null, anosDeEstrada: p.origem.anosDeEstrada },
    marcaAnomaliaId: p.marcaAnomaliaId ?? null,
    bestaVinculadaId: p.bestaVinculadaId ?? null,
    tracoId: p.tracoPersonalidadeId,
  };
  return (
    <section className="ficha" aria-label={`Ficha de ${p.nome}`}>
      <header className="ficha-topo">
        <Miniatura parametros={{ racaId: p.racaId, coreId: p.coreId, corCabeloId: p.aparencia.corCabelo, corRoupaId: p.aparencia.corRoupa }} tamanho={96} rotulo={`Miniatura de ${p.nome}`} />
        <div>
          <h2>{p.nome}</h2>
          <p className="suave">
            {raca.nome} · {core.nome}
          </p>
          <p>
            Nível {p.nivel} · XP {p.xp}
          </p>
        </div>
      </header>
      <CartoesResultado resultado={resultado} lore={p.origem.loreGerada} />
    </section>
  );
}
