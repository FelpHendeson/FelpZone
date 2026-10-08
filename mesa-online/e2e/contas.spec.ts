import { expect, test, type Browser, type Page } from "@playwright/test";

// Contas, fichas, apostas, dominó e praça, como duas pessoas em iPhones.

interface Watched {
  page: Page;
  errors: string[];
}

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

async function signUp(browser: Browser, nickname: string): Promise<Watched> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`${nickname}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${nickname}: ${message.text()}`);
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Criar conta" }).click();
  await page.getByLabel("E-mail").fill(`${nickname.toLowerCase()}.${unique()}@exemplo.com`);
  await page.getByLabel(/Apelido/).fill(nickname);
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByRole("button", { name: /Criar conta e ganhar/ }).click();
  await expect(page.getByText("1.000 fichas")).toBeVisible();
  return { page, errors };
}

async function me(page: Page) {
  const response = await page.request.get("/api/conta");
  return ((await response.json()) as { me: { chips: number; inPlay: number; stats: { played: number; wins: number } } }).me;
}

test("conta: cadastro, bônus e dominó contra robô com aposta", async ({ browser }) => {
  const nick = `Ana${unique().slice(-5)}`;
  const { page, errors } = await signUp(browser, nick);

  // Apelido repetido é recusado (outra pessoa tentando o mesmo nome, em maiúsculas).
  const other = await browser.newContext();
  const intruder = await other.newPage();
  await intruder.goto("/");
  await intruder.getByRole("tab", { name: "Criar conta" }).click();
  await intruder.getByLabel("E-mail").fill(`outra.${unique()}@exemplo.com`);
  await intruder.getByLabel(/Apelido/).fill(nick.toUpperCase());
  await intruder.getByLabel("Senha").fill("senha-forte-123");
  await intruder.getByRole("button", { name: /Criar conta e ganhar/ }).click();
  await expect(intruder.locator(".account-form .error")).toContainText("já está em uso");

  await page.getByRole("button", { name: /Pegar 100 fichas do dia/ }).click();
  await expect(page.getByText("1.100 fichas")).toBeVisible();

  // Sala de dominó com aposta de 100 e meta de mão única.
  await page.getByRole("radio", { name: /Dominó/ }).click();
  await page.getByLabel("Modalidade").selectOption("bloqueio");
  await page.getByRole("button", { name: /Jogar com amigos/ }).click();
  await page.waitForURL(/\/sala\/[A-Z0-9]{5}$/);
  await page.getByLabel("Meta").selectOption({ label: "Mão única" });
  const stake = page.getByRole("combobox", { name: /^Aposta \(fichas virtuais\)/ });
  await stake.selectOption("100");
  await expect(stake).toHaveValue("100");
  await page.getByRole("button", { name: "+ Robô" }).click();
  await expect(page.getByText("Robô Fácil")).toBeVisible();
  await page.getByRole("button", { name: "Começar partida" }).click();
  await expect(page.locator(".domino-felt")).toBeVisible();
  expect(await me(page)).toMatchObject({ chips: 1000, inPlay: 100 });

  // Joga até a partida acabar: toca nas pedras que servem.
  const final = page.getByRole("dialog").filter({ hasText: /venceu|venceram/ });
  for (let step = 0; step < 300 && !(await final.count()); step += 1) {
    const playable = page.locator(".hand-tile.playable");
    if (await playable.count()) {
      await playable.first().click({ timeout: 2_000 }).catch(() => undefined);
      const side = page.locator(".side-choice button").first();
      if (await side.count()) await side.click({ timeout: 2_000 }).catch(() => undefined);
    }
    await page.waitForTimeout(300);
  }
  await expect(final).toBeVisible();

  const after = await me(page);
  expect(after.inPlay).toBe(0);
  expect(after.stats.played).toBe(1);
  // Saldo = 1.000 (depois da entrada) + a parte do pote de 200 que coube a ela.
  const code = page.url().split("/").pop()!;
  const { room } = (await (await page.request.get(`/api/rooms/${code}`)).json()) as {
    room: { results: { pot: number; seats: { playerId: string; name: string }[]; payouts: Record<string, number> }[] };
  };
  const result = room.results.at(-1)!;
  expect(result.pot).toBe(200);
  const seat = result.seats.find((item) => item.name === nick)!;
  expect(after.chips).toBe(1000 + result.payouts[seat.playerId]);
  expect(errors).toEqual([]);
});

test("praça: duas contas se veem online, conversam, acenam e se convidam", async ({ browser }) => {
  const anaNick = `Lia${unique().slice(-5)}`;
  const biaNick = `Rui${unique().slice(-5)}`;
  const ana = await signUp(browser, anaNick);
  const bia = await signUp(browser, biaNick);

  const anaOnline = ana.page.locator(".online-list li", { hasText: biaNick });
  const biaOnline = bia.page.locator(".online-list li", { hasText: anaNick });
  await expect(anaOnline).toBeVisible({ timeout: 25_000 });
  await expect(biaOnline).toBeVisible({ timeout: 25_000 });

  await ana.page.getByLabel("Mensagem para a praça").fill("Alguém pra um dominó?");
  await ana.page.getByRole("button", { name: "Enviar" }).last().click();
  await expect(bia.page.getByText("Alguém pra um dominó?")).toBeVisible({ timeout: 25_000 });

  await biaOnline.getByRole("button", { name: `Acenar para ${anaNick}` }).click();
  await expect(ana.page.getByText("acenou para você")).toBeVisible({ timeout: 25_000 });

  // Ana abre uma sala de dominó, volta ao menu e convida a Bia.
  await ana.page.getByRole("radio", { name: /Dominó/ }).click();
  await ana.page.getByRole("button", { name: /Jogar com amigos/ }).click();
  await ana.page.waitForURL(/\/sala\/[A-Z0-9]{5}$/);
  const code = ana.page.url().split("/").pop()!;
  await ana.page.getByRole("link", { name: /Início/ }).click();
  await ana.page.locator(".online-list li", { hasText: biaNick }).getByRole("button", { name: "Convidar" }).click();
  await expect(ana.page.getByText(`Convite enviado para ${biaNick}`)).toBeVisible();

  const invite = bia.page.locator(".notice-card", { hasText: `sala ${code}` });
  await expect(invite).toBeVisible({ timeout: 25_000 });
  await invite.getByRole("button", { name: "Entrar" }).click();
  await bia.page.waitForURL(new RegExp(code));
  await expect(bia.page.getByText(`Entrar como ${biaNick}`)).toBeVisible();
  await bia.page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(bia.page.locator(".player-list").getByText(biaNick)).toBeVisible();
  expect([...ana.errors, ...bia.errors]).toEqual([]);
});
