// Armas, fornecedores e eventos (eras Bairro e Cidade). Preços na escala da era (× cfg.price).

// power: força de um soldado armado com ela (desarmado = 1). heat: visada por unidade guardada.
// ammo: custo de munição por unidade por dia. minEra: primeira era em que aparece.
export const WEAPONS = {
  faca:     { label: 'Faca e taco', icon: '🔪', power: 1.2, heat: 0,    ammo: 0,  minEra: 'bairro' },
  pistola:  { label: 'Pistola',     icon: '🔫', power: 1.5, heat: 0.12, ammo: 3,  minEra: 'bairro' },
  escopeta: { label: 'Escopeta',    icon: '💥', power: 1.8, heat: 0.2,  ammo: 5,  minEra: 'bairro' },
  fuzil:    { label: 'Fuzil',       icon: '🎯', power: 2.2, heat: 0.35, ammo: 8,  minEra: 'cidade' },
};
export const WEAPON_ORDER = ['fuzil', 'escopeta', 'pistola', 'faca'];   // as melhores vão primeiro pra mão de alguém
export const BASE_STORAGE = 20;                                         // espaço do arsenal sem depósito

// Cada fornecedor: preço por arma, risco de a compra ser rastreada (visada +15) e um bordão.
export const SUPPLIERS = {
  ademir:   { name: 'Seu Ademir do ferro-velho', icon: '🧔', era: ['bairro', 'cidade'], risk: 0,
              prices: { faca: 40 }, line: 'Faca, taco, cano de ferro... tudo que não faz barulho.' },
  primo:    { name: 'Primo do Paraguai',          icon: '🧢', era: ['bairro', 'cidade'], risk: 0.15,
              prices: { pistola: 260 }, line: 'Preço bom, mas não me pergunta de onde vem.' },
  sargento: { name: 'Sargento Reformado',         icon: '🎖️', era: ['bairro', 'cidade'], risk: 0.05,
              prices: { pistola: 340, escopeta: 520 }, line: 'Material de qualidade, discreto. Custa caro.' },
  porto:    { name: 'Contato do Porto',           icon: '⚓', era: ['cidade'], risk: 0.2,
              prices: { escopeta: 450, fuzil: 900 }, line: 'Chegou container. Quem paga primeiro leva.' },
};

// Eventos nos pontos: custo, onde pode, efeito imediato e bônus temporário.
export const EVENTS = {
  bailao:    { label: 'Bailão',             icon: '🔊', cost: 500, action: true,  where: ['campinho', 'inferninho', 'bar', 'hq'],
               desc: '+6 respeito e +3 recrutamentos por dia durante 3 dias. Visada +10.',
               respect: 6, heat: 10, buff: { recruit: 3, days: 3 } },
  racha:     { label: 'Racha de motos',     icon: '🏍️', cost: 300, action: true,  where: ['desmanche', 'fliperama'],
               desc: '+4 respeito e XP pro Comandante. Visada +6. Às vezes alguém se machuca.',
               respect: 4, heat: 6, xp: 10, risk: 0.2 },
  churrasco: { label: 'Churrasco do bonde', icon: '🍖', cost: 400, action: false, where: ['hq'],
               desc: '+8 de lealdade pra todo o bonde. Sem risco.', loyalty: 8 },
  social:    { label: 'Ação social',        icon: '🤲', cost: 600, action: true,  where: ['hq', 'campinho', 'bar'],
               desc: 'Visada −20 e a polícia pega leve por 2 dias. −2 respeito (tem rival que acha frouxo).',
               respect: -2, heat: -20, buff: { calm: true, days: 2 } },
};
