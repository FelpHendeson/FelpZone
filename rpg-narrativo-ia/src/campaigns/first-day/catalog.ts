import type { AbilityDefinition, ItemDefinition, NpcDefinition, TitleDefinition } from '../../core/events';
import {
  ABILITY_EMPATHY,
  ABILITY_PERCEPTION,
  ABILITY_RESILIENCE,
  FLAG_CAMPED_ALONE,
  FLAG_CAMPED_TOGETHER,
  FLAG_REPAIRED,
  FLAG_SHARED_RESOURCE,
  ITEM_BRANCH,
  ITEM_FRUIT,
  ITEM_WATER,
  NPC_MIRA,
} from './ids';

export const items: ItemDefinition[] = [
  {
    id: ITEM_WATER,
    name: 'Água limpa',
    description: 'Um pouco de água encontrada em uma pedra oca. Cabe em duas mãos.',
  },
  {
    id: ITEM_FRUIT,
    name: 'Fruto desconhecido',
    description: 'Polpa densa, cheiro doce. Ninguém ensinou se isso alimenta ou engana.',
  },
  {
    id: ITEM_BRANCH,
    name: 'Galho resistente',
    description: 'Madeira viva, mais dura do que deveria. Serve como apoio ou defesa improvisada.',
  },
];

export const abilities: AbilityDefinition[] = [
  {
    id: ABILITY_PERCEPTION,
    name: 'Olhar Atento',
    description: 'A cautela aumenta. Ameaças e detalhes aparecem antes de chegar perto.',
  },
  {
    id: ABILITY_RESILIENCE,
    name: 'Resiliência',
    description: 'Saúde e energia aumentam. O corpo aguenta melhor o primeiro dia.',
  },
  {
    id: ABILITY_EMPATHY,
    name: 'Voz Calma',
    description: 'A humanidade aumenta. Outras pessoas tendem a baixar a guarda perto de você.',
  },
];

export const npcs: NpcDefinition[] = [
  {
    id: NPC_MIRA,
    name: 'Mira Vale',
  },
];

export const titles: TitleDefinition[] = [
  {
    id: 'mao-partilhada',
    name: 'Mão Partilhada',
    description: 'Você dividiu o pouco que tinha e passou a primeira noite ao lado de outra pessoa.',
    conditions: [
      { type: 'flag.is', flag: FLAG_SHARED_RESOURCE, value: true },
      { type: 'flag.is', flag: FLAG_CAMPED_TOGETHER, value: true },
    ],
  },
  {
    id: 'gesto-tardio',
    name: 'Gesto Tardio',
    description: 'A primeira recusa não foi a última palavra. Você tentou reparar o dia.',
    conditions: [{ type: 'flag.is', flag: FLAG_REPAIRED, value: true }],
  },
  {
    id: 'caminho-solitario',
    name: 'Caminho Solitário',
    description: 'Você concluiu o primeiro dia sem dividir o fogo com ninguém.',
    conditions: [{ type: 'flag.is', flag: FLAG_CAMPED_ALONE, value: true }],
  },
  {
    id: 'primeiro-abrigo',
    name: 'Primeiro Abrigo',
    description: 'Houve um teto improvisado e outra voz por perto quando a noite chegou.',
    conditions: [{ type: 'flag.is', flag: FLAG_CAMPED_TOGETHER, value: true }],
  },
  {
    id: 'despertar',
    name: 'Despertar',
    description: 'Você sobreviveu ao primeiro dia. O resto ainda não tem nome.',
    conditions: [],
  },
];
