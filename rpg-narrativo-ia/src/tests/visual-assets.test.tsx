import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { inspectImageReference } from '../core/events';
import { validateCampaign } from '../core/engine';
import { inspectNavigationMap } from '../modules/navigation';
import { INITIAL_ITEMS_CATALOG, inspectItemsCatalog, getItem } from '../modules/items';
import { ImagePlaceholder } from '../ui/components/ImagePlaceholder';
import { stubCampaign } from './helpers';

const scene = { kind: 'scene' as const, label: 'Clareira', src: '/images/first-day/clearing.webp' };

describe('imagens opcionais do pack', () => {
  it('aceita somente arquivos locais em formatos raster conhecidos', () => {
    expect(inspectImageReference(scene)).toEqual(scene);
    expect(inspectImageReference({ kind: 'scene', label: 'Sem arte' })).toEqual({ kind: 'scene', label: 'Sem arte' });
    for (const src of [
      'https://example.com/scene.png',
      '//example.com/scene.png',
      '/images/../secret.png',
      '/images/scene.svg',
      '/images/scene.png?token=abc',
      'data:image/png;base64,abc',
    ]) {
      expect(inspectImageReference({ ...scene, src })).toBeUndefined();
    }
  });

  it('mantém o caminho validado no mapa e rejeita caminhos hostis', () => {
    const valid = inspectNavigationMap({ id: 'clearing', name: 'Clareira', image: scene });
    expect(valid.ok).toBe(true);
    if (valid.ok) expect(valid.value.locations.get('clearing')?.image?.src).toBe(scene.src);
    expect(inspectNavigationMap({ id: 'clearing', name: 'Clareira', image: { ...scene, src: 'https://example.com/a.png' } }).ok).toBe(false);
  });

  it('aceita arte de item sem a misturar ao estado e protege o catálogo', () => {
    const image = { kind: 'icon' as const, label: 'Água', src: '/images/first-day/water.png' };
    const raw = { items: INITIAL_ITEMS_CATALOG.items.map((item, index) => index === 0 ? { ...item, image } : item) };
    const inspected = inspectItemsCatalog(raw);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const id = raw.items[0]?.id ?? '';
    expect(getItem(inspected.value, id).image?.src).toBe(image.src);
    expect(inspectItemsCatalog({ items: [{ ...raw.items[0], image: { ...image, src: '/images/../bad.png' } }] }).ok).toBe(false);
  });

  it('permite evento sem arte e valida capa, cena e retrato quando declarados', () => {
    const campaign = stubCampaign({ coverImage: scene });
    campaign.events[0]!.image = undefined;
    expect(validateCampaign(campaign)).toEqual([]);
    campaign.events[0]!.portrait = { kind: 'portrait', label: 'Mira', src: '/images/first-day/mira.webp' };
    expect(validateCampaign(campaign)).toEqual([]);
    campaign.coverImage = { ...scene, src: 'https://example.com/a.png' };
    expect(validateCampaign(campaign)).toContain('A capa da campanha possui imagem inválida.');
  });

  it('usa placeholder sem arquivo e renderiza img local quando há arquivo', () => {
    const fallback = renderToStaticMarkup(<ImagePlaceholder kind="scene" label="Clareira" />);
    const illustrated = renderToStaticMarkup(<ImagePlaceholder kind="scene" label="Clareira" src={scene.src} />);
    expect(fallback).toContain('placeholder__label');
    expect(fallback).not.toContain('<img');
    expect(illustrated).toContain('src="/images/first-day/clearing.webp"');
    expect(illustrated).not.toContain('placeholder__label');
  });
});
