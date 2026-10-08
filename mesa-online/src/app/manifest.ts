import type { MetadataRoute } from "next";

/** Manifesto do app: instalável na tela de início (necessário para avisos no iPhone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mesa Online",
    short_name: "Mesa Online",
    description: "Magnata, Dominó e Truco com a família e os amigos.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#163b27",
    theme_color: "#1f5135",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
