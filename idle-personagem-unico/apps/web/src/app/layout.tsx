import type { Metadata, Viewport } from "next";
import { RegistrarSW } from "@/componentes/RegistrarSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idle de Personagem Único",
  description: "Idle RPG de um único personagem sorteado.",
  applicationName: "Idle de Personagem Único",
  appleWebApp: { capable: true, title: "Personagem Único", statusBarStyle: "black-translucent" },
  icons: { apple: "/icones/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14121a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="pular" href="#conteudo">
          Pular para o conteúdo
        </a>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
