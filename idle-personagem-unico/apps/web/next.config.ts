import path from "node:path";
import type { NextConfig } from "next";

const raizDoWorkspace = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  // O motor é publicado como código TypeScript dentro do workspace.
  transpilePackages: ["@idle-pu/motor"],
  outputFileTracingRoot: raizDoWorkspace,
  turbopack: { root: raizDoWorkspace },
  poweredByHeader: false,
};

export default nextConfig;
