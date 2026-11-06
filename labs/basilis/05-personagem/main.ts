import '../01-controles/style.css';
import '../02-cenario/style.css';
import './style.css';
import { mountPanel } from '../01-controles/panel.ts';
import { element } from '../02-cenario/stage.ts';
import { sliceClips } from '../04-animacao/sheets.ts';
import { ARMA_PALETTE, generateTestSword } from './arma-teste.ts';
import { CAMADAS, type CamadaId } from './camadas.ts';
import { Montador } from './compor.ts';
import { receitaDeCriacao } from './criacao.ts';
import { generateManequimSheet } from './manequim.ts';
import { MANEQUIM_PALETTE, MOLDE_FORMAT } from './molde.ts';
import { downloadBlob, downloadCanvas, paintIndexed } from './pintura.ts';
import { pointsJSON } from './pontos.ts';
import { RECEITA_PADRAO, lerReceita, receitaJSON, type Receita } from './receita.ts';
import { MOLDE_DEFAULTS, MOLDE_FIELDS, loadMoldeSettings, saveMoldeSettings } from './settings.ts';
import { TelaDeCriacao } from './tela-criacao.ts';
import { TelaDeJogo } from './tela-jogo.ts';
import { BACKGROUNDS, MoldeViewer, PilhaPanel, type MoldeImages, type PilhaState } from './viewer.ts';

const settings = loadMoldeSettings();
const sword = generateTestSword();
const weapon = {
  orientations: sword.map((sprite) => paintIndexed(sprite.image, ARMA_PALETTE)),
  gripX: sword[0].gripX,
  gripY: sword[0].gripY,
};
const manequimOptions = () => ({ selectiveOutline: settings.selectiveOutline, innerLines: settings.innerLines });

// ---- Receitas guardadas no aparelho: a da criação e a da bancada, separadas ----

const RECIPE_KEY = 'basilis.lab05.receita';
const CREATION_KEY = 'basilis.lab05.criacao';
const TAB_KEY = 'basilis.lab05.aba';

function readRecipe(value: unknown): Receita | null {
  return value ? lerReceita(JSON.stringify(value)).receita : null;
}

function loadState(): PilhaState {
  try {
    const stored = JSON.parse(localStorage.getItem(RECIPE_KEY) ?? 'null') as { receita?: unknown; desligadas?: unknown } | null;
    const receita = readRecipe(stored?.receita);
    const ids = new Set(CAMADAS.map((camada) => camada.id as string));
    const desligadas = Array.isArray(stored?.desligadas) ? stored.desligadas.filter((id): id is CamadaId => ids.has(id)) : [];
    return { receita: receita ?? RECEITA_PADRAO, desligadas: new Set(desligadas) };
  } catch {
    return { receita: RECEITA_PADRAO, desligadas: new Set() };
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sem armazenamento: vale só nesta sessão.
  }
}

function saveState(state: PilhaState): void {
  store(RECIPE_KEY, JSON.stringify({ receita: JSON.parse(receitaJSON(state.receita)), desligadas: [...state.desligadas] }));
}

function loadCreation(): Receita {
  try {
    return readRecipe(JSON.parse(localStorage.getItem(CREATION_KEY) ?? 'null')) ?? RECEITA_PADRAO;
  } catch {
    return RECEITA_PADRAO;
  }
}

// ---- Abas: criação (parte 3), jogo e menu (parte 4) e bancada (partes 1 e 2) ----

type Aba = 'criacao' | 'jogo' | 'bancada';
const ABAS: Aba[] = ['criacao', 'jogo', 'bancada'];
const TITULOS: Record<Aba, string> = {
  criacao: 'Lab 05 · Criação de personagem',
  jogo: 'Lab 05 · Jogo e menu',
  bancada: 'Lab 05 · Camadas e paleta',
};
let aba: Aba = (() => {
  try {
    const stored = localStorage.getItem(TAB_KEY) as Aba | null;
    return stored && ABAS.includes(stored) ? stored : 'criacao';
  } catch {
    return 'criacao';
  }
})();

