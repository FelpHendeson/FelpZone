import { defineConfig, devices } from "@playwright/test";

// Testes de navegador: sobem a versão de produção (`next start`) com o
// armazenamento em memória e jogam como uma pessoa num iPhone jogaria.
// Rode `npm run build` antes de `npm run e2e`.
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["iPhone 13"],
    // O Chromium com tela, toque e user agent de iPhone basta aqui (o WebKit
    // não está disponível em todos os ambientes).
    browserName: "chromium",
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
