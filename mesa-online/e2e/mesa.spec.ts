import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

// Fluxos de ponta a ponta, como alguém num iPhone jogaria. Os dados são
// aleatórios, então os testes jogam em laço até o acontecimento esperado
// (com prazo), e conferem o estado pela mesma API pública que o site usa.

interface Watched {
  page: Page;
  errors: string[];
}

async function person(browser: Browser, name: string): Promise<Watched> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${name}: ${message.text()}`);
  });
  await page.goto("/");
  await page.getByPlaceholder("Como vão te chamar na mesa").fill(name);
  return { page, errors };
}

/** Onde estão os botões agora: dentro da janela que pede decisão ou na página. */
async function scope(page: Page): Promise<Locator> {
  return (await page.locator(".event-backdrop:not(.passive)").count()) ? page.locator(".event-dialog") : page.locator("main");
}

/** Clica no primeiro botão habilitado que existir, na ordem dada. */
async function tryClick(page: Page, names: RegExp[]): Promise<string | null> {
  const where = await scope(page);
  for (const name of names) {
    const button = where.getByRole("button", { name });
    if ((await button.count()) && (await button.first().isEnabled())) {
      await button.first().click({ timeout: 2_000 }).catch(() => undefined);
      return name.source;
    }
  }
  return null;
}

interface GameSnapshot {
  events: { type: string }[];
  players: { id: string; name: string }[];
  properties: Record<string, { owner: string | null }>;
}

/** O estado público da partida, pela mesma API que o site consulta. */
async function snapshot(page: Page, code: string): Promise<GameSnapshot> {
  const response = await page.request.get(`/api/rooms/${code}`);
  const body = (await response.json()) as { room?: { game?: GameSnapshot } };
  return body.room?.game ?? { events: [], players: [], properties: {} };
}

function owns(game: GameSnapshot, name: string): boolean {
  const id = game.players.find((player) => player.name === name)?.id;
  return Object.values(game.properties).some((property) => property?.owner === id);
}

test("partida solo: robôs jogam e cada lance é narrado numa janela", async ({ browser }) => {
  const felp = await person(browser, "Felp");
  const { page } = felp;
  await page.getByRole("button", { name: /Jogar contra robôs/ }).click();
  await page.waitForURL(/\/sala\/[A-Z0-9]{5}$/);
  await expect(page.locator(".board")).toBeVisible();

  // A câmera começa seguindo a vez.
  await expect(page.getByRole("button", { name: /Vez/ }).first()).toHaveAttribute("aria-pressed", "true");

  // Jogar a própria vez pelos botões da janela, várias vezes.
  let mine = 0;
  let narrated = 0;
  const deadline = Date.now() + 120_000;
  while (mine < 4 && Date.now() < deadline) {
    if (await page.locator(".event-dialog .beat-lines li").count()) narrated++;
    const done = await tryClick(page, [/^Comprar$/, /Rolar|Tentar dupla/, /^Pagar dívida$/, /^Passar a vez$/, /^Passar$/]);
    if (done) mine++;
    await page.waitForTimeout(300);
  }
  expect(mine).toBeGreaterThanOrEqual(4);
  expect(narrated).toBeGreaterThan(0);

  // Escape fecha a janela de decisão e a câmera troca de modo.
  for (let tries = 0; tries < 10 && (await page.locator(".event-backdrop:not(.passive)").count()); tries++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }
  const all = page.getByRole("button", { name: /Tudo/ });
  await all.click();
  await expect(all).toHaveAttribute("aria-pressed", "true");
  expect(felp.errors).toEqual([]);
});

test("amigos: sala, conversa, leilão e troca entre duas pessoas", async ({ browser }) => {
  const ana = await person(browser, "Ana");
  const bia = await person(browser, "Bia");
  await ana.page.getByRole("button", { name: /Jogar com amigos/ }).click();
  await ana.page.waitForURL(/\/sala\/[A-Z0-9]{5}$/);
  const code = ana.page.url().split("/").pop()!;

  await bia.page.getByLabel("Código da sala").fill(code.toLowerCase());
  await bia.page.locator("form.join-row").getByRole("button", { name: "Entrar" }).click();
  await bia.page.waitForURL(new RegExp(code));
  await expect(ana.page.getByText("Bia").first()).toBeVisible();

  await bia.page.getByLabel("Mensagem").fill("Oi, bora!");
  await bia.page.getByRole("button", { name: "Enviar" }).click();
  await expect(ana.page.getByText("Oi, bora!")).toBeVisible();

  // O leilão vem ligado e aparece no resumo de quem não é o anfitrião.
  await expect(ana.page.getByLabel(/Leilão ao recusar/)).toBeChecked();
  await expect(bia.page.getByText("Leilão ao recusar: ligado")).toBeVisible();

  await ana.page.getByRole("button", { name: "Começar partida" }).click();
  await expect(ana.page.locator(".board")).toBeVisible();
  await expect(bia.page.locator(".board")).toBeVisible();

  // Ana compra tudo; Bia recusa e abre leilões, em que Ana dá lance e Bia passa.
  // Quando Ana tiver uma propriedade, propõe dá-la à Bia, que aceita.
  let proposed = false;
  let sawAuction = false;
  let traded = false;
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline && !(sawAuction && traded)) {
    const anaTurn = await scope(ana.page);
    const tradeButton = anaTurn.getByRole("button", { name: /Propor troca/ });
    if (!proposed && owns(await snapshot(ana.page, code), "Ana") && (await tradeButton.count()) && (await tradeButton.first().isEnabled())) {
      await tradeButton.first().click();
      const sheet = ana.page.getByRole("dialog", { name: "Propor troca" });
      const giving = sheet.locator("fieldset", { hasText: "Você entrega" });
      const option = giving.locator("input[type=checkbox]:not([disabled])").first();
      if (await option.count()) {
        await option.check();
        await sheet.getByRole("button", { name: "Enviar proposta" }).click();
        await expect(sheet).toBeHidden();
        proposed = true;
      } else {
        await sheet.getByRole("button", { name: "Fechar" }).click();
      }
    }

    await tryClick(ana.page, [/^Dar lance de/, /^Comprar$/, /Rolar|Tentar dupla/, /^Pagar dívida$/, /^Passar a vez$/]);
    await tryClick(bia.page, [/^Aceitar troca$/, /^Passar$/, /^Não comprar$/, /Rolar|Tentar dupla/, /^Pagar dívida$/, /^Passar a vez$/]);

    const now = (await snapshot(ana.page, code)).events;
    sawAuction ||= now.some((event) => event.type === "auction-end");
    traded ||= now.some((event) => event.type === "trade-accepted");
    await ana.page.waitForTimeout(250);
  }

  expect(sawAuction, "houve um leilão").toBe(true);
  expect(traded, "a troca foi aceita").toBe(true);

  // O Histórico registra os dois.
  for (let tries = 0; tries < 10 && (await ana.page.locator(".event-backdrop:not(.passive)").count()); tries++) {
    await ana.page.keyboard.press("Escape");
    await ana.page.waitForTimeout(200);
  }
  await ana.page.getByRole("tab", { name: "Histórico" }).click();
  await expect(ana.page.getByText(/Troca feita/).first()).toBeVisible();
  await expect(ana.page.getByText(/Fim do leilão/).first()).toBeVisible();
  expect([...ana.errors, ...bia.errors]).toEqual([]);
});

test("preferências: o tempo das janelas fica salvo no aparelho", async ({ browser }) => {
  const { page, errors } = await person(browser, "Cris");
  await page.getByRole("button", { name: "Preferências" }).click();
  const pace = page.getByLabel("Tempo das janelas");
  await expect(pace).toHaveValue("normal");
  await pace.selectOption("slow");
  await page.reload();
  await page.getByRole("button", { name: "Preferências" }).click();
  await expect(page.getByLabel("Tempo das janelas")).toHaveValue("slow");
  expect(errors).toEqual([]);
});
