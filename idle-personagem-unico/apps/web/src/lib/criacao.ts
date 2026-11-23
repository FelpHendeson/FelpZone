import {
  iniciarSorteio,
  personagemAtivo,
  salvarJogo,
  type Armazenamento,
  type EstadoJogo,
  type ResultadoAcao,
} from "@idle-pu/motor";
import { CHAVE_SAVE } from "./persistencia";

/**
 * Sem personagem e sem sorteio, já começa o sorteio (a 1ª tentativa sai na
 * hora). Com sorteio em andamento ou personagem criado, não muda nada.
 */
export function prepararCriacao(estado: EstadoJogo): EstadoJogo {
  if (personagemAtivo(estado) || estado.conta.sorteio) return estado;
  const r = iniciarSorteio(estado);
  return r.ok ? r.estado : estado;
}

/**
 * Aplica uma ação do motor e grava o resultado antes de devolvê-lo, para
 * que recarregar a página nunca volte a um estado anterior (e devolva chances).
 */
export async function aplicarESalvar(
  armazenamento: Armazenamento,
  resultado: ResultadoAcao,
): Promise<ResultadoAcao> {
  if (resultado.ok) await salvarJogo(armazenamento, CHAVE_SAVE, resultado.estado);
  return resultado;
}
