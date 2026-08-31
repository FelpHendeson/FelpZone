import type { Attributes, AttributeId, CharacterIdentity } from '../../core/state/types';

export type { AttributeId, Attributes, CharacterIdentity };

export const ATTRIBUTE_MIN = 0;
export const ATTRIBUTE_MAX = 100;

export const ATTRIBUTE_LABELS: Record<AttributeId, string> = {
  saude: 'Saúde',
  energia: 'Energia',
  fome: 'Fome',
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
    saude: 80,
    energia: 70,
    fome: 30,
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

export function fullName(character: CharacterIdentity): string {
  return `${character.firstName} ${character.lastName}`.trim();
}

export const STORY_VAR_KEYS = ['nome', 'sobrenome', 'nomeCompleto'] as const;

export function storyVars(character: CharacterIdentity): Record<string, string> {
  return {
    nome: character.firstName,
    sobrenome: character.lastName,
    nomeCompleto: fullName(character),
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

export function normalizeIdentity(firstName: string, lastName: string): CharacterIdentity {
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
