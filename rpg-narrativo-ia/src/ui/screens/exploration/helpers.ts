export function requireActiveCatalog<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`O catálogo de ${label} do pack ativo não está disponível.`);
  }
  return value;
}

export function itemGlyph(id: string): string {
  if (id.includes('water') || id.includes('agua') || id.includes('spring')) return '◒';
  if (id.includes('meat') || id.includes('rabbit')) return '♨';
  if (id.includes('campfire') || id.includes('cook')) return '♨';
  if (id.includes('branch') || id.includes('stick') || id.includes('galho')) return '⌁';
  if (id.includes('hide') || id.includes('cloth')) return '▧';
  if (id.includes('horn') || id.includes('bone')) return '◇';
  if (id.includes('fruit') || id.includes('fruto')) return '●';
  return '◆';
}
