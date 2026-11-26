import { CATALOGO, type Personagem } from "@idle-pu/motor";

export const ORDEM_RACAS_ARTE = ["humano", "anao", "elfo", "orc", "lobisomem", "sangue-palido", "draconato", "silfo"] as const;
const LOCAIS = ["pedravau", "bosque-raso", "mina-velha", "lago-espelho"] as const;
export function quadroRaca(id: string): { coluna: number; linha: number } | null {
  const i = (ORDEM_RACAS_ARTE as readonly string[]).indexOf(id);
  return i < 0 ? null : { coluna: i % 4, linha: Math.floor(i / 4) };
}
/** Cena é apresentação do estado confirmado, sem antecipar chegada ou simular ações. */
export function cenaDoPersonagem(p: Pick<Personagem, "localId" | "atividade" | "viagem" | "limiar">) {
  const tipo = p.atividade ? CATALOGO.atividades.get(p.atividade.id)?.tipo : undefined;
  const estado = p.limiar ? "limiar" : p.viagem ? "viagem" : tipo === "combate" ? "combate" : p.atividade ? "trabalho" : "repouso";
  const local = (LOCAIS as readonly string[]).indexOf(p.localId);
  const i = Math.max(0, local);
  return { id: p.limiar ? "limiar" : p.localId, arquivo: p.limiar ? "/arte/limiar-v1.webp" : "/arte/locais-v1.webp", posicao: p.limiar ? "0 0" : `${(i % 2) * 100}% ${Math.floor(i / 2) * 100}%`, tamanho: p.limiar ? "100% 100%" : "200% 200%", estado } as const;
}
