import { useEffect, useState } from 'react';

/** Número que sobe de 0 até o valor em ~600 ms (direto, com movimento reduzido). */
export function useContagem(valor: number, ms = 600): number {
  const reduzir = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [atual, setAtual] = useState(reduzir ? valor : 0);
  useEffect(() => {
    if (reduzir) {
      setAtual(valor);
      return;
    }
    const inicio = performance.now();
    let id = 0;
    const passo = (agora: number) => {
      const f = Math.min(1, (agora - inicio) / ms);
      setAtual(valor * (1 - Math.pow(1 - f, 3)));
      if (f < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [valor, ms, reduzir]);
  return atual;
}
