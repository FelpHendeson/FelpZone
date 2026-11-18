import { useEffect, useRef, type CSSProperties } from 'react';
import type { Sprite } from '../arte/sprite';
import { altura, largura, urlDoSprite } from '../arte/sprite';

type Desenho = (ctx: CanvasRenderingContext2D, t: number) => void;

// Um único laço de animação para todos os canvases, a ~8 quadros por segundo.
const inscritos = new Set<(t: number) => void>();
let rodando = false;
let ultimo = 0;

function laco(agora: number) {
  if (inscritos.size === 0) {
    rodando = false;
    return;
  }
  if (agora - ultimo >= 120) {
    ultimo = agora;
    for (const f of inscritos) f(agora / 1000);
  }
  requestAnimationFrame(laco);
}

function inscrever(f: (t: number) => void): () => void {
  inscritos.add(f);
  if (!rodando) {
    rodando = true;
    requestAnimationFrame(laco);
  }
  return () => inscritos.delete(f);
}

/** Canvas em resolução baixa, ampliado pelo CSS sem suavização. */
export function CanvasPixel(props: {
  largura: number;
  altura: number;
  desenho: Desenho;
  className?: string;
  rotulo?: string;
  estilo?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const desenho = useRef(props.desenho);
  desenho.current = props.desenho;

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduzir) {
      desenho.current(ctx, 0);
      const id = setInterval(() => desenho.current(ctx, 0), 1000);
      return () => clearInterval(id);
    }
    return inscrever((t) => desenho.current(ctx, t));
  }, []);

  return (
    <canvas
      ref={ref}
      width={props.largura}
      height={props.altura}
      className={`pixel ${props.className ?? ''}`}
      style={props.estilo}
      role="img"
      aria-label={props.rotulo}
    />
  );
}

/** Ícone estático gerado a partir de um sprite. */
export function Icone(props: { chave: string; sprite: Sprite; escala?: number; rotulo?: string }) {
  const escala = props.escala ?? 2;
  return (
    <img
      className="pixel icone"
      src={urlDoSprite(props.chave, props.sprite)}
      width={largura(props.sprite) * escala}
      height={altura(props.sprite) * escala}
      alt={props.rotulo ?? ''}
    />
  );
}
