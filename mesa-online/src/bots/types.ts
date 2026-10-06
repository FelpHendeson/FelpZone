import type { MagnataAction, MagnataState, Rng } from "@/games/magnata/engine";

export type BotKind = "investidor" | "conservador" | "colecionador";

export interface BotContext {
  state: MagnataState;
  me: string;
  /** Resultado de `legalActions(state, me)`. */
  legal: MagnataAction[];
  rng: Rng;
}

export interface BotStrategy {
  kind: BotKind;
  name: string;
  description: string;
  decide(ctx: BotContext): MagnataAction;
}
