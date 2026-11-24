import path from "node:path";
import type { NextConfig } from "next";

const raizDoWorkspace = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  // O motor é publicado como código TypeScript dentro do workspace.
  transpilePackages: ["@idle-pu/motor"],
  outputFileTracingRoot: raizDoWorkspace,
  turbopack: { root: raizDoWorkspace },
  poweredByHeader: false,
  // F13: cabeçalhos de segurança (auditoria em docs/SEGURANCA.md).
  async headers() {
    const dev = process.env.NODE_ENV !== "production";
    const csp = [
      "default-src 'self'",
      // O Next injeta scripts inline de hidratação; em desenvolvimento o HMR usa eval.
      `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      `connect-src 'self'${dev ? " ws:" : ""}`,
      "worker-src 'self'",
      "manifest-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;
