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
  migrarV2ParaV3,
  migrarV3ParaV4,
  migrarV4ParaV5,
  migrarV5ParaV6,
  migrarV6ParaV7,
  migrarV7ParaV8,
  migrarV8ParaV9,
  migrarV9ParaV10,
  migrarV10ParaV11,
  migrarV11ParaV12,
  migrarV12ParaV13,
  migrarV13ParaV14,
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
export type { AtividadeAtual, Aparencia, EfeitoEmCurso, EstadoCombate, EstadoLimiar, EstadoMissoes, MissaoAtiva, ProgressoOficio, Viagem, Conta, EstadoSorteio, OrigemPersonagem, Personagem, RegistroTentativa } from "./personagem/conta";
export { NOME_MAX, NOME_MIN, validarNome } from "./personagem/nome";
export type { CodigoErroNome, ErroNome } from "./personagem/nome";
export { gerarLoreOrigem } from "./personagem/lore";
export { gerarMiniaturaSvg } from "./personagem/aparencia";
export type { ParametrosMiniatura } from "./personagem/aparencia";

// F2: progressão, atividades e avanço do tempo.
export {
  CONFIG_PROGRESSAO,
  faixaStatus,
  faixas,
  fator,
  ganhoDeTreino,
  modificadoresDoPersonagem,
  statusIniciais,
  valorEfetivo,
  xpParaProximoNivel,
  xpParaProximoNivelOficio,
  CONFIG_OFICIOS,
  CONFIG_MOCHILA,
} from "./personagem/progressao";
export { adicionarItens, cabeNaMochila, capacidadeMochila, espacosUsados, removerItens } from "./personagem/mochila";
export type { Mochila } from "./personagem/mochila";
export { camposIniciaisF3, camposIniciaisF4, camposIniciaisF5, camposIniciaisF6, camposIniciaisF7, camposIniciaisF8, nomeadoDaOrigem } from "./personagem/conta";
export type { BaseModificadores, ConfigProgressao, FaixaStatus, ValoresStatus } from "./personagem/progressao";
export {
  avancar,
  avancarPersonagem,
  BONUS_AGILIDADE_POR_PONTO,
  BONUS_RARO_POR_PONTO,
  chanceRaro,
  duracaoCicloMs,
  duracaoViagemMs,
  ganhosZerados,
  nivelEfetivoOficio,
  rendimentoMedio,
  resumoVazio,
  xpDoCiclo,
} from "./atividades/ciclos";
export type { ResultadoCiclos, ResumoAvanco } from "./atividades/ciclos";
export {
  pagarPedagio,
  comprarEquipamento,
  comprarFerramenta,
  definirRecuo,
  ampliarMochila,
  capacidadeDe,
  desequipar,
  equipar,
  fundir,
  infoFusao,
  iniciarAtividade,
  irPara,
  LOCAL_CIDADE,
  pararAtividade,
  precoAmpliacao,
  precoDeCompra,
  precoDeVenda,
  vender,
  vendivel,
  venderTudo,
} from "./atividades/acoes";
export type { CodigoErroAtividade, ErroAtividade, ResultadoAtividade } from "./atividades/acoes";
export { combateInicial, CONFIG_COMBATE, dano, riscoDaArea, statusDeCombate } from "./atividades/combate";
export type { Risco, StatusDeCombate } from "./atividades/combate";
export { aplicarXp } from "./personagem/progressao";

// F5: habilidades.
export {
  CONFIG_HABILIDADES,
  estagio,
  fatorMaestria,
  ganharMaestria,
  modificadoresDaPassiva,
  modificadoresDeHabilidades,
  nomeComEstagio,
  slotsPassivas,
  tecnicasDoCore,
  xpParaProximaMaestria,
} from "./habilidades/maestria";
export type { BaseHabilidades, Habilidades, ProgressoHabilidade } from "./habilidades/maestria";
export {
  comprarLivro,
  desequiparHabilidade,
  equiparHabilidade,
  escolherRamo,
  iniciarAprendizado,
  lerLivro,
  moverPrioridade,
} from "./habilidades/acoes";

// F6: O Limiar.
export { cargasEco, custoDoPedagio, duracaoDoLimiar, entrarNoLimiar, janelaEco, opcoesDoLimiar, sairDoLimiar, sinergiaLimiar, titulosPorMortes } from "./atividades/limiar";

// F7: missões e guilda.
export {
  abandonarMissao,
  aceitarMissao,
  alvoDoObjetivo,
  ehContador,
  entregarMissao,
  estaNoLugar,
  meritoParaSubir,
  missoesVisiveis,
  podeAceitar,
  progressoDaMissao,
  promover,
  valorDoObjetivo,
} from "./missoes/missoes";

// F9: ações serializáveis (cliente e servidor) e cofre da conta.
export { aplicarAcao, trocarPersonagem, validarAcao } from "./acoes";
export type { Acao, ResultadoAplicar, TipoAcao } from "./acoes";
export { atualizarCofre, COFRE_VAZIO, CONQUISTAS, MAX_PERGAMINHOS, RANKS_COM_PERGAMINHO, validarCofre } from "./personagem/cofre";
export type { Cofre, Conquista, Descobertas } from "./personagem/cofre";

// F10: pets.
export {
  bonusDoPet,
  camposIniciaisF10,
  categoriaAtual,
  especieDe,
  modificadoresDePets,
  novoPet,
  petTrabalhando,
  petUtil,
  SLOTS_PET,
  xpParaProximoNivelPet,
} from "./pets/pets";
export type { Pet, SlotPet } from "./pets/pets";
export { ativarUniao, atribuirPet, comprarLaco, comprarPet, nomearPet, soltarPet } from "./pets/acoes";

// F11: mundo vivo.
export {
  acumularEventos,
  atualizarCronica,
  camposIniciaisF11,
  climaEm,
  ehNoite,
  estadoDoMundo,
  horaDoJogo,
  marcosAtingidos,
  modificadoresDeTitulos,
  modificadoresDoMundo,
  proximaMudanca,
} from "./mundo/mundo";
export type { Cronica, EstadoEventos, EstadoMundo, EventoPendente, RegistroCronica } from "./mundo/mundo";
export { BONUS_TITULOS, CLIMAS, CONFIG_MUNDO, EFEITOS_CLIMA, EFEITOS_NOITE, EVENTOS, MARCOS_BESTIARIO, MARCOS_CRONICA, NOME_CLIMA, bonusBestiario } from "./dados/mundo";
export type { Clima, EscolhaEvento, Evento, MarcoCronica } from "./dados/mundo";
export { resolverEvento } from "./mundo/acoes";

// F12: competição.
export {
  botDeArena,
  camposIniciaisF12,
  campoDeProvas,
  chaveDoTorneio,
  diaDe,
  duelo,
  emDia,
  ocupacaoDe,
  faixaDaColocacao,
  inicioDaSemana,
  rankingDaTemporada,
  resolverTorneio,
  retratoDe,
  semanaDe,
  temaDaTemporada,
  temporadaDe,
  validarRetrato,
} from "./competicao/competicao";
export type { EstadoCompeticao, LanceDuelo, PartidaTorneio, ReplayArena, ResultadoDuelo, Retrato } from "./competicao/competicao";
export { inscreverTorneio, lutarArena, resgatarTorneio } from "./competicao/acoes";

export { PASSOS_TUTORIAL, tutorialInicial, validarTutorial } from "./personagem/tutorial";
export type { EstadoTutorial, PassoTutorial } from "./personagem/tutorial";
