import type { EstadoJogo, ResultadoAtividade } from "@idle-pu/motor";

/** Ação do motor que a interface dispara (o Shell avança, grava e mostra erros). */
export type AcaoJogo = (estado: EstadoJogo, agora: number) => ResultadoAtividade;
export type Agir = (acao: AcaoJogo) => void;
