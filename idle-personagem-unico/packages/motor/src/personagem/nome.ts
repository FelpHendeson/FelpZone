/** Validação do nome do personagem. */

export const NOME_MIN = 3;
export const NOME_MAX = 20;

export type CodigoErroNome = "nome_curto" | "nome_longo" | "nome_espacos_nas_pontas" | "nome_caracteres_invalidos" | "nome_sem_letra";

export interface ErroNome {
  readonly codigo: CodigoErroNome;
  readonly mensagem: string;
}

/** Letras (com acentos), números, espaço, hífen e apóstrofo (reto ou tipográfico). */
const PERMITIDOS = /^[\p{L}\p{M}\p{Nd} '’-]+$/u;
const TEM_LETRA = /\p{L}/u;

/**
 * Normaliza (NFC) e valida o nome. Devolve o nome normalizado ou um erro.
 * O tamanho conta caracteres visíveis (pontos de código após NFC).
 */
export function validarNome(entrada: unknown): { readonly ok: true; readonly nome: string } | { readonly ok: false; readonly erro: ErroNome } {
  if (typeof entrada !== "string") return { ok: false, erro: { codigo: "nome_caracteres_invalidos", mensagem: "O nome precisa ser um texto." } };
  const nome = entrada.normalize("NFC");
  const tamanho = [...nome].length;
  if (tamanho < NOME_MIN) return { ok: false, erro: { codigo: "nome_curto", mensagem: `O nome precisa ter pelo menos ${NOME_MIN} caracteres.` } };
  if (tamanho > NOME_MAX) return { ok: false, erro: { codigo: "nome_longo", mensagem: `O nome pode ter no máximo ${NOME_MAX} caracteres.` } };
  if (nome.trim() !== nome) {
    return { ok: false, erro: { codigo: "nome_espacos_nas_pontas", mensagem: "O nome não pode começar nem terminar com espaço." } };
  }
  if (!PERMITIDOS.test(nome)) {
    return {
      ok: false,
      erro: { codigo: "nome_caracteres_invalidos", mensagem: "Use só letras, números, espaço, hífen e apóstrofo." },
    };
  }
  if (!TEM_LETRA.test(nome)) return { ok: false, erro: { codigo: "nome_sem_letra", mensagem: "O nome precisa ter ao menos uma letra." } };
  return { ok: true, nome };
}
