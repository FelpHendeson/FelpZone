import '../01-controles/style.css';
import '../02-cenario/style.css';
import './style.css';
import { mountPanel } from '../01-controles/panel.ts';
import { element } from '../02-cenario/stage.ts';
import { sliceClips } from '../04-animacao/sheets.ts';
import { ARMA_PALETTE, generateTestSword } from './arma-teste.ts';
import { CAMADAS, type CamadaId } from './camadas.ts';
import { Montador } from './compor.ts';
import { generateManequimSheet } from './manequim.ts';
import { MANEQUIM_PALETTE, MOLDE_FORMAT } from './molde.ts';
import { downloadBlob, downloadCanvas, paintIndexed } from './pintura.ts';
import { pointsJSON } from './pontos.ts';
import { RECEITA_PADRAO, lerReceita, receitaJSON } from './receita.ts';
import { MOLDE_DEFAULTS, MOLDE_FIELDS, loadMoldeSettings, saveMoldeSettings } from './settings.ts';
import { MoldeViewer, PilhaPanel, type MoldeImages, type PilhaState } from './viewer.ts';

const settings = loadMoldeSettings();
const sword = generateTestSword();
const weapon = {
  orientations: sword.map((sprite) => paintIndexed(sprite.image, ARMA_PALETTE)),
  gripX: sword[0].gripX,
  gripY: sword[0].gripY,
};

// ---- Receita guardada no aparelho (a última montada) ----

const RECIPE_KEY = 'basilis.lab05.receita';

function loadState(): PilhaState {
  try {
    const stored = JSON.parse(localStorage.getItem(RECIPE_KEY) ?? 'null') as { receita?: unknown; desligadas?: unknown } | null;
    const receita = stored ? lerReceita(JSON.stringify(stored.receita)).receita : null;
    const ids = new Set(CAMADAS.map((camada) => camada.id as string));
    const desligadas = Array.isArray(stored?.desligadas) ? stored.desligadas.filter((id): id is CamadaId => ids.has(id)) : [];
    return { receita: receita ?? RECEITA_PADRAO, desligadas: new Set(desligadas) };
  } catch {
    return { receita: RECEITA_PADRAO, desligadas: new Set() };
  }
}

function saveState(state: PilhaState): void {
  try {
    localStorage.setItem(RECIPE_KEY, JSON.stringify({ receita: JSON.parse(receitaJSON(state.receita)), desligadas: [...state.desligadas] }));
  } catch {
    // Sem armazenamento: a receita vale só nesta sessão.
  }
}

// ---- Montagem: uma folha pintada fora da tela, refeita só quando a receita muda ----

const montador = new Montador((sheet, palette) => {
  const canvas = paintIndexed(sheet, palette);
  return { sheet: canvas, frames: sliceClips(canvas, MOLDE_FORMAT) };
});

let state = loadState();
let images: MoldeImages;
let viewer: MoldeViewer | null = null;
let panel: PilhaPanel | null = null;

function build() {
  const montagem = montador.montar(state.receita, {
    manequim: { selectiveOutline: settings.selectiveOutline, innerLines: settings.innerLines },
    desligadas: state.desligadas,
  });
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

mountPanel(element('ajustes-campos'), settings, MOLDE_FIELDS, MOLDE_DEFAULTS, (changed) => {
  saveMoldeSettings(changed);
  // Os ajustes de contorno entram na chave da montagem: só refazem a folha se mudaram.
  build();
});

element('baixar-montada').addEventListener('click', () => downloadCanvas(images.sheet, 'basilis-personagem-montado.png'));
element('baixar-receita').addEventListener('click', () =>
  downloadBlob(new Blob([receitaJSON(state.receita)], { type: 'application/json' }), 'basilis-receita.json'),
);
element('baixar-folha').addEventListener('click', () =>
  downloadCanvas(
    paintIndexed(
      generateManequimSheet({ selectiveOutline: settings.selectiveOutline, innerLines: settings.innerLines }),
      MANEQUIM_PALETTE.map((entry) => entry?.color ?? null),
    ),
    'basilis-molde-manequim.png',
  ),
);
element('baixar-pontos').addEventListener('click', () =>
  downloadBlob(new Blob([pointsJSON()], { type: 'application/json' }), 'basilis-molde-pontos.json'),
);

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  viewer!.tick(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
