import type { ParametrosMiniatura } from "@idle-pu/motor";
import { PersonagemRaster } from "./PersonagemRaster";

export function Miniatura({ parametros, tamanho = 96, rotulo }: { parametros: ParametrosMiniatura; tamanho?: number; rotulo: string }) {
  return <PersonagemRaster parametros={parametros} tamanho={tamanho} rotulo={rotulo} retrato />;
}
