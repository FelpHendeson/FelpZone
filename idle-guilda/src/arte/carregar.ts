/**
 * Cache das imagens geradas por scripts/fatiar.py. Uma imagem que falha ao
 * carregar (rede instável, deploy no meio) sai do cache depois de um tempo,
 * e a próxima chamada tenta de novo. Enquanto isso, quem desenha usa o
 * sprite em texto.
 */
const ESPERA_NOVA_TENTATIVA_MS = 10_000;

const imagens = new Map<string, HTMLImageElement>();
const ouvintes = new Set<() => void>();

function avisar() {
  for (const f of ouvintes) f();
}

/** Imagem pronta para desenhar, ou null enquanto carrega (ou depois de falhar). */
export function imagemPronta(url: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = imagens.get(url);
  if (!img) {
    const nova = new Image();
    nova.onload = avisar;
    nova.onerror = () => {
      setTimeout(() => {
        if (imagens.get(url) === nova) imagens.delete(url);
        avisar();
      }, ESPERA_NOVA_TENTATIVA_MS);
    };
    nova.src = url;
    imagens.set(url, nova);
    img = nova;
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** Chamado quando alguma imagem carrega ou pode ser tentada de novo. */
export function aoMudarImagens(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}
