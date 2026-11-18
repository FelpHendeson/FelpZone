import type { Estado } from '../tipos';

/** Textos do bestiário, revelados no primeiro abate. */
export const LORE_MONSTROS: Record<string, string> = {
  gosma:
    'Óleo velho, limalha e chuva ácida das nuvens: quando se juntam nos cantos da Ilha de Aço, ganham vontade própria. Comem metal e deixam ferrugem por onde passam.',
  lobo:
    'Lobos das pedreiras da Ilha de Aço que aprenderam a roer o minério das encostas. A pelagem endurece em placas cinzentas. Caçam em matilha e são rápidos.',
  harpia:
    'Moram no alto do Bosque Suspenso e mergulham das copas sobre quem anda pelas trilhas. Dizem que roubam brilhos para enfeitar os ninhos.',
  esqueleto:
    'Antigos guardas da primeira capital de Hope. Morreram em serviço e não perceberam. Ainda fazem a ronda, ainda pedem senha, ainda atacam quem não sabe responder.',
  espectro:
    'Restos de magia antiga das Ruínas que tomaram forma. Atravessam escudos e atingem todos de uma vez, mas se desfazem diante da luz.',
  golem:
    'Rochas da Forja Vulcânica que a lava moldou em forma de guerreiro. Lentos, pesados e quase imunes ao fogo. O povo salamandrino os chama de “irmãos mais velhos”.',
  diabrete:
    'Pequenos espíritos de brasa que dançam sobre os rios de lava. Riem enquanto lançam chamas sobre a party inteira. Odeiam raízes e água.',
  sentinela:
    'Autômatos de pedra celeste que guardam a Cidadela das Nuvens há séculos. Ninguém sabe quem os construiu, nem quem eles ainda esperam.',
};

/** Marcos de abates de cada espécie e o dano extra permanente contra ela. */
export const MARCOS_BESTIARIO: { abates: number; bonus: number; texto: string }[] = [
  { abates: 1, bonus: 0, texto: 'Descoberto: lore revelada' },
  { abates: 10, bonus: 0, texto: 'Estudado: atributos, fraqueza e resistência' },
  { abates: 100, bonus: 5, texto: '+5% de dano contra a espécie' },
  { abates: 1000, bonus: 10, texto: '+10% de dano contra a espécie' },
  { abates: 5000, bonus: 15, texto: '+15% de dano contra a espécie' },
];

export function abatesDe(e: Estado, monstro: string): number {
  return e.estatisticas.bestiario?.[monstro]?.abates ?? 0;
}

/** Maior marco alcançado (índice em MARCOS_BESTIARIO), ou −1 se nunca derrotado. */
export function marcoAtual(abates: number): number {
  let i = -1;
  MARCOS_BESTIARIO.forEach((m, n) => {
    if (abates >= m.abates) i = n;
  });
  return i;
}

/** Dano extra (%) da party contra a espécie, pelo que já se sabe dela. */
export function bonusBestiario(e: Estado, monstro: string): number {
  const i = marcoAtual(abatesDe(e, monstro));
  return i < 0 ? 0 : MARCOS_BESTIARIO[i].bonus;
}
