// Ajustes do Lab 03. Movimento e joystick vêm do Lab 01; tela e câmera, do Lab 02.

import { loadStored, saveStored, type Field } from '../01-controles/settings.ts';
import { SLASH_OPTIONS, type SlashStyle } from '../02-cenario/slash.ts';
import type { CombatSettings } from './combat.ts';

export interface FightSettings {
  attackDamage: number;
  attackCooldown: number;
  attackReach: number;
  knockback: number;
  hitstop: boolean;
  playerInvulnerability: number;
  enemyCount: number;
  enemyHp: number;
  enemyDamage: number;
  enemySpeed: number;
  windup: number;
  slash: SlashStyle;
  damageNumbers: boolean;
  showHitboxes: boolean;
  debug: boolean;
}

export const FIGHT_DEFAULTS: FightSettings = {
  attackDamage: 10,
  attackCooldown: 0.35,
  attackReach: 1.3,
  knockback: 7,
  hitstop: true,
  playerInvulnerability: 0.8,
  enemyCount: 5,
  enemyHp: 30,
  enemyDamage: 15,
  enemySpeed: 2.6,
  windup: 0.45,
  slash: 'cone',
  damageNumbers: true,
  showHitboxes: false,
  debug: true,
};

export const FIGHT_FIELDS: Field<FightSettings>[] = [
  { key: 'attackDamage', label: 'Dano do ataque', kind: 'range', min: 5, max: 50, step: 5, unit: '' },
  { key: 'attackCooldown', label: 'Recarga do ataque', kind: 'range', min: 0.2, max: 1.2, step: 0.05, unit: 's' },
  { key: 'attackReach', label: 'Alcance do ataque', kind: 'range', min: 0.8, max: 2.5, step: 0.1, unit: 'tiles' },
  { key: 'knockback', label: 'Empurrão', kind: 'range', min: 0, max: 16, step: 1, unit: 'tiles/s' },
  { key: 'hitstop', label: 'Pausa no impacto', kind: 'toggle' },
  { key: 'playerInvulnerability', label: 'Invulnerável depois de levar dano', kind: 'range', min: 0, max: 2, step: 0.1, unit: 's' },
  { key: 'enemyCount', label: 'Inimigos', kind: 'range', min: 1, max: 12, step: 1, unit: '' },
  { key: 'enemyHp', label: 'Vida dos inimigos', kind: 'range', min: 10, max: 100, step: 5, unit: '' },
  { key: 'enemyDamage', label: 'Dano dos inimigos', kind: 'range', min: 5, max: 40, step: 5, unit: '' },
  { key: 'enemySpeed', label: 'Velocidade dos inimigos', kind: 'range', min: 1, max: 5, step: 0.2, unit: 'tiles/s' },
  { key: 'windup', label: 'Aviso antes do bote', kind: 'range', min: 0.15, max: 1, step: 0.05, unit: 's' },
  { key: 'slash', label: 'Golpe', kind: 'choice', options: SLASH_OPTIONS },
  { key: 'damageNumbers', label: 'Números de dano', kind: 'toggle' },
  { key: 'showHitboxes', label: 'Mostrar áreas de acerto', kind: 'toggle' },
  { key: 'debug', label: 'Mostrar depuração', kind: 'toggle' },
];

const STORAGE_KEY = 'basilis.lab03.settings';

export function loadFightSettings(): FightSettings {
  return loadStored(STORAGE_KEY, FIGHT_FIELDS, FIGHT_DEFAULTS);
}

export function saveFightSettings(settings: FightSettings): void {
  saveStored(STORAGE_KEY, settings);
}

export const ATTACK_ARC = (Math.PI * 2) / 3;

export function combatSettings(settings: FightSettings): CombatSettings {
  return {
    attackDamage: settings.attackDamage,
    attackReach: settings.attackReach,
    attackArc: ATTACK_ARC,
    knockback: settings.knockback,
    playerInvulnerability: settings.playerInvulnerability,
    enemyHp: settings.enemyHp,
    enemyDamage: settings.enemyDamage,
    enemySpeed: settings.enemySpeed,
    aggroRange: 5,
    windup: settings.windup,
    respawnSeconds: 4,
  };
}
