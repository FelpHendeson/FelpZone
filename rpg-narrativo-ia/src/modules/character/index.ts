import type { Attributes, AttributeId, CharacterIdentity, CharacterSex, LegacyCharacterIdentity } from '../../core/state/types';
import { createInitialNeedsSnapshot } from '../needs';

export type { AttributeId, Attributes, CharacterIdentity, LegacyCharacterIdentity };

export const ATTRIBUTE_MIN = 0;
export const ATTRIBUTE_MAX = 100;

export const ATTRIBUTE_LABELS: Record<AttributeId, string> = {
  saude: 'Saúde',
  energia: 'Energia',
  fome: 'Fome',
  sede: 'Sede',
  humanidade: 'Humanidade',
  cautela: 'Cautela',
};

const NAME_PATTERN = /^[\p{L}]+(?:[- '][\p{L}]+)*$/u;

export function clampAttribute(value: number): number {
  if (Number.isNaN(value)) {
    return ATTRIBUTE_MIN;
  }

  return Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, Math.round(value)));
}

export function createInitialAttributes(): Attributes {
  return {
    ...createInitialNeedsSnapshot(),
    humanidade: 50,
    cautela: 40,
  };
}

export function changeAttribute(attributes: Attributes, attribute: AttributeId, amount: number): Attributes {
  return {
    ...attributes,
    [attribute]: clampAttribute(attributes[attribute] + amount),
  };
}

export function fullName(character: LegacyCharacterIdentity): string {
  return `${character.firstName} ${character.lastName}`.trim();
}

export const STORY_VAR_KEYS = ['nome', 'sobrenome', 'nomeCompleto', 'desperto', 'dia', 'diaOrdinal'] as const;

const ORDINAL_UNITS = ['', 'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo', 'oitavo', 'nono'];
const ORDINAL_TENS = ['', 'décimo', 'vigésimo', 'trigésimo', 'quadragésimo', 'quinquagésimo', 'sexagésimo', 'septuagésimo', 'octogésimo', 'nonagésimo'];

/** Ordinal por extenso (masculino) do dia: "terceiro", "décimo segundo"; acima de 99, "100º". */
export function ordinalDay(day: number): string {
  if (!Number.isSafeInteger(day) || day < 1 || day > 99) return `${day}º`;
  const tens = ORDINAL_TENS[Math.floor(day / 10)]!;
  const units = ORDINAL_UNITS[day % 10]!;
  return [tens, units].filter(Boolean).join(' ');
}

const AWAKENED_FORM: Record<CharacterSex, string> = {
  male: 'Desperto',
  female: 'Desperta',
  unspecified: 'Desperto(a)',
};

/**
 * Variáveis de texto da história. Com o dia do mundo, os textos dizem o dia real em que a cena
 * acontece (`{{dia}}`, `{{diaOrdinal}}`): eventos se destravam por eventos, não por data fixa.
 */
export function storyVars(character: LegacyCharacterIdentity & { sex?: CharacterSex }, day?: number): Record<string, string> {
  return {
    nome: character.firstName,
    sobrenome: character.lastName,
    nomeCompleto: fullName(character),
    desperto: AWAKENED_FORM[character.sex ?? 'unspecified'],
    ...(day !== undefined ? { dia: String(day), diaOrdinal: ordinalDay(day) } : {}),
  };
}

export interface IdentityValidation {
  ok: boolean;
  firstNameError?: string;
  lastNameError?: string;
}

export function validateIdentity(firstName: string, lastName: string): IdentityValidation {
  const first = firstName.trim();
  const last = lastName.trim();
  const result: IdentityValidation = { ok: true };

  const firstError = validateNamePart(first, 'nome');
  const lastError = validateNamePart(last, 'sobrenome');

  if (firstError) {
    result.ok = false;
    result.firstNameError = firstError;
  }

  if (lastError) {
    result.ok = false;
    result.lastNameError = lastError;
  }

  return result;
}

export function normalizeIdentity(firstName: string, lastName: string): LegacyCharacterIdentity {
  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
  };
}

function validateNamePart(value: string, label: string): string | undefined {
  if (value.length < 2) {
    return `O ${label} precisa ter pelo menos 2 letras.`;
  }

  if (value.length > 24) {
    return `O ${label} pode ter no máximo 24 caracteres.`;
  }

  if (!NAME_PATTERN.test(value)) {
    return `Use apenas letras, espaços, hífen ou apóstrofo no ${label}.`;
  }

  return undefined;
}
