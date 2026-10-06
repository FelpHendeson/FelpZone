// Transforma acontecimentos estruturados em texto para a mesa, no tema da
// partida. Puro: usado pelos avisos, pelo histórico e pelos testes.

import { BOARD } from "./board";
import { DECKS } from "./cards";
import { money, type GameEvent } from "./engine";
import { tileNameIn, type Theme } from "./themes";

export type NoticeLevel = "quick" | "card" | "result";
export type NoticeTone = "neutral" | "good" | "bad" | "info";

export interface Notice {
  seq: number;
  type: GameEvent["type"];
  icon: string;
  title: string;
  text: string;
  level: NoticeLevel;
  tone: NoticeTone;
  /** Quem fez a ação (para mostrar o retrato). */
  actorId: string | null;
  /** A pessoa que está olhando foi afetada? */
  involvesMe: boolean;
}

export interface DescribeContext {
  theme: Theme;
  /** Nome e retrato por playerId. */
  people: Map<string, { name: string; avatar: string }>;
  meId: string | null;
}

export function cardText(deck: "sorte" | "surpresa", cardId: string, theme: Theme): string {
  const card = DECKS[deck].find((candidate) => candidate.id === cardId);
  if (!card) return "";
  const target = card.effect.type === "move-to" ? tileNameIn(theme, card.effect.tile) : "";
  return card.text.replace("{casa}", target);
}

