// Agrupa acontecimentos em "lances": tudo o que uma jogada causou, para
// narrar de uma vez ("tirou 3 e 4, foi para X, pagou $20 de aluguel a Y")
// em vez de mostrar números mudando sem explicação. Puro e testável.

import { describeEvent, type DescribeContext, type Notice } from "./describe";
import type { GameEvent } from "./engine";

export interface CashChange {
  playerId: string;
  amount: number;
}

export interface Beat {
  /** Identificador estável: o `seq` do primeiro acontecimento. */
  key: number;
  /** Quem jogou (para o retrato e o foco da câmera). */
  actorId: string | null;
  /** Linhas narradas, em ordem. "Vez de…" não vira linha. */
  lines: Notice[];
  /** O lance começa uma nova vez. */
  startsTurn: boolean;
  /** Mudanças de saldo causadas por este lance. */
  cash: CashChange[];
  /** "result" para o fim da partida. */
  level: "info" | "result";
  /** Envolve quem está olhando (agiu, recebeu ou pagou). */
  involvesMe: boolean;
  /** Só "Vez de outra pessoa", sem nada acontecido ainda: não merece janela. */
  silent: boolean;
}

const actorOf = (event: GameEvent): string | null =>
  "playerId" in event ? event.playerId : event.type === "game-end" ? event.winnerId : null;

/**
 * Divide os acontecimentos novos em lances. Um lance começa numa nova vez, a
 * cada rolagem de dados (salvo logo depois do início da vez) e no fim da partida.
 * As mudanças de saldo vêm da comparação do dinheiro antes e depois, e ficam
 * com o último lance que tem acontecimentos (um "Vez de…" logo depois de uma
 * compra não causou a compra).
 */
export function buildBeats(
  events: GameEvent[],
  ctx: DescribeContext,
  cashBefore: Map<string, number>,
  cashAfter: Map<string, number>,
): Beat[] {
  const groups: GameEvent[][] = [];
  for (const event of events) {
    const current = groups.at(-1);
    const onlyPreamble = current?.every((item) => ["turn-start", "away", "back", "loan-due"].includes(item.type));
    const breaks =
      !current ||
      event.type === "turn-start" ||
      event.type === "game-start" ||
      event.type === "game-end" ||
      (event.type === "roll" && !onlyPreamble);
    if (breaks) groups.push([event]);
    else current.push(event);
  }

  const cash: CashChange[] = [];
  for (const [playerId, after] of cashAfter) {
    const before = cashBefore.get(playerId);
    if (before !== undefined && before !== after) cash.push({ playerId, amount: after - before });
  }

  const hasLines = (group: GameEvent[]) => group.some((event) => event.type !== "turn-start");
  let cashOwner = groups.length - 1;
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    if (hasLines(groups[index])) {
      cashOwner = index;
      break;
    }
  }

  return groups.map((group, index) => {
    const lines = group.filter((event) => event.type !== "turn-start").map((event) => describeEvent(event, ctx));
    const startsTurn = group.some((event) => event.type === "turn-start");
    const actorId = actorOf(group[0]);
    const beatCash = index === cashOwner ? cash : [];
    const involvesMe =
      ctx.meId !== null && (actorId === ctx.meId || lines.some((line) => line.involvesMe) || beatCash.some((c) => c.playerId === ctx.meId));
    return {
      key: group[0].seq,
      actorId,
      lines,
      startsTurn,
      cash: beatCash,
      level: group.some((event) => event.type === "game-end") ? "result" : "info",
      involvesMe,
      silent: lines.length === 0 && beatCash.length === 0 && actorId !== ctx.meId,
    };
  });
}
