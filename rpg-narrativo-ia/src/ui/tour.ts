export interface TourStep {
  /** Seletor CSS do elemento destacado; sem alvo visível, o passo aparece centralizado. */
  target: string;
  title: string;
  text: string;
}

/** Tour de primeira vez na voz do Sistema. Pode ser pulado e revisto em Configurações. */
export const FIRST_TOUR: readonly TourStep[] = [
  {
    target: '.game-hud',
    title: 'Suas necessidades',
    text: 'Saúde, energia, fome e sede. Quando uma delas ficar em risco, eu aviso — e digo o que você tem à mão para resolver.',
  },
  {
    target: '.location-hero__primary',
    title: 'Explorar',
    text: 'Explorar revela recursos, rastros e pessoas. Cada ação toma tempo do seu dia: o custo aparece antes de você agir.',
  },
  {
    target: '.location-hero__secondary',
    title: 'Ações locais',
    text: 'Coletar, fabricar, cozinhar, descansar e atividades com outras pessoas ficam aqui.',
  },
  {
    target: '.system-hints',
    title: 'Orientação do Sistema',
    text: 'Este cartão mostra o que importa agora. Se estiver em dúvida, olhe aqui primeiro.',
  },
  {
    target: '.bottom-nav',
    title: 'Navegação',
    text: 'Jornadas guardam seus objetivos. O Menu abre progressão, relações, Ajuda e Configurações.',
  },
];

const STORAGE_KEY = 'reset.tour.first.done';

export function isTourDone(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markTourDone(): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, '1');
  } catch {
    // Sem armazenamento, o tour pode reaparecer; é inofensivo.
  }
}
