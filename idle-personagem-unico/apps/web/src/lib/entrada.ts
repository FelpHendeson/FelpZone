import { lerJogo, type Armazenamento, type EstadoJogo } from "@idle-pu/motor";
import { CHAVE_SAVE } from "./persistencia";

/** A apresentação só consulta. Criar um save ou consumir sorteio exige uma escolha explícita. */
export async function lerJornadaLocal(armazenamento: Armazenamento): Promise<EstadoJogo | null> {
  const r = await lerJogo(armazenamento, CHAVE_SAVE);
  return r.ok ? r.estado : null;
}
