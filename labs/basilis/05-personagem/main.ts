import '../01-controles/style.css';
import '../02-cenario/style.css';
import './style.css';
import { mountPanel } from '../01-controles/panel.ts';
import { element } from '../02-cenario/stage.ts';
import { sliceClips } from '../04-animacao/sheets.ts';
import { ARMA_PALETTE, generateTestSword } from './arma-teste.ts';
import { generateManequimSheet } from './manequim.ts';
import { MANEQUIM_PALETTE, MOLDE_FORMAT } from './molde.ts';
import { downloadBlob, downloadCanvas, paintIndexed } from './pintura.ts';
import { pointsJSON } from './pontos.ts';
import { MOLDE_DEFAULTS, MOLDE_FIELDS, loadMoldeSettings, saveMoldeSettings } from './settings.ts';
import { MoldeViewer, type MoldeImages } from './viewer.ts';

const settings = loadMoldeSettings();
const palette = MANEQUIM_PALETTE.map((entry) => entry?.color ?? null);
const sword = generateTestSword();
const weapon = {
  orientations: sword.map((sprite) => paintIndexed(sprite.image, ARMA_PALETTE)),
  gripX: sword[0].gripX,
  gripY: sword[0].gripY,
};

function buildImages(): MoldeImages {
  const sheet = paintIndexed(
    generateManequimSheet({ selectiveOutline: settings.selectiveOutline, innerLines: settings.innerLines }),
    palette,
  );
  return { sheet, frames: sliceClips(sheet, MOLDE_FORMAT), weapon };
}

let images = buildImages();
const viewer = new MoldeViewer(element('visualizador'), images, settings);

let artKey = '';
const keyOf = () => `${settings.selectiveOutline}-${settings.innerLines}`;
artKey = keyOf();
mountPanel(element('ajustes-campos'), settings, MOLDE_FIELDS, MOLDE_DEFAULTS, (changed) => {
  saveMoldeSettings(changed);
  if (keyOf() !== artKey) {
    artKey = keyOf();
    images = buildImages();
    viewer.setImages(images);
  }
});

element('baixar-folha').addEventListener('click', () => downloadCanvas(images.sheet, 'basilis-molde-manequim.png'));
element('baixar-pontos').addEventListener('click', () =>
  downloadBlob(new Blob([pointsJSON()], { type: 'application/json' }), 'basilis-molde-pontos.json'),
);

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  viewer.tick(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
