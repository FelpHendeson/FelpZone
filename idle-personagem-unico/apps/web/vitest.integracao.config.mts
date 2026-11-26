import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["test-integracao/**/*.test.ts"], environment: "node", maxWorkers: 1 } });
