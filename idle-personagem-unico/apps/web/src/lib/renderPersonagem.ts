import type { ParametrosMiniatura } from "@idle-pu/motor";
import { quadroRaca } from "./arte";
import { aplicarPaleta, BASE_PERSONAGEM, coresDoPersonagem, RECORTES_RETRATO } from "./paletaPersonagem";

interface Arte { corpo: HTMLCanvasElement; retrato: HTMLCanvasElement; }
let imagem: Promise<HTMLImageElement> | null = null;
const variantes = new Map<string, Arte>();
const pendentes = new Map<string, Promise<Arte>>();
const LIMITE_CACHE = 16;
function carregar() {
  if (imagem) return imagem;
  const p = new Promise<HTMLImageElement>((ok, erro) => {
    const img = new Image(); img.decoding = "async";
    img.onload = () => ok(img); img.onerror = () => erro(new Error("Não foi possível carregar a arte.")); img.src = BASE_PERSONAGEM;
  });
  imagem = p;
  void p.catch(() => { if (imagem === p) imagem = null; });
  return p;
}
function canvas(lado: number) {
  const c = document.createElement("canvas"); c.width = lado; c.height = lado;
  const ctx = c.getContext("2d"); if (!ctx) throw new Error("Renderização indisponível.");
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}
export function obterArtePersonagem(p: ParametrosMiniatura): Promise<Arte> {
  const cores = coresDoPersonagem(p), q = quadroRaca(p.racaId), recorte = RECORTES_RETRATO[p.racaId];
  if (!q || !recorte) return Promise.reject(new Error("Raça sem arte."));
  const pronta = variantes.get(cores.chave);
  if (pronta) { variantes.delete(cores.chave); variantes.set(cores.chave, pronta); return Promise.resolve(pronta); }
  const emCurso = pendentes.get(cores.chave); if (emCurso) return emCurso;
  const promessa = carregar().then((img) => {
    const x = Math.round(q.coluna * img.naturalWidth / 4), y = Math.round(q.linha * img.naturalHeight / 2);
    const w = Math.round((q.coluna + 1) * img.naturalWidth / 4) - x;
    const h = Math.round((q.linha + 1) * img.naturalHeight / 2) - y;
    const base = document.createElement("canvas"); base.width = w; base.height = h;
    const ctx = base.getContext("2d", { willReadFrequently: true }); if (!ctx) throw new Error("Renderização indisponível.");
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    const pixels = ctx.getImageData(0, 0, w, h);
    pixels.data.set(aplicarPaleta(pixels.data, w, cores.cabelo, cores.roupa, p.racaId)); ctx.putImageData(pixels, 0, 0);
    const corpo = canvas(256), retrato = canvas(128);
    corpo.ctx.drawImage(base, 0, 0, 256, 256);
    retrato.ctx.drawImage(base, recorte.x * w, recorte.y * h, recorte.lado * w, recorte.lado * h, 0, 0, 128, 128);
    const arte = { corpo: corpo.c, retrato: retrato.c };
    variantes.set(cores.chave, arte);
    while (variantes.size > LIMITE_CACHE) variantes.delete(variantes.keys().next().value!);
    return arte;
  }).finally(() => pendentes.delete(cores.chave));
  pendentes.set(cores.chave, promessa); return promessa;
}
