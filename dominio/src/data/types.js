// Tipos de ponto do mapa.
export const TYPES = {
  hq:        { label: 'QG',          icon: '🏚️', income: 170, heat: 0, resp: 0, def: 2.0, recruit: 100,
               desc: 'O coração do bonde. Se cair, acabou.' },
  boca:      { label: 'Boca',        icon: '💊', income: 220, heat: 4, resp: 0, def: 1.0,
               desc: 'Dinheiro rápido, mas chama muita atenção da polícia.' },
  inferninho:{ label: 'Inferninho',  icon: '💃', income: 170, heat: 2, resp: 2, def: 1.0,
               desc: 'Casa noturna de fachada. Dá grana, fama e boatos: avisa quando um rival vai atacar você.', intel: true },
  desmanche: { label: 'Desmanche',   icon: '🔧', income: 150, heat: 2, resp: 0, def: 1.1,
               desc: 'Carro roubado entra inteiro, sai em peças.' },
  bar:       { label: 'Bar',         icon: '🍺', income: 60,  heat: 0, resp: 1, def: 1.0, recruit: 80,
               desc: 'Onde a molecada do bairro se junta. Bom pra recrutar.' },
  fliperama: { label: 'Fliperama',   icon: '🕹️', income: 80,  heat: 0, resp: 1, def: 1.0, recruit: 90,
               desc: 'Ponto de encontro das gangues de moto. Dá pra recrutar.' },
  mercado:   { label: 'Mercadão',    icon: '🏪', income: 180, heat: 1, resp: 1, def: 1.1,
               desc: 'Os comerciantes pagam “proteção” toda semana.' },
  porto:     { label: 'Porto',       icon: '🚢', income: 280, heat: 3, resp: 0, def: 1.3,
               desc: 'Contrabando pelo cais. O ponto mais lucrativo da cidade.' },
  policia:   { label: 'Delegacia',   icon: '🚓', income: 0,   heat: 0, resp: 0, def: 0,
               desc: 'Intocável. Seus pontos aqui perto ficam mais visados (+1).' },
  // F3: lotes e construções
  lote:      { label: 'Lote vazio',  icon: '🚧', income: 0,   heat: 0, resp: 0, def: 0.6,
               desc: 'Terreno sem dono. Compre e construa o que quiser. Em obra, o ponto fica frágil.' },
  campinho:  { label: 'Campinho',    icon: '⚽', income: 30,  heat: 0, resp: 2, def: 1.0, recruit: 70,
               desc: 'O futebol do bairro. Recruta e é o lugar do bailão.' },
  academia:  { label: 'Academia',    icon: '🥊', income: 90,  heat: 0, resp: 1, def: 1.3, recruit: 120,
               desc: 'Recruta lutadores: cada um já chega com faca/taco (arma leve), se couber no arsenal.' },
  deposito:  { label: 'Depósito',    icon: '📦', income: 0,   heat: 1, resp: 0, def: 1.4,
               desc: 'Guarda armas: +30 de espaço no arsenal.', storage: 30 },
};

// O que dá pra erguer num lote: custo (na escala da era) e dias de obra.
export const BUILDABLE = {
  boca:       { cost: 900,  days: 2 },
  bar:        { cost: 500,  days: 1 },
  inferninho: { cost: 1200, days: 3 },
  desmanche:  { cost: 800,  days: 2 },
  academia:   { cost: 1000, days: 3 },
  deposito:   { cost: 600,  days: 2 },
};
