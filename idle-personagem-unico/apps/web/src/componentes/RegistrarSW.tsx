"use client";

import { useEffect } from "react";

/** Registra o service worker (PWA: instalar e abrir sem rede). Só em produção. */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* Sem service worker o jogo funciona igual, só não abre sem rede. */
    });
  }, []);
  return null;
}
