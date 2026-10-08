// Peças comuns a todos os motores de jogo.

/** Aleatoriedade injetada: o servidor usa a criptográfica; os testes, uma semente. */
export type Rng = () => number;

/** Jogada que as regras não permitem; a mensagem vai para quem tentou. */
export class GameRuleError extends Error {}
