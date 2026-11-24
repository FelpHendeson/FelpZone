/**
 * Ações puras da criação do personagem: recebem o estado e devolvem estado
 * novo ou erro tipado. O estado do sorteio vive no save; recarregar a página
 * não devolve chances.
 */
import { CATALOGO } from "../dados";
import { camposIniciaisF3, camposIniciaisF4, camposIniciaisF5, MAX_PERSONAGENS, resumoTentativa, type EstadoSorteio, type Personagem } from "../personagem/conta";
import { gerarLoreOrigem } from "../personagem/lore";
import { statusIniciais } from "../personagem/progressao";
import { validarNome, type CodigoErroNome } from "../personagem/nome";
import { Rng } from "../rng";
import type { EstadoJogo } from "../save";
import { reproduzirTentativa, sortearTentativa, type ResultadoTentativa } from "./cascata";
import { CONFIG_SORTEIO } from "./config";

export type CodigoErroSorteio =
  | "sorteio_em_andamento"
  | "sem_sorteio"
  | "sem_chances"
  | "ja_aceito"
  | "nao_aceito"
  | "limite_personagens"
  | "requer_pergaminho"
  | "cor_invalida"
  | "instante_invalido"
  | CodigoErroNome;

export interface ErroSorteio {
  readonly codigo: CodigoErroSorteio;
  readonly mensagem: string;
}

export type ResultadoAcao = { readonly ok: true; readonly estado: EstadoJogo } | { readonly ok: false; readonly erro: ErroSorteio };

function falha(codigo: CodigoErroSorteio, mensagem: string): ResultadoAcao {
  return { ok: false, erro: { codigo, mensagem } };
}

/** Sorteia a próxima tentativa a partir do RNG do save e registra no histórico. */
function novaTentativa(estado: EstadoJogo, sorteio: EstadoSorteio): EstadoJogo {
  const rng = Rng.deEstado(estado.rng);
  const rngInicio = rng.estado();
  const resultado = sortearTentativa(rng, CONFIG_SORTEIO);
  return {
    ...estado,
    rng: rng.estado(),
    conta: { ...estado.conta, sorteio: { ...sorteio, historico: [...sorteio.historico, { rngInicio, resumo: resumoTentativa(resultado) }] } },
  };
}

/** Começa o sorteio do primeiro personagem (a 1ª tentativa já sai sorteada). */
export function iniciarSorteio(estado: EstadoJogo): ResultadoAcao {
  if (estado.conta.sorteio) return falha("sorteio_em_andamento", "Já existe um sorteio em andamento.");
  if (estado.conta.personagens.length >= MAX_PERSONAGENS) {
    return falha("limite_personagens", `A conta já tem ${MAX_PERSONAGENS} personagens.`);
  }
  if (estado.conta.personagens.length > 0) {
    return falha("requer_pergaminho", "Um novo personagem exige o Pergaminho do Novo Destino (ainda não disponível).");
  }
  return { ok: true, estado: novaTentativa(estado, { maxTentativas: CONFIG_SORTEIO.tentativas, historico: [], aceito: false }) };
}

/** Tentativa atual (número a partir de 1), restantes e se só resta aceitar. */
export function situacaoSorteio(estado: EstadoJogo): {
  readonly tentativa: number;
  readonly maxTentativas: number;
  readonly restantes: number;
  readonly aceito: boolean;
} | null {
  const s = estado.conta.sorteio;
  if (!s) return null;
  return { tentativa: s.historico.length, maxTentativas: s.maxTentativas, restantes: s.maxTentativas - s.historico.length, aceito: s.aceito };
}

/** Resultado da tentativa atual, reproduzido a partir do estado salvo. */
export function tentativaAtual(estado: EstadoJogo): ResultadoTentativa | null {
  const ultima = estado.conta.sorteio?.historico.at(-1);
  return ultima ? reproduzirTentativa(ultima.rngInicio, CONFIG_SORTEIO) : null;
}

/** Descarta o resultado atual e sorteia outro. Depois da última tentativa, só resta aceitar. */
export function rerolar(estado: EstadoJogo): ResultadoAcao {
  const s = estado.conta.sorteio;
  if (!s) return falha("sem_sorteio", "Não há sorteio em andamento.");
  if (s.aceito) return falha("ja_aceito", "O resultado já foi aceito.");
  if (s.historico.length >= s.maxTentativas) return falha("sem_chances", "As chances acabaram: aceite o último resultado.");
  return { ok: true, estado: novaTentativa(estado, s) };
}

