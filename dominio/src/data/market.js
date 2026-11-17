// Mercado das bocas e atrações dos inferninhos (eras Bairro e Cidade). Produtos fictícios genéricos.

// mult: renda da boca; heat: multiplica a visada da boca; swing: quanto a demanda oscila.
export const PRODUCTS = {
  erva:      { label: 'Erva',      icon: '🌿', mult: 0.85, heat: 0.7, swing: 0.05, desc: 'Margem baixa, pouca atenção da polícia, demanda estável.' },
  po:        { label: 'Pó',        icon: '❄️', mult: 1.2,  heat: 1.2, swing: 0.1,  desc: 'Lucro bom, visada alta. O clássico da rua.' },
  sintetico: { label: 'Sintético', icon: '💠', mult: 1.5,  heat: 1.5, swing: 0.25, desc: 'Lucro alto, visada muito alta e demanda que sobe e desce.' },
};

// cost: por boca por dia (escala da era); quality multiplica a renda; risk: chance de apreensão por dia.
export const MARKET_SUPPLIERS = {
  local:  { label: 'Fornecedor do morro', icon: '🏚️', cost: 15, quality: 0.9, risk: 0,    desc: 'Barato e garantido. Produto meia-boca.' },
  porto:  { label: 'Contato do porto',    icon: '⚓', cost: 35, quality: 1.1, risk: 0.04, desc: 'Produto bom. De vez em quando a carga cai.' },
  cartel: { label: 'O Cartel',            icon: '🦂', cost: 70, quality: 1.3, risk: 0.08, desc: 'O melhor produto da cidade. Quando cai, cai feio.' },
};

// income: renda das suas bocas; rival: renda das bocas rivais (fregueses migram); respect: por dia.
export const PRICES = {
  barato: { label: 'Barato', icon: '⬇️', income: 0.85, rival: 0.8,  respect: 0,  anger: true,
            desc: 'Rouba freguês dos rivais (−20% na renda deles), mas eles ficam com raiva.' },
  justo:  { label: 'Justo',  icon: '⚖️', income: 1,    rival: 1,    respect: 0,  desc: 'Preço de mercado. Ninguém reclama.' },
  caro:   { label: 'Caro',   icon: '⬆️', income: 1.2,  rival: 1.1,  respect: -1, desc: '+20% de margem; perde freguês pros rivais e −1 de respeito por dia.' },
};

// Atração da semana em todos os seus inferninhos.
export const ATTRACTIONS = {
  dj:       { label: 'DJ da quebrada', icon: '🎧', income: 1,   resp: 1, heat: 0,  intel: false, desc: '+1 de respeito por inferninho.' },
  show:     { label: 'Show ao vivo',   icon: '🎤', income: 1.3, resp: 0, heat: 1,  intel: false, desc: '+30% de renda, +1 de visada por inferninho.' },
  tematica: { label: 'Noite temática', icon: '🎭', income: 0.9, resp: 0, heat: -1, intel: true,  desc: 'Menos visada e boatos mesmo com o ponto parado.' },
};

// Eventos de mercado (sorteados de vez em quando): multiplicam a demanda de um produto (ou de todos).
export const MARKET_EVENTS = [
  { key: 'carga',   text: '🚢 Chegou carregamento grande no porto: o sintético ficou barato e a demanda caiu.', product: 'sintetico', mult: 0.7, days: 4 },
  { key: 'seca',    text: '🚔 Operação policial secou a praça: quem tem produto vende caro.', product: null, mult: 1.3, days: 3 },
  { key: 'festa',   text: '🎉 Festa grande no fim de semana: todo mundo quer pó.', product: 'po', mult: 1.35, days: 2 },
  { key: 'moda',    text: '🌿 Virou moda a erva "artesanal": demanda em alta.', product: 'erva', mult: 1.4, days: 4 },
  { key: 'guerra',  text: '💥 Guerra de preço entre rivais: todo mundo vendendo menos.', product: null, mult: 0.8, days: 3 },
];

export const DEFAULT_MARKET = { product: 'po', supplier: 'local', price: 'justo', attraction: 'dj', event: null };
