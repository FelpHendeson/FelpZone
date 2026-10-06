import type { DeckId } from "./board";

export type CardEffect =
  | { type: "collect"; amount: number }
  | { type: "pay"; amount: number }
  | { type: "move-to"; tile: number }
  | { type: "move-back"; steps: number }
  | { type: "go-to-jail" }
  | { type: "jail-card" }
  | { type: "repairs"; perHouse: number; perHotel: number };

export interface Card {
  id: string;
  text: string;
  effect: CardEffect;
}

export const DECKS: Record<DeckId, readonly Card[]> = {
  sorte: [
    { id: "sorte-partida", text: "Avance até a Partida e receba $200.", effect: { type: "move-to", tile: 0 } },
    { id: "sorte-horizonte", text: "Vá até a Av. Horizonte.", effect: { type: "move-to", tile: 24 } },
    { id: "sorte-matriz", text: "Passeio pela Praça da Matriz.", effect: { type: "move-to", tile: 11 } },
    { id: "sorte-norte", text: "Embarque na Estação Norte.", effect: { type: "move-to", tile: 5 } },
    { id: "sorte-diamante", text: "Visite a Av. Diamante.", effect: { type: "move-to", tile: 39 } },
    { id: "sorte-dividendos", text: "O banco paga dividendos de $50.", effect: { type: "collect", amount: 50 } },
    { id: "sorte-emprestimo", text: "Seu empréstimo para construção venceu. Receba $150.", effect: { type: "collect", amount: 150 } },
    { id: "sorte-liberdade", text: "Saia livre da prisão. Guarde esta carta até usá-la.", effect: { type: "jail-card" } },
    { id: "sorte-volte", text: "Volte três casas.", effect: { type: "move-back", steps: 3 } },
    { id: "sorte-prisao", text: "Vá direto para a prisão, sem passar pela Partida.", effect: { type: "go-to-jail" } },
    { id: "sorte-reformas", text: "Reformas gerais: pague $25 por casa e $100 por hotel.", effect: { type: "repairs", perHouse: 25, perHotel: 100 } },
    { id: "sorte-multa", text: "Multa por excesso de velocidade: pague $15.", effect: { type: "pay", amount: 15 } },
  ],
  surpresa: [
    { id: "surpresa-partida", text: "Avance até a Partida e receba $200.", effect: { type: "move-to", tile: 0 } },
    { id: "surpresa-erro", text: "Erro do banco a seu favor. Receba $200.", effect: { type: "collect", amount: 200 } },
    { id: "surpresa-medico", text: "Consulta médica: pague $50.", effect: { type: "pay", amount: 50 } },
    { id: "surpresa-acoes", text: "Você vendeu ações. Receba $50.", effect: { type: "collect", amount: 50 } },
    { id: "surpresa-liberdade", text: "Saia livre da prisão. Guarde esta carta até usá-la.", effect: { type: "jail-card" } },
    { id: "surpresa-prisao", text: "Vá direto para a prisão, sem passar pela Partida.", effect: { type: "go-to-jail" } },
    { id: "surpresa-ferias", text: "Seu fundo de férias rendeu. Receba $100.", effect: { type: "collect", amount: 100 } },
    { id: "surpresa-restituicao", text: "Restituição do imposto de renda. Receba $20.", effect: { type: "collect", amount: 20 } },
    { id: "surpresa-hospital", text: "Despesas hospitalares: pague $100.", effect: { type: "pay", amount: 100 } },
    { id: "surpresa-escola", text: "Mensalidade escolar: pague $50.", effect: { type: "pay", amount: 50 } },
    { id: "surpresa-consultoria", text: "Você prestou uma consultoria. Receba $25.", effect: { type: "collect", amount: 25 } },
    { id: "surpresa-ruas", text: "Conserto de ruas: pague $40 por casa e $115 por hotel.", effect: { type: "repairs", perHouse: 40, perHotel: 115 } },
    { id: "surpresa-concurso", text: "Segundo lugar num concurso de culinária. Receba $10.", effect: { type: "collect", amount: 10 } },
    { id: "surpresa-heranca", text: "Você recebeu uma herança de $100.", effect: { type: "collect", amount: 100 } },
  ],
};

export function findCard(deck: DeckId, id: string): Card {
  const card = DECKS[deck].find((candidate) => candidate.id === id);
  if (!card) throw new Error(`Carta desconhecida: ${id}`);
  return card;
}