function showTab(next: Aba): void {
  aba = next;
  store(TAB_KEY, next);
  for (const id of ABAS) element(`aba-${id}`).hidden = next !== id;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-aba]')) {
    const on = button.dataset.aba === next;
    button.classList.toggle('selecionado', on);
    button.setAttribute('aria-selected', String(on));
  }
  element('titulo').textContent = TITULOS[next];
  window.scrollTo(0, 0);
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-aba]')) {
  button.addEventListener('click', () => showTab(button.dataset.aba as Aba));
}

// ---- Bancada: a receita montada uma vez numa folha pintada fora da tela ----

const montador = new Montador((sheet, palette) => {
  const canvas = paintIndexed(sheet, palette);
  return { sheet: canvas, frames: sliceClips(canvas, MOLDE_FORMAT) };
});

let state = loadState();
let images: MoldeImages;
let viewer: MoldeViewer | null = null;
let panel: PilhaPanel | null = null;

function build() {
  const montagem = montador.montar(state.receita, { manequim: manequimOptions(), desligadas: state.desligadas });
  images = { ...montagem.pintada, weapon };
  viewer?.setImages(images);
  if (viewer) viewer.shadowLayer = !state.desligadas.has('sombra');
  panel?.showStatus(montagem, montador.contagem);
  return montagem;
}

const first = build();
viewer = new MoldeViewer(element('visualizador'), images!, settings);
viewer.shadowLayer = !state.desligadas.has('sombra');
panel = new PilhaPanel(
  {
    camadas: element('camadas'),
    pecas: element('pecas'),
    rampas: element('rampas'),
    receita: element('receita'),
    status: element('montagem'),
  },
  state,
  (next) => {
    state = next;
    saveState(state);
    build();
  },
);
panel.showStatus(first, montador.contagem);

// ---- Jogo e menu: o personagem da criação ----

const jogo = new TelaDeJogo(
  { menu: element('jogo-menu'), detalhes: element('jogo-detalhes'), arena: element<HTMLCanvasElement>('arena') },
  {
    receita: loadCreation(),
    manequim: manequimOptions,
    fundo: () => BACKGROUNDS[settings.background],
    sombra: () => settings.showShadow,
    weapon,
    ativa: () => aba === 'jogo',
  },
);

// ---- Criação ----

const criacao = new TelaDeCriacao(element('criacao'), {
  receita: loadCreation(),
  manequim: manequimOptions,
  fundo: () => BACKGROUNDS[settings.background],
  weapon,
  onChange: (receita) => {
    store(CREATION_KEY, receitaJSON(receita));
    // O jogo e o menu seguem a criação sem recarregar (montam de novo quando a aba aparece).
    jogo.definirReceita(receita);
  },
  abrirNaBancada: (receita) => {
    panel!.definirReceita(receita);
    showTab('bancada');
  },
});
element('trazer-da-bancada').addEventListener('click', () => {
  criacao.definirReceita(receitaDeCriacao(state.receita));
  showTab('criacao');
});

mountPanel(element('ajustes-campos'), settings, MOLDE_FIELDS, MOLDE_DEFAULTS, (changed) => {
  saveMoldeSettings(changed);
  // Os ajustes de contorno entram na chave da montagem: só refazem a folha se mudaram.
  build();
  criacao.ajustesMudaram();
  jogo.ajustesMudaram();
});

element('baixar-montada').addEventListener('click', () => downloadCanvas(images.sheet, 'basilis-personagem-montado.png'));
element('baixar-receita').addEventListener('click', () =>
  downloadBlob(new Blob([receitaJSON(state.receita)], { type: 'application/json' }), 'basilis-receita.json'),
);
element('baixar-folha').addEventListener('click', () =>
  downloadCanvas(
    paintIndexed(generateManequimSheet(manequimOptions()), MANEQUIM_PALETTE.map((entry) => entry?.color ?? null)),
    'basilis-molde-manequim.png',
  ),
);
element('baixar-pontos').addEventListener('click', () =>
  downloadBlob(new Blob([pointsJSON()], { type: 'application/json' }), 'basilis-molde-pontos.json'),
);

showTab(aba);

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  // Só a aba aberta anima.
  if (aba === 'criacao') criacao.tick(dt);
  else if (aba === 'jogo') jogo.tick(dt);
  else viewer!.tick(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
