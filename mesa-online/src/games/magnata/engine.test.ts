import { describe, expect, it } from "vitest";
import { JAIL_INDEX, STARTING_CASH } from "./board";
import {
  applyMagnataAction,
  createMagnataGame,
  getPlayer,
  parseMagnataAction,
  rentFor,
  type MagnataAction,
  type MagnataState,
} from "./engine";

const SEATS = [
  { id: "ana", name: "Ana", color: "#f00" },
  { id: "bia", name: "Bia", color: "#0f0" },
];

/** Gera valores de rng que produzem exatamente os dados informados. */
function dice(...faces: number[]) {
  const queue = faces.map((face) => (face - 1) / 6 + 0.01);
  return () => {
    const next = queue.shift();
    if (next === undefined) throw new Error("Dados insuficientes no teste.");
    return next;
  };
}

function newGame(seats = SEATS): MagnataState {
  const game = createMagnataGame(seats, () => 0.999);
  // Ordem fixa e baralhos conhecidos deixam os testes independentes do embaralhamento.
  game.players.sort((a, b) => seats.findIndex((s) => s.id === a.id) - seats.findIndex((s) => s.id === b.id));
  game.currentPlayerId = seats[0].id;
  return game;
}

function act(state: MagnataState, playerId: string, action: MagnataAction, rng = dice()) {
  return applyMagnataAction(state, playerId, action, rng);
}

function own(state: MagnataState, playerId: string, ...tiles: number[]) {
  for (const tile of tiles) state.properties[tile].owner = playerId;
}

describe("criação", () => {
  it("distribui dinheiro inicial e deixa tudo à venda", () => {
    const game = createMagnataGame(SEATS, Math.random);
    expect(game.players.map((p) => p.cash)).toEqual([STARTING_CASH, STARTING_CASH]);
    expect(Object.values(game.properties).every((p) => p.owner === null)).toBe(true);
    expect(game.phase).toBe("roll");
  });

  it("exige de 2 a 6 jogadores", () => {
    expect(() => createMagnataGame(SEATS.slice(0, 1), Math.random)).toThrow();
  });
});

describe("turno básico", () => {
  it("move, oferece compra e encerra o turno", () => {
    let game = act(newGame(), "ana", { type: "roll" }, dice(2, 4));
    expect(getPlayer(game, "ana").position).toBe(6);
    expect(game.phase).toBe("buy");

    game = act(game, "ana", { type: "buy" });
    expect(game.properties[6].owner).toBe("ana");
    expect(getPlayer(game, "ana").cash).toBe(STARTING_CASH - 100);
    expect(game.phase).toBe("end");

    game = act(game, "ana", { type: "end-turn" });
    expect(game.currentPlayerId).toBe("bia");
  });

  it("recusa ação fora da vez", () => {
    expect(() => act(newGame(), "bia", { type: "roll" }, dice(1, 2))).toThrow("Aguarde a sua vez.");
  });

  it("dupla dá nova jogada e três duplas levam à prisão", () => {
    let game = act(newGame(), "ana", { type: "roll" }, dice(3, 3));
    game = act(game, "ana", { type: "decline" });
    expect(game.phase).toBe("roll");
    game = act(game, "ana", { type: "roll" }, dice(2, 2));
    game = act(game, "ana", { type: "roll" }, dice(1, 1));
    expect(getPlayer(game, "ana")).toMatchObject({ inJail: true, position: JAIL_INDEX });
    expect(game.phase).toBe("end");
  });

  it("paga salário ao passar pela Partida", () => {
    const game = newGame();
    getPlayer(game, "ana").position = 38;
    const next = act(game, "ana", { type: "roll" }, dice(1, 2));
    expect(getPlayer(next, "ana").position).toBe(1);
    expect(getPlayer(next, "ana").cash).toBe(STARTING_CASH + 200);
  });
});

describe("aluguel", () => {
  it("cobra aluguel simples, dobrado com a cor completa e com casas", () => {
    const game = newGame();
    own(game, "bia", 1);
    expect(rentFor(game, 1, 7)).toBe(2);
    own(game, "bia", 3);
    expect(rentFor(game, 1, 7)).toBe(4);
    game.properties[1].houses = 2;
    expect(rentFor(game, 1, 7)).toBe(30);
  });

  it("transfere o aluguel para o dono", () => {
    const game = newGame();
    own(game, "bia", 5, 15);
    const next = act(game, "ana", { type: "roll" }, dice(2, 3));
    expect(getPlayer(next, "ana").cash).toBe(STARTING_CASH - 50);
    expect(getPlayer(next, "bia").cash).toBe(STARTING_CASH + 50);
  });

  it("companhias cobram pelo valor dos dados", () => {
    const game = newGame();
    own(game, "bia", 12);
    game.players[0].position = 7;
    const next = act(game, "ana", { type: "roll" }, dice(2, 3));
    expect(getPlayer(next, "ana").cash).toBe(STARTING_CASH - 20);
  });

  it("propriedade hipotecada não cobra aluguel", () => {
    const game = newGame();
    own(game, "bia", 6);
    game.properties[6].mortgaged = true;
    const next = act(game, "ana", { type: "roll" }, dice(2, 4));
    expect(getPlayer(next, "ana").cash).toBe(STARTING_CASH);
  });
});

