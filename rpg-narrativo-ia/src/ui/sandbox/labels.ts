const SANDBOX_ITEM_NAMES: Record<string, string> = {
  'fallen-branch': 'Graveto',
  'raw-water': 'Água bruta',
  'raw-horned-rabbit-meat': 'Carne crua de coelho chifrudo',
  'cooked-horned-rabbit-meat': 'Carne cozida de coelho chifrudo',
  'horned-rabbit-hide': 'Couro de coelho chifrudo',
  'horned-rabbit-horn': 'Chifre de coelho chifrudo',
  'horned-rabbit-bones': 'Ossos de coelho chifrudo',
  'agua-limpa': 'Água limpa',
  'fruto-desconhecido': 'Fruto desconhecido',
  'galho-resistente': 'Galho resistente',
};

const STATION_NAMES: Record<string, string> = {
  cooking: 'Cozinha',
  heat: 'Calor',
};

const DISCOVERY_NAMES: Record<string, string> = {
  'awakening-site': 'Marca do despertar',
  'first-priority-event': 'Um chamado do Sistema',
  'path-great-tree': 'Passagem para a Grande Árvore',
  'fallen-sticks': 'Gravetos caídos',
  'path-spring-lake': 'Passagem para a Nascente',
  'torn-cloth': 'Pano rasgado',
  'path-dense-woods': 'Passagem para a Mata Densa',
  'great-tree-trunk': 'Tronco da Grande Árvore',
  'bark-markings': 'Marcas na casca',
  'spring-source': 'Olho d’água',
  'spring-water': 'Nascente',
  'dense-undergrowth': 'Sub-bosque denso',
  'horned-rabbit-tracks': 'Rastros de coelho chifrudo',
  'hidden-cave': 'Caverna Oculta',
};

export function sandboxItemName(itemId: string): string {
  if (typeof itemId !== 'string' || itemId.trim() === '') {
    return itemId;
  }

  return SANDBOX_ITEM_NAMES[itemId] ?? itemId;
}

export function sandboxDiscoveryName(discoveryId: string): string {
  if (typeof discoveryId !== 'string' || discoveryId.trim() === '') {
    return discoveryId;
  }

  return DISCOVERY_NAMES[discoveryId] ?? discoveryId;
}

export function sandboxStationName(tag: string): string {
  if (typeof tag !== 'string' || tag.trim() === '') {
    return tag;
  }

  return STATION_NAMES[tag] ?? tag;
}

export function formatPeriodCost(periods: number): string {
  return periods === 1 ? '1 período' : `${periods} períodos`;
}
