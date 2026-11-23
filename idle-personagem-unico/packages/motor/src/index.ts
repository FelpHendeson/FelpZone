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
  migrarV1ParaV2,
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

// F1: conteúdo, sorteio e personagem.
export * from "./dados";
export { CONFIG_SORTEIO } from "./sorteio/config";
export type { ConfigSorteio } from "./sorteio/config";
export {
  escolherComOrcamento,
  opcoesCore,
  opcoesDom,
  opcoesOrigem,
  opcoesRaca,
  origensEspeciaisDaRaca,
  reproduzirTentativa,
  sortearTentativa,
  OPCAO_ORIGEM_COMUM,
} from "./sorteio/cascata";
export type { EscolhaComOrcamento, NomePasso, OpcaoComCusto, OrigemSorteada, PassoOrcamento, ResultadoTentativa } from "./sorteio/cascata";
export {
  aceitarSorteio,
  definirNomeEAparencia,
  iniciarSorteio,
  personagemAtivo,
  rerolar,
  situacaoSorteio,
  tentativaAtual,
} from "./sorteio/acoes";
export type { CodigoErroSorteio, ErroSorteio, EscolhasFinais, ResultadoAcao } from "./sorteio/acoes";
export { CONTA_VAZIA, MAX_PERSONAGENS, resumoTentativa, validarConta } from "./personagem/conta";
export type { Aparencia, Conta, EstadoSorteio, OrigemPersonagem, Personagem, RegistroTentativa } from "./personagem/conta";
export { NOME_MAX, NOME_MIN, validarNome } from "./personagem/nome";
export type { CodigoErroNome, ErroNome } from "./personagem/nome";
export { gerarLoreOrigem } from "./personagem/lore";
export { gerarMiniaturaSvg } from "./personagem/aparencia";
export type { ParametrosMiniatura } from "./personagem/aparencia";