describe("construções e hipotecas", () => {
  it("exige a cor completa e construção uniforme", () => {
    let game = newGame();
    own(game, "ana", 1);
    expect(() => act(game, "ana", { type: "build", tile: 1 })).toThrow("todas as ruas");
    own(game, "ana", 3);
    game = act(game, "ana", { type: "build", tile: 1 });
    expect(game.properties[1].houses).toBe(1);
    expect(() => act(game, "ana", { type: "build", tile: 1 })).toThrow("uniforme");
    game = act(game, "ana", { type: "build", tile: 3 });
    expect(getPlayer(game, "ana").cash).toBe(STARTING_CASH - 100);
  });

  it("impede hipoteca com casas na cor e devolve metade do preço", () => {
    let game = newGame();
    own(game, "ana", 1, 3);
    game.properties[3].houses = 1;
    expect(() => act(game, "ana", { type: "mortgage", tile: 1 })).toThrow("Venda as construções");
    game = act(game, "ana", { type: "sell-building", tile: 3 });
    expect(getPlayer(game, "ana").cash).toBe(STARTING_CASH + 25);
    game = act(game, "ana", { type: "mortgage", tile: 1 });
    expect(getPlayer(game, "ana").cash).toBe(STARTING_CASH + 55);
    game = act(game, "ana", { type: "unmortgage", tile: 1 });
    expect(getPlayer(game, "ana").cash).toBe(STARTING_CASH + 55 - 33);
  });
});

describe("prisão", () => {
  it("após três tentativas sem dupla paga a fiança e anda", () => {
    let game = newGame();
    Object.assign(getPlayer(game, "ana"), { inJail: true, position: JAIL_INDEX, jailTurns: 2 });
    game = act(game, "ana", { type: "roll" }, dice(1, 2));
    expect(getPlayer(game, "ana")).toMatchObject({ inJail: false, position: 13, cash: STARTING_CASH - 50 });
    expect(game.phase).toBe("buy");
  });

  it("dupla na prisão liberta sem nova jogada", () => {
    let game = newGame();
    Object.assign(getPlayer(game, "ana"), { inJail: true, position: JAIL_INDEX });
    game = act(game, "ana", { type: "roll" }, dice(4, 4));
    game = act(game, "ana", { type: "decline" });
    expect(getPlayer(game, "ana").position).toBe(18);
    expect(game.phase).toBe("end");
  });

  it("carta de liberdade fica com o jogador até ser usada", () => {
    let game = newGame();
    game.decks.sorte = ["sorte-liberdade", ...game.decks.sorte.filter((id) => id !== "sorte-liberdade")];
    game = act(game, "ana", { type: "roll" }, dice(3, 4));
    expect(getPlayer(game, "ana").jailCards).toEqual(["sorte"]);
    expect(game.decks.sorte).not.toContain("sorte-liberdade");

    Object.assign(getPlayer(game, "ana"), { inJail: true, position: JAIL_INDEX });
    game.phase = "roll";
    game = act(game, "ana", { type: "use-jail-card" });
    expect(getPlayer(game, "ana")).toMatchObject({ inJail: false, jailCards: [] });
    expect(game.decks.sorte.at(-1)).toBe("sorte-liberdade");
  });
});

describe("dívidas e falência", () => {
  it("bloqueia o turno até a dívida ser paga", () => {
    let game = newGame();
    own(game, "bia", 39);
    own(game, "ana", 1);
    game.properties[39].houses = 5;
    getPlayer(game, "ana").cash = 1980;
    getPlayer(game, "ana").position = 33;
    game = act(game, "ana", { type: "roll" }, dice(3, 3));
    expect(game.phase).toBe("debt");
    expect(game.debt?.amount).toBe(2000);
    expect(() => act(game, "ana", { type: "end-turn" })).toThrow();

    game = act(game, "ana", { type: "mortgage", tile: 1 });
    game = act(game, "ana", { type: "pay-debt" });
    expect(getPlayer(game, "ana").cash).toBe(10);
    expect(getPlayer(game, "bia").cash).toBe(STARTING_CASH + 2000);
    // A dupla ainda dá direito a jogar de novo.
    expect(game.phase).toBe("roll");
  });

  it("falência para outro jogador entrega os bens e encerra a partida", () => {
    let game = newGame();
    own(game, "bia", 39);
    own(game, "ana", 1);
    game.properties[39].houses = 5;
    getPlayer(game, "ana").position = 33;
    game = act(game, "ana", { type: "roll" }, dice(2, 4));
    expect(game.phase).toBe("debt");
    game = act(game, "ana", { type: "declare-bankruptcy" });
    expect(game.properties[1].owner).toBe("bia");
    expect(game.phase).toBe("finished");
    expect(game.winnerId).toBe("bia");
  });

  it("desistência devolve os bens ao banco e passa a vez", () => {
    const seats = [...SEATS, { id: "caio", name: "Caio", color: "#00f" }];
    let game = newGame(seats);
    own(game, "ana", 1, 3);
    game = act(game, "ana", { type: "resign" });
    expect(game.properties[1].owner).toBeNull();
    expect(game.currentPlayerId).toBe("bia");
    expect(game.phase).toBe("roll");

    game = act(game, "caio", { type: "resign" });
    expect(game.winnerId).toBe("bia");
  });
});

describe("parseMagnataAction", () => {
  it("aceita apenas ações conhecidas e casas válidas", () => {
    expect(parseMagnataAction({ type: "roll" })).toEqual({ type: "roll" });
    expect(parseMagnataAction({ type: "build", tile: 3 })).toEqual({ type: "build", tile: 3 });
    expect(parseMagnataAction({ type: "build", tile: 40 })).toBeNull();
    expect(parseMagnataAction({ type: "hack" })).toBeNull();
    expect(parseMagnataAction("roll")).toBeNull();
  });
});
