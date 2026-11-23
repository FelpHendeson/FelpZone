// API pública do motor. A interface importa só daqui.
export { Rng, estadoDaSemente, ehEstadoRng, TAMANHO_MAXIMO_SEMENTE } from "./rng";
export type { EstadoRng, OpcaoPonderada } from "./rng";

export {
  PASSO_MS,
  LIMITE_OFFLINE_MS,
  MAX_PASSOS_OFFLINE,
  relogioDoSistema,
  criarRelogioManual,
  calcularPassos,
} from "./tempo";
export type { Relogio, RelogioManual, ResultadoPassos } from "./tempo";

export { RESUMO_NEUTRO, resumirModificadores, aplicarResumo, comporModificadores } from "./modificadores";
export type {
  Modificador,
  OperacaoModificador,
  OrigemModificador,
  ResumoModificadores,
  TipoOrigemModificador,
} from "./modificadores";

export {
  VERSAO_SAVE_ATUAL,
  TAMANHO_MAXIMO_SAVE_BYTES,
  MIGRACOES,
  criarEstadoInicial,
  serializarSave,
  carregarSave,
  migrarSave,
  validarEstado,
  tamanhoUtf8,
} from "./save";
export type {
  EstadoJogo,
  DadosSave,
  Migracao,
  CodigoErroSave,
  ErroSave,
  ResultadoCarga,
  ResultadoMigracao,
  OpcoesCarga,
} from "./save";

export { criarArmazenamentoEmMemoria, salvarJogo, lerJogo } from "./armazenamento";
export type { Armazenamento, ResultadoLeitura } from "./armazenamento";
