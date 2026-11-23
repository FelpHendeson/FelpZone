import { gerarMiniaturaSvg, type ParametrosMiniatura } from "@idle-pu/motor";

/** Miniatura de perfil gerada pelo motor (SVG só com ids do catálogo). */
export function Miniatura({ parametros, tamanho = 96, rotulo }: { parametros: ParametrosMiniatura; tamanho?: number; rotulo: string }) {
  const svg = gerarMiniaturaSvg(parametros);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG gerado em memória, não há o que otimizar.
    <img
      className="miniatura"
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      width={tamanho}
      height={tamanho}
      alt={rotulo}
    />
  );
}
