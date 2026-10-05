#!/usr/bin/env node
/**
 * Instala arte gerada por IA no pack do primeiro dia.
 *
 * Coloque as imagens em `art-inbox/` (ou passe outra pasta) com o nome sugerido nos prompts,
 * por exemplo `apprentice-mage-3.png` ou `awakening.jpg`; o formato e o tamanho não importam.
 * O script recorta, reduz, converte para webp, salva em `public/images/first-day/...` e preenche
 * o `src` correspondente no pack. Nomes desconhecidos são listados e ficam intocados.
 *
 * Uso: npm run art:install [-- <pasta>] [-- --dry-run]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const inbox = resolve(root, args.find((arg) => !arg.startsWith('--')) ?? 'art-inbox');
const publicDir = join(root, 'public');
const packFiles = {
  archetypes: join(root, 'content/first-day/system/archetypes.json'),
  items: join(root, 'content/first-day/system/items.json'),
};

/** Formatos de saída por tipo de espaço. */
const FORMATS = {
  portrait: { width: 640, height: 640, fit: 'cover', position: 'attention' },
  icon: { width: 256, height: 256, fit: 'cover', position: 'centre' },
  backdrop: { width: 1080, height: 1920, fit: 'inside', position: 'centre' },
  texture: { width: 512, height: 512, fit: 'cover', position: 'centre' },
};

const CREATION_FILES = { awakening: 'awakening', reflection: 'reflection', registry: 'registry', cardTexture: 'card-texture' };

/** Todos os espaços de imagem conhecidos: nome do arquivo → onde salvar e qual objeto do pack preencher. */
function collectSlots(packs) {
  const slots = new Map();
  const add = (name, pack, image, path, format) => slots.set(name, { pack, image, path: `/images/first-day/${path}.webp`, format });
  for (const [slot, file] of Object.entries(CREATION_FILES)) {
    const image = packs.archetypes.creation?.[slot];
    if (image) add(file, 'archetypes', image, `creation/${file}`, slot === 'cardTexture' ? 'texture' : 'backdrop');
  }
  for (const archetype of packs.archetypes.archetypes) {
    if (archetype.backdrop) add(archetype.id, 'archetypes', archetype.backdrop, `creation/${archetype.id}`, 'backdrop');
    for (const preset of archetype.portraits ?? []) add(preset.id, 'archetypes', preset.image, `portraits/${preset.id}`, 'portrait');
  }
  for (const item of packs.items.items ?? []) {
    if (item.image) add(item.id, 'items', item.image, `items/${item.id}`, 'icon');
  }
  return slots;
}

function normalizeName(file) {
  return basename(file, extname(file))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-?\(\d+\)$/, '')
    .replace(/[^a-z0-9-]/g, '');
}

async function main() {
  if (!existsSync(inbox)) {
    mkdirSync(inbox, { recursive: true });
    console.log(`Pasta criada: ${inbox}\nColoque as imagens geradas nela e rode de novo.`);
    return;
  }
  const packs = Object.fromEntries(Object.entries(packFiles).map(([key, file]) => [key, JSON.parse(readFileSync(file, 'utf8'))]));
  const slots = collectSlots(packs);
  const files = readdirSync(inbox).filter((file) => /\.(png|jpe?g|webp|avif|gif|tiff?)$/i.test(file));
  const installed = [];
  const unknown = [];
  const touched = new Set();

  for (const file of files) {
    const slot = slots.get(normalizeName(file));
    if (!slot) {
      unknown.push(file);
      continue;
    }
    const format = FORMATS[slot.format];
    const target = join(publicDir, slot.path);
    if (!dryRun) {
      mkdirSync(dirname(target), { recursive: true });
      const info = await sharp(join(inbox, file))
        .rotate()
        .resize({ width: format.width, height: format.height, fit: format.fit, position: format.position, withoutEnlargement: format.fit === 'inside' })
        .webp({ quality: 80, effort: 5 })
        .toFile(target);
      installed.push(`${file} → ${slot.path} (${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB)`);
    } else {
      installed.push(`${file} → ${slot.path} (simulação)`);
    }
    slot.image.src = slot.path;
    touched.add(slot.pack);
  }

  if (!dryRun) {
    for (const pack of touched) writeFileSync(packFiles[pack], `${JSON.stringify(packs[pack], null, 2)}\n`);
  }

  const missing = [...slots.entries()].filter(([, slot]) => !slot.image.src).map(([name]) => name);
  console.log(installed.length ? `Instaladas (${installed.length}):\n  ${installed.join('\n  ')}` : 'Nenhuma imagem reconhecida.');
  if (unknown.length) console.log(`\nNomes não reconhecidos (renomeie e rode de novo):\n  ${unknown.join('\n  ')}`);
  console.log(`\nEspaços ainda sem arte: ${missing.length}${missing.length ? `\n  ${missing.join(', ')}` : ''}`);
  if (installed.length && !dryRun) console.log('\nPronto. Rode `npm test` e `npm run build` para conferir.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
