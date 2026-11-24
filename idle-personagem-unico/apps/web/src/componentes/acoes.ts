import type { Acao } from "@idle-pu/motor";

/** Ação que a interface dispara: serializável, a mesma no modo local e no servidor. */
export type AcaoJogo = Acao;
export type Agir = (acao: Acao) => void;