export function describeEvent(event: GameEvent, ctx: DescribeContext): Notice {
  const name = (id: string | null | undefined) => (id ? (ctx.people.get(id)?.name ?? "Alguém") : ctx.theme.bank);
  const tile = (index: number) => tileNameIn(ctx.theme, index);
  const theBank = `o ${ctx.theme.bank.toLowerCase()}`;
  /** "a Bia" ou "ao banco". */
  const to = (id: string | null) => (id ? `a ${name(id)}` : `a${theBank}`);
  const base = { seq: event.seq, type: event.type };
  const involves = (...ids: (string | null | undefined)[]) => ctx.meId !== null && ids.includes(ctx.meId);

  switch (event.type) {
    case "game-start":
      return {
        ...base,
        icon: "🎲",
        title: "A partida começou",
        text: `Ordem da mesa: ${event.order.map((id) => name(id)).join(", ")}.`,
        level: "card",
        tone: "info",
        actorId: null,
        involvesMe: true,
      };
    case "turn-start":
      return {
        ...base,
        icon: "▶️",
        title: involves(event.playerId) ? "Sua vez!" : `Vez de ${name(event.playerId)}`,
        text: "",
        level: "quick",
        tone: "info",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "roll":
      return {
        ...base,
        icon: "🎲",
        title: `${name(event.playerId)} tirou ${event.dice[0]} e ${event.dice[1]}`,
        text: event.doubles ? "Dupla!" : "",
        level: "quick",
        tone: "neutral",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "move":
      return {
        ...base,
        icon: "🚶",
        title: `${name(event.playerId)} foi para ${tile(event.to)}`,
        text: event.via === "card" ? "Por causa de uma carta." : "",
        level: "quick",
        tone: "neutral",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "salary":
      return {
        ...base,
        icon: "💵",
        title: `${name(event.playerId)} passou pela Partida`,
        text: `Recebeu ${money(event.amount)}.`,
        level: "quick",
        tone: "good",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "buy":
      return {
        ...base,
        icon: "🏠",
        title: "Compra",
        text: `${name(event.playerId)} comprou ${tile(event.tile)} por ${money(event.price)}.`,
        level: "card",
        tone: "good",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "decline":
      return {
        ...base,
        icon: "✋",
        title: `${name(event.playerId)} não comprou ${tile(event.tile)}`,
        text: "A casa continua à venda.",
        level: "quick",
        tone: "neutral",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "rent": {
      const reasons = {
        base: "aluguel simples",
        group: "aluguel dobrado: o dono tem a cor completa",
        houses: "aluguel com construções",
        stations: "conforme o número de estações do dono",
        utility: "conforme o valor dos dados",
      } as const;
      return {
        ...base,
        icon: "💸",
        title: "Aluguel",
        text: `${name(event.playerId)} parou em ${tile(event.tile)}, de ${name(event.ownerId)}, e pagou ${money(event.amount)} (${reasons[event.basis]}).`,
        level: "card",
        tone: involves(event.ownerId) ? "good" : "bad",
        actorId: event.playerId,
        involvesMe: involves(event.playerId, event.ownerId),
      };
    }
    case "rent-waived":
      return {
        ...base,
        icon: "🛡️",
        title: "Sem aluguel",
        text: `${tile(event.tile)}, de ${name(event.ownerId)}, está hipotecada. ${name(event.playerId)} não pagou nada.`,
        level: "card",
        tone: "neutral",
        actorId: event.playerId,
        involvesMe: involves(event.playerId, event.ownerId),
      };
    case "tax":
      return {
        ...base,
        icon: "🧾",
        title: "Imposto",
        text: `${name(event.playerId)} pagou ${money(event.amount)} de ${tile(event.tile)}.`,
        level: "card",
        tone: "bad",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "card":
      return {
        ...base,
        icon: event.deck === "sorte" ? "❓" : "🎁",
        title: event.deck === "sorte" ? "Sorte" : "Surpresa",
        text: `${name(event.playerId)}: ${cardText(event.deck, event.cardId, ctx.theme)}`,
        level: "card",
        tone: "info",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "card-money":
      return {
        ...base,
        icon: event.amount >= 0 ? "💰" : "🧾",
        title: `${name(event.playerId)} ${event.amount >= 0 ? "recebeu" : "pagou"} ${money(Math.abs(event.amount))}`,
        text: "",
        level: "quick",
        tone: event.amount >= 0 ? "good" : "bad",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "jail": {
      const reasons = {
        tile: "caiu em Vá para a Prisão",
        card: "tirou uma carta que manda para a prisão",
        doubles: "tirou três duplas seguidas",
      } as const;
      return {
        ...base,
        icon: "🔒",
        title: "Prisão",
        text: `${name(event.playerId)} ${reasons[event.reason]} e foi para a prisão.`,
        level: "card",
        tone: "bad",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    }
    case "jail-stay":
      return {
        ...base,
        icon: "🔒",
        title: `${name(event.playerId)} continua na prisão`,
        text: `Tentativa ${event.attempt} de 3.`,
        level: "quick",
        tone: "neutral",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "jail-release": {
      const how = {
        doubles: "tirou dupla e saiu da prisão",
        fine: `pagou ${money(event.amount)} de fiança e saiu da prisão`,
        card: "usou a carta de liberdade",
        served: `cumpriu a pena e paga ${money(event.amount)} para sair`,
      } as const;
      return {
        ...base,
        icon: "🔓",
        title: "Liberdade",
        text: `${name(event.playerId)} ${how[event.method]}.`,
        level: "card",
        tone: "neutral",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    }
    case "build":
      return {
        ...base,
        icon: event.houses === 5 ? "🏨" : "🏗️",
        title: "Construção",
        text: `${name(event.playerId)} construiu ${event.houses === 5 ? "um hotel" : "uma casa"} em ${tile(event.tile)} por ${money(event.amount)}.`,
        level: "card",
        tone: "good",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "sell-building":
      return {
        ...base,
        icon: "🔨",
        title: "Venda de construção",
        text: `${name(event.playerId)} vendeu uma construção em ${tile(event.tile)} e recebeu ${money(event.amount)}.`,
        level: "card",
        tone: "neutral",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "mortgage":
      return {
        ...base,
        icon: "🏦",
        title: "Hipoteca",
        text: `${name(event.playerId)} hipotecou ${tile(event.tile)} e recebeu ${money(event.amount)}. Enquanto isso, ela não cobra aluguel.`,
        level: "card",
        tone: "neutral",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "unmortgage":
      return {
        ...base,
        icon: "🏦",
        title: "Hipoteca quitada",
        text: `${name(event.playerId)} pagou ${money(event.amount)} e ${tile(event.tile)} voltou a cobrar aluguel.`,
        level: "card",
        tone: "good",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "debt":
      return {
        ...base,
        icon: "⚠️",
        title: "Dívida",
        text: `${name(event.playerId)} deve ${money(event.amount)} ${to(event.creditorId)} e precisa levantar ${money(event.shortfall)}. Pode vender construções ou hipotecar.`,
        level: "card",
        tone: "bad",
        actorId: event.playerId,
        involvesMe: involves(event.playerId, event.creditorId),
      };
    case "debt-paid":
      return {
        ...base,
        icon: "✅",
        title: "Dívida paga",
        text: `${name(event.playerId)} pagou ${money(event.amount)} ${to(event.creditorId)}.`,
        level: "card",
        tone: "good",
        actorId: event.playerId,
        involvesMe: involves(event.playerId, event.creditorId),
      };
    case "bankrupt":
      return {
        ...base,
        icon: event.resigned ? "🏳️" : "💥",
        title: event.resigned ? "Desistência" : "Falência",
        text: `${name(event.playerId)} saiu da partida. ${event.creditorId ? `Os bens foram para ${name(event.creditorId)}.` : `Os bens voltaram para ${theBank}.`}`,
        level: "card",
        tone: "bad",
        actorId: event.playerId,
        involvesMe: involves(event.playerId, event.creditorId),
      };
    case "loan-taken":
      return {
        ...base,
        icon: "🏦",
        title: "Empréstimo",
        text: `${name(event.playerId)} pegou ${money(event.amount)} com ${theBank} e vai devolver ${money(event.due)} em ${event.turns} turnos.`,
        level: "card",
        tone: "info",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "loan-repaid":
      return {
        ...base,
        icon: "✅",
        title: "Empréstimo quitado",
        text: event.early
          ? `${name(event.playerId)} quitou o empréstimo antes do prazo (${money(event.amount)}).`
          : `${name(event.playerId)} pagou o empréstimo vencido (${money(event.amount)}).`,
        level: "card",
        tone: "good",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "loan-due":
      return {
        ...base,
        icon: "⏰",
        title: "Empréstimo venceu",
        text: `${name(event.playerId)} precisa devolver ${money(event.amount)} antes de jogar.`,
        level: "card",
        tone: "bad",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "away":
      return {
        ...base,
        icon: "💤",
        title: "Ausência",
        text: `${name(event.playerId)} não jogou a tempo. O piloto automático joga até a pessoa voltar.`,
        level: "card",
        tone: "info",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "back":
      return {
        ...base,
        icon: "👋",
        title: `${name(event.playerId)} voltou`,
        text: "",
        level: "quick",
        tone: "info",
        actorId: event.playerId,
        involvesMe: involves(event.playerId),
      };
    case "game-end": {
      const why =
        event.reason === "bankruptcy"
          ? "Todos os outros faliram ou desistiram."
          : `Acabaram as ${event.reason === "round-limit" ? "rodadas" : "jogadas"}. Venceu o maior patrimônio${event.netWorth !== null ? `: ${money(event.netWorth)}` : ""}.`;
      return {
        ...base,
        icon: "🏆",
        title: involves(event.winnerId) ? "Você venceu!" : `${name(event.winnerId)} venceu!`,
        text: why,
        level: "result",
        tone: "good",
        actorId: event.winnerId,
        involvesMe: true,
      };
    }
  }
}

/** Texto curto de uma casa para o cartão de "onde a pessoa parou". */
export function tileKindLabel(index: number): string {
  const tile = BOARD[index];
  switch (tile.kind) {
    case "street":
      return "Rua";
    case "station":
      return "Estação";
    case "utility":
      return "Companhia";
    case "tax":
      return "Imposto";
    case "card":
      return "Carta";
    default:
      return "Casa especial";
  }
}
