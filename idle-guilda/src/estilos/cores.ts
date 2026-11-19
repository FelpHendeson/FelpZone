import { DADOS_RARIDADE } from '../motor/dados/itens';
import { COR_ELEMENTO } from '../motor/dados/personagens';

/** Variáveis CSS de raridade (`--r-*`) e de elemento (`--el-*`), tiradas dos dados do jogo. */
export function variaveisDeCor(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [id, r] of Object.entries(DADOS_RARIDADE)) vars[`--r-${id}`] = r.cor;
  for (const [id, cor] of Object.entries(COR_ELEMENTO)) vars[`--el-${id}`] = cor;
  return vars;
}

/** Grava as cores do jogo como variáveis CSS em `:root`. */
export function aplicarCores(raiz: HTMLElement = document.documentElement): void {
  for (const [nome, valor] of Object.entries(variaveisDeCor())) raiz.style.setProperty(nome, valor);
}
