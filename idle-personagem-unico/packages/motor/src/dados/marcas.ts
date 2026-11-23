/**
 * Marca da Anomalia (GDD §4.2): existe para todo par raça × core excêntrico.
 * Os pares curados à mão vêm primeiro; os demais saem de um gerador
 * determinístico por modelos (sem RNG: escolhe pelo hash dos ids).
 */
import type { Core, MarcaAnomalia, Raca } from "./tipos";

interface MarcaCurada {
  readonly racaId: string;
  readonly coreId: string;
  readonly nome: string;
  readonly descricao: string;
}

/** Pares escritos à mão. O primeiro é o exemplo do GDD. */
export const MARCAS_CURADAS: readonly MarcaCurada[] = [
  {
    racaId: "lobisomem",
    coreId: "ser-das-trevas",
    nome: "Lua sem Luz",
    descricao: "A fera não precisa mais da lua: nas noites sem lua, a transformação vem das sombras, e o lobo não faz barulho nem deixa cheiro.",
  },
  {
    racaId: "anao",
    coreId: "filho-da-tempestade",
    nome: "Bigorna do Trovão",
    descricao: "Cada martelada ecoa como trovão; golpes pesados descarregam raios no chão.",
  },
  {
    racaId: "elfo",
    coreId: "portador-da-chama",
    nome: "Outono Eterno",
    descricao: "O fogo não queima as árvores que ele ama: as chamas viram folhas em brasa que ferem só os inimigos.",
  },
  {
    racaId: "sangue-palido",
    coreId: "alma-da-luz",
    nome: "Sangue ao Meio-Dia",
    descricao: "A luz que deveria queimá-lo agora o alimenta: ao sol, o roubo de vida vira cura de quem está perto.",
  },
  {
    racaId: "draconato",
    coreId: "sem-chama",
    nome: "Dragão sem Fogo",
    descricao: "Um dragão que nasceu frio. Não cospe chamas, mas aprende o sopro de qualquer elemento que vê.",
  },
  {
    racaId: "humano",
    coreId: "ser-das-trevas",
    nome: "Sombra Emprestada",
    descricao: "As trevas o acolheram por engano e agora não sabem devolvê-lo; sua sombra age um instante antes dele.",
  },
  {
    racaId: "orc",
    coreId: "mente-lucida",
    nome: "Fúria Calculada",
    descricao: "A raiva vem, mas obedece: a Fúria Ancestral escolhe o momento certo em vez de explodir.",
  },
];

/** Hash FNV-1a de 32 bits: escolhe modelos sem depender de RNG nem de ordem. */
function hash32(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function escolher<T>(lista: readonly T[], semente: number): T {
  if (lista.length === 0) throw new RangeError("Lista vazia no gerador de marcas.");
  return lista[semente % lista.length] as T;
}

const MODELOS_DESCRICAO: readonly ((raca: string, efeito: string) => string)[] = [
  (raca, efeito) => `Ninguém esperava um ${raca} assim: ${efeito}.`,
  (raca, efeito) => `Uma anomalia rara entre os ${raca}s: ${efeito}.`,
  (raca, efeito) => `O sangue ${raca} estranha o próprio núcleo, e disso nasce algo novo: ${efeito}.`,
];

export function idMarcaAnomalia(racaId: string, coreId: string): string {
  return `anomalia-${racaId}-${coreId}`;
}

/** Gera a marca de um par por modelos (nome = núcleo da raça + complemento do core). */
export function gerarMarcaAnomalia(raca: Raca, core: Core): MarcaAnomalia {
  const h = hash32(`${raca.id}|${core.id}`);
  const nucleo = escolher(raca.nucleosAnomalia, h);
  const complemento = escolher(core.complementosAnomalia, h >>> 8);
  const modelo = escolher(MODELOS_DESCRICAO, h >>> 16);
  const nomeRaca = raca.nome.toLowerCase();
  return {
    id: idMarcaAnomalia(raca.id, core.id),
    racaId: raca.id,
    coreId: core.id,
    nome: `${nucleo} ${complemento}`,
    descricao: modelo(nomeRaca, core.efeitoAnomalia),
    curada: false,
    efeito: { efeitoPendente: "Sinergia única do par raça × core; números chegam com habilidades (F5)." },
  };
}

/** Marca de um par excêntrico: curada se existir, senão gerada. */
export function montarMarcaAnomalia(raca: Raca, core: Core): MarcaAnomalia {
  const curada = MARCAS_CURADAS.find((m) => m.racaId === raca.id && m.coreId === core.id);
  if (!curada) return gerarMarcaAnomalia(raca, core);
  return {
    id: idMarcaAnomalia(raca.id, core.id),
    racaId: raca.id,
    coreId: core.id,
    nome: curada.nome,
    descricao: curada.descricao,
    curada: true,
    efeito: { efeitoPendente: "Sinergia única do par raça × core; números chegam com habilidades (F5)." },
  };
}
