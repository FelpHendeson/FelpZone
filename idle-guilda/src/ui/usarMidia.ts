import { useEffect, useState } from 'react';

/** Acompanha uma media query (ex.: '(min-width: 900px)'). */
export function useMidia(consulta: string): boolean {
  const ler = () => typeof window !== 'undefined' && !!window.matchMedia?.(consulta).matches;
  const [casa, setCasa] = useState(ler);
  useEffect(() => {
    const m = window.matchMedia?.(consulta);
    if (!m) return;
    const mudar = () => setCasa(m.matches);
    mudar();
    m.addEventListener('change', mudar);
    return () => m.removeEventListener('change', mudar);
  }, [consulta]);
  return casa;
}
