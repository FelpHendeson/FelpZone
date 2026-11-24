/** Ações de atividade: começar, trocar e parar. Uma atividade por vez [Autor]. */
import { CATALOGO } from "../dados";
import type { EstadoJogo } from "../save";
import { avancar, type ResumoAvanco } from "./ciclos";

export type CodigoErroAtividade = "sem_personagem" | "atividade_inexistente" | "ja_na_atividade" | "ja_ocioso";

export interface ErroAtividade {
  readonly codigo: CodigoErroAtividade;
  readonly mensagem: string;
}

export type ResultadoAtividade =
  | { readonly ok: true; readonly estado: EstadoJogo; readonly resumo: ResumoAvanco }
  | { readonly ok: false; readonly erro: ErroAtividade };

function falha(codigo: CodigoErroAtividade, mensagem: string): ResultadoAtividade {
  return { ok: false, erro: { codigo, mensagem } };
}

function trocar(estado: EstadoJogo, agora: number, atividadeId: string | null): ResultadoAtividade {
  // Primeiro avança até agora: o tempo até a troca conta para a atividade antiga.
  const { estado: avancado, resumo } = avancar(estado, agora);
  const id = avancado.conta.personagemAtivoId;
  const personagens = avancado.conta.personagens.map((p) =>
    p.id === id ? { ...p, atividade: atividadeId === null ? null : { id: atividadeId, progressoMs: 0 } } : p,
  );
  return { ok: true, estado: { ...avancado, conta: { ...avancado.conta, personagens } }, resumo };
}

/**
 * Começa (ou troca para) uma atividade. O ciclo parcial da atividade anterior
 * é descartado [Proposta]: trocar tem custo, e não dá para "guardar" meio ciclo.
 */
export function iniciarAtividade(estado: EstadoJogo, atividadeId: string, agora: number): ResultadoAtividade {
  const ativo = estado.conta.personagens.find((p) => p.id === estado.conta.personagemAtivoId);
  if (!ativo) return falha("sem_personagem", "Não há personagem ativo.");
  if (!CATALOGO.atividades.has(atividadeId)) return falha("atividade_inexistente", "Atividade desconhecida.");
  if (ativo.atividade?.id === atividadeId) return falha("ja_na_atividade", "O personagem já está nessa atividade.");
  return trocar(estado, agora, atividadeId);
}

/** Para a atividade atual; o personagem fica ocioso. */
export function pararAtividade(estado: EstadoJogo, agora: number): ResultadoAtividade {
  const ativo = estado.conta.personagens.find((p) => p.id === estado.conta.personagemAtivoId);
  if (!ativo) return falha("sem_personagem", "Não há personagem ativo.");
  if (!ativo.atividade) return falha("ja_ocioso", "O personagem já está ocioso.");
  return trocar(estado, agora, null);
}
