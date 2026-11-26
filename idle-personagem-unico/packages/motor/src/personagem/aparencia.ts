/** Retrato pixel art modular e determinístico, compatível com os saves existentes. */
import { retratoPixel } from "./pixel";

export interface ParametrosMiniatura {
  readonly racaId: string;
  readonly coreId: string;
  readonly corCabeloId: string;
  readonly corRoupaId: string;
}

export function gerarMiniaturaSvg(p: ParametrosMiniatura): string {
  return retratoPixel(p);
}