/** Aceita o resultado atual. Depois, falta escolher nome e aparência. */
export function aceitarSorteio(estado: EstadoJogo): ResultadoAcao {
  const s = estado.conta.sorteio;
  if (!s) return falha("sem_sorteio", "Não há sorteio em andamento.");
  if (s.aceito) return falha("ja_aceito", "O resultado já foi aceito.");
  return { ok: true, estado: { ...estado, conta: { ...estado.conta, sorteio: { ...s, aceito: true } } } };
}

export interface EscolhasFinais {
  readonly nome: string;
  readonly corCabelo: string;
  readonly corRoupa: string;
}

/** Cria o personagem a partir do resultado aceito, com nome e aparência, e o torna ativo. */
export function definirNomeEAparencia(estado: EstadoJogo, escolhas: EscolhasFinais, agora: number): ResultadoAcao {
  const s = estado.conta.sorteio;
  if (!s) return falha("sem_sorteio", "Não há sorteio em andamento.");
  if (!s.aceito) return falha("nao_aceito", "Aceite o resultado do sorteio antes de escolher o nome.");
  if (!Number.isSafeInteger(agora) || agora < 0) return falha("instante_invalido", "Instante inválido.");
  const nome = validarNome(escolhas.nome);
  if (!nome.ok) return falha(nome.erro.codigo, nome.erro.mensagem);
  if (!CATALOGO.coresCabelo.has(escolhas.corCabelo) || !CATALOGO.coresRoupa.has(escolhas.corRoupa)) {
    return falha("cor_invalida", "Escolha cores da paleta.");
  }
  const r = tentativaAtual(estado) as ResultadoTentativa;
  const loreGerada = gerarLoreOrigem(r.origem, r.racaId, nome.nome);
  const identidade: Omit<
    Personagem,
    "status" | "atividade" | keyof ReturnType<typeof camposIniciaisF3> | keyof ReturnType<typeof camposIniciaisF4> | keyof ReturnType<typeof camposIniciaisF5>
  > = {
    id: `personagem-${estado.conta.personagens.length + 1}`,
    nome: nome.nome,
    nivel: 1,
    xp: 0,
    racaId: r.racaId,
    coreId: r.coreId,
    dons: [r.domId],
    origem:
      r.origem.tipo === "especial"
        ? { tipo: "especial", id: r.origem.id, loreGerada }
        : {
            tipo: "comum",
            id: r.origem.bercoId,
            motivacaoId: r.origem.motivacaoId,
            ...(r.origem.marcaId ? { marcaId: r.origem.marcaId } : {}),
            anosDeEstrada: r.origem.anosDeEstrada,
            loreGerada,
          },
    ...(r.bestaVinculadaId ? { bestaVinculadaId: r.bestaVinculadaId } : {}),
    ...(r.marcaAnomaliaId ? { marcaAnomaliaId: r.marcaAnomaliaId } : {}),
    tracoPersonalidadeId: r.tracoId,
    aparencia: { corCabelo: escolhas.corCabelo, corRoupa: escolhas.corRoupa },
    criadoEm: agora,
  };
  const f4 = camposIniciaisF4();
  const f5 = camposIniciaisF5(r.coreId, r.origem.tipo === "especial" ? r.origem.id : undefined);
  const personagem: Personagem = {
    ...identidade,
    status: statusIniciais({ ...identidade, equipados: f4.equipados, ...f5 }),
    atividade: null,
    ...camposIniciaisF3(),
    ...f4,
    ...f5,
  };
  return {
    ok: true,
    estado: {
      ...estado,
      ultimoTick: Math.max(estado.ultimoTick, agora),
      conta: { personagens: [...estado.conta.personagens, personagem], personagemAtivoId: personagem.id, sorteio: null },
    },
  };
}

/** Personagem ativo, se houver. */
export function personagemAtivo(estado: EstadoJogo): Personagem | null {
  return estado.conta.personagens.find((p) => p.id === estado.conta.personagemAtivoId) ?? null;
}
