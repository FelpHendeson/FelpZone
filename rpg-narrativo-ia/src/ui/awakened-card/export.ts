import { CARD_HEIGHT, CARD_WIDTH } from './card';

/**
 * Exportação da Carta do Desperto: o SVG da prévia vira PNG num canvas, tudo no aparelho.
 * Imagens dentro do SVG precisam estar embutidas (data URL), senão o navegador não as desenha.
 */
export async function toDataUrl(src: string): Promise<string | null> {
  if (src.startsWith('data:')) return src;
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function renderCardPng(svg: SVGSVGElement): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(CARD_WIDTH));
  clone.setAttribute('height', String(CARD_HEIGHT));
  clone.removeAttribute('class');
  const markup = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas indisponível.');
    context.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const CARD_FILE_NAME = 'carta-do-desperto.png';

/** Compartilhamento nativo de arquivo, quando o aparelho oferece. */
export function canShareFiles(): boolean {
  try {
    const probe = new File([new Blob()], CARD_FILE_NAME, { type: 'image/png' });
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function' && navigator.canShare?.({ files: [probe] }) === true;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
