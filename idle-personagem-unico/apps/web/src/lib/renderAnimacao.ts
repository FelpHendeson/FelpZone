import type { ParametrosMiniatura } from "@idle-pu/motor";
import { aplicarPaleta, coresDoPersonagem } from "./paletaPersonagem";
import { SEQUENCIAS, type SequenciaPersonagem } from "./animacaoPersonagem";

const imagens = new Map<string, HTMLImageElement>();
const carregando = new Map<string, Promise<HTMLImageElement>>();
const variantes = new Map<string, HTMLCanvasElement>();
const pendentes = new Map<string, Promise<HTMLCanvasElement>>();
function limitar<T>(mapa: Map<string, T>, limite: number) { while (mapa.size > limite) mapa.delete(mapa.keys().next().value!); }
function carregar(raca: string) {
  const pronta = imagens.get(raca);
  if (pronta) { imagens.delete(raca); imagens.set(raca, pronta); return Promise.resolve(pronta); }
  const pendente = carregando.get(raca); if (pendente) return pendente;
  const promessa = new Promise<HTMLImageElement>((ok, erro) => {
    const img = new Image(); img.decoding = "async";
    img.onload = () => {
      if (img.naturalWidth !== 1024 || img.naturalHeight !== 1024) { erro(new Error("Folha inválida.")); return; }
      imagens.set(raca, img); limitar(imagens, 4); ok(img);
    };
    img.onerror = () => erro(new Error("Animação indisponível."));
    img.src = `/arte/animacoes-v1/${raca}.webp`;
  }).finally(() => carregando.delete(raca));
  carregando.set(raca, promessa); return promessa;
}
/** Uma linha personalizada por vez: 4 quadros, cache LRU de oito variantes. */
export function obterAnimacao(p: ParametrosMiniatura, sequencia: SequenciaPersonagem): Promise<HTMLCanvasElement> {
  const cores = coresDoPersonagem(p), chave = `${cores.chave}:${sequencia}`;
  const pronta = variantes.get(chave);
  if (pronta) { variantes.delete(chave); variantes.set(chave, pronta); return Promise.resolve(pronta); }
  const pendente = pendentes.get(chave); if (pendente) return pendente;
  const promessa = carregar(p.racaId).then(img => {
    const linha = document.createElement("canvas"); linha.width = 1024; linha.height = 256;
    const ctx = linha.getContext("2d", { willReadFrequently: true }); if (!ctx) throw new Error("Canvas indisponível.");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, SEQUENCIAS[sequencia].linha * 256, 1024, 256, 0, 0, 1024, 256);
    for (let q = 0; q < 4; q++) {
      const pixels = ctx.getImageData(q * 256, 0, 256, 256);
      pixels.data.set(aplicarPaleta(pixels.data, 256, cores.cabelo, cores.roupa, p.racaId));
      ctx.putImageData(pixels, q * 256, 0);
    }
    variantes.set(chave, linha); limitar(variantes, 8); return linha;
  }).finally(() => pendentes.delete(chave));
  pendentes.set(chave, promessa); return promessa;
}
