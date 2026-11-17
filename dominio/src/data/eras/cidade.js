// Era 3: Cidade (Porto Neon). É o "Modo Livre: Cidade" e o destino da campanha depois do salto no tempo.
import { TYPES } from '../types.js';
import { RIVALS } from '../rivals.js';
import { MAP, EDGES, DISTRICTS, POLICE_NODE } from '../maps/porto-neon.js';

export const CIDADE = {
  id: 'cidade',
  label: 'Cidade',
  types: TYPES, rivals: RIVALS,
  map: { MAP, EDGES, DISTRICTS, POLICE_NODE },
  decor: 'mar',
  cfg: {
    upkeep: 12, captainSalary: 15, actions: 3, truceDays: 4,
    policeRadius: 210, heatPerPoint: 2.6, heatDrift: 0.35, bribeDays: 3,
    price: 1,                       // multiplica custos (melhorar, comprar ponto, suborno, agrado, capitão, IA dos rivais)
    startMoney: 800, startFree: 6, startRespect: 10, rivalStartMoney: 500, rivalStartReserve: 5,
    raid: 'policia',                // consequência da visada alta: batidas e megaoperação
    motoCost: 0,                    // motos não existem nesta era (ainda)
    build: true, weapons: true, events: true,
  },
  words: {
    heat: 'Visada', heatIcon: '👁️', police: 'polícia', bribe: 'Subornar', bribeIcon: '💼', soldiers: 'soldados',
    bribeTip: 'Tira 20 de visada e corta o alvo pela metade por {dias} dias',
  },
  text: {
    start: [
      ['{leader} reúne o {gang} no alto do Morro do Farol. A cidade vai conhecer esse nome.', 'big'],
      ['As gangues ainda estão te medindo. Você tem {trégua} dias antes de começarem a vir pra cima.', 'warn'],
    ],
    eliminatedByPlayer: '💀 {rival} CAÍRAM! {lider} fugiu da cidade. Você pegou o caixa deles ({grana}). Os pontos deles ficaram sem dono.',
    eliminatedByOther: '💀 {rival} foram destruídos por {por}! Os pontos deles ficaram sem dono.',
    bribe: '💼 Molhou a mão do delegado com {custo}. Vista grossa por {dias} dias: a pressão cai pela metade.',
    bribeEnd: '👮 Acabou a vista grossa. A polícia voltou a olhar pra você.',
    winTitle: '👑 DONO DA CIDADE',
    win: 'No dia {dia}, o {gang} derrubou o último QG rival. Porto Neon agora responde a {leader}.',
    loseTitle: '☠️ FIM DA LINHA',
    lose: 'O QG do Farol caiu no dia {dia}. O {gang} virou história de bar.',
  },
  events: {
    money: '🎒 Um olheiro achou uma mochila esquecida num dos pontos. +{grana}',
    recruits: '🏍️ Dois moleques de moto pediram pra entrar pro bonde. +2 soldados',
    news: '📰 Saiu matéria no jornal sobre a guerra de gangues. Visada +8',
    party: '🎉 A festa de sábado no inferninho bombou. Todo mundo comentando. +5 respeito',
    partyType: 'inferninho',
    caught: '🚔 Um dos seus foi pego numa blitz. -1 soldado',
    rivalSplit: '🗞️ Racha interno: {rival} perderam 2 soldados numa briga entre eles.',
  },
  objectives: [
    { id: 'cidade', text: 'Tome os QGs das três gangues rivais', check: (s) => Object.values(s.rivals).every((r) => !r.alive) },
  ],
};
