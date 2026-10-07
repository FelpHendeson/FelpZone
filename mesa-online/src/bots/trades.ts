// Como os robôs avaliam leilões e trocas. Puro: só olha o estado.

import { BOARD, groupTiles, type OwnableTile } from "@/games/magnata/board";
import { getPlayer, type MagnataView, type Rng, type Trade, type TradeSide } from "@/games/magnata/engine";

const price = (tile: number) => (BOARD[tile] as OwnableTile).price;
const round10 = (value: number) => Math.max(0, Math.floor(value / 10) * 10);

/** Dono de cada casa depois de aplicar uma troca hipotética. */
function ownersAfter(state: MagnataView, trade?: { fromId: string; toId: string; give: TradeSide; get: TradeSide }) {
  const owners = new Map<number, string | null>();
  for (const [index, property] of Object.entries(state.properties)) owners.set(Number(index), property.owner);
  if (trade) {
    for (const tile of trade.give.tiles) owners.set(tile, trade.toId);
    for (const tile of trade.get.tiles) owners.set(tile, trade.fromId);
  }
  return owners;
}

/** A pessoa fica com a cor completa da rua `tile` com esses donos? */
function completes(owners: Map<number, string | null>, playerId: string, tile: number): boolean {
  const info = BOARD[tile];
  return info.kind === "street" && groupTiles(info.group).every((index) => owners.get(index) === playerId);
}

/**
 * "Força" de alguém no tabuleiro: valor das propriedades (hipotecadas pela
 * metade) mais um bônus igual ao preço total de cada cor completa.
 */
function strength(state: MagnataView, owners: Map<number, string | null>, playerId: string): number {
  let total = 0;
  const groups = new Set<string>();
  for (const [index, owner] of owners) {
    if (owner !== playerId) continue;
    total += price(index) * (state.properties[index].mortgaged ? 0.5 : 1);
    const info = BOARD[index];
    if (info.kind === "street") groups.add(info.group);
  }
  for (const group of groups) {
    const tiles = groupTiles(group as Parameters<typeof groupTiles>[0]);
    if (tiles.every((tile) => owners.get(tile) === playerId)) total += tiles.reduce((sum, tile) => sum + price(tile), 0);
  }
  return total;
}

/**
 * Saldo de uma proposta para quem a recebe: quanto ela fica mais forte (com o
 * dinheiro) menos uma fração (`rivalWeight`) do quanto o rival fica mais forte.
 */
export function tradeValueFor(state: MagnataView, me: string, trade: Trade, rivalWeight: number): number {
  const before = ownersAfter(state);
  const after = ownersAfter(state, trade);
  const other = trade.fromId === me ? trade.toId : trade.fromId;
  const cashToMe = trade.toId === me ? trade.give.cash - trade.get.cash : trade.get.cash - trade.give.cash;
  const mine = strength(state, after, me) - strength(state, before, me) + cashToMe;
  const theirs = strength(state, after, other) - strength(state, before, other) - cashToMe;
  return mine - rivalWeight * theirs;
}

/**
 * Proposta para completar uma cor quando falta uma única rua e ela é de outra
 * pessoa. Prefere a troca em que os dois completam uma cor; senão oferece
 * dinheiro que compense o rival. No máximo uma proposta a cada 4 rodadas.
 */
export function findProposal(state: MagnataView, me: string, reserve: number): Trade | null {
  const proposedRecently = state.events.some(
    (event) => event.type === "trade-proposed" && event.playerId === me && state.round - event.round < 4,
  );
  if (proposedRecently) return null;
  const player = getPlayer(state, me);
  const owners = ownersAfter(state);
  const nearlyComplete = (playerId: string) => {
    const result: { target: number; group: number[] }[] = [];
    const seen = new Set<string>();
    for (const [index, owner] of owners) {
      const info = BOARD[index];
      if (owner !== playerId || info.kind !== "street" || seen.has(info.group)) continue;
      seen.add(info.group);
      const tiles = groupTiles(info.group);
      const missing = tiles.filter((tile) => owners.get(tile) !== playerId);
      if (missing.length === 1 && tiles.every((tile) => state.properties[tile].houses === 0)) result.push({ target: missing[0], group: tiles });
    }
    return result;
  };

  for (const { target, group } of nearlyComplete(me)) {
    const ownerId = owners.get(target);
    if (!ownerId || ownerId === me || getPlayer(state, ownerId).bankrupt) continue;
    // Troca mútua: tenho a rua que falta para o outro completar uma cor.
    const theirNeed = nearlyComplete(ownerId).find(({ target: tile }) => owners.get(tile) === me && !group.includes(tile));
    if (theirNeed) {
      const balance = Math.max(0, round10(price(target) - price(theirNeed.target)));
      if (player.cash - balance >= reserve) {
        return {
          fromId: me,
          toId: ownerId,
          give: { tiles: [theirNeed.target], cash: balance },
          get: { tiles: [target], cash: 0 },
          resumePhase: "roll",
        };
      }
    }
    // Só dinheiro: o preço da rua mais parte do valor da cor que eu ganho.
    const offer = round10(price(target) + 0.45 * group.reduce((sum, tile) => sum + price(tile), 0));
    if (offer > 0 && player.cash - offer >= reserve) {
      return { fromId: me, toId: ownerId, give: { tiles: [], cash: offer }, get: { tiles: [target], cash: 0 }, resumePhase: "roll" };
    }
  }
  return null;
}

/** Lance de leilão: o quanto a casa vale para este estilo, com uma variação pequena para evitar empates. */
export function auctionBid(state: MagnataView, me: string, tile: number, style: "investidor" | "conservador" | "colecionador", rng: Rng): number {
  const player = getPlayer(state, me);
  const owners = ownersAfter(state);
  owners.set(tile, me);
  const closes = completes(owners, me, tile);
  const info = BOARD[tile];
  const sameGroup = info.kind === "street" && groupTiles(info.group).some((index) => index !== tile && state.properties[index].owner === me);
  // Impede que outra pessoa complete a cor (ela tem todas as outras ruas do grupo).
  const others = info.kind === "street" ? groupTiles(info.group).filter((index) => index !== tile) : [];
  const rival = others.length ? state.properties[others[0]].owner : null;
  const blocks = rival !== null && rival !== me && others.every((index) => state.properties[index].owner === rival);
  let value: number;
  let reserve: number;
  if (style === "investidor") {
    value = price(tile) * (closes ? 1.4 : 1);
    reserve = 50;
  } else if (style === "conservador") {
    value = price(tile) * (closes ? 1 : 0.6);
    reserve = 300;
  } else {
    value = price(tile) * (closes || blocks ? 1.5 : sameGroup ? 0.9 : 0.5);
    reserve = 100;
  }
  const noise = 0.9 + rng() * 0.2;
  return round10(Math.min(player.cash - reserve, value * noise));
}
